# Retrieval A/B: with and without reranking

Run on 2026-11-05 over the 12 cases in `data/seed_facts.json`, search only
(no agent answers). Results JSON: `backend/evals/results-no-rerank.json` and
`backend/evals/results-rerank.json`.

```
                     no-rerank   rerank
hit@1                    0.857    0.857
off-corpus passages          5        0
avg search ms              291     2248
```

- Reranking drops all 5 irrelevant passages for the paint booth question,
  which lets the specialist answer "not in the documents".
- Reranking moves the emergency passage from rank 2 to rank 1.
- Reranking adds about 2 s per search. Part of that is waiting on the Cohere
  free-tier limit (about 10 rerank calls a minute).
- Neither setup finds the lockout section (SAF-002 section 4) in the top 5
  for "How do I lock the press off before I reach in?".

## Run

From `backend/`:

```
uv run python -m prof.cli eval-ab --retrieval-only
```

Without `--retrieval-only` it also runs each case through the agents, which
exceeds the free-tier rerank limit. Do not run it alongside `ask-all`.
