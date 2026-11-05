import { shortDate } from "../../format";
import type { Citation, DocRef } from "../../types";
import { Icon } from "../common/Icon";

interface SourceCardProps {
    citation: Citation;
    onOpen: (ref: DocRef) => void;
}

export function SourceCard({ citation, onOpen }: SourceCardProps) {
    const superseded = citation.status.toLowerCase() === "superseded";
    return (
        <button
            type="button"
            className="source"
            onClick={() => onOpen({ doc_id: citation.doc_id, revision: citation.revision, section: citation.section })}
        >
            <span className="source-head">
                <Icon name="file" size={14} />
                <span className="source-title">{citation.title}</span>
                {superseded && <span className="badge warn">Superseded</span>}
            </span>
            <span className="source-meta">
                <span className="mono">{citation.doc_id}</span>
                <span>Section {citation.section}</span>
                <span>
                    Revision {citation.revision}
                    {citation.effective_date ? `, ${shortDate(citation.effective_date)}` : ""}
                </span>
            </span>
            {citation.quote && <blockquote className="source-quote">{citation.quote}</blockquote>}
            <span className="source-open">Open document</span>
        </button>
    );
}

interface SourceListProps {
    citations: Citation[];
    onOpen: (ref: DocRef) => void;
}

export function SourceList({ citations, onOpen }: SourceListProps) {
    if (!citations.length) return null;
    return (
        <section className="sources" aria-label="Sources">
            <h4 className="lbl">
                Sources ({citations.length})
            </h4>
            <div className="source-grid">
                {citations.map((c, i) => (
                    <SourceCard key={`${c.doc_id}-${c.section}-${i}`} citation={c} onOpen={onOpen} />
                ))}
            </div>
        </section>
    );
}
