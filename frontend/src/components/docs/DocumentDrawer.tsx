import { useEffect, useRef } from "react";
import { documentPath } from "../../api";
import { useFetch } from "../../hooks/useFetch";
import type { DocRef, DocumentDetail, DocumentSection } from "../../types";
import { CriticalityBadge, RevisionText, StatusBadge } from "../common/DocMeta";
import { DomainBadge } from "../common/DomainBadge";
import { Icon } from "../common/Icon";

interface DocumentDrawerProps {
    docRef: DocRef;
    onClose: () => void;
}

const normalize = (value: string) => value.trim().replace(/\.$/, "").toLowerCase();

function isCited(section: DocumentSection, ref: DocRef): boolean {
    if (!ref.section) return false;
    return normalize(section.section) === normalize(ref.section);
}

export function DocumentDrawer({ docRef, onClose }: DocumentDrawerProps) {
    const { data, error, loading, reload } = useFetch<DocumentDetail>(documentPath(docRef.doc_id, docRef.revision));
    const citedRef = useRef<HTMLElement | null>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        closeRef.current?.focus();
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    useEffect(() => {
        if (data) citedRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, [data]);

    return (
        <div className="drawer-root">
            <div className="scrim" onClick={onClose} />
            <aside className="drawer" role="dialog" aria-modal="true" aria-label="Document">
                <header className="drawer-head">
                    <div className="drawer-titles">
                        {data ? (
                            <>
                                <h2>{data.title}</h2>
                                <div className="drawer-sub">
                                    <span className="mono">{data.doc_id}</span>
                                    <RevisionText doc={data} />
                                </div>
                                <div className="drawer-tags">
                                    <DomainBadge domain={data.domain} />
                                    <CriticalityBadge value={data.criticality} />
                                    <StatusBadge status={data.status} />
                                    {data.supersedes && <span className="badge outline">Replaces {data.supersedes}</span>}
                                </div>
                            </>
                        ) : (
                            <>
                                <h2>{docRef.doc_id}</h2>
                                <div className="drawer-sub">
                                    {docRef.revision && <span>Revision {docRef.revision}</span>}
                                </div>
                            </>
                        )}
                    </div>
                    <button ref={closeRef} type="button" className="btn ghost icon sm" onClick={onClose} aria-label="Close document">
                        <Icon name="x" size={18} />
                    </button>
                </header>
                <div className="drawer-body">
                    {loading && (
                        <div className="drawer-loading">
                            <div className="sk" style={{ width: "60%" }} />
                            <div className="sk" style={{ width: "92%" }} />
                            <div className="sk" style={{ width: "80%" }} />
                        </div>
                    )}
                    {error && (
                        <div className="alert destructive" role="alert">
                            <Icon name="alert" size={16} />
                            <div>
                                <div className="t">Could not load the document</div>
                                <div className="d">{error}</div>
                                <button type="button" className="btn outline sm" onClick={reload} style={{ marginTop: 8 }}>
                                    <Icon name="refresh" size={14} /> Try again
                                </button>
                            </div>
                        </div>
                    )}
                    {data?.sections.map((section, i) => {
                        const cited = isCited(section, docRef);
                        return (
                            <section
                                key={`${section.section}-${i}`}
                                ref={cited ? citedRef : undefined}
                                className={`doc-section${cited ? " cited" : ""}`}
                            >
                                <div className="doc-section-head">
                                    <h3>Section {section.section}</h3>
                                    {cited && (
                                        <span className="badge warn">
                                            <Icon name="bookmark" size={12} /> Cited in the answer
                                        </span>
                                    )}
                                    <span className="muted num lines">
                                        lines {section.line_start} to {section.line_end}
                                    </span>
                                </div>
                                <p>{section.text}</p>
                            </section>
                        );
                    })}
                </div>
            </aside>
        </div>
    );
}
