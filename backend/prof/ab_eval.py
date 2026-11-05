import json
import time
from pathlib import Path

from prof import retrieval
from prof.config import SEED_FACTS
from prof.evaluate import _run_fact

RESULTS_DIR = Path(__file__).resolve().parents[1] / "evals"
SETUPS = {"no-rerank": False, "rerank": True}
K = 5
# The trial Cohere key allows about 10 rerank calls a minute; a fallback silently drops to fused order.
FALLBACK_WAIT_S = 12
FALLBACK_RETRIES = 3


def _search_with_retry(query: str, domain: str | None, rerank: bool) -> tuple[list, float]:
    for _ in range(FALLBACK_RETRIES + 1):
        started = time.perf_counter()
        passages = retrieval.search(query, domain, k=K, rerank=rerank)
        elapsed = time.perf_counter() - started
        fell_back = rerank and any(p.rerank_score is None for p in passages)
        if not fell_back:
            return passages, elapsed
        time.sleep(FALLBACK_WAIT_S)
    return passages, elapsed


def _retrieval_case(fact: dict, rerank: bool) -> dict:
    passages, elapsed = _search_with_retry(fact["question"], fact["expected_domain"], rerank)
    rank = None
    if fact["doc_id"] and fact["section"]:
        for i, p in enumerate(passages, start=1):
            if p.doc_id == fact["doc_id"] and p.section == fact["section"] and p.status == "current":
                rank = i
                break
    return {"rank": rank, "search_ms": round(elapsed * 1000), "returned": len(passages)}


def _passed(row: dict) -> bool:
    return all(row[k] != "MISS" for k in ("domain", "doc", "contains", "kind_check"))


def run_setup(name: str, facts: list[dict], retrieval_only: bool) -> dict:
    rerank = SETUPS[name]
    retrieval.RERANK_ENABLED = rerank
    tag = f"{name}-{int(time.time()) % 1_000_000}"
    cases = []
    for fact in facts:
        case = {"id": fact["id"], "kind": fact["kind"]}
        case.update(_retrieval_case(fact, rerank))
        if not retrieval_only:
            started = time.perf_counter()
            row = _run_fact(fact, tag)
            case["latency_s"] = round(time.perf_counter() - started, 2)
            case.update({k: row[k] for k in ("routed", "domain", "doc", "contains", "kind_check", "tools", "text", "unreranked")})
            case["total_tokens"] = row["metrics"].get("total_tokens")
            case["pass"] = _passed(row)
        cases.append(case)
        print(f"  [{name}] {fact['id']}: rank={case['rank']} " + (f"pass={case['pass']} {case['latency_s']}s" if not retrieval_only else ""), flush=True)
    return {"setup": name, "summary": _summary(cases, retrieval_only, rerank), "cases": cases}


def _summary(cases: list[dict], retrieval_only: bool, rerank: bool) -> dict:
    ranked = [c for c in cases if c["kind"] not in ("not_in_docs", "off_topic", "emergency", "refusal", "clarify")]
    ranks = [c["rank"] for c in ranked]
    off_corpus = [c for c in cases if c["kind"] == "not_in_docs"]
    out = {
        "retrieval_cases": len(ranked),
        "hit_at_1": round(sum(1 for r in ranks if r == 1) / len(ranks), 3),
        "hit_at_5": round(sum(1 for r in ranks if r) / len(ranks), 3),
        "mrr": round(sum(1 / r for r in ranks if r) / len(ranks), 3),
        "avg_search_ms": round(sum(c["search_ms"] for c in cases) / len(cases)),
        "off_corpus_passages": sum(c["returned"] for c in off_corpus),
    }
    if not retrieval_only:
        passed = sum(1 for c in cases if c["pass"])
        tokens = [c["total_tokens"] for c in cases if c.get("total_tokens")]
        out.update({
            "passed": passed,
            "total": len(cases),
            "pass_rate": round(passed / len(cases), 3),
            "avg_latency_s": round(sum(c["latency_s"] for c in cases) / len(cases), 2),
            "avg_tokens": round(sum(tokens) / len(tokens)) if tokens else None,
            "unreranked_passages": sum(c["unreranked"] for c in cases) if rerank else None,
        })
    return out


def _fmt(v) -> str:
    if v is None:
        return "-"
    if isinstance(v, bool):
        return "pass" if v else "FAIL"
    return str(v)


def print_diff(a: dict, b: dict) -> None:
    sa, sb = a["summary"], b["summary"]
    print(f"\nSUMMARY            {a['setup']:>12}  {b['setup']:>12}  delta")
    for key in sa:
        va, vb = sa[key], sb.get(key)
        delta = ""
        if isinstance(va, (int, float)) and isinstance(vb, (int, float)) and not isinstance(va, bool):
            d = round(vb - va, 3)
            delta = f"{d:+}" if d else "="
        print(f"{key:<18} {_fmt(va):>12}  {_fmt(vb):>12}  {delta}")

    print(f"\nPER CASE (rank of expected passage, end-to-end result)   * = changed")
    print(f"  {'id':<32} {'rank A':>6} {'rank B':>6}  {'A':>5} {'B':>5}  {'lat A':>6} {'lat B':>6}")
    for ca, cb in zip(a["cases"], b["cases"]):
        changed = ca["rank"] != cb["rank"] or ca.get("pass") != cb.get("pass")
        mark = "*" if changed else " "
        print(
            f"{mark} {ca['id']:<32} {_fmt(ca['rank']):>6} {_fmt(cb['rank']):>6}  "
            f"{_fmt(ca.get('pass')):>5} {_fmt(cb.get('pass')):>5}  {_fmt(ca.get('latency_s')):>6} {_fmt(cb.get('latency_s')):>6}"
        )


def main(retrieval_only: bool = False) -> None:
    facts = json.loads(SEED_FACTS.read_text())
    RESULTS_DIR.mkdir(exist_ok=True)
    results = []
    for name in SETUPS:
        print(f"running setup: {name}", flush=True)
        result = run_setup(name, facts, retrieval_only)
        (RESULTS_DIR / f"results-{name}.json").write_text(json.dumps(result, indent=2))
        results.append(result)
    retrieval.RERANK_ENABLED = True
    print_diff(results[0], results[1])
    print(f"\nsaved: {', '.join(str(RESULTS_DIR / f'results-{n}.json') for n in SETUPS)}")
