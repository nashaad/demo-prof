import { useCallback, useState } from "react";
import { AskScreen } from "./components/ask/AskScreen";
import { DocumentDrawer } from "./components/docs/DocumentDrawer";
import { LibraryScreen } from "./components/docs/LibraryScreen";
import { TopNav, type View } from "./components/TopNav";
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

    return (
        <div className="app">
            <TopNav view={view} onView={setView} />
            <main className="main">
                {view === "ask" && <AskScreen convo={convo} userId={userId} onUser={changeUser} onOpen={setDocRef} />}
                {view === "library" && <LibraryScreen onOpen={setDocRef} />}
            </main>
            {docRef && <DocumentDrawer docRef={docRef} onClose={closeDoc} />}
        </div>
    );
}
