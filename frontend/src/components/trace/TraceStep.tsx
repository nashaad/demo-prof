import type { ReactNode } from "react";
import { elapsed } from "../../format";

export type TraceTone = "ok" | "bad" | "info";

interface TraceStepProps {
    index: number;
    title: ReactNode;
    tone?: TraceTone;
    meta?: string | null;
    at?: number;
    children?: ReactNode;
}

export function TraceStep({ index, title, tone = "info", meta, at, children }: TraceStepProps) {
    return (
        <li className={`tstep ${tone}`}>
            <span className="tstep-num num" aria-hidden="true">
                {index}
            </span>
            <section className="tstep-card">
                <header className="tstep-head">
                    <h3>{title}</h3>
                    <span className="spacer" />
                    {meta && <span className="tstep-meta muted num">{meta}</span>}
                    {at !== undefined && <span className="tstep-meta muted num">{elapsed(at)}</span>}
                </header>
                {children && <div className="tstep-body">{children}</div>}
            </section>
        </li>
    );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="tfield">
            <span className="lbl">{label}</span>
            <div className="tfield-value">{children}</div>
        </div>
    );
}

export function Exact({ text }: { text: string }) {
    return <pre className="exact">{text}</pre>;
}

export function Raw({ summary, children }: { summary: string; children: ReactNode }) {
    return (
        <details className="raw">
            <summary>{summary}</summary>
            <div className="raw-body">{children}</div>
        </details>
    );
}
