import type { DocRef, Turn } from "../../types";
import { summarize } from "../../turnSummary";
import { Icon } from "../common/Icon";
import { RunTimeline } from "./RunTimeline";

interface RunViewProps {
    turn: Turn | null;
    onOpen: (ref: DocRef) => void;
}

function statusOf(turn: Turn): { label: string; cls: string } {
    const { blocked } = summarize(turn);
    if (turn.status === "running") return { label: "Running", cls: "secondary" };
    if (blocked) return { label: "Blocked", cls: "bad" };
    if (turn.status === "error") return { label: "Error", cls: "bad" };
    return { label: "Done", cls: "good" };
}

export function RunView({ turn, onOpen }: RunViewProps) {
    if (!turn) {
        return (
            <div className="run-view">
                <div className="empty run-empty">
                    <div className="media">
                        <Icon name="steps" size={20} />
                    </div>
                    <div className="t">Run steps</div>
                    <div className="d">Ask a question and each step the assistant takes will appear here as it happens.</div>
                </div>
            </div>
        );
    }
    const status = statusOf(turn);
    return (
        <div className="run-view">
            <header className="run-head">
                <div className="run-head-row">
                    <h2>How this was answered</h2>
                    <span className={`badge ${status.cls}`}>{status.label}</span>
                </div>
                <p className="run-question muted">&ldquo;{turn.question}&rdquo;</p>
            </header>
            <RunTimeline key={turn.id} turn={turn} onOpen={onOpen} />
            <details className="legend">
                <summary>What do the bars mean?</summary>
                <dl>
                    <dt>Keyword match</dt>
                    <dd>Exact words from the question found in the passage.</dd>
                    <dt>Meaning match</dt>
                    <dd>The passage says something close to the question, even in different words.</dd>
                    <dt>Combined</dt>
                    <dd>Keyword and meaning results merged into one ranking.</dd>
                    <dt>Final rerank</dt>
                    <dd>A second pass re-reads the top results and puts the most relevant first.</dd>
                </dl>
            </details>
        </div>
    );
}
