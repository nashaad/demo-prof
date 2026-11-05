import type { Passage } from "../../types";

interface ScoreMetric {
    key: "bm25_score" | "vector_score" | "fused_score" | "rerank_score";
    label: string;
    hint: string;
}

const METRICS: ScoreMetric[] = [
    { key: "bm25_score", label: "Keyword match", hint: "exact words from the question found in the passage" },
    { key: "vector_score", label: "Meaning match", hint: "the passage means something close to the question" },
    { key: "fused_score", label: "Combined", hint: "keyword and meaning results merged" },
    { key: "rerank_score", label: "Final rerank", hint: "a second pass re-reads the top results and reorders them" },
];

function range(passages: Passage[], key: ScoreMetric["key"]): { lo: number; hi: number } {
    const values = passages.map((p) => p[key]).filter((v): v is number => typeof v === "number");
    if (!values.length) return { lo: 0, hi: 1 };
    return { lo: Math.min(0, ...values), hi: Math.max(...values) };
}

function fmt(value: number): string {
    const abs = Math.abs(value);
    if (abs !== 0 && abs < 0.001) return value.toExponential(1);
    return value.toFixed(abs < 10 ? 3 : 1);
}

interface ScoreBarsProps {
    passage: Passage;
    all: Passage[];
}

export function ScoreBars({ passage, all }: ScoreBarsProps) {
    return (
        <div className="bars">
            {METRICS.map((metric) => {
                const value = passage[metric.key];
                const { lo, hi } = range(all, metric.key);
                const pct = typeof value === "number" ? Math.max(3, ((value - lo) / (hi - lo || 1)) * 100) : 0;
                const title =
                    typeof value === "number" ? `${metric.label}: ${value} (${metric.hint})` : `${metric.label}: not used for this search`;
                return (
                    <div className="bar-row" key={metric.key} title={title}>
                        <span className="bar-label">{metric.label}</span>
                        <span className={`bar-track${typeof value === "number" ? "" : " none"}`}>
                            <span className={`bar-fill ${metric.key}`} style={{ width: `${pct}%` }} />
                        </span>
                        <span className="bar-value num mono">{typeof value === "number" ? fmt(value) : "n/a"}</span>
                    </div>
                );
            })}
        </div>
    );
}
