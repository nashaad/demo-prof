import { useCallback, useEffect, useRef, useState } from "react";
import { askUrl } from "../api";
import type { AppEvent, DoneEvent, Turn } from "../types";

const randomId = () => Math.random().toString(36).slice(2, 10);
const newSessionId = () => `s-${Date.now().toString(36)}${randomId().slice(0, 3)}`;

export interface Conversation {
    turns: Turn[];
    sessionId: string;
    selected: Turn | null;
    running: boolean;
    ask: (question: string) => void;
    reset: () => void;
    select: (id: string) => void;
}

export function useConversation(userId: string): Conversation {
    const [turns, setTurns] = useState<Turn[]>([]);
    const [sessionId, setSessionId] = useState(newSessionId);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const source = useRef<EventSource | null>(null);

    const closeSource = useCallback(() => {
        source.current?.close();
        source.current = null;
    }, []);

    useEffect(() => closeSource, [closeSource]);

    const reset = useCallback(() => {
        closeSource();
        setTurns([]);
        setSelectedId(null);
        setSessionId(newSessionId());
    }, [closeSource]);

    const ask = useCallback(
        (question: string) => {
            const text = question.trim();
            if (!text || source.current) return;
            const id = randomId();
            const started = performance.now();
            const patch = (fn: (turn: Turn) => Turn) =>
                setTurns((all) => all.map((turn) => (turn.id === id ? fn(turn) : turn)));
            setTurns((all) => [...all, { id, question: text, events: [], status: "running" }]);
            setSelectedId(null);

            const es = new EventSource(askUrl(text, userId, sessionId));
            source.current = es;
            const stamp = (event: AppEvent) => ({ event, at: performance.now() - started });

            const finish = () => {
                es.close();
                if (source.current === es) source.current = null;
            };

            es.onmessage = (message) => {
                let event: AppEvent | DoneEvent;
                try {
                    event = JSON.parse(message.data);
                } catch {
                    return;
                }
                if (event.type === "done") {
                    finish();
                    patch((turn) => ({ ...turn, status: turn.status === "error" ? "error" : "done" }));
                    return;
                }
                patch((turn) => ({
                    ...turn,
                    events: [...turn.events, stamp(event)],
                    status: event.type === "error" ? "error" : turn.status,
                }));
                if (event.type === "error") finish();
            };

            es.onerror = () => {
                if (source.current !== es) return;
                finish();
                patch((turn) => {
                    if (turn.events.some((e) => e.event.type === "answer")) return { ...turn, status: "done" };
                    const lost: AppEvent = { type: "error", message: "Lost the connection to the assistant. Is the backend running?" };
                    return { ...turn, events: [...turn.events, stamp(lost)], status: "error" };
                });
            };
        },
        [userId, sessionId],
    );

    const selected = turns.find((turn) => turn.id === selectedId) ?? turns[turns.length - 1] ?? null;
    const running = turns.some((turn) => turn.status === "running");

    return { turns, sessionId, selected, running, ask, reset, select: setSelectedId };
}
