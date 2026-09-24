import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { MockAgentAdapter } from "../src/mock-adapter.js";
import { AgentGateway, type GatewaySession } from "../src/gateway.js";
import { CheckpointStore } from "../src/checkpoint.js";
import { WorktreeManager, branchNameFor, writeLedgerEntry } from "../src/worktree.js";
import { OpenCodeAdapter, OPENCODE_TAKEOVER_NOTE } from "../src/opencode.js";
import { sessionTitleFor } from "../src/adapter.js";
import type { EventEnvelope, JarvisEventType } from "@jarvis/protocol";

const execFileAsync = promisify(execFile);

let dir: string;
let repoPath: string;
let workspaceRoot: string;
let journalEvents: EventEnvelope[];
let checkpoints: CheckpointStore;

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "jvs-w06-"));
  repoPath = join(dir, "scratch-repo");
  workspaceRoot = join(dir, "workspaces");
  await execFileAsync("git", ["init", "-b", "main", repoPath]);
  const readme = join(repoPath, "README.md");
  const fs = await import("node:fs");
  fs.writeFileSync(readme, "# scratch\n");
  await execFileAsync("git", ["-C", repoPath, "add", "."]);
  await execFileAsync("git", ["-C", repoPath, "-c", "user.name=T", "-c", "user.email=t@t.test", "commit", "-m", "init"]);
  journalEvents = [];
  checkpoints = new CheckpointStore(join(dir, "checkpoints"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function makeGateway(adapter = new MockAgentAdapter(30)): { gateway: AgentGateway; subscribe: (s: GatewaySession) => void } {
  const emitted: EventEnvelope[] = [];
  journalEvents = emitted;
  const gateway = new AgentGateway({
    adapter,
    journal: {
      emit: (input) => {
        const envelope: EventEnvelope = {
          event_id: `evt_test_${emitted.length + 1}`,
          event_version: 1,
          type: input.type,
          occurred_at: new Date().toISOString(),
          user_id: input.user_id,
          workstation_id: input.workstation_id,
          task_id: input.task_id ?? null,
          session_id: input.session_id ?? null,
          sequence: emitted.length + 1,
          payload: input.payload ?? {},
          source: input.source ?? "workstation",
        };
        emitted.push(envelope);
        return envelope;
      },
    },
    checkpoints,
  });
  return {
    gateway,
    subscribe: (s) => {
      s.subscribe((e) => void e);
    },
  };
}

function types(): JarvisEventType[] {
  return journalEvents.map((e) => e.type);
}

async function waitFor(predicate: () => boolean, timeoutMs = 4000): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error(`timeout; got: ${types().join(", ")}`);
    await new Promise((r) => setTimeout(r, 25));
  }
}

async function startSessionOnWorktree(gateway: AgentGateway): Promise<{ session: GatewaySession; branch: string; worktreePath: string }> {
  const wm = new WorktreeManager(workspaceRoot);
  const branch = branchNameFor(12, "Add retry backoff to websocket reconnect", "t1");
  const ref = await wm.create({ repoPath, branch, repoSlug: "scratch-repo", issueNumber: 12 });
  const session = await gateway.createSession({
    repository: "demo/scratch-repo",
    branch,
    worktreePath: ref.worktreePath,
    prompt: "implement the fix",
    validationCommands: ["npm test"],
    userId: "usr_test",
    workstationId: "ws_test",
  });
  return { session, branch, worktreePath: ref.worktreePath };
}

describe("WEEK-06 exit test: mock-agent lifecycle E2E on a real scratch repo", () => {
  it("creates an isolated worktree, runs the full lifecycle, approval binds, completes", async () => {
    const { gateway } = makeGateway();
    const { session, branch, worktreePath } = await startSessionOnWorktree(gateway);

    await waitFor(() => session.pendingApproval() !== null);
    expect(session.currentState()).toBe("WAITING_FOR_APPROVAL");
    expect(types()).toEqual([
      "TaskQueued",
      "PreflightStarted",
      "PreflightPassed",
      "AgentStarted",
      "AgentThinkingSummary",
      "FileChanged",
      "FileChanged",
      "PatchGenerated",
      "TestFinished",
      "ApprovalRequested",
    ]);
    const approvalPayload = journalEvents.find((e) => e.type === "ApprovalRequested")!.payload;
    expect(approvalPayload.action).toBe(`git push origin ${branch}`);
    expect((await import("node:fs")).existsSync(join(worktreePath, "README.md"))).toBe(true);

    const decided = await session.decide(true);
    expect(decided.ok).toBe(true);
    await waitFor(() => session.currentState() === "COMPLETED");
    expect(types()).toEqual([
      "TaskQueued",
      "PreflightStarted",
      "PreflightPassed",
      "AgentStarted",
      "AgentThinkingSummary",
      "FileChanged",
      "FileChanged",
      "PatchGenerated",
      "TestFinished",
      "ApprovalRequested",
      "ApprovalGranted",
      "CommandFinished",
      "TestStarted",
      "TestFinished",
      "PRCreated",
      "AgentCompleted",
    ]);
    expect(session.currentState()).toBe("COMPLETED");
  });

  it("deny pauses the session with ApprovalDenied; re-approve is rejected", async () => {
    const { gateway } = makeGateway();
    const { session } = await startSessionOnWorktree(gateway);
    await waitFor(() => session.pendingApproval() !== null);

    const denied = await session.decide(false);
    expect(denied.ok).toBe(true);
    expect(session.currentState()).toBe("PAUSED");
    expect(types()).toContain("ApprovalDenied");
    expect(types()).not.toContain("AgentCompleted");

    const again = await session.decide(true);
    expect(again).toEqual({ ok: false, reason: "no pending approval" });
  });

  it("pause/resume around the approval gate; follow-up reaches the same adapter session", async () => {
    const { gateway } = makeGateway();
    const { session } = await startSessionOnWorktree(gateway);
    await waitFor(() => session.pendingApproval() !== null);
    expect(session.currentState()).toBe("WAITING_FOR_APPROVAL");

    session.pause();
    expect(session.currentState()).toBe("PAUSED");
    session.resume();
    expect(session.currentState()).toBe("RUNNING");

    const decided = await session.decide(true);
    expect(decided.ok).toBe(true);
    await waitFor(() => session.currentState() === "COMPLETED");

    session.followUp("do not change the public API");
    await waitFor(() => types().includes("AgentMessage"));
    expect(journalEvents.filter((e) => e.type === "AgentMessage").length).toBeGreaterThanOrEqual(2);

    expect(() => session.pause()).toThrow(/invalid session transition: COMPLETED -> PAUSED/);
  });

  it("checkpoints record the phase trail (contract s33)", async () => {
    const { gateway } = makeGateway();
    const { session } = await startSessionOnWorktree(gateway);
    await waitFor(() => session.pendingApproval() !== null);
    await session.decide(true);
    await waitFor(() => session.currentState() === "COMPLETED");

    const trail = checkpoints.readAll().map((c) => `${c.state}:${c.phase}`);
    expect(trail).toContain("QUEUED:TASK_ACCEPTED");
    expect(trail).toContain("PREFLIGHT:REPO_PREPARED");
    expect(trail).toContain("RUNNING:IMPLEMENTATION_STARTED");
    expect(trail).toContain("WAITING_FOR_APPROVAL:APPROVAL_CHECKPOINT");
    expect(trail).toContain("TESTING:TEST_CHECKPOINT");
    expect(trail).toContain("REVIEW_READY:REVIEW_CHECKPOINT");
    expect(trail).toContain("COMPLETED:FINALIZATION");
  });
});

describe("WorktreeManager (REPO-WORK-CONVENTIONS)", () => {
  it("branch naming: issue-sourced and jarvis-sourced", () => {
    expect(branchNameFor(12, "Add retry backoff!!", "t9")).toBe("feat/issue-12-add-retry-backoff");
    expect(branchNameFor(null, "Memory leak", "abc123")).toBe("feat/jarvis-abc123-memory-leak");
  });

  it("isolated worktrees: two tasks get separate directories; cleanup removes them", async () => {
    const wm = new WorktreeManager(workspaceRoot);
    const a = await wm.create({ repoPath, branch: "feat/issue-1-a", repoSlug: "scratch-repo", issueNumber: 1 });
    const b = await wm.create({ repoPath, branch: "feat/issue-2-b", repoSlug: "scratch-repo", issueNumber: 2 });
    expect(a.worktreePath).not.toBe(b.worktreePath);
    expect((await wm.verify(a)).ok).toBe(true);

    await wm.cleanup(a, { preserve: false });
    const fs = await import("node:fs");
    expect(fs.existsSync(a.worktreePath)).toBe(false);
    expect(fs.existsSync(b.worktreePath)).toBe(true);
    await wm.cleanup(b, { preserve: false });
  });

  it("duplicate worktree creation is refused; ledger appends entries", async () => {
    const wm = new WorktreeManager(workspaceRoot);
    await wm.create({ repoPath, branch: "feat/issue-3-c", repoSlug: "scratch-repo", issueNumber: 3 });
    await expect(wm.create({ repoPath, branch: "feat/issue-3-c2", repoSlug: "scratch-repo", issueNumber: 3 })).rejects.toThrow(
      /worktree already exists/,
    );
    writeLedgerEntry(workspaceRoot, { issue: 3, state: "open" });
    writeLedgerEntry(workspaceRoot, { issue: 3, state: "mergeable" });
    const fs = await import("node:fs");
    expect(fs.readFileSync(join(workspaceRoot, "ledger.jsonl"), "utf-8").trim().split("\n")).toHaveLength(2);
    const wm2 = new WorktreeManager(join(dir, "other-ws"));
    await wm2.create({ repoPath, branch: "feat/issue-3-c3", repoSlug: "scratch-repo", issueNumber: 3 });
  });
});

describe("OpenCodeAdapter (contract s203: mock-first; PROTO until live)", () => {
  it("reports unavailable honestly when the CLI is absent", async () => {
    const adapter = new OpenCodeAdapter({
      probeBinary: async () => ({ ok: false, detail: "ENOENT" }),
    });
    const health = await adapter.available();
    expect(health.ok).toBe(false);
    expect(health.detail).toContain("not found");
  });

  it("server health probes the documented port; unreachable is reported, not thrown", async () => {
    const adapter = new OpenCodeAdapter({ serverUrl: "http://127.0.0.1:1" });
    const health = await adapter.serverHealth();
    expect(health.ok).toBe(false);
    const healthy = new OpenCodeAdapter({
      serverUrl: "http://127.0.0.1:1",
      fetch: (async () => new Response(null, { status: 200 })) as typeof fetch,
    });
    expect((await healthy.serverHealth()).ok).toBe(true);
  });

  it("runtime paths refuse to pretend (PROTO discipline)", () => {
    const adapter = new OpenCodeAdapter();
    expect(() => adapter.start({ repository: "x", branch: "b", worktreePath: "/tmp", prompt: "p", validationCommands: [] }, () => undefined)).toThrow(
      /PROTO/,
    );
  });

  it("dispatch command follows the researched convention: --dir worktree, --title GitSwipe label, --model", () => {
    const adapter = new OpenCodeAdapter();
    const cmd = adapter.runCommandFor(
      {
        repository: "demo/scratch-repo",
        branch: "feat/issue-12-add-retry-backoff",
        worktreePath: "C:/ws/scratch/issue-12",
        prompt: "solve issue #12",
        validationCommands: ["npm test"],
        sessionTitle: sessionTitleFor("demo/scratch-repo", 12, "Add retry backoff"),
      },
      "anthropic/claude-sonnet-4-5",
    );
    expect(cmd.binary).toBe("opencode");
    const joined = cmd.args.join(" ");
    expect(joined).toContain("--dir C:/ws/scratch/issue-12");
    expect(joined).toContain("--title GitSwipe: Issue #12 - demo/scratch-repo (add-retry-backoff)");
    expect(joined).toContain("--model anthropic/claude-sonnet-4-5");
  });

  it("session titles are clean for the Desktop queue; takeover note documents the resume path", () => {
    expect(sessionTitleFor("o/r", 12, "Add retry backoff!!")).toBe("GitSwipe: Issue #12 - o/r (add-retry-backoff)");
    expect(sessionTitleFor("o/r", null, "Memory leak")).toBe("GitSwipe: task - o/r (memory-leak)");
    expect(OPENCODE_TAKEOVER_NOTE).toContain("opencode session resume");
    expect(OPENCODE_TAKEOVER_NOTE).toContain("Verify flags");
  });
});

describe("gateway-level adapter health + session registry", () => {
  it("adapter health flows through the gateway; sessions are listed", async () => {
    const { gateway } = makeGateway();
    const health = await gateway.adapterHealth();
    expect(health.ok).toBe(true);
    const { session } = await startSessionOnWorktree(gateway);
    expect(gateway.listSessions().map((s) => s.jarvisSession().jarvis_session_id)).toContain(
      session.jarvisSession().jarvis_session_id,
    );
    expect(session.jarvisSession().agent_type).toBe("mock");
  });
});
