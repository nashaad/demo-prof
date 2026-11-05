import type { ReactNode } from "react";
import { runPath } from "../../api";
import { guardrailLabel } from "../../guardrails";
import { useFetch } from "../../hooks/useFetch";
import { seconds } from "../../format";
import type { AppEvent, DocRef, RunTrace, Turn } from "../../types";
import { Icon } from "../common/Icon";
import { Verdict } from "../run/RunStep";
import { RouterStep, SpecialistStep, delegatedTask, modelMeta } from "./AgentSteps";
import { SearchStep } from "./SearchStep";
import { Exact, Field, Raw, TraceStep } from "./TraceStep";

type EventOf<T extends AppEvent["type"]> = Extract<AppEvent, { type: T }>;

interface Stamped<T extends AppEvent["type"]> {
    event: EventOf<T>;
    at: number;
}

function pick<T extends AppEvent["type"]>(turn: Turn, type: T): Stamped<T>[] {
    return turn.events.filter((e): e is Stamped<T> => e.event.type === type);
}

interface TracePageProps {
    turn: Turn | undefined;
    onBack: () => void;
    onOpen: (ref: DocRef) => void;
}

export function TracePage({ turn, onBack, onOpen }: TracePageProps) {
    const started = turn ? pick(turn, "run_started")[0]?.event : undefined;
    const finished = turn !== undefined && turn.status !== "running";
    const { data: trace, error } = useFetch<RunTrace>(started && finished ? runPath(started.run_id) : null);

    return (
        <div className="page trace-page">
            <div>
                <button type="button" className="btn ghost sm" onClick={onBack}>
                    ← Back to chat
                </button>
            </div>
            {turn ? <TraceBody turn={turn} trace={trace} pending={pendingNote(finished, error)} onOpen={onOpen} /> : <p className="muted">This run is no longer in the conversation.</p>}
        </div>
    );
}

function pendingNote(finished: boolean, error: string | null): string {
    if (!finished) return "Model records load when the run finishes.";
    if (error) return `No stored model records for this run (${error}).`;
    return "Loading model records...";
}

interface TraceBodyProps {
    turn: Turn;
    trace: RunTrace | null;
    pending: string;
    onOpen: (ref: DocRef) => void;
}

function TraceBody({ turn, trace, pending, onOpen }: TraceBodyProps) {
    const started = pick(turn, "run_started")[0];
    const guardrails = pick(turn, "guardrail");
    const blocked = guardrails.find((g) => g.event.verdict === "BLOCKED");
    const routed = pick(turn, "routed")[0];
    const tools = pick(turn, "tool_called");
    const searches = pick(turn, "passages");
    const answer = pick(turn, "answer")[0];
    const memories = pick(turn, "memory").filter((m) => m.event.memories.length);
    const errors = pick(turn, "error");

    const members = trace?.members ?? [];
    const searchResults = members.flatMap((m) => m.tool_calls).filter((t) => t.tool.startsWith("search_"));
    const task = trace ? delegatedTask(trace.router) : null;
    const totalTokens = trace ? [trace.router.metrics, ...members.map((m) => m.metrics), trace.memory_metrics].reduce((sum, m) => sum + (m?.input_tokens ?? 0) + (m?.output_tokens ?? 0), 0) : null;

    const steps: ReactNode[] = [];
    const next = () => steps.length + 1;

    steps.push(
        <TraceStep key="q" index={next()} title="Question received" at={started?.at}>
            <Exact text={turn.question} />
            {started && (
                <p className="muted mono tids">
                    run {started.event.run_id}, session {started.event.session_id}, user {started.event.user_id}
                </p>
            )}
        </TraceStep>,
    );

    steps.push(
        <TraceStep key="g" index={next()} title="Guardrail checks (word rules, no model)" tone={blocked ? "bad" : "ok"} at={guardrails[guardrails.length - 1]?.at}>
            {guardrails.map(({ event }, i) => {
                const rule = trace?.guardrails.find((r) => r.name === event.name);
                return (
                    <div key={i} className="tguard">
                        <div className="tguard-row">
                            <span>{guardrailLabel(event.name).checked}</span>
                            <Verdict verdict={event.verdict} />
                            <span className="muted">{event.detail}</span>
                        </div>
                        {rule && (
                            <Raw summary="What it looks for">
                                <Exact text={rule.looks_for} />
                            </Raw>
                        )}
                    </div>
                );
            })}
            {blocked && <p>Stopped here. No model was called.</p>}
        </TraceStep>,
    );

    if (!blocked) {
        steps.push(<RouterStep key="r" index={next()} routed={routed} router={trace?.router ?? null} pending={pending} />);
        members.forEach((call) => {
            steps.push(<SpecialistStep key={`m-${call.run_id}`} index={next()} call={call} task={task} at={tools[0]?.at} />);
        });
        searches.forEach(({ event, at }, i) => {
            steps.push(
                <SearchStep
                    key={`s-${i}`}
                    index={next()}
                    event={event}
                    at={at}
                    resultText={searchResults[i]?.result ?? null}
                    citations={answer?.event.citations ?? []}
                    onOpen={onOpen}
                />,
            );
        });
    }

    if (answer) {
        const m = answer.event.metrics;
        const meta = [seconds(m?.duration) && `${seconds(m?.duration)} total`, totalTokens !== null && `${totalTokens} tokens across all model calls`].filter(Boolean).join(", ");
        steps.push(
            <TraceStep key="a" index={next()} tone="ok" title={`Answer from ${answer.event.agent || "the router"}`} meta={meta || null} at={answer.at}>
                <Field label="Exact reply text">
                    <Exact text={answer.event.text} />
                </Field>
                <Field label="Citations matched to retrieved passages">
                    {answer.event.citations.length ? (
                        <span className="mono">{answer.event.citations.map((c) => `${c.doc_id} rev ${c.revision}, ${c.section}`).join("; ")}</span>
                    ) : (
                        <span className="muted">None</span>
                    )}
                </Field>
            </TraceStep>,
        );
    }

    if (trace?.memory_metrics || memories.length) {
        steps.push(
            <TraceStep key="mem" index={next()} title="Memory update (separate model call)" meta={modelMeta(null, trace?.memory_metrics)} at={memories[0]?.at}>
                {memories.length ? (
                    <ul className="memories">
                        {memories.flatMap(({ event }) => event.memories).map((m, i) => (
                            <li key={i}>{m}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="muted">Nothing new was stored.</p>
                )}
            </TraceStep>,
        );
    }

    errors.forEach(({ event, at }, i) => {
        steps.push(
            <TraceStep key={`e-${i}`} index={next()} tone="bad" title="Error" at={at}>
                <Exact text={event.message} />
            </TraceStep>,
        );
    });

    return (
        <>
            <header className="page-head">
                <h1>Run trace</h1>
                <p className="muted">Every step of this answer, with the exact text each model and search received.</p>
            </header>
            <ol className="trace">{steps}</ol>
            {turn.status === "running" && (
                <p className="muted">
                    <Icon name="loader" size={14} className="spin" /> Still running...
                </p>
            )}
        </>
    );
}
