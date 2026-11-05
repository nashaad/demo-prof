from dataclasses import asdict, dataclass, field
from typing import Any, Union


@dataclass
class Passage:
    chunk_id: int
    doc_id: str
    title: str
    domain: str
    section: str
    revision: str
    effective_date: str
    status: str
    criticality: str
    line_start: int
    line_end: int
    text: str
    # bm25_score is -bm25() so that higher is better, like the other scores.
    bm25_score: float | None = None
    vector_score: float | None = None
    fused_score: float | None = None
    rerank_score: float | None = None


@dataclass
class SearchStats:
    domain: str | None
    keyword_query: str
    candidate_limit: int
    keyword_hits: int
    meaning_hits: int
    merged: int
    reranked: int
    rerank_model: str | None
    rerank_failed: bool
    min_score: float | None
    below_min_score: int
    returned: int


@dataclass
class Citation:
    doc_id: str
    title: str
    section: str
    revision: str
    effective_date: str
    status: str
    quote: str


@dataclass
class RunStarted:
    run_id: str
    user_id: str
    session_id: str
    question: str
    type: str = "run_started"


@dataclass
class Routed:
    domain: str
    agent: str
    reason: str | None = None
    type: str = "routed"


@dataclass
class ToolCalled:
    agent: str
    tool: str
    args: dict[str, Any] = field(default_factory=dict)
    type: str = "tool_called"


@dataclass
class Passages:
    agent: str
    query: str
    passages: list[Passage] = field(default_factory=list)
    searches: list[SearchStats] = field(default_factory=list)
    type: str = "passages"


@dataclass
class Guardrail:
    name: str
    verdict: str  # "ok" or "BLOCKED"
    detail: str = ""
    type: str = "guardrail"


@dataclass
class Memory:
    user_id: str
    memories: list[str] = field(default_factory=list)
    type: str = "memory"


@dataclass
class Answer:
    text: str
    citations: list[Citation] = field(default_factory=list)
    agent: str = ""
    metrics: dict[str, Any] = field(default_factory=dict)
    type: str = "answer"


@dataclass
class Error:
    message: str
    type: str = "error"


AppEvent = Union[RunStarted, Routed, ToolCalled, Passages, Guardrail, Memory, Answer, Error]


def to_dict(event: AppEvent) -> dict[str, Any]:
    return asdict(event)
