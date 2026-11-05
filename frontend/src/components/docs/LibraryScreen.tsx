import { useFetch } from "../../hooks/useFetch";
import type { DocRef, DocumentMeta } from "../../types";
import { CriticalityBadge, RevisionText, StatusBadge } from "../common/DocMeta";
import { DomainBadge, domainLabel } from "../common/DomainBadge";
import { Icon } from "../common/Icon";

const ORDER = ["safety", "maintenance", "quality"];

function group(docs: DocumentMeta[]): [string, DocumentMeta[]][] {
    const map = new Map<string, DocumentMeta[]>();
    for (const doc of docs) map.set(doc.domain, [...(map.get(doc.domain) ?? []), doc]);
    const rank = (d: string) => (ORDER.includes(d) ? ORDER.indexOf(d) : ORDER.length);
    return [...map.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
}

export function LibraryScreen({ onOpen }: { onOpen: (ref: DocRef) => void }) {
    const { data, error, loading, reload } = useFetch<DocumentMeta[]>("/api/documents");

    return (
        <div className="page">
            <div className="page-head">
                <h1>Document library</h1>
                <p className="muted">Everything the specialists can search, grouped by area. Open a document to read every section.</p>
            </div>
            {loading && <div className="sk" style={{ width: 240, height: 18 }} />}
            {error && (
                <div className="alert destructive" role="alert">
                    <Icon name="alert" size={16} />
                    <div>
                        <div className="t">Could not load documents</div>
                        <div className="d">{error}</div>
                        <button type="button" className="btn outline sm" onClick={reload} style={{ marginTop: 8 }}>
                            <Icon name="refresh" size={14} /> Try again
                        </button>
                    </div>
                </div>
            )}
            {data && data.length === 0 && (
                <div className="empty">
                    <div className="media">
                        <Icon name="book" size={20} />
                    </div>
                    <div className="t">No documents yet</div>
                    <div className="d">The document set has not been loaded.</div>
                </div>
            )}
            {data &&
                group(data).map(([domain, docs]) => (
                    <section key={domain} className="lib-group">
                        <h2 className="lib-group-head">
                            <DomainBadge domain={domain} />
                            <span>{domainLabel(domain)}</span>
                            <span className="muted num">{docs.length}</span>
                        </h2>
                        <div className="lib-grid">
                            {docs.map((doc) => (
                                <button
                                    key={`${doc.doc_id}-${doc.revision}`}
                                    type="button"
                                    className="doc-card"
                                    onClick={() => onOpen({ doc_id: doc.doc_id, revision: doc.revision })}
                                >
                                    <span className="doc-card-title">{doc.title}</span>
                                    <span className="doc-card-meta">
                                        <span className="mono">{doc.doc_id}</span>
                                        <RevisionText doc={doc} />
                                    </span>
                                    <span className="doc-card-tags">
                                        <CriticalityBadge value={doc.criticality} />
                                        <StatusBadge status={doc.status} />
                                        {doc.supersedes && <span className="badge outline">Replaces {doc.supersedes}</span>}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>
                ))}
        </div>
    );
}
