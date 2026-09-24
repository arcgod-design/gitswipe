import { describe, expect, it } from "vitest";
import { EventEnvelopeSchema, EVENT_TYPES, makeEvent } from "../src/events.js";

const base = {
  user_id: "usr_test" as const,
  workstation_id: "ws_test" as const,
  sequence: 1,
};

describe("event envelope", () => {
  it("makeEvent produces a valid v1 envelope", () => {
    const evt = makeEvent({ ...base, type: "TaskCreated", task_id: "task_1" });
    expect(() => EventEnvelopeSchema.parse(evt)).not.toThrow();
    expect(evt.event_version).toBe(1);
    expect(evt.event_id).toMatch(/^evt_/);
    expect(evt.payload).toEqual({});
  });

  it("rejects unknown event types and bad sequences", () => {
    const evt = makeEvent({ ...base, type: "AgentStarted" });
    expect(EventEnvelopeSchema.safeParse({ ...evt, type: "NotARealEvent" }).success).toBe(false);
    expect(EventEnvelopeSchema.safeParse({ ...evt, sequence: -1 }).success).toBe(false);
  });

  it("nullable task/session ids default to null", () => {
    const evt = makeEvent({ ...base, type: "WorkstationConnected" });
    expect(evt.task_id).toBeNull();
    expect(evt.session_id).toBeNull();
  });

  it("event type list contains the contract §20 names", () => {
    for (const name of ["ApprovalRequested", "ApprovalGranted", "AgentTakenOver", "PRCreated", "TestFinished"]) {
      expect(EVENT_TYPES).toContain(name);
    }
  });
});
