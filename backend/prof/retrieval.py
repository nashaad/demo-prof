import logging
import os
import re
import time
from dataclasses import replace
from functools import lru_cache

import cohere

from prof.config import RERANK_BASE_URL, RERANK_MIN_SCORE, RERANK_MODEL
from prof.events import Passage
from prof.store import chroma_collection, connect, embed

log = logging.getLogger(__name__)

CANDIDATES = 20
RERANK_POOL = 15
RRF_K = 60
SUPERSEDED_WEIGHT = 0.5
RATE_LIMIT_BACKOFF_S = 6
STOPWORDS = frozenset(
    "a an and are as at be by can do does for from how i in is it my of on or our the to us was we what when where which who with you your"
    .split()
)


RERANK_ENABLED = True


def search(query: str, domain: str | None, k: int = 5, rerank: bool | None = None) -> list[Passage]:
    """Hybrid search in one domain (all domains when None): FTS5 bm25 and Chroma vectors, fused with RRF, then optionally reranked."""
    if rerank is None:
        rerank = RERANK_ENABLED
    bm25 = _bm25_hits(query, domain, CANDIDATES)
    vector = _vector_hits(query, domain, CANDIDATES)

    fused: dict[int, float] = {}
    for hits in (bm25, vector):
        for rank, (chunk_id, _) in enumerate(hits, start=1):
            fused[chunk_id] = fused.get(chunk_id, 0.0) + 1.0 / (RRF_K + rank)
    if not fused:
        return []

    bm25_scores, vector_scores = dict(bm25), dict(vector)
    ranked = sorted(fused, key=lambda cid: fused[cid], reverse=True)
    pool = _load_passages(ranked[: RERANK_POOL if rerank else k])
    passages = [
        replace(p, bm25_score=bm25_scores.get(p.chunk_id), vector_score=vector_scores.get(p.chunk_id), fused_score=fused[p.chunk_id])
        for p in pool
    ]

    if rerank:
        passages = _rerank(query, passages)
        passages = [p for p in passages if p.rerank_score is None or p.rerank_score >= RERANK_MIN_SCORE]
        passages.sort(key=lambda p: _final_score(p), reverse=True)
    else:
        passages.sort(key=lambda p: _final_score(p), reverse=True)
    return passages[:k]


def _final_score(p: Passage) -> float:
    base = p.rerank_score if p.rerank_score is not None else (p.fused_score or 0.0)
    return base * (SUPERSEDED_WEIGHT if p.status == "superseded" else 1.0)


def _fts_query(query: str) -> str:
    tokens = [t for t in re.findall(r"[A-Za-z0-9]+", query.lower()) if t not in STOPWORDS]
    return " OR ".join(f'"{t}"' for t in dict.fromkeys(tokens))


def _bm25_hits(query: str, domain: str | None, limit: int) -> list[tuple[int, float]]:
    match = _fts_query(query)
    if not match:
        return []
    conn = connect()
    try:
        rows = conn.execute(
            "SELECT f.chunk_id AS chunk_id, bm25(chunks_fts) AS score"
            " FROM chunks_fts f JOIN chunks c ON c.id = f.chunk_id JOIN documents d ON d.id = c.document_id"
            " WHERE chunks_fts MATCH ? AND (? IS NULL OR d.domain = ?) ORDER BY score LIMIT ?",
            (match, domain, domain, limit),
        ).fetchall()
    finally:
        conn.close()
    return [(int(r["chunk_id"]), -float(r["score"])) for r in rows]


def _vector_hits(query: str, domain: str | None, limit: int) -> list[tuple[int, float]]:
    where = {"domain": domain} if domain else None
    result = chroma_collection().query(query_embeddings=embed([query]), n_results=limit, where=where)
    return [(int(cid), 1.0 - float(dist)) for cid, dist in zip(result["ids"][0], result["distances"][0])]


def _load_passages(chunk_ids: list[int]) -> list[Passage]:
    if not chunk_ids:
        return []
    marks = ",".join("?" * len(chunk_ids))
    conn = connect()
    try:
        rows = conn.execute(
            "SELECT c.id, c.doc_id, c.section, c.line_start, c.line_end, c.text,"
            " d.title, d.domain, d.revision, d.effective_date, d.status, d.criticality"
            f" FROM chunks c JOIN documents d ON d.id = c.document_id WHERE c.id IN ({marks})",
            chunk_ids,
        ).fetchall()
    finally:
        conn.close()
    by_id = {
        r["id"]: Passage(
            chunk_id=r["id"], doc_id=r["doc_id"], title=r["title"], domain=r["domain"], section=r["section"],
            revision=r["revision"], effective_date=r["effective_date"], status=r["status"], criticality=r["criticality"],
            line_start=r["line_start"], line_end=r["line_end"], text=r["text"],
        )
        for r in rows
    }
    return [by_id[i] for i in chunk_ids if i in by_id]


@lru_cache(maxsize=1)
def _cohere() -> cohere.Client:
    return cohere.Client(api_key=os.environ["OPENROUTER_API_KEY"], base_url=RERANK_BASE_URL)


def _rerank(query: str, passages: list[Passage]) -> list[Passage]:
    if not passages:
        return passages
    documents = [f"{p.title} | {p.section}\n{p.text}" for p in passages]
    response = None
    for attempt in range(2):
        try:
            response = _cohere().rerank(model=RERANK_MODEL, query=query, documents=documents, top_n=len(documents))
            break
        except Exception as exc:
            rate_limited = type(exc).__name__ == "TooManyRequestsError"
            if rate_limited and attempt == 0:
                time.sleep(RATE_LIMIT_BACKOFF_S)
                continue
            log.warning("rerank failed, keeping fused order: %s", type(exc).__name__)
            return passages
    return [replace(passages[r.index], rerank_score=float(r.relevance_score)) for r in response.results]


def get_chunk(doc_id: str, section_prefix: str, current_only: bool = True) -> Passage | None:
    conn = connect()
    try:
        row = conn.execute(
            "SELECT c.id FROM chunks c JOIN documents d ON d.id = c.document_id"
            " WHERE c.doc_id = ? AND c.section LIKE ? AND (? = 0 OR d.status = 'current') ORDER BY c.id LIMIT 1",
            (doc_id, f"{section_prefix}%", int(current_only)),
        ).fetchone()
    finally:
        conn.close()
    if not row:
        return None
    loaded = _load_passages([row["id"]])
    return loaded[0] if loaded else None
