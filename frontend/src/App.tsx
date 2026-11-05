import { useCallback, useEffect, useState } from "react";
import { AskScreen } from "./components/ask/AskScreen";
import { DocumentDrawer } from "./components/docs/DocumentDrawer";
import { LibraryScreen } from "./components/docs/LibraryScreen";
import { TopNav, type View } from "./components/TopNav";
import { TracePage } from "./components/trace/TracePage";
import { DEMO_USERS } from "./config";
import { useConversation } from "./hooks/useConversation";
import type { DocRef } from "./types";

export function App() {
    const [view, setView] = useState<View>("ask");
    const [userId, setUserId] = useState(DEMO_USERS[0].id);
    const [docRef, setDocRef] = useState<DocRef | null>(null);
    const convo = useConversation(userId);
    const { reset } = convo;

    const changeUser = useCallback(
        (id: string) => {
            setUserId(id);
            reset();
        },
        [reset],
    );
    const closeDoc = useCallback(() => setDocRef(null), []);

    const [traceTurnId, setTraceTurnId] = useState<string | null>(null);
    useEffect(() => {
        const onPop = (e: PopStateEvent) => setTraceTurnId(e.state?.traceTurnId ?? null);
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, []);
    const openTrace = useCallback((turnId: string) => {
        history.pushState({ traceTurnId: turnId }, "", "#trace");
        setTraceTurnId(turnId);
        window.scrollTo(0, 0);
    }, []);
    const closeTrace = useCallback(() => history.back(), []);
    const changeView = useCallback((next: View) => {
        if (traceTurnId) history.back();
        setView(next);
    }, [traceTurnId]);

    return (
        <div className="app">
            <TopNav view={view} onView={changeView} />
            <main className="main">
                {view === "ask" && traceTurnId && (
                    <TracePage turn={convo.turns.find((t) => t.id === traceTurnId)} onBack={closeTrace} onOpen={setDocRef} />
                )}
                {view === "ask" && !traceTurnId && (
                    <AskScreen convo={convo} userId={userId} onUser={changeUser} onOpen={setDocRef} onTrace={openTrace} />
                )}
                {view === "library" && <LibraryScreen onOpen={setDocRef} />}
            </main>
            {docRef && <DocumentDrawer docRef={docRef} onClose={closeDoc} />}
        </div>
    );
}
