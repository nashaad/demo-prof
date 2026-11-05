export function seconds(value: number | undefined): string | null {
    if (value === undefined || !Number.isFinite(value)) return null;
    return value < 10 ? `${value.toFixed(1)} s` : `${Math.round(value)} s`;
}

export function elapsed(ms: number): string {
    return `+${(ms / 1000).toFixed(1)}s`;
}

export function shortDate(value: string): string {
    return value ? value.slice(0, 10) : "";
}
