export const SESSION_STATES = [
  "CREATED",
  "QUEUED",
  "PREFLIGHT",
  "STARTING",
  "RUNNING",
  "WAITING_FOR_AGENT",
  "WAITING_FOR_APPROVAL",
  "PAUSED",
  "TAKEN_OVER",
  "TESTING",
  "REVIEW_READY",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "RECOVERING",
  "DISCONNECTED",
] as const;

export type SessionState = (typeof SESSION_STATES)[number];

const TERMINAL: ReadonlySet<SessionState> = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

const TRANSITIONS: Readonly<Record<SessionState, readonly SessionState[]>> = {
  CREATED: ["QUEUED"],
  QUEUED: ["PREFLIGHT"],
  PREFLIGHT: ["STARTING", "FAILED", "CANCELLED"],
  STARTING: ["RUNNING", "CANCELLED"],
  RUNNING: [
    "WAITING_FOR_AGENT",
    "WAITING_FOR_APPROVAL",
    "TESTING",
    "PAUSED",
    "TAKEN_OVER",
    "DISCONNECTED",
    "FAILED",
    "CANCELLED",
  ],
  WAITING_FOR_AGENT: ["RUNNING", "PAUSED", "DISCONNECTED", "FAILED", "CANCELLED"],
  WAITING_FOR_APPROVAL: ["RUNNING", "PAUSED", "DISCONNECTED", "FAILED", "CANCELLED"],
  PAUSED: ["RUNNING", "DISCONNECTED", "FAILED", "CANCELLED"],
  TAKEN_OVER: ["RUNNING", "DISCONNECTED", "FAILED", "CANCELLED"],
  TESTING: ["REVIEW_READY", "RUNNING", "DISCONNECTED", "FAILED", "CANCELLED"],
  REVIEW_READY: ["COMPLETED", "FAILED", "CANCELLED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
  DISCONNECTED: ["RECOVERING", "FAILED", "CANCELLED"],
  RECOVERING: ["RUNNING", "FAILED", "CANCELLED"],
};

export function canTransition(from: SessionState, to: SessionState): boolean {
  const allowed = TRANSITIONS[from];
  return allowed !== undefined && allowed.includes(to);
}

export function assertTransition(from: SessionState, to: SessionState): void {
  if (!canTransition(from, to)) {
    throw new Error(`invalid session transition: ${from} -> ${to}`);
  }
}

export function isTerminal(state: SessionState): boolean {
  return TERMINAL.has(state);
}
