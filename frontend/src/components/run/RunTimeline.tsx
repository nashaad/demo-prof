import type { ReactNode } from "react";
import { guardrailLabel } from "../../guardrails";
import type { AnswerEvent, DocRef, StampedEvent, Turn } from "../../types";
import { seconds } from "../../format";
import { DomainBadge, domainKey, domainLabel } from "../common/DomainBadge";
import { PassageList } from "./PassageList";
import { RunStep, Verdict } from "./RunStep";

interface RunTimelineProps {
    turn: Turn;
    onOpen: (ref: DocRef) => void;
}

function metricLine(answer: AnswerEvent): string[] {
    const m = answer.metrics ?? {};
    const out: string[] = [];
    const total = seconds(m.duration);
    if (total) out.push(`${total} in total`);
    const first = seconds(m.time_to_first_token);
    if (first) out.push(`${first} to the first word`);
    if (m.total_tokens !== undefined) {
        const split = m.input_tokens !== undefined && m.output_tokens !== undefined ? ` (${m.input_tokens} read, ${m.output_tokens} written)` : "";
        out.push(`${m.total_tokens} tokens${split}`);
    }
    return out;
}

function toolStep(event: Extract<StampedEvent["event"], { type: "tool_called" }>, domain: string): ReactNode {
    const who = `${event.agent || domainLabel(domain)} specialist`;
    const query = typeof event.args.query === "string" ? event.args.query : null;
    if (query !== null) {
        return (
            <>
                {who} chose to search {domainKey(domain) === "none" ? "the" : domainLabel(domain).toLowerCase()} documents for:{" "}
                <q className="query">{query}</q>
            </>
        );
    }
    const docId = typeof event.args.doc_id === "string" ? event.args.doc_id : null;
    if (docId) return `${who} chose to open ${docId}`;
    return `${who} chose to use the ${event.tool.replace(/_/g, " ")} tool`;
}

function renderStep(entry: StampedEvent, index: number, ctx: { domain: string }, onOpen: (ref: DocRef) => void): ReactNode {
    const { event, at } = entry;
    switch (event.type) {
        case "run_started":
            return <RunStep key={index} tone="info" icon="message" title="Question received" at={at} />;
        case "guardrail": {
            const blocked = event.verdict === "BLOCKED";
            return (
                <RunStep
                    key={index}
                    tone={blocked ? "bad" : "ok"}
                    icon={blocked ? "octagon" : "shield"}
                    title={
                        <>
                            {guardrailLabel(event.name).checked}: <Verdict verdict={event.verdict} />
                        </>
                    }
                    at={at}
                >
                    {blocked && (
                        <>
                            <p>{event.detail ? `Matched ${event.detail.replace(/^matched\s*/i, "")}.` : null}</p>
                            <p>Stopped here. No specialist was asked.</p>
                        </>
                    )}
                </RunStep>
            );
        }
        case "routed": {
            const none = domainKey(event.domain) === "none";
            return (
                <RunStep
                    key={index}
                    tone="info"
                    icon="compass"
                    at={at}
                    title={
                        none ? (
                            "No specialist needed"
                        ) : (
                            <>
                                Sent to the {event.agent || domainLabel(event.domain)} specialist <DomainBadge domain={event.domain} />
                            </>
                        )
                    }
                >
                    {event.reason && <p className="muted">Why: {event.reason}</p>}
                </RunStep>
            );
        }
        case "tool_called":
            return <RunStep key={index} tone="info" icon="search" title={toolStep(event, ctx.domain)} at={at} />;
        case "passages":
            return (
                <RunStep
                    key={index}
                    tone="ok"
                    icon="book"
                    at={at}
                    title={event.passages.length === 0 ? "Found no matching passages" : `Found ${event.passages.length} passage${event.passages.length === 1 ? "" : "s"}`}
                >
                    {event.passages.length > 0 && (
                        <>
                            <p className="muted">Ranked best first. Bars compare passages within this search.</p>
                            <PassageList passages={event.passages} onOpen={onOpen} />
                        </>
                    )}
                </RunStep>
            );
        case "memory":
            if (!event.memories.length) return null;
            return (
                <RunStep key={index} tone="info" icon="bookmark" title="Remembered about you" at={at}>
                    <ul className="memories">
                        {event.memories.map((m, i) => (
                            <li key={i}>{m}</li>
                        ))}
                    </ul>
                </RunStep>
            );
        case "answer": {
            const lines = metricLine(event);
            return (
                <RunStep
                    key={index}
                    tone="ok"
                    icon="check"
                    at={at}
                    title={event.agent === "guardrail" ? "Replied with the standard safety message" : "Answered"}
                >
                    {event.citations.length > 0 && (
                        <p className="muted">
                            Cited {event.citations.length} source{event.citations.length === 1 ? "" : "s"}
                        </p>
                    )}
                    {lines.length > 0 && <p className="muted num">{lines.join(", ")}</p>}
                </RunStep>
            );
        }
        case "error":
            return (
                <RunStep key={index} tone="bad" icon="alert" title="Something went wrong" at={at}>
                    <p>{event.message}</p>
                </RunStep>
            );
    }
}

export function RunTimeline({ turn, onOpen }: RunTimelineProps) {
    let domain = "none";
    const steps: ReactNode[] = [];
    turn.events.forEach((entry, i) => {
        if (entry.event.type === "routed") domain = entry.event.domain;
        steps.push(renderStep(entry, i, { domain }, onOpen));
    });
    return (
        <ol className="timeline">
            {steps}
            {turn.status === "running" && <RunStep key="working" tone="pending" icon="loader" title={<span className="shimmer">Working...</span>} />}
        </ol>
    );
}
