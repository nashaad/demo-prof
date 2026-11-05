import type { ReactNode } from "react";

type Block =
    | { kind: "p"; text: string }
    | { kind: "h"; text: string }
    | { kind: "ol"; start: number; items: string[] }
    | { kind: "ul"; items: string[] };

const OL = /^\s*(\d+)[.)]\s+(.*)$/;
const UL = /^\s*[-*•]\s+(.*)$/;
const H = /^\s*#{1,6}\s+(.*)$/;

function parse(text: string): Block[] {
    const blocks: Block[] = [];
    let para: string[] = [];
    const flush = () => {
        if (para.length) blocks.push({ kind: "p", text: para.join(" ") });
        para = [];
    };
    for (const line of text.split("\n")) {
        const ol = OL.exec(line);
        const ul = UL.exec(line);
        const h = H.exec(line);
        const last = blocks[blocks.length - 1];
        if (!line.trim()) {
            flush();
        } else if (h) {
            flush();
            blocks.push({ kind: "h", text: h[1] });
        } else if (ol) {
            flush();
            if (last?.kind === "ol" && para.length === 0) last.items.push(ol[2]);
            else blocks.push({ kind: "ol", start: Number(ol[1]), items: [ol[2]] });
        } else if (ul) {
            flush();
            if (last?.kind === "ul") last.items.push(ul[1]);
            else blocks.push({ kind: "ul", items: [ul[1]] });
        } else if ((last?.kind === "ol" || last?.kind === "ul") && para.length === 0 && /^\s+/.test(line)) {
            last.items[last.items.length - 1] += ` ${line.trim()}`;
        } else {
            para.push(line.trim());
        }
    }
    flush();
    return blocks;
}

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`)/g;

function inline(text: string): ReactNode[] {
    return text.split(INLINE).map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>;
        return part;
    });
}

export function Markdown({ text }: { text: string }) {
    return (
        <div className="md">
            {parse(text).map((block, i) => {
                switch (block.kind) {
                    case "h":
                        return <h4 key={i}>{inline(block.text)}</h4>;
                    case "ol":
                        return (
                            <ol key={i} start={block.start}>
                                {block.items.map((item, j) => (
                                    <li key={j}>{inline(item)}</li>
                                ))}
                            </ol>
                        );
                    case "ul":
                        return (
                            <ul key={i}>
                                {block.items.map((item, j) => (
                                    <li key={j}>{inline(item)}</li>
                                ))}
                            </ul>
                        );
                    default:
                        return <p key={i}>{inline(block.text)}</p>;
                }
            })}
        </div>
    );
}
