import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { AuditJournal, auditPath } from "../src/audit.js";
import { ExecutionGate, type GateContext, type GateRequest } from "../src/gate.js";

const execFileAsync = promisify(execFile);

let dir: string;
let repoPath: string;
let audit: AuditJournal;
let gate: ExecutionGate;
const ctx: GateContext = { actor: "usr_test", sessionId: "sess_1", taskId: "task_1", policyVersion: "1" };

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "jvs-w07-"));
  repoPath = join(dir, "scratch");
  await execFileAsync("git", ["init", "-b", "main", repoPath]);
  await execFileAsync("git", ["-C", repoPath, "config", "user.name", "Gate Test"]);
  await execFileAsync("git", ["-C", repoPath, "config", "user.email", "gate@test.local"]);
  const fs = await import("node:fs");
  fs.writeFileSync(join(repoPath, "README.md"), "# scratch\n");
  await execFileAsync("git", ["-C", repoPath, "add", "."]);
  await execFileAsync("git", ["-C", repoPath, "commit", "-m", "init"]);
  audit = new AuditJournal(auditPath(dir));
  gate = new ExecutionGate({ audit });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function req(argv: string[], cwd = repoPath, roots: string[] = [repoPath]): GateRequest {
  return { argv, cwd, allowedRoots: roots };
}

function auditTrail(): string {
  return audit.readAll().map((r) => `${r.category}:${r.decision}`).join("\n");
}

describe("WEEK-07 exit test: the s118 policy table enforced in a REAL execution path", () => {
  it("git status -> ALLOW and actually executes", async () => {
    const out = await gate.execute(req(["git", "status"]), ctx);
    expect(out.ok).toBe(true);
    expect(out.stdout).toContain("On branch main");
    expect(auditTrail()).toContain("policy_decision:ALLOW");
  });

  it("git push --force -> DENY, never executes, audited as blocked", async () => {
    const review = await gate.review(req(["git", "push", "--force", "origin", "main"]), ctx);
    expect(review.kind).toBe("deny");
    const out = await gate.execute(req(["git", "push", "--force", "origin", "main"]), ctx);
    expect(out.ok).toBe(false);
    expect(out.refusalReason).toBeTruthy();
    expect(auditTrail()).toContain("action_blocked:DENY");
    const blocks = audit.readAll().filter((r) => r.category === "action_blocked");
    expect(blocks[0]!.detail).toContain("force");
  });

  it("git commit -> APPROVAL_REQUIRED with a real bound approval; approved binding executes the real commit", async () => {
    const fs = await import("node:fs");
    fs.writeFileSync(join(repoPath, "CHANGE.md"), "change\n");
    await execFileAsync("git", ["-C", repoPath, "add", "."]);

    const review = await gate.review(req(["git", "commit", "-m", "feat: demo"]), ctx);
    expect(review.kind, "expected approval_required").toBe("approval_required");
    if (review.kind !== "approval_required") return;
    expect(review.approval.action_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(review.approval.status).toBe("pending");
    expect(auditTrail()).toContain("approval_requested:APPROVAL_REQUIRED");

    const approved = { ...review.approval, status: "granted" as const };
    const out = await gate.executeAfterApproval(approved, req(["git", "commit", "-m", "feat: demo"]), ctx);
    expect(out.ok, `refusalReason: ${out.refusalReason ?? "none"} | stderr: ${out.stderr}`).toBe(true);
    const log = await execFileAsync("git", ["-C", repoPath, "log", "--oneline"]);
    expect(log.stdout).toContain("feat: demo");
    expect(auditTrail()).toContain("action_executed:ALLOW");
  });

  it("forged approval (payload swapped after approval) is refused and audited", async () => {
    const fs = await import("node:fs");
    fs.writeFileSync(join(repoPath, "EVIL.md"), "evil\n");
    await execFileAsync("git", ["-C", repoPath, "add", "."]);
    const review = await gate.review(req(["git", "commit", "-m", "legit message"]), ctx);
    if (review.kind !== "approval_required") throw new Error("expected approval_required");
    const approved = { ...review.approval, status: "granted" as const };
    const out = await gate.executeAfterApproval(approved, req(["git", "commit", "-m", "INJECTED EVIL MESSAGE"]), ctx);
    expect(out.ok).toBe(false);
    expect(out.refusalReason).toContain("action_mismatch");
    expect(auditTrail()).toContain("action_blocked:REFUSED");
    const log = await execFileAsync("git", ["-C", repoPath, "log", "--oneline"]);
    expect(log.stdout).not.toContain("INJECTED");
  });

  it("replaying an already-decided approval is refused", async () => {
    const fs = await import("node:fs");
    fs.writeFileSync(join(repoPath, "A.md"), "a\n");
    await execFileAsync("git", ["-C", repoPath, "add", "."]);
    const review = await gate.review(req(["git", "commit", "-m", "first"]), ctx);
    if (review.kind !== "approval_required") throw new Error("expected approval_required");
    const approved = { ...review.approval, status: "granted" as const };
    const first = await gate.executeAfterApproval(approved, req(["git", "commit", "-m", "first"]), ctx);
    expect(first.ok, `refusalReason: ${first.refusalReason ?? "none"} | stderr: ${first.stderr}`).toBe(true);
    expect(approved.status).toBe("consumed");
    const second = await gate.executeAfterApproval(approved, req(["git", "commit", "-m", "first"]), ctx);
    expect(second.ok).toBe(false);
    expect(second.refusalReason).toContain("consumed");
    const copy = { ...approved, status: "granted" as const };
    const third = await gate.executeAfterApproval(copy, req(["git", "commit", "-m", "first"]), ctx);
    expect(third.ok).toBe(false);
    expect(third.refusalReason).toContain("already executed");
  });

  it("expired approvals never execute", async () => {
    const review = await gate.review(req(["git", "commit", "-m", "late"]), ctx);
    if (review.kind !== "approval_required") throw new Error("expected approval_required");
    const expired = {
      ...review.approval,
      status: "granted" as const,
      expires_at: new Date(Date.now() - 1_000).toISOString(),
    };
    const out = await gate.executeAfterApproval(expired, req(["git", "commit", "-m", "late"]), ctx);
    expect(out.ok).toBe(false);
    expect(out.refusalReason).toContain("expired");
  });

  it("secret paths are DENIED outright (s26): ssh keys, .env", async () => {
    const ssh = await gate.review(req(["type", join(dir, "nonexistent-ssh", "id_rsa")], repoPath, [repoPath, join(dir, "nonexistent-ssh")]), ctx);
    expect(ssh.kind).toBe("deny");
    if (ssh.kind === "deny") expect(ssh.result.rule_id).toBe("secret.path");
    const env = await gate.review(req(["type", join(dir, "nonexistent", ".env")], repoPath, [repoPath, join(dir, "nonexistent")]), ctx);
    expect(env.kind).toBe("deny");
    expect(audit.readAll().filter((r) => r.category === "action_blocked").length).toBe(2);
  });

  it("paths outside the allowed roots are DENIED (fs sandbox)", async () => {
    const out = await gate.review(req(["type", "C:\\Windows\\win.ini"], repoPath, [repoPath]), ctx);
    expect(out.kind).toBe("deny");
    if (out.kind === "deny") expect(out.result.rule_id).toBe("fs.sandbox");
  });

  it("npm install -> APPROVAL_REQUIRED (dependency installs are gated, s26)", async () => {
    const review = await gate.review(req(["npm", "install", "left-pad"]), ctx);
    expect(review.kind).toBe("approval_required");
    expect(auditTrail()).toContain("approval_requested:APPROVAL_REQUIRED");
  });

  it("unmatched commands default to APPROVAL_REQUIRED, never silent allow (ADR 0003)", async () => {
    const review = await gate.review(req(["unknown-tool-xyz", "--flag"]), ctx);
    expect(review.kind).toBe("approval_required");
  });

  it("wrong actor cannot execute someone else's approval (context binding, s58)", async () => {
    const fs = await import("node:fs");
    fs.writeFileSync(join(repoPath, "B.md"), "b\n");
    await execFileAsync("git", ["-C", repoPath, "add", "."]);
    const review = await gate.review(req(["git", "commit", "-m", "stolen"]), ctx);
    if (review.kind !== "approval_required") throw new Error("expected approval_required");
    const approved = { ...review.approval, status: "granted" as const };
    const attacker: GateContext = { ...ctx, actor: "usr_attacker" };
    const out = await gate.executeAfterApproval(approved, req(["git", "commit", "-m", "stolen"]), attacker);
    expect(out.ok).toBe(false);
    expect(out.refusalReason).toContain("context_mismatch");
    const log = await execFileAsync("git", ["-C", repoPath, "log", "--oneline"]);
    expect(log.stdout).not.toContain("stolen");
  });

  it("policy-version drift between approval and execution is rejected", async () => {
    const fs = await import("node:fs");
    fs.writeFileSync(join(repoPath, "C.md"), "c\n");
    await execFileAsync("git", ["-C", repoPath, "add", "."]);
    const review = await gate.review(req(["git", "commit", "-m", "drift"]), ctx);
    if (review.kind !== "approval_required") throw new Error("expected approval_required");
    const approved = { ...review.approval, status: "granted" as const };
    const newPolicy: GateContext = { ...ctx, policyVersion: "2" };
    const out = await gate.executeAfterApproval(approved, req(["git", "commit", "-m", "drift"]), newPolicy);
    expect(out.ok).toBe(false);
    expect(out.refusalReason).toContain("context_mismatch");
  });

  it("a consumed approval can never execute again, even from a fresh gate (state-based, not just in-memory)", async () => {
    const fs = await import("node:fs");
    fs.writeFileSync(join(repoPath, "D.md"), "d\n");
    await execFileAsync("git", ["-C", repoPath, "add", "."]);
    const review = await gate.review(req(["git", "commit", "-m", "once"]), ctx);
    if (review.kind !== "approval_required") throw new Error("expected approval_required");
    const approved = { ...review.approval, status: "granted" as const };
    await gate.executeAfterApproval(approved, req(["git", "commit", "-m", "once"]), ctx);
    const freshGate = new ExecutionGate({ audit });
    const out = await freshGate.executeAfterApproval(approved, req(["git", "commit", "-m", "once"]), ctx);
    expect(out.ok).toBe(false);
    expect(out.refusalReason).toContain("consumed");
  });

  it("a FAILED execution also consumes the approval - retries require fresh approval (safe default)", async () => {
    const review = await gate.review(req(["git", "commit", "-m", "nothing-staged"]), ctx);
    if (review.kind !== "approval_required") throw new Error("expected approval_required");
    const approved = { ...review.approval, status: "granted" as const };
    const out = await gate.executeAfterApproval(approved, req(["git", "commit", "-m", "nothing-staged"]), ctx);
    expect(out.ok).toBe(false);
    expect(out.exitCode).not.toBe(0);
    expect(approved.status).toBe("consumed");
    const retry = await gate.executeAfterApproval(approved, req(["git", "commit", "-m", "nothing-staged"]), ctx);
    expect(retry.ok).toBe(false);
    expect(retry.refusalReason).toContain("consumed");
  });
});

describe("AuditJournal (s114)", () => {
  it("append-only with monotonic ids; survives restart and continues the sequence", async () => {
    const a = new AuditJournal(auditPath(dir));
    a.record({ actor: "u", session_id: null, task_id: null, category: "policy_decision", action: "x", decision: "ALLOW", detail: "d", action_hash: null });
    a.record({ actor: "u", session_id: null, task_id: null, category: "push", action: "y", decision: "ALLOW", detail: "d", action_hash: null });
    const restarted = new AuditJournal(auditPath(dir));
    const third = restarted.record({ actor: "u", session_id: null, task_id: null, category: "pr_created", action: "z", decision: "ALLOW", detail: "d", action_hash: null });
    expect(third.audit_id).toBe(3);
    const all = new AuditJournal(auditPath(dir)).readAll();
    expect(all.map((r) => r.audit_id)).toEqual([1, 2, 3]);
  });
});
