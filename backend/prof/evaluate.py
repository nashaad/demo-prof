import json
import time

from prof.agents import NOT_FOUND, run
from prof.config import SEED_FACTS
from prof.events import Answer, Guardrail, Passages, Routed, ToolCalled

MEMORY_PRELUDE = "I run Line 3 on days."


def _run_fact(fact: dict, tag: str) -> dict:
    user = f"seed-{fact['id']}-{tag}"
    if fact["kind"] == "memory":
        for _ in run(MEMORY_PRELUDE, user, f"{user}-earlier"):
            pass
    events = list(run(fact["question"], user, f"{user}-now"))

    routed = next((e.domain for e in events if isinstance(e, Routed)), "")
    blocked = next((e for e in events if isinstance(e, Guardrail) and e.verdict == "BLOCKED"), None)
    answer = next((e for e in events if isinstance(e, Answer)), None)
    text = answer.text if answer else ""
    retrieved = {p.doc_id for e in events if isinstance(e, Passages) for p in e.passages}
    cited = {c.doc_id for c in answer.citations} if answer else set()
    tools = [e.tool for e in events if isinstance(e, ToolCalled)]
    unreranked = sum(1 for e in events if isinstance(e, Passages) for p in e.passages if p.rerank_score is None)
    if blocked:
        routed = f"BLOCKED:{blocked.name}"

    expected = fact["expected_domain"]
    if expected is None:
        domain_ok = routed == "none" if fact["kind"] == "off_topic" else True
    else:
        domain_ok = routed == expected or (routed.startswith("BLOCKED") and expected == "safety")

    doc = fact["doc_id"]
    if doc is None:
        doc_ok = "-"
    else:
        doc_ok = "cited" if doc in cited else "retrieved" if doc in retrieved else "MISS"

    needles = fact["answer_contains"]
    contains_ok = "-" if not needles else ("ok" if all(n.lower() in text.lower() for n in needles) else "MISS")

    kind_ok = "-"
    if fact["kind"] == "clarify":
        kind_ok = "ok" if "?" in text else "MISS"
    elif fact["kind"] == "not_in_docs":
        needle = NOT_FOUND.lower().rstrip(".").replace("'", "")
        kind_ok = "ok" if needle in text.lower().replace("’", "").replace("'", "") else "MISS"
    elif fact["kind"] in ("emergency", "refusal"):
        kind_ok = "ok" if blocked else "MISS"
    elif fact["kind"] == "off_topic":
        kind_ok = "ok" if routed == "none" and not tools else "MISS"
    elif fact["kind"] == "conflict":
        kind_ok = "ok" if {"MNT-003", "QC-003"} <= cited else "MISS"

    return {
        "id": fact["id"], "kind": fact["kind"], "expected": expected or "-", "routed": routed or "-",
        "domain": "ok" if domain_ok else "MISS", "doc": doc_ok, "contains": contains_ok, "kind_check": kind_ok,
        "tools": len(tools), "text": text,
        "metrics": answer.metrics if answer else {}, "unreranked": unreranked,
    }


def ask_all() -> None:
    facts = json.loads(SEED_FACTS.read_text())
    tag = str(int(time.time()))[-6:]
    rows = [_run_fact(f, tag) for f in facts]
    headers = ["id", "kind", "expected", "routed", "domain", "doc", "contains", "kind_check", "tools"]
    widths = {h: max(len(h), *(len(str(r[h])) for r in rows)) for h in headers}
    print("  ".join(h.ljust(widths[h]) for h in headers))
    for r in rows:
        print("  ".join(str(r[h]).ljust(widths[h]) for h in headers))
    right = sum(1 for r in rows if r["domain"] == "ok")
    print(f"\nrouting correct: {right}/{len(rows)}")
    print("\nanswers")
    for r in rows:
        print(f"- {r['id']}: {r['text'].strip()[:400]!r}")
