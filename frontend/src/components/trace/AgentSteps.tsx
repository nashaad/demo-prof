import type { AgentCall, ModelMetrics, RoutedEvent, TraceMessage, TraceToolCall } from "../../types";
import { seconds } from "../../format";
import { DomainBadge, domainKey } from "../common/DomainBadge";
import { Exact, Field, Raw, TraceStep } from "./TraceStep";

const DELEGATE_TOOL = "delegate_task_to_member";

export function modelMeta(model: string | null, m: ModelMetrics | null | undefined): string | null {
    if (!m) return model;
    const parts: string[] = [];
    if (model) parts.push(model);
    if (m.input_tokens !== undefined && m.output_tokens !== undefined) parts.push(`${m.input_tokens} in / ${m.output_tokens} out tokens`);
    if (m.reasoning_tokens) parts.push(`${m.reasoning_tokens} reasoning`);
    return parts.join(", ") || null;
}

export function callText(name: string, args: Record<string, unknown>): string {
    return `${name}(${JSON.stringify(args, null, 2)})`;
}

export function delegatedTask(router: AgentCall): string | null {
    const call = router.tool_calls.find((t) => t.tool === DELEGATE_TOOL);
    return typeof call?.args.task === "string" ? call.args.task : null;
}

function MessageList({ messages }: { messages: TraceMessage[] }) {
    return (
        <ol className="tmsgs">
            {messages.map((m, i) => (
                <li key={i} className="tmsg">
                    <div className="tmsg-head">
                        <span className="badge outline mono">{m.role}</span>
                        {m.from_history && <span className="badge secondary">from earlier turn</span>}
                        {m.content && <span className="muted num">{m.content.length} chars</span>}
                    </div>
                    {m.content && <Exact text={m.content} />}
                    {m.tool_calls.map((c, j) => (
                        <Exact key={j} text={callText(c.name, c.args)} />
                    ))}
                </li>
            ))}
        </ol>
    );
}

function Messages({ call }: { call: AgentCall }) {
    return (
        <Raw summary={`Everything the ${call.agent} model received and sent (${call.messages.length} messages)`}>
            <MessageList messages={call.messages} />
        </Raw>
    );
}

interface RouterStepProps {
    index: number;
    routed: { event: RoutedEvent; at: number } | undefined;
    router: AgentCall | null;
    pending: string | null;
}

export function RouterStep({ index, routed, router, pending }: RouterStepProps) {
    const domain = routed?.event.domain;
    const delegated = domain !== undefined && domainKey(domain) !== "none";
    const task = router ? delegatedTask(router) : null;
    return (
        <TraceStep index={index} title="Router picks a specialist" meta={modelMeta(router?.model ?? null, router?.metrics)} at={routed?.at}>
            <Field label="Decision">
                {delegated ? (
                    <span>
                        Sent to <DomainBadge domain={domain} />
                    </span>
                ) : (
                    <span>Did not delegate. The router replied itself.</span>
                )}
            </Field>
            {routed?.event.reason && <Field label="Why (router's own words)">{routed.event.reason}</Field>}
            {task && (
                <Field label="Exact task sent to the specialist">
                    <Exact text={task} />
                </Field>
            )}
            {router && !delegated && router.reply && (
                <Field label="Router reply">
                    <Exact text={router.reply} />
                </Field>
            )}
            {router ? <Messages call={router} /> : pending && <p className="muted">{pending}</p>}
        </TraceStep>
    );
}

function ToolCalls({ calls }: { calls: TraceToolCall[] }) {
    return (
        <div className="tcalls">
            {calls.map((c, i) => (
                <div key={i} className="tcall">
                    <Exact text={callText(c.tool, c.args)} />
                    {c.duration !== null && <span className="muted num">ran in {seconds(c.duration)}</span>}
                </div>
            ))}
        </div>
    );
}

interface SpecialistStepProps {
    index: number;
    call: AgentCall;
    task: string | null;
    at: number | undefined;
}

export function SpecialistStep({ index, call, task, at }: SpecialistStepProps) {
    const sameAsTask = task !== null && call.input.trim() === task.trim();
    return (
        <TraceStep
            index={index}
            title={
                <>
                    {call.agent} specialist <DomainBadge domain={call.agent_id} />
                </>
            }
            meta={modelMeta(call.model, call.metrics)}
            at={at}
        >
            <Field label="Received">{sameAsTask ? <span>The task above, word for word.</span> : <Exact text={call.input} />}</Field>
            <Field label={`Tool calls (${call.tool_calls.length})`}>
                {call.tool_calls.length ? <ToolCalls calls={call.tool_calls} /> : <span className="muted">None. Answered without searching.</span>}
            </Field>
            <Field label="Reply">
                <Exact text={call.reply} />
            </Field>
            <Messages call={call} />
        </TraceStep>
    );
}
