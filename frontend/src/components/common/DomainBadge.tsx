import { Icon, type IconName } from "./Icon";

interface DomainStyle {
    label: string;
    icon: IconName;
    cls: string;
}

const DOMAINS: Record<string, DomainStyle> = {
    safety: { label: "Safety", icon: "shield", cls: "dom-safety strong" },
    maintenance: { label: "Maintenance", icon: "wrench", cls: "dom-maintenance" },
    quality: { label: "Quality", icon: "clipboard", cls: "dom-quality" },
    guardrail: { label: "Guardrail", icon: "shield", cls: "dom-safety strong" },
    none: { label: "Router", icon: "compass", cls: "dom-none" },
};

export function domainKey(value: string | undefined): string {
    const key = (value ?? "none").toLowerCase();
    return key in DOMAINS ? key : "none";
}

export function domainLabel(value: string | undefined): string {
    return DOMAINS[domainKey(value)].label;
}

export function DomainBadge({ domain }: { domain: string | undefined }) {
    const style = DOMAINS[domainKey(domain)];
    return (
        <span className={`badge domain ${style.cls}`}>
            <Icon name={style.icon} size={12} />
            {style.label}
        </span>
    );
}
