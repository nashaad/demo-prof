import json
import sqlite3
from collections.abc import Iterator
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from prof import agents
from prof.config import SQLITE_PATH
from prof.events import Error, to_dict

EVALS_DIR = Path(__file__).resolve().parents[1] / "evals"

DOCUMENT_COLUMNS = "doc_id, title, domain, criticality, revision, effective_date, status, supersedes"

app = FastAPI(title="prof")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _sse(payload: dict[str, Any]) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def _db() -> sqlite3.Connection:
    if not SQLITE_PATH.exists():
        raise HTTPException(status_code=503, detail="document store not ingested")
    conn = sqlite3.connect(f"file:{SQLITE_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


@app.get("/api/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/api/ask")
def ask(question: str, user_id: str, session_id: str) -> StreamingResponse:
    def stream() -> Iterator[str]:
        try:
            for event in agents.run(question, user_id, session_id):
                yield _sse(to_dict(event))
        except Exception as exc:
            yield _sse(to_dict(Error(message=str(exc) or type(exc).__name__)))
        yield _sse({"type": "done"})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/documents")
def list_documents() -> list[dict[str, Any]]:
    conn = _db()
    try:
        rows = conn.execute(f"SELECT {DOCUMENT_COLUMNS} FROM documents ORDER BY doc_id, effective_date").fetchall()
    finally:
        conn.close()
    return [dict(row) for row in rows]


@app.get("/api/documents/{doc_id}")
def get_document(doc_id: str, revision: str | None = Query(default=None)) -> dict[str, Any]:
    conn = _db()
    try:
        if revision is not None:
            doc = conn.execute(
                f"SELECT id, {DOCUMENT_COLUMNS} FROM documents WHERE doc_id = ? AND revision = ?",
                (doc_id, revision),
            ).fetchone()
        else:
            doc = conn.execute(
                f"SELECT id, {DOCUMENT_COLUMNS} FROM documents WHERE doc_id = ? "
                "ORDER BY (status = 'current') DESC, effective_date DESC LIMIT 1",
                (doc_id,),
            ).fetchone()
        if doc is None:
            raise HTTPException(status_code=404, detail="document not found")
        sections = conn.execute(
            "SELECT section, line_start, line_end, text FROM chunks WHERE document_id = ? ORDER BY id",
            (doc["id"],),
        ).fetchall()
    finally:
        conn.close()
    result = {key: doc[key] for key in doc.keys() if key != "id"}
    result["sections"] = [dict(row) for row in sections]
    return result


@app.get("/api/evals")
def list_evals() -> list[dict[str, Any]]:
    results = []
    for path in sorted(EVALS_DIR.glob("results-*.json")):
        results.append({"setup": path.stem.removeprefix("results-"), "data": json.loads(path.read_text())})
    return results
