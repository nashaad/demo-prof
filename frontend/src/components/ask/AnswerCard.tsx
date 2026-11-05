import { seconds } from "../../format";
import type { AnswerEvent, DocRef } from "../../types";
import { DomainBadge, domainKey, domainLabel } from "../common/DomainBadge";
import { Icon } from "../common/Icon";
import { Markdown } from "../common/Markdown";
import { SourceList } from "./SourceCard";

interface AnswerCardProps {
    answer: AnswerEvent;
    routedDomain: string | undefined;
    onOpen: (ref: DocRef) => void;
    onShowSteps: () => void;
}

function badgeDomain(answer: AnswerEvent, routedDomain: string | undefined): string {
    const fromAgent = domainKey(answer.agent);
    if (fromAgent !== "none") return fromAgent;
    return domainKey(routedDomain);
}

export function AnswerCard({ answer, routedDomain, onOpen, onShowSteps }: AnswerCardProps) {
    const domain = badgeDomain(answer, routedDomain);
    const latency = seconds(answer.metrics?.duration);
    return (
        <article className="answer">
            <header className="answer-head">
                <DomainBadge domain={domain} />
                <span className="muted">
                    {domain === "none" ? "Answered by the router" : `${domainLabel(domain)} specialist`}
                </span>
                <span className="spacer" />
                {latency && (
                    <span className="muted meta num">
                        <Icon name="clock" size={12} /> {latency}
                    </span>
                )}
                <button type="button" className="btn ghost sm steps-btn" onClick={onShowSteps}>
                    <Icon name="steps" size={14} /> Show steps
                </button>
            </header>
            <Markdown text={answer.text} />
            <SourceList citations={answer.citations} onOpen={onOpen} />
        </article>
    );
}
