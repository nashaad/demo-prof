import os
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(REPO_ROOT / ".env")

DOCS_DIR = REPO_ROOT / "data" / "docs"
SEED_FACTS = REPO_ROOT / "data" / "seed_facts.json"
VAR_DIR = REPO_ROOT / "var"
SQLITE_PATH = VAR_DIR / "docs.sqlite"
CHROMA_DIR = VAR_DIR / "chroma"
AGENT_DB_PATH = VAR_DIR / "agent.sqlite"

CHAT_MODEL = os.environ.get("PROF_CHAT_MODEL", "gpt-6-luna")
EMBEDDING_MODEL = "text-embedding-3-small"
RERANK_MODEL = os.environ.get("PROF_RERANK_MODEL", "cohere/rerank-v3.5")
RERANK_BASE_URL = "https://openrouter.ai/api"

DOMAINS = ("safety", "maintenance", "quality")

# Plant emergency line, SAF-001 section 2.
EMERGENCY_EXTENSION = "2911"

# Passages whose rerank score falls below this are dropped, so an off-corpus question returns no passages.
RERANK_MIN_SCORE = float(os.environ.get("PROF_RERANK_MIN_SCORE", "0.05"))
