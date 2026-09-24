import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, isTerminal, SESSION_STATES } from "../src/session.js";

describe("session state machine", () => {
  it("follows the happy path per contract §19", () => {
    const path = ["CREATED", "QUEUED", "PREFLIGHT", "STARTING", "RUNNING", "TESTING", "REVIEW_READY", "COMPLETED"] as const;
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  it("allows approval loop", () => {
    expect(canTransition("RUNNING", "WAITING_FOR_APPROVAL")).toBe(true);
    expect(canTransition("WAITING_FOR_APPROVAL", "RUNNING")).toBe(true);
    expect(canTransition("WAITING_FOR_APPROVAL", "PAUSED")).toBe(true);
  });

  it("allows pause, takeover, disconnect recovery", () => {
    expect(canTransition("RUNNING", "PAUSED")).toBe(true);
    expect(canTransition("PAUSED", "RUNNING")).toBe(true);
    expect(canTransition("RUNNING", "TAKEN_OVER")).toBe(true);
    expect(canTransition("TAKEN_OVER", "RUNNING")).toBe(true);
    expect(canTransition("RUNNING", "DISCONNECTED")).toBe(true);
    expect(canTransition("DISCONNECTED", "RECOVERING")).toBe(true);
    expect(canTransition("RECOVERING", "RUNNING")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransition("CREATED", "RUNNING")).toBe(false);
    expect(canTransition("COMPLETED", "RUNNING")).toBe(false);
    expect(canTransition("PREFLIGHT", "TESTING")).toBe(false);
    expect(() => assertTransition("FAILED", "RUNNING")).toThrow(/invalid session transition/);
  });

  it("terminal states have zero exits and cancel is reachable from active states", () => {
    const noCancel = new Set(["CREATED", "QUEUED"]);
    for (const state of SESSION_STATES) {
      if (isTerminal(state)) {
        expect(canTransition(state, "RUNNING")).toBe(false);
      } else if (!noCancel.has(state)) {
        expect(canTransition(state, "CANCELLED"), `${state} -> CANCELLED`).toBe(true);
      }
    }
  });
});
