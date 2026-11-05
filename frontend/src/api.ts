export async function getJson<T>(path: string): Promise<T> {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return (await res.json()) as T;
}

export function askUrl(question: string, userId: string, sessionId: string): string {
    const params = new URLSearchParams({ question, user_id: userId, session_id: sessionId });
    return `/api/ask?${params.toString()}`;
}

export function documentPath(docId: string, revision?: string): string {
    const base = `/api/documents/${encodeURIComponent(docId)}`;
    return revision ? `${base}?revision=${encodeURIComponent(revision)}` : base;
}

export function runPath(runId: string): string {
    return `/api/runs/${encodeURIComponent(runId)}`;
}
