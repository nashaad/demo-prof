import { useTheme } from "../hooks/useTheme";
import { Icon, type IconName } from "./common/Icon";

export type View = "ask" | "library";

const TABS: { id: View; label: string; icon: IconName }[] = [
    { id: "ask", label: "Ask", icon: "message" },
    { id: "library", label: "Library", icon: "book" },
];

interface TopNavProps {
    view: View;
    onView: (view: View) => void;
}

export function TopNav({ view, onView }: TopNavProps) {
    const [theme, toggleTheme] = useTheme();
    return (
        <header className="topnav">
            <div className="brand">
                <span className="brand-mark" aria-hidden="true" />
                <span className="brand-text">
                    <strong>Calder Ridge</strong>
                    <span className="muted">Plant assistant</span>
                </span>
            </div>
            <nav className="tabs" aria-label="Main">
                {TABS.map((tab) => (
                    <button key={tab.id} type="button" className={`tab${view === tab.id ? " on" : ""}`} aria-current={view === tab.id ? "page" : undefined} onClick={() => onView(tab.id)}>
                        <Icon name={tab.icon} size={15} />
                        {tab.label}
                    </button>
                ))}
            </nav>
            <button type="button" className="btn ghost icon sm" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
                <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
            </button>
        </header>
    );
}
