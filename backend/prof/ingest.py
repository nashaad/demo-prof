import re
from dataclasses import dataclass
from pathlib import Path

import yaml

from prof.config import DOCS_DIR
from prof.store import chroma_collection, connect, embed

FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
HEADING = re.compile(r"^## (.+)$")


@dataclass
class ParsedChunk:
    section: str
    line_start: int
    line_end: int
    text: str


def parse_document(path: Path) -> tuple[dict, list[ParsedChunk]]:
    raw = path.read_text()
    match = FRONTMATTER.match(raw)
    if not match:
        raise ValueError(f"{path}: missing frontmatter")
    meta = yaml.safe_load(match.group(1))
    body_offset = raw[: match.end()].count("\n")
    lines = raw[match.end():].split("\n")

    chunks: list[ParsedChunk] = []
    current: tuple[str, int] | None = None
    for index, line in enumerate(lines):
        number = body_offset + index + 1
        heading = HEADING.match(line)
        if heading:
            if current:
                chunks.append(_close(current, number - 1, lines, body_offset))
            current = (heading.group(1).strip(), number)
    if current:
        chunks.append(_close(current, body_offset + len(lines), lines, body_offset))
    return meta, chunks


def _close(current: tuple[str, int], end: int, lines: list[str], offset: int) -> ParsedChunk:
    section, start = current
    text = "\n".join(lines[start - offset - 1 : end - offset]).strip()
    return ParsedChunk(section=section, line_start=start, line_end=end, text=text)


def search_text(title: str, section: str, text: str) -> str:
    return f"{title} | {section}\n{text}"


def ingest(docs_dir: Path = DOCS_DIR) -> dict[str, int]:
    conn = connect()
    collection = chroma_collection()
    paths = sorted(docs_dir.glob("*/*.md"))
    seen = {str(p.relative_to(docs_dir.parent.parent)) for p in paths}

    for row in conn.execute("SELECT id, path FROM documents").fetchall():
        if row["path"] not in seen:
            _delete_document(conn, collection, row["id"])

    total_chunks = 0
    for path in paths:
        meta, chunks = parse_document(path)
        rel = str(path.relative_to(docs_dir.parent.parent))
        existing = conn.execute("SELECT id FROM documents WHERE path = ?", (rel,)).fetchone()
        if existing:
            _delete_document(conn, collection, existing["id"])
        cursor = conn.execute(
            "INSERT INTO documents (doc_id, title, domain, criticality, revision, effective_date, status, supersedes, path)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                meta["doc_id"], meta["title"], meta["domain"], meta["criticality"], str(meta["revision"]),
                str(meta["effective_date"]), meta["status"], meta.get("supersedes"), rel,
            ),
        )
        document_id = cursor.lastrowid
        ids, texts, metadatas = [], [], []
        for chunk in chunks:
            cursor = conn.execute(
                "INSERT INTO chunks (document_id, doc_id, section, line_start, line_end, text) VALUES (?, ?, ?, ?, ?, ?)",
                (document_id, meta["doc_id"], chunk.section, chunk.line_start, chunk.line_end, chunk.text),
            )
            chunk_id = cursor.lastrowid
            indexed = search_text(meta["title"], chunk.section, chunk.text)
            conn.execute("INSERT INTO chunks_fts (content, chunk_id) VALUES (?, ?)", (indexed, chunk_id))
            ids.append(str(chunk_id))
            texts.append(indexed)
            metadatas.append({"domain": meta["domain"], "status": meta["status"], "doc_id": meta["doc_id"]})
        if ids:
            collection.upsert(ids=ids, embeddings=embed(texts), metadatas=metadatas, documents=texts)
        total_chunks += len(ids)
    conn.commit()
    conn.close()
    return {"documents": len(paths), "chunks": total_chunks}


def _delete_document(conn, collection, document_id: int) -> None:
    chunk_ids = [r["id"] for r in conn.execute("SELECT id FROM chunks WHERE document_id = ?", (document_id,))]
    if chunk_ids:
        collection.delete(ids=[str(i) for i in chunk_ids])
        marks = ",".join("?" * len(chunk_ids))
        conn.execute(f"DELETE FROM chunks_fts WHERE chunk_id IN ({marks})", chunk_ids)
        conn.execute(f"DELETE FROM chunks WHERE id IN ({marks})", chunk_ids)
    conn.execute("DELETE FROM documents WHERE id = ?", (document_id,))
