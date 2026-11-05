import sqlite3
from functools import lru_cache

import chromadb
from openai import OpenAI

from prof.config import CHROMA_DIR, EMBEDDING_MODEL, SQLITE_PATH, VAR_DIR

SCHEMA = """
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY,
    doc_id TEXT NOT NULL,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    criticality TEXT NOT NULL,
    revision TEXT NOT NULL,
    effective_date TEXT NOT NULL,
    status TEXT NOT NULL,
    supersedes TEXT,
    path TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id),
    doc_id TEXT NOT NULL,
    section TEXT NOT NULL,
    line_start INTEGER NOT NULL,
    line_end INTEGER NOT NULL,
    text TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS chunks_document ON chunks(document_id);
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
    content, chunk_id UNINDEXED, tokenize = 'porter unicode61'
);
"""


def connect() -> sqlite3.Connection:
    VAR_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


@lru_cache(maxsize=1)
def chroma_collection():
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return client.get_or_create_collection("chunks", metadata={"hnsw:space": "cosine"})


@lru_cache(maxsize=1)
def _openai() -> OpenAI:
    return OpenAI()


def embed(texts: list[str]) -> list[list[float]]:
    response = _openai().embeddings.create(model=EMBEDDING_MODEL, input=texts)
    return [item.embedding for item in response.data]
