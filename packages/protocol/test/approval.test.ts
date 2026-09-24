import { describe, expect, it } from "vitest";
import { makeApprovalRequest, verifyApprovalBinding, canonicalJson, hashAction } from "../src/approval.js";

const input = {
  user_id: "usr_1",
  session_id: "sess_1",
  task_id: "task_1",
  action: "git push origin feat/issue-12-server-pagination",
  action_payload: { branch: "feat/issue-12-server-pagination", remote: "origin", force: false },
  policy_version: "1",
  risk_level: "HIGH" as const,
};

describe("approvals", () => {
  it("canonicalJson is order-independent", () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 3, c: 4 }] })).toBe(canonicalJson({ a: [2, { c: 4, d: 3 }], b: 1 }));
  });

  it("hashAction is deterministic and 64 hex chars", async () => {
    const h1 = await hashAction(input.action);
    const h2 = await hashAction(input.action);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("approval binds to the exact action and payload", async () => {
    const approval = await makeApprovalRequest(input);
    const ok = await verifyApprovalBinding({ approval, action: input.action, action_payload: input.action_payload });
    expect(ok.ok).toBe(true);

    const wrongAction = await verifyApprovalBinding({
      approval,
      action: "git push origin main",
      action_payload: input.action_payload,
    });
    expect(wrongAction).toEqual({ ok: false, reason: "action_mismatch" });

    const wrongPayload = await verifyApprovalBinding({
      approval,
      action: input.action,
      action_payload: { branch: "main", remote: "origin", force: false },
    });
    expect(wrongPayload).toEqual({ ok: false, reason: "payload_mismatch" });
  });

  it("expired approvals are rejected", async () => {
    const approval = await makeApprovalRequest({ ...input, ttl_ms: 1 });
    const result = await verifyApprovalBinding({
      approval,
      action: input.action,
      action_payload: input.action_payload,
      at: new Date(Date.now() + 1000),
    });
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("already-decided approvals cannot be re-decided", async () => {
    const approval = await makeApprovalRequest(input);
    const decided = { ...approval, status: "granted" as const };
    const result = await verifyApprovalBinding({
      approval: decided,
      action: input.action,
      action_payload: input.action_payload,
    });
    expect(result).toEqual({ ok: false, reason: "already_decided" });
  });
});
