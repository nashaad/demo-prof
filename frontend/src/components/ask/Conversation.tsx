import { useEffect, useRef } from "react";
import type { Conversation as ConversationState } from "../../hooks/useConversation";
import type { DemoUser, DocRef } from "../../types";
import { Icon } from "../common/Icon";
import { Suggestions } from "./Suggestions";
import { TurnView } from "./TurnView";

interface ConversationProps {
    convo: ConversationState;
    user: DemoUser;
    onOpen: (ref: DocRef) => void;
    onShowSteps: (turnId: string) => void;
    onTrace: (turnId: string) => void;
}

export function Conversation({ convo, user, onOpen, onShowSteps, onTrace }: ConversationProps) {
    const endRef = useRef<HTMLDivElement>(null);
    const last = convo.turns[convo.turns.length - 1];
    const marker = `${convo.turns.length}:${last?.events.length ?? 0}:${last?.status ?? ""}`;

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [marker]);

    if (!convo.turns.length) {
        return (
            <div className="convo empty-state">
                <div className="hero">
                    <div className="hero-icon">
                        <Icon name="message" size={22} />
                    </div>
                    <h2>What do you need to know, {user.name.split(" ")[0]}?</h2>
                    <p className="muted">
                        Ask about safety procedures, maintenance manuals or quality standards. Every answer cites the plant document it came from.
                    </p>
                    <div className="chips hero-chips">
                        <Suggestions onPick={convo.ask} disabled={convo.running} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="convo">
            <div className="turns">
                {convo.turns.map((turn) => (
                    <TurnView
                        key={turn.id}
                        turn={turn}
                        active={convo.selected?.id === turn.id}
                        onOpen={onOpen}
                        onShowSteps={() => onShowSteps(turn.id)}
                        onTrace={() => onTrace(turn.id)}
                    />
                ))}
                <div ref={endRef} />
            </div>
        </div>
    );
}
