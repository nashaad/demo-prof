import type { Citation, DocRef, Passage, PassagesEvent, SearchStats } from "../../types";
import { domainLabel } from "../common/DomainBadge";
import { Exact, Field, Raw, TraceStep } from "./TraceStep";

function scope(domain: string | null | undefined): string {
    return domain ? `${domainLabel(domain).toLowerCase()} documents` : "all departments";
}

function score(value: number | null): string {
    return value === null ? "n/a" : value.toFixed(3);
}

interface StageProps {
    n: number | null;
    label: string;
    tone?: "ok" | "warn";
}

function Stage({ n, label, tone }: StageProps) {
    return (
        <div className={`stage${tone ? ` ${tone}` : ""}`}>
            {n !== null && <span className="stage-n num">{n}</span>}
            <span className="stage-label">{label}</span>
        </div>
    );
}

function Arrow() {
    return (
        <span className="stage-arrow" aria-hidden="true">
            →
        </span>
    );
}

function Funnel({ stats }: { stats: SearchStats }) {
    const reranking = stats.rerank_model !== null;
    return (
        <div className="funnel">
            <div className="stage-pair">
                <Stage n={stats.keyword_hits} label={`keyword hits (max ${stats.candidate_limit})`} />
                <Stage n={stats.meaning_hits} label={`meaning hits (max ${stats.candidate_limit})`} />
            </div>
            <Arrow />
            <Stage n={stats.merged} label="unique after merging" />
            <Arrow />
            {reranking ? <Stage n={stats.reranked} label={`reranked by ${stats.rerank_model}`} /> : <Stage n={null} label="rerank off" />}
            {stats.min_score !== null && (
                <>
                    <Arrow />
                    <Stage n={stats.below_min_score} label={`dropped, rerank score under ${stats.min_score}`} tone={stats.below_min_score ? "warn" : undefined} />
                </>
            )}
            <Arrow />
            <Stage n={stats.returned} label="returned" tone="ok" />
            {stats.rerank_failed && <span className="badge warn">Rerank failed, kept the merged order</span>}
        </div>
    );
}

function isCited(p: Passage, citations: Citation[]): boolean {
    return citations.some((c) => c.doc_id === p.doc_id && c.section === p.section && c.revision === p.revision);
}

interface PassageTableProps {
    passages: Passage[];
    citations: Citation[];
    onOpen: (ref: DocRef) => void;
}

function PassageTable({ passages, citations, onOpen }: PassageTableProps) {
    if (!passages.length) return <p className="muted">Nothing passed the filters.</p>;
    return (
        <div className="ptable-wrap">
            <table className="ptable">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Passage</th>
                        <th className="r">Keyword</th>
                        <th className="r">Meaning</th>
                        <th className="r">Combined</th>
                        <th className="r">Rerank</th>
                    </tr>
                </thead>
                <tbody>
                    {passages.map((p, i) => (
                        <tr key={`${p.chunk_id}-${i}`}>
                            <td className="num muted">{i + 1}</td>
                            <td>
                                <button type="button" className="plink" onClick={() => onOpen({ doc_id: p.doc_id, revision: p.revision, section: p.section })}>
                                    <span className="mono">{p.doc_id}</span> rev {p.revision}, {p.section}
                                </button>
                                {isCited(p, citations) && <span className="badge good">cited</span>}
                                {p.status.toLowerCase() === "superseded" && <span className="badge warn">superseded</span>}
                            </td>
                            <td className="r num mono">{score(p.bm25_score)}</td>
                            <td className="r num mono">{score(p.vector_score)}</td>
                            <td className="r num mono">{score(p.fused_score)}</td>
                            <td className="r num mono">{score(p.rerank_score)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

interface SearchStepProps {
    index: number;
    event: PassagesEvent;
    at: number;
    resultText: string | null;
    citations: Citation[];
    onOpen: (ref: DocRef) => void;
}

export function SearchStep({ index, event, at, resultText, citations, onOpen }: SearchStepProps) {
    const [main, wide] = event.searches ?? [];
    return (
        <TraceStep index={index} tone="ok" title={`Search: ${scope(main?.domain)}`} at={at}>
            <Field label="Meaning search input (embedded as is)">
                <Exact text={event.query} />
            </Field>
            {main && (
                <Field label="Keyword search query (SQLite full text)">
                    <Exact text={main.keyword_query || "(no searchable words)"} />
                </Field>
            )}
            {main && (
                <Field label="How candidates were narrowed">
                    <Funnel stats={main} />
                </Field>
            )}
            {wide && (
                <Field label="Also searched all departments (up to 3 added from other departments)">
                    <Funnel stats={wide} />
                </Field>
            )}
            <Field label={`Passages returned to the model (${event.passages.length})`}>
                <PassageTable passages={event.passages} citations={citations} onOpen={onOpen} />
            </Field>
            {resultText !== null && (
                <Raw summary="Exact text the model read">
                    <Exact text={resultText} />
                </Raw>
            )}
        </TraceStep>
    );
}
