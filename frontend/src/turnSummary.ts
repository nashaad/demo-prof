import type { AnswerEvent, ErrorEvent, GuardrailEvent, RoutedEvent, Turn } from "./types";

export interface TurnSummary {
    answer?: AnswerEvent;
    routed?: RoutedEvent;
    blocked?: GuardrailEvent;
    error?: ErrorEvent;
}

export function summarize(turn: Turn): TurnSummary {
    const out: TurnSummary = {};
    for (const { event } of turn.events) {
        if (event.type === "answer") out.answer = event;
        else if (event.type === "routed") out.routed = event;
        else if (event.type === "error") out.error = event;
        else if (event.type === "guardrail" && event.verdict === "BLOCKED") out.blocked = event;
    }
    return out;
}

export function workingLabel(turn: Turn): string {
    const last = turn.events[turn.events.length - 1]?.event;
    switch (last?.type) {
        case undefined:
        case "run_started":
            return "Running safety checks";
        case "guardrail":
            return "Deciding which specialist should answer";
        case "routed":
            return `${last.agent || "The"} specialist is choosing what to look up`;
        case "tool_called":
            return "Searching the plant documents";
        case "passages":
            return "Reading the passages and writing an answer";
        case "memory":
            return "Finishing up";
        default:
            return "Working";
    }
}
