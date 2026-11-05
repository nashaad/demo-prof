import { EMERGENCY_EXTENSION } from "../../config";
import { guardrailLabel } from "../../guardrails";
import type { AnswerEvent, DocRef, GuardrailEvent } from "../../types";
import { Icon } from "../common/Icon";
import { Markdown } from "../common/Markdown";
import { SourceList } from "./SourceCard";

interface BlockedProps {
    guardrail: GuardrailEvent;
    answer: AnswerEvent | undefined;
    onOpen: (ref: DocRef) => void;
    onShowSteps: () => void;
    onTrace: () => void;
}

function BlockedFoot({ guardrail, onShowSteps, onTrace }: Pick<BlockedProps, "guardrail" | "onShowSteps" | "onTrace">) {
    return (
        <footer className="blocked-foot">
            <span>
                Stopped by the {guardrailLabel(guardrail.name).short} check: <strong>BLOCKED</strong>. No specialist was asked.
            </span>
            <button type="button" className="btn ghost sm steps-btn" onClick={onShowSteps}>
                <Icon name="steps" size={14} /> Show steps
            </button>
            <button type="button" className="btn ghost sm steps-btn" onClick={onTrace}>
                <Icon name="search" size={14} /> Open trace
            </button>
        </footer>
    );
}

export function EmergencyCard({ guardrail, answer, onOpen, onShowSteps, onTrace }: BlockedProps) {
    return (
        <article className="emergency" role="alert">
            <header className="emergency-head">
                <Icon name="octagon" size={36} />
                <div>
                    <h3>Emergency: stop the machine</h3>
                    <p>Press the nearest emergency stop, then call extension {EMERGENCY_EXTENSION}.</p>
                </div>
                <a className="call-btn" href={`tel:${EMERGENCY_EXTENSION}`}>
                    <Icon name="phone" size={20} />
                    Call ext. {EMERGENCY_EXTENSION}
                </a>
            </header>
            {answer && (
                <div className="emergency-body">
                    <Markdown text={answer.text} />
                    <SourceList citations={answer.citations} onOpen={onOpen} />
                </div>
            )}
            <BlockedFoot guardrail={guardrail} onShowSteps={onShowSteps} onTrace={onTrace} />
        </article>
    );
}

export function RefusalCard({ guardrail, answer, onOpen, onShowSteps, onTrace }: BlockedProps) {
    const bypass = guardrail.name === "safety_bypass";
    return (
        <article className="refusal" role="alert">
            <header className="refusal-head">
                <Icon name="ban" size={24} />
                <div>
                    <h3>{bypass ? "Request declined: safety controls stay on" : "Request blocked"}</h3>
                    {guardrail.detail && <p className="muted">Matched: {guardrail.detail.replace(/^matched\s*/i, "")}</p>}
                </div>
            </header>
            {answer && (
                <>
                    <Markdown text={answer.text} />
                    <SourceList citations={answer.citations} onOpen={onOpen} />
                </>
            )}
            <BlockedFoot guardrail={guardrail} onShowSteps={onShowSteps} onTrace={onTrace} />
        </article>
    );
}
