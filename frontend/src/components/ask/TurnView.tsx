import { summarize, workingLabel } from "../../turnSummary";
import type { DocRef, Turn } from "../../types";
import { Icon } from "../common/Icon";
import { AnswerCard } from "./AnswerCard";
import { EmergencyCard, RefusalCard } from "./BlockedCards";

interface TurnViewProps {
    turn: Turn;
    active: boolean;
    onOpen: (ref: DocRef) => void;
    onShowSteps: () => void;
    onTrace: () => void;
}

export function TurnView({ turn, active, onOpen, onShowSteps, onTrace }: TurnViewProps) {
    const { answer, routed, blocked, error } = summarize(turn);

    return (
        <div className={`turn${active ? " active" : ""}`}>
            <div className="user-row">
                <div className="bubble">{turn.question}</div>
            </div>
            {blocked &&
                (blocked.name === "emergency_language" ? (
                    <EmergencyCard guardrail={blocked} answer={answer} onOpen={onOpen} onShowSteps={onShowSteps} onTrace={onTrace} />
                ) : (
                    <RefusalCard guardrail={blocked} answer={answer} onOpen={onOpen} onShowSteps={onShowSteps} onTrace={onTrace} />
                ))}
            {!blocked && answer && (
                <AnswerCard answer={answer} routedDomain={routed?.domain} onOpen={onOpen} onShowSteps={onShowSteps} onTrace={onTrace} />
            )}
            {error && (
                <div className="alert destructive" role="alert">
                    <Icon name="alert" size={16} />
                    <div>
                        <div className="t">Something went wrong</div>
                        <div className="d">{error.message}</div>
                    </div>
                </div>
            )}
            {turn.status === "running" && !answer && (
                <div className="working" aria-live="polite">
                    <Icon name="loader" size={16} className="spin" />
                    <span className="shimmer">{workingLabel(turn)}</span>
                    <button type="button" className="btn ghost sm steps-btn" onClick={onShowSteps}>
                        <Icon name="steps" size={14} /> Watch the steps
                    </button>
                </div>
            )}
        </div>
    );
}
