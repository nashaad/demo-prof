import { useState, type KeyboardEvent } from "react";
import { Icon } from "../common/Icon";

interface ComposerProps {
    disabled: boolean;
    placeholder: string;
    onSend: (question: string) => void;
}

export function Composer({ disabled, placeholder, onSend }: ComposerProps) {
    const [value, setValue] = useState("");

    const send = () => {
        if (!value.trim() || disabled) return;
        onSend(value);
        setValue("");
    };

    const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <div className="composer">
            <textarea
                aria-label="Ask a question"
                rows={2}
                value={value}
                placeholder={placeholder}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKey}
            />
            <button
                type="button"
                className="btn primary icon round send"
                aria-label="Send question"
                disabled={disabled || !value.trim()}
                onClick={send}
            >
                <Icon name="send" size={18} />
            </button>
        </div>
    );
}
