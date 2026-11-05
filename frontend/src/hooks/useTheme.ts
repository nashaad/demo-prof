import { useCallback, useState } from "react";

type Theme = "dark" | "light";

export function useTheme(): [Theme, () => void] {
    const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === "light" ? "light" : "dark"));
    const toggle = useCallback(() => {
        const next: Theme = theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
            localStorage.setItem("cr-theme", next);
        } catch {
            // storage can be blocked; the theme still applies for this page
        }
        setTheme(next);
    }, [theme]);
    return [theme, toggle];
}
