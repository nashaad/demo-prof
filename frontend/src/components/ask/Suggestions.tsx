import { SUGGESTIONS } from "../../config";

interface SuggestionsProps {
    onPick: (question: string) => void;
    disabled: boolean;
}

export function Suggestions({ onPick, disabled }: SuggestionsProps) {
    return (
        <>
            {SUGGESTIONS.map((question) => (
                <button key={question} type="button" className="chip" disabled={disabled} onClick={() => onPick(question)}>
                    {question}
                </button>
            ))}
        </>
    );
}
