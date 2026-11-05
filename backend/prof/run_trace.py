import json
import sqlite3
from dataclasses import dataclass, field
from typing import Any

from prof.config import AGENT_DB_PATH
from prof.guardrails import GUARDRAILS

METRIC_KEYS = ("input_tokens", "output_tokens", "reasoning_tokens", "cache_read_tokens", "cache_write_tokens")
TIMING_KEYS = ("duration", "time_to_first_token")


@dataclass
class TraceMessage:
    role: str
    content: str
    from_history: bool
    tool_calls: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class TraceToolCall:
    tool: str
    args: dict[str, Any]
    result: str
    duration: float | None


@dataclass
class AgentCall:
    run_id: str
    agent_id: str
    agent: str
    status: str
    model: str
    input: str
    reply: str
    messages: list[TraceMessage]
    tool_calls: list[TraceToolCall]
    metrics: dict[str, Any]


@dataclass
class GuardrailRule:
    name: str
    looks_for: str


@dataclass
class RunTrace:
    run_id: str
    router: AgentCall
    members: list[AgentCall]
    memory_metrics: dict[str, Any] | None
    guardrails: list[GuardrailRule]


def load_run_trace(run_id: str) -> RunTrace | None:
    """The stored router run and its member runs, as Agno saved them in the agent database."""
    if not AGENT_DB_PATH.exists():
        return None
    conn = sqlite3.connect(AGENT_DB_PATH)
    try:
        rows = conn.execute(
            "SELECT run_id, run_data FROM agno_runs WHERE run_id = ? OR parent_run_id = ? ORDER BY created_at",
            (run_id, run_id),
        ).fetchall()
    except sqlite3.OperationalError:
        return None
    finally:
        conn.close()

    runs = {rid: json.loads(data) for rid, data in rows}
    root = runs.pop(run_id, None)
    if root is None:
        return None
    return RunTrace(
        run_id=run_id,
        router=_agent_call(root),
        members=[_agent_call(data) for data in runs.values()],
        memory_metrics=_model_metrics(root.get("metrics") or {}, "memory_model"),
        guardrails=[GuardrailRule(name=g.name, looks_for=g.looks_for) for g in GUARDRAILS],  # type: ignore[attr-defined]
    )


def _agent_call(data: dict[str, Any]) -> AgentCall:
    metrics = data.get("metrics") or {}
    model_metrics = _model_metrics(metrics, "model") or {k: metrics[k] for k in METRIC_KEYS if k in metrics}
    model_metrics.update({k: metrics[k] for k in TIMING_KEYS if k in metrics})
    return AgentCall(
        run_id=data.get("run_id", ""),
        agent_id=data.get("team_id") or data.get("agent_id") or "",
        agent=data.get("team_name") or data.get("agent_name") or "",
        status=data.get("status", ""),
        model=data.get("model") or "",
        input=(data.get("input") or {}).get("input_content") or "",
        reply=_text(data.get("content")),
        messages=[_message(m) for m in data.get("messages") or []],
        tool_calls=[_tool_call(t) for t in data.get("tools") or []],
        metrics=model_metrics,
    )


def _model_metrics(metrics: dict[str, Any], key: str) -> dict[str, Any] | None:
    calls = (metrics.get("details") or {}).get(key) or []
    if not calls:
        return None
    totals: dict[str, Any] = {"calls": len(calls)}
    for name in METRIC_KEYS:
        values = [c[name] for c in calls if c.get(name) is not None]
        if values:
            totals[name] = sum(values)
    return totals


def _message(m: dict[str, Any]) -> TraceMessage:
    calls = []
    for call in m.get("tool_calls") or []:
        fn = call.get("function") or {}
        calls.append({"name": fn.get("name", ""), "args": _parse_args(fn.get("arguments"))})
    return TraceMessage(role=m.get("role", ""), content=_text(m.get("content")), from_history=bool(m.get("from_history")), tool_calls=calls)


def _tool_call(t: dict[str, Any]) -> TraceToolCall:
    return TraceToolCall(
        tool=t.get("tool_name") or "",
        args=t.get("tool_args") or {},
        result=_text(t.get("result")),
        duration=(t.get("metrics") or {}).get("duration"),
    )


def _parse_args(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    try:
        parsed = json.loads(raw or "{}")
    except (TypeError, ValueError):
        return {"raw": raw}
    return parsed if isinstance(parsed, dict) else {"raw": parsed}


def _text(value: Any) -> str:
    if value is None:
        return ""
    return value if isinstance(value, str) else json.dumps(value, indent=2)
