import { useState } from "react";
import { DEMO_USERS } from "../../config";
import type { Conversation as ConversationState } from "../../hooks/useConversation";
import type { DocRef } from "../../types";
import { RunView } from "../run/RunView";
import { AskBar, type AskPanel } from "./AskBar";
import { Composer } from "./Composer";
import { Conversation } from "./Conversation";
import { Suggestions } from "./Suggestions";

interface AskScreenProps {
    convo: ConversationState;
    userId: string;
    onUser: (id: string) => void;
    onOpen: (ref: DocRef) => void;
    onTrace: (turnId: string) => void;
}

export function AskScreen({ convo, userId, onUser, onOpen, onTrace }: AskScreenProps) {
    const [panel, setPanel] = useState<AskPanel>("chat");
    const user = DEMO_USERS.find((u) => u.id === userId) ?? DEMO_USERS[0];

    const showSteps = (turnId: string) => {
        convo.select(turnId);
        setPanel("run");
    };

    return (
        <div className={`ask-screen show-${panel}`}>
            <AskBar
                user={user}
                sessionId={convo.sessionId}
                panel={panel}
                onUser={onUser}
                onNewSession={convo.reset}
                onPanel={setPanel}
            />
            <div className="ask-body">
                <section className="chat-col" aria-label="Conversation">
                    <div className="chat-scroll">
                        <Conversation convo={convo} user={user} onOpen={onOpen} onShowSteps={showSteps} onTrace={onTrace} />
                    </div>
                    <div className="chat-foot">
                        {convo.turns.length > 0 && (
                            <div className="chips chips-row">
                                <Suggestions onPick={convo.ask} disabled={convo.running} />
                            </div>
                        )}
                        <Composer
                            disabled={convo.running}
                            placeholder={convo.running ? "Working on your last question..." : "Ask about safety, maintenance or quality"}
                            onSend={convo.ask}
                        />
                    </div>
                </section>
                <aside className="run-col" aria-label="Run steps">
                    <RunView turn={convo.selected} onOpen={onOpen} />
                </aside>
            </div>
        </div>
    );
}
