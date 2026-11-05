import argparse
import json
import sys


def main() -> None:
    parser = argparse.ArgumentParser(prog="prof")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("ingest")
    ask = sub.add_parser("ask")
    ask.add_argument("question")
    ask.add_argument("--user", default="nash")
    ask.add_argument("--session", default="s1")
    search = sub.add_parser("search")
    search.add_argument("query")
    search.add_argument("--domain", required=True)
    search.add_argument("--no-rerank", action="store_true")
    sub.add_parser("ask-all")
    ab = sub.add_parser("eval-ab")
    ab.add_argument("--retrieval-only", action="store_true")
    args = parser.parse_args()

    if args.command == "ingest":
        from prof.ingest import ingest
        print(ingest())
    elif args.command == "search":
        from prof.retrieval import search as run_search
        for p in run_search(args.query, args.domain, rerank=not args.no_rerank):
            print(f"{p.doc_id} rev {p.revision} [{p.status}] {p.section}  bm25={p.bm25_score} vec={p.vector_score} fused={p.fused_score} rerank={p.rerank_score}")
    elif args.command == "ask":
        from prof.agents import run
        for event in run(args.question, args.user, args.session):
            print(format_event(event))
    elif args.command == "ask-all":
        from prof.evaluate import ask_all
        ask_all()
    elif args.command == "eval-ab":
        from prof.ab_eval import main as eval_ab
        eval_ab(retrieval_only=args.retrieval_only)


def format_event(event) -> str:
    from prof.events import to_dict
    d = to_dict(event)
    kind = d.pop("type")
    if kind == "passages":
        rows = [
            f"{p['doc_id']} rev {p['revision']} [{p['status']}] {p['section']} "
            f"bm25={_f(p['bm25_score'])} vec={_f(p['vector_score'])} fused={_f(p['fused_score'])} rerank={_f(p['rerank_score'])}"
            for p in d["passages"]
        ]
        return f"[passages] {d['agent']} query={d['query']!r}\n    " + ("\n    ".join(rows) if rows else "(none)")
    if kind == "answer":
        cites = "; ".join(f"{c['doc_id']} rev {c['revision']} {c['section']}" for c in d["citations"])
        return f"[answer] agent={d['agent']} metrics={json.dumps(d['metrics'])}\n{d['text']}\n    citations: {cites or '(none)'}"
    return f"[{kind}] " + json.dumps(d, default=str)


def _f(value) -> str:
    return "-" if value is None else f"{value:.3f}"


if __name__ == "__main__":
    sys.exit(main())
