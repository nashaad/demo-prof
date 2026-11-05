import type { ReactNode } from "react";
import { elapsed } from "../../format";
import { Icon, type IconName } from "../common/Icon";

export type StepTone = "ok" | "bad" | "info" | "pending";

interface RunStepProps {
    tone: StepTone;
    icon: IconName;
    title: ReactNode;
    at?: number;
    children?: ReactNode;
}

export function RunStep({ tone, icon, title, at, children }: RunStepProps) {
    return (
        <li className={`step ${tone}`}>
            <span className="step-marker" aria-hidden="true">
                <Icon name={icon} size={14} className={tone === "pending" ? "spin" : undefined} />
            </span>
            <div className="step-main">
                <div className="step-title">
                    <span>{title}</span>
                    {at !== undefined && <span className="step-time num muted">{elapsed(at)}</span>}
                </div>
                {children && <div className="step-body">{children}</div>}
            </div>
        </li>
    );
}

export function Verdict({ verdict }: { verdict: "ok" | "BLOCKED" }) {
    const blocked = verdict === "BLOCKED";
    return (
        <span className={`badge ${blocked ? "bad" : "good"}`}>
            <Icon name={blocked ? "x" : "check"} size={12} />
            {verdict}
        </span>
    );
}
