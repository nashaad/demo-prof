import type { DemoUser } from "./types";

export const EMERGENCY_EXTENSION = "2911";

export const DEMO_USERS: DemoUser[] = [
    { id: "dana-reyes", name: "Dana Reyes", role: "Line 3 supervisor" },
    { id: "sam-okafor", name: "Sam Okafor", role: "Line 1 supervisor" },
];

export const SUGGESTIONS: string[] = [
    "What PPE do I need to clean Press 4?",
    "Torque spec for the Conveyor C2 drive coupling bolts?",
    "What's the bore tolerance on part 1142?",
    "Press 4 guard is cracked, can we keep running?",
    "Can I bridge the light curtain to speed up Line 2?",
    "Someone's hand got caught at station 3",
    "How do I lock the press off before I reach in?",
    "What's the maximum humidity for the paint booth?",
];
