import os
import re
import threading
from collections import defaultdict
from functools import lru_cache
from typing import Any, Callable, Iterator
from uuid import uuid4

from agno.agent import Agent
from agno.db.sqlite import SqliteDb
from agno.memory import MemoryManager
from agno.models.openai import OpenAIResponses
from agno.run import RunContext
from agno.team import Team, TeamMode

from prof import retrieval
from prof.config import AGENT_DB_PATH, CHAT_MODEL, DOMAINS, VAR_DIR
from prof.events import (
    Answer, AppEvent, Citation, Error, Guardrail, Memory, Passage, Passages, Routed, RunStarted, ToolCalled,
)
from prof.guardrails import GUARDRAIL_NAMES, GUARDRAILS

ROUTER_NAME = "Plant Router"
NOT_FOUND = "I couldn't find this in the plant documents."

# Passages the search tools return, keyed by session id, read back by run() to emit exact scores.
_passage_sink: dict[str, list[tuple[str, list[Passage]]]] = defaultdict(list)
_sink_lock = threading.Lock()


def _model() -> OpenAIResponses:
    return OpenAIResponses(id=CHAT_MODEL)


def _format_for_model(passages: list[Passage]) -> str:
    if not passages:
        return "No relevant passages found."
    blocks = []
    for i, p in enumerate(passages, start=1):
        flag = "" if p.status == "current" else " | SUPERSEDED, do not use as the answer"
        blocks.append(
            f"[{i}] {p.doc_id} | {p.title} | {p.section} | rev {p.revision} | effective {p.effective_date}"
            f" | status {p.status}{flag}\n{p.text}"
        )
    return "\n\n".join(blocks)


def _make_search_tool(domain: str) -> Callable[..., str]:
    def search_docs(query: str, run_context: RunContext, include_other_domains: bool = False) -> str:
        passages = retrieval.search(query, domain)
        if include_other_domains:
            others = [p for p in retrieval.search(query, None) if p.domain != domain]
            passages = passages + others[:3]
        with _sink_lock:
            _passage_sink[run_context.session_id or ""].append((query, passages))
        return _format_for_model(passages)

    search_docs.__name__ = f"search_{domain}_docs"
    search_docs.__doc__ = (
        f"Search the plant {domain} documents for passages relevant to a question.\n\n"
        f"Args:\n    query: A short search query with the key terms (equipment name, part number, task).\n"
        f"    include_other_domains: Also return the best matches from the other departments' documents. "
        f"Set true when asking for a specific value (torque, tolerance, interval, limit) that another department might also state, to check the documents agree.\n\n"
        f"Returns passages with document id, title, section, revision, effective date and status."
    )
    return search_docs


SPECIALIST_RULES = """
You answer floor supervisors' questions for Calder Ridge Manufacturing, Plant 1 from the plant's {domain} documents only.

- Before answering a factual question, call search_{domain}_docs. Call it again with different terms if the first passages do not cover the question. Never answer from general knowledge.
- Answer only from the passages returned. If they do not contain the answer, reply "{not_found}" and, if useful, say what related topics the documents do cover. Do not guess.
- Cite every fact inline as [DOC_ID rev X, §N], for example [SAF-003 rev B, §4], and quote the key sentence or value from the passage in quotation marks.
- Passages marked SUPERSEDED are old revisions. Answer from the current revision. If a superseded revision gives a different value, mention that in one line and say it no longer applies.
- When the question asks for a specific value (a torque, tolerance, interval or limit), call the search tool with include_other_domains=true so you can check whether another department's document states a different value.
- If two passages, even from different documents, give different values for the same thing, report both with their sources, say that they disagree, and do not pick one silently.
- If the question could apply to several machines or parts and the task does not say which, search if needed to see which ones the documents cover, then ask one short clarifying question instead of listing everything.
- Use the documents' own wording for procedures and terms.
- Lead with the direct answer, then the steps or values, kept short. Plain text, no markdown headings.
{extra}"""

SPECIALISTS = {
    "safety": (
        "Safety",
        "Machine guarding, lockout/tagout, PPE, chemical handling, emergency response, and any question about whether something is safe.",
        "- Safety procedures are critical: give the steps in the order the document lists them, and never suggest bypassing a safety device.",
    ),
    "maintenance": (
        "Maintenance",
        "Preventive maintenance, service intervals, lubrication, torque specifications, equipment repair and inspection for Press 4, Conveyor C2 and CNC 3.",
        "- The task may include remembered facts about the supervisor, such as the line they run. Use them to pick the machine instead of asking.",
    ),
    "quality": (
        "Quality",
        "Part specifications and tolerances, dimensional inspection, gauges and fixtures, nonconforming material, SPC and sampling.",
        "",
    ),
}

ROUTER_INSTRUCTIONS = [
    "You are the router for floor supervisors at Calder Ridge Manufacturing, Plant 1. You never answer plant questions yourself.",
    "Hand each in-scope question to exactly one member. If the question touches safety at all (guards, light curtains, lockout/tagout, PPE, chemicals, hazards, whether something is safe to run), choose safety. "
    "Equipment upkeep, service intervals, lubrication, torque and repair go to maintenance. Part specifications, tolerances, inspection, gauges and nonconforming material go to quality.",
    "Write the task as a complete standalone question. Resolve follow-ups using the chat history, and include relevant facts you remember about the user (for example the line they run) in the task. "
    "Start the task with one line `Routing reason: <short clause>` and then the question.",
    "If the question is not about plant safety, maintenance or quality, do not delegate. Reply in one sentence that you can only help with plant safety, maintenance and quality questions.",
    "If you cannot tell which domain a question belongs to, do not delegate. Ask exactly one short clarifying question. "
    "If the domain is clear but a detail such as which machine is missing, delegate anyway: the specialist asks for the detail.",
]


def _build_specialist(domain: str) -> Agent:
    name, role, extra = SPECIALISTS[domain]
    return Agent(
        id=domain,
        name=name,
        role=role,
        model=_model(),
        tools=[_make_search_tool(domain)],
        instructions=SPECIALIST_RULES.format(domain=domain, not_found=NOT_FOUND, extra=extra),
    )


@lru_cache(maxsize=1)
def build_team() -> Team:
    VAR_DIR.mkdir(parents=True, exist_ok=True)
    db = SqliteDb(db_file=str(AGENT_DB_PATH))
    return Team(
        id="plant-router",
        name=ROUTER_NAME,
        mode=TeamMode.route,
        model=_model(),
        members=[_build_specialist(d) for d in DOMAINS],
        instructions=ROUTER_INSTRUCTIONS,
        pre_hooks=list(GUARDRAILS),
        db=db,
        memory_manager=MemoryManager(
            model=_model(),
            db=db,
            additional_instructions="Remember durable facts about the supervisor such as the line, machines or shift they run.",
        ),
        update_memory_on_run=True,
        add_history_to_context=True,
        num_history_runs=3,
    )


_CITATION = re.compile(r"([A-Z]{2,4}-\d{3})(?:\s+rev(?:ision)?\s+([A-Za-z0-9]+))?\s*,?\s*(?:§|section\s+)(\d+)", re.IGNORECASE)


def _citations(answer: str, passages: list[Passage]) -> list[Citation]:
    cited: list[Citation] = []
    for match in _CITATION.finditer(answer):
        doc_id, revision, number = match.group(1).upper(), match.group(2), match.group(3)
        for p in passages:
            same_section = re.match(rf"{number}\b", p.section)
            if p.doc_id == doc_id and same_section and (revision is None or revision.upper() == p.revision.upper()):
                citation = Citation(p.doc_id, p.title, p.section, p.revision, p.effective_date, p.status, p.text[:600])
                if citation not in cited:
                    cited.append(citation)
                break
    return cited


def _guardrail_citations(message: str) -> list[Citation]:
    out = []
    for doc_id, prefix in re.findall(r"([A-Z]{2,4}-\d{3}) section (\d+)", message):
        p = retrieval.get_chunk(doc_id, f"{prefix}.")
        if p:
            out.append(Citation(p.doc_id, p.title, p.section, p.revision, p.effective_date, p.status, p.text[:600]))
    return out


def _metrics(metrics: Any) -> dict[str, Any]:
    if metrics is None:
        return {}
    keep = ("duration", "time_to_first_token", "input_tokens", "output_tokens", "total_tokens", "cost")
    data = metrics.to_dict() if hasattr(metrics, "to_dict") else {}
    return {k: data[k] for k in keep if k in data}


class _RunState:
    def __init__(self, session_id: str, user_id: str):
        self.session_id = session_id
        self.user_id = user_id
        self.hook_index = 0
        self.current_hook = ""
        self.routed: str | None = None
        self.member_name = ""
        self.passages: list[Passage] = []
        self.deltas: list[str] = []
        self.blocked = False
        self.answered = False


def run(question: str, user_id: str, session_id: str) -> Iterator[AppEvent]:
    """Run one question through guardrails, router and specialist, yielding app events."""
    state = _RunState(session_id, user_id)
    run_id = str(uuid4())
    yield RunStarted(run_id=run_id, user_id=user_id, session_id=session_id, question=question)
    with _sink_lock:
        _passage_sink.pop(session_id, None)
    try:
        stream = build_team().run(
            question, user_id=user_id, session_id=session_id, run_id=run_id, stream=True, stream_events=True
        )
        for raw in stream:
            if os.environ.get("PROF_DEBUG_EVENTS") and "Content" not in raw.event:
                print("RAW", raw.event, getattr(raw, "agent_name", ""), getattr(raw, "pre_hook_name", ""), flush=True)
            yield from _translate(raw, state)
    except Exception as exc:
        yield Error(message=f"{type(exc).__name__}: {exc}")
    finally:
        with _sink_lock:
            _passage_sink.pop(session_id, None)


def _translate(raw: Any, state: _RunState) -> Iterator[AppEvent]:
    kind = raw.event

    if kind == "TeamPreHookStarted":
        state.current_hook = GUARDRAIL_NAMES[state.hook_index] if state.hook_index < len(GUARDRAIL_NAMES) else raw.pre_hook_name or "hook"
        state.hook_index += 1

    elif kind == "TeamPreHookCompleted":
        yield Guardrail(name=state.current_hook, verdict="ok", detail="no match")

    elif kind == "TeamToolCallStarted":
        tool = raw.tool
        if tool and tool.tool_name == "delegate_task_to_member":
            args = tool.tool_args or {}
            member_id = str(args.get("member_id", ""))
            task = str(args.get("task", ""))
            reason = re.search(r"Routing reason:\s*(.+)", task)
            state.routed = member_id
            state.member_name = member_id.capitalize()
            yield Routed(domain=member_id, agent=state.member_name, reason=reason.group(1).strip() if reason else None)

    elif kind == "ToolCallStarted":
        tool = raw.tool
        if tool:
            yield ToolCalled(agent=getattr(raw, "agent_name", "") or state.member_name, tool=tool.tool_name or "", args=tool.tool_args or {})

    elif kind == "ToolCallCompleted":
        with _sink_lock:
            queue = _passage_sink.get(state.session_id) or []
            hit = queue.pop(0) if queue else None
        if hit:
            query, passages = hit
            state.passages.extend(passages)
            yield Passages(agent=getattr(raw, "agent_name", "") or state.member_name, query=query, passages=passages)

    elif kind == "TeamRunContent":
        if isinstance(raw.content, str):
            state.deltas.append(raw.content)

    elif kind == "TeamMemoryUpdateCompleted":
        yield Memory(user_id=state.user_id, memories=[_memory_text(m) for m in (raw.memories or [])])

    elif kind == "TeamRunError":
        yield from _on_error(raw, state)

    elif kind == "TeamRunCompleted":
        yield from _on_completed(raw, state)


def _memory_text(memory: Any) -> str:
    return getattr(memory, "memory", None) or str(memory)


def _on_error(raw: Any, state: _RunState) -> Iterator[AppEvent]:
    message = raw.content or "run failed"
    if raw.error_type == "input_check_error" or getattr(raw, "error_id", None) in ("input_not_allowed", "prompt_injection"):
        state.blocked = True
        extra = raw.additional_data or {}
        yield Guardrail(
            name=extra.get("guardrail") or state.current_hook or "guardrail",
            verdict="BLOCKED",
            detail=extra.get("detail") or message,
        )
        yield Answer(text=message, citations=_guardrail_citations(message), agent="guardrail")
        state.answered = True
    else:
        yield Error(message=message)


def _on_completed(raw: Any, state: _RunState) -> Iterator[AppEvent]:
    if state.answered:
        return
    text = raw.content if isinstance(raw.content, str) and raw.content else "".join(state.deltas)
    if state.routed is None:
        yield Routed(domain="none", agent=ROUTER_NAME, reason="answered by the router without delegating")
    agent = state.member_name or ROUTER_NAME
    yield Answer(text=text, citations=_citations(text, state.passages), agent=agent, metrics=_metrics(raw.metrics))
    state.answered = True
