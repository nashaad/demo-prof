import { useCallback, useEffect, useState } from "react";
import { getJson } from "../api";

interface FetchState<T> {
    data: T | null;
    error: string | null;
    loading: boolean;
    reload: () => void;
}

export function useFetch<T>(path: string | null): FetchState<T> {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(path !== null);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (path === null) return;
        let live = true;
        setLoading(true);
        setError(null);
        getJson<T>(path)
            .then((value) => live && setData(value))
            .catch((err: Error) => live && setError(err.message))
            .finally(() => live && setLoading(false));
        return () => {
            live = false;
        };
    }, [path, tick]);

    const reload = useCallback(() => setTick((n) => n + 1), []);
    return { data, error, loading, reload };
}
