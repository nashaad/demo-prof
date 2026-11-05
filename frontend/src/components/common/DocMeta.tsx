import { shortDate } from "../../format";
import type { DocumentMeta } from "../../types";

export function CriticalityBadge({ value }: { value: string }) {
    const high = ["critical", "high"].includes(value.toLowerCase());
    return <span className={`badge ${high ? "bad" : "outline"}`}>{value} criticality</span>;
}

export function StatusBadge({ status }: { status: string }) {
    const superseded = status.toLowerCase() === "superseded";
    return <span className={`badge ${superseded ? "warn" : "outline"}`}>{superseded ? "Superseded" : status}</span>;
}

export function RevisionText({ doc }: { doc: Pick<DocumentMeta, "revision" | "effective_date"> }) {
    return (
        <span>
            Revision {doc.revision}
            {doc.effective_date ? `, effective ${shortDate(doc.effective_date)}` : ""}
        </span>
    );
}
