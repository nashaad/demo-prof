import type { ReactNode } from "react";

const PATHS = {
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    wrench: (
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    ),
    clipboard: (
        <>
            <rect x="8" y="2" width="8" height="4" rx="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="m9 14 2 2 4-4" />
        </>
    ),
    alert: (
        <>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
        </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    x: <path d="M18 6 6 18M6 6l12 12" />,
    search: (
        <>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </>
    ),
    file: (
        <>
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <path d="M14 2v6h6" />
        </>
    ),
    loader: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
    send: <path d="M12 19V5M5 12l7-7 7 7" />,
    plus: <path d="M12 5v14M5 12h14" />,
    book: <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />,
    user: (
        <>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </>
    ),
    steps: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
    bookmark: <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />,
    compass: (
        <>
            <circle cx="12" cy="12" r="10" />
            <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
        </>
    ),
    phone: (
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    ),
    moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />,
    sun: (
        <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </>
    ),
    clock: (
        <>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
        </>
    ),
    chevDown: <path d="m6 9 6 6 6-6" />,
    message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    ban: (
        <>
            <circle cx="12" cy="12" r="10" />
            <path d="m4.9 4.9 14.2 14.2" />
        </>
    ),
    octagon: (
        <>
            <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z" />
            <path d="M12 8v4M12 16h.01" />
        </>
    ),
    panel: (
        <>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M15 3v18" />
        </>
    ),
    refresh: (
        <>
            <path d="M21 12a9 9 0 0 0-15-6.7L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 15 6.7L21 16" />
            <path d="M16 16h5v5" />
        </>
    ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

interface IconProps {
    name: IconName;
    size?: number;
    className?: string;
}

export function Icon({ name, size = 16, className }: IconProps) {
    return (
        <svg
            className={`icon${className ? ` ${className}` : ""}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            {PATHS[name]}
        </svg>
    );
}
