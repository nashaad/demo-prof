interface GuardrailLabel {
    checked: string;
    short: string;
}

const LABELS: Record<string, GuardrailLabel> = {
    emergency_language: { checked: "Checked for emergency language", short: "emergency language" },
    safety_bypass: { checked: "Checked for attempts to bypass safety controls", short: "safety bypass" },
    prompt_injection: { checked: "Checked for instructions that try to override the assistant", short: "prompt tampering" },
};

export function guardrailLabel(name: string): GuardrailLabel {
    const known = LABELS[name];
    if (known) return known;
    const readable = name.replace(/_/g, " ");
    return { checked: `Checked: ${readable}`, short: readable };
}
