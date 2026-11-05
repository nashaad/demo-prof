import { DEMO_USERS } from "../../config";
import type { DemoUser } from "../../types";
import { Icon } from "../common/Icon";

export type AskPanel = "chat" | "run";

interface AskBarProps {
    user: DemoUser;
    sessionId: string;
    panel: AskPanel;
    onUser: (id: string) => void;
    onNewSession: () => void;
    onPanel: (panel: AskPanel) => void;
}

export function AskBar({ user, sessionId, panel, onUser, onNewSession, onPanel }: AskBarProps) {
    return (
        <div className="ask-bar">
            <label className="user-picker">
                <span className="avatar" aria-hidden="true">
                    {user.name[0]}
                </span>
                <span className="user-picker-text">
                    <span className="lbl">Signed in as</span>
                    <select value={user.id} onChange={(e) => onUser(e.target.value)} aria-label="Signed in as">
                        {DEMO_USERS.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.name}, {u.role}
                            </option>
                        ))}
                    </select>
                </span>
                <Icon name="chevDown" size={14} className="muted" />
            </label>
            <div className="session">
                <span className="lbl">Session</span>
                <span className="mono num">{sessionId}</span>
            </div>
            <button type="button" className="btn outline sm" onClick={onNewSession}>
                <Icon name="plus" size={14} /> New session
            </button>
            <span className="spacer" />
            <div className="panel-tabs" role="tablist" aria-label="Panel">
                <button type="button" role="tab" aria-selected={panel === "chat"} className={panel === "chat" ? "on" : ""} onClick={() => onPanel("chat")}>
                    <Icon name="message" size={14} /> Conversation
                </button>
                <button type="button" role="tab" aria-selected={panel === "run"} className={panel === "run" ? "on" : ""} onClick={() => onPanel("run")}>
                    <Icon name="steps" size={14} /> Run steps
                </button>
            </div>
        </div>
    );
}
