export interface Passage {
    chunk_id: number;
    doc_id: string;
    title: string;
    domain: string;
    section: string;
    revision: string;
    effective_date: string;
    status: string;
    criticality: string;
    line_start: number;
    line_end: number;
    text: string;
    bm25_score: number | null;
    vector_score: number | null;
    fused_score: number | null;
    rerank_score: number | null;
}

export interface Citation {
    doc_id: string;
    title: string;
    section: string;
    revision: string;
    effective_date: string;
    status: string;
    quote: string;
}

export interface RunMetrics {
    duration?: number;
    time_to_first_token?: number;
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    cost?: number;
}

export interface RunStartedEvent {
    type: "run_started";
    run_id: string;
    user_id: string;
    session_id: string;
    question: string;
}

export interface RoutedEvent {
    type: "routed";
    domain: string;
    agent: string;
    reason: string | null;
}

export interface ToolCalledEvent {
    type: "tool_called";
    agent: string;
    tool: string;
    args: Record<string, unknown>;
}

export interface PassagesEvent {
    type: "passages";
    agent: string;
    query: string;
    passages: Passage[];
}

export interface GuardrailEvent {
    type: "guardrail";
    name: string;
    verdict: "ok" | "BLOCKED";
    detail: string;
}

export interface MemoryEvent {
    type: "memory";
    user_id: string;
    memories: string[];
}

export interface AnswerEvent {
    type: "answer";
    text: string;
    citations: Citation[];
    agent: string;
    metrics: RunMetrics;
}

export interface ErrorEvent {
    type: "error";
    message: string;
}

export interface DoneEvent {
    type: "done";
}

export type AppEvent =
    | RunStartedEvent
    | RoutedEvent
    | ToolCalledEvent
    | PassagesEvent
    | GuardrailEvent
    | MemoryEvent
    | AnswerEvent
    | ErrorEvent;

export interface StampedEvent {
    event: AppEvent;
    at: number;
}

export type TurnStatus = "running" | "done" | "error";

export interface Turn {
    id: string;
    question: string;
    events: StampedEvent[];
    status: TurnStatus;
}

export interface DocumentMeta {
    doc_id: string;
    title: string;
    domain: string;
    criticality: string;
    revision: string;
    effective_date: string;
    status: string;
    supersedes: string | null;
}

export interface DocumentSection {
    section: string;
    line_start: number;
    line_end: number;
    text: string;
}

export interface DocumentDetail extends DocumentMeta {
    sections: DocumentSection[];
}

export interface DocRef {
    doc_id: string;
    revision?: string;
    section?: string;
}

export interface DemoUser {
    id: string;
    name: string;
    role: string;
}
