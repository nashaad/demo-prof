import { shortDate } from "../../format";
import type { DocRef, Passage } from "../../types";
import { ScoreBars } from "./ScoreBars";

interface PassageListProps {
    passages: Passage[];
    onOpen: (ref: DocRef) => void;
}

export function PassageList({ passages, onOpen }: PassageListProps) {
    return (
        <ol className="passages">
            {passages.map((p, i) => (
                <li key={`${p.chunk_id}-${i}`} className="passage">
                    <div className="passage-head">
                        <span className="rank num">{i + 1}</span>
                        <button
                            type="button"
                            className="passage-title"
                            onClick={() => onOpen({ doc_id: p.doc_id, revision: p.revision, section: p.section })}
                        >
                            {p.title}
                        </button>
                        {p.status.toLowerCase() === "superseded" && <span className="badge warn">Superseded</span>}
                    </div>
                    <div className="passage-meta muted">
                        <span className="mono">{p.doc_id}</span>
                        <span>Section {p.section}</span>
                        <span>
                            Revision {p.revision}
                            {p.effective_date ? `, ${shortDate(p.effective_date)}` : ""}
                        </span>
                    </div>
                    <ScoreBars passage={p} all={passages} />
                    <details className="passage-text">
                        <summary>Show passage text</summary>
                        <p>{p.text}</p>
                    </details>
                </li>
            ))}
        </ol>
    );
}
