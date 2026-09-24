import {
  assertTransition,
  makeApprovalRequest,
  verifyApprovalBinding,
  type ApprovalRequest,
  type EventEnvelope,
  type SessionId,
  type SessionState,
  type TaskId,
  type UserId,
  type WorkstationId,
} from "@jarvis/protocol";
import type { SessionJournal } from "./journal.js";

export interface MockAgentDeps {
  sessionId: SessionId;
  taskId: TaskId;
  userId: UserId;
  workstationId: WorkstationId;
  repository: string;
  branch: string;
  journal: SessionJournal;
  stepIntervalMs?: number;
}

export type AgentListener = (state: SessionState) => void;

export class MockAgentSession {
  private state: SessionState = "CREATED";
  private approval: ApprovalRequest | null = null;
  private approvalAction: { action: string; payload: unknown } | null = null;
  private decision: "granted" | "denied" | null = null;
  private listeners: AgentListener[] = [];
  private readonly stepMs: number;
  private readonly deps: MockAgentDeps;
  private started = false;

  constructor(deps: MockAgentDeps) {
    this.deps = deps;
    this.stepMs = deps.stepIntervalMs ?? 120;
  }

  onState(listener: AgentListener): void {
    this.listeners.push(listener);
  }

  currentState(): SessionState {
    return this.state;
  }

  pendingApproval(): ApprovalRequest | null {
    return this.approval;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    void this.runScript();
  }

  async decide(approve: boolean, action: string, payload: unknown): Promise<{ ok: boolean; reason?: string }> {
    if (this.approval === null || this.approvalAction === null) {
      return { ok: false, reason: "no pending approval" };
    }
    const binding = await verifyApprovalBinding({
      approval: this.approval,
      action,
      action_payload: payload,
    });
    if (!binding.ok) return { ok: false, reason: binding.reason };
    this.approval = { ...this.approval, status: approve ? "granted" : "denied" };
    this.decision = approve ? "granted" : "denied";
    return { ok: true };
  }

  private async runScript(): Promise<void> {
    const d = this.deps;
    const seq = (): number => d.journal.latest() + 1;
    const emit = (type: EventEnvelope["type"], payload: Record<string, unknown>, state?: SessionState): void => {
      if (state !== undefined && state !== this.state) {
        assertTransition(this.state, state);
        this.state = state;
        for (const l of this.listeners) l(this.state);
      }
      d.journal.append({
        event_id: `evt_${crypto.randomUUID()}`,
        event_version: 1,
        type,
        occurred_at: new Date().toISOString(),
        user_id: d.userId,
        workstation_id: d.workstationId,
        task_id: d.taskId,
        session_id: d.sessionId,
        sequence: seq(),
        payload,
        source: "workstation",
      });
    };
    const wait = (): Promise<void> => new Promise((r) => setTimeout(r, this.stepMs));

    emit("TaskQueued", { position: 1 }, "QUEUED");
    await wait();
    emit("PreflightStarted", { checks: ["repository reachable", "git present", "runtime available", "policy loaded"] }, "PREFLIGHT");
    await wait();
    emit("PreflightPassed", { checks_passed: 12 }, "STARTING");
    await wait();
    emit("AgentStarted", { repository: d.repository, agent: "mock-agent" }, "RUNNING");
    await wait();
    emit("AgentThinkingSummary", { summary: `Inspecting ${d.repository} and its tests before touching anything.` });
    await wait();
    emit("FileChanged", { path: "src/ws/reconnect.ts", change: "modified" });
    await wait();
    emit("FileChanged", { path: "tests/ws.test.ts", change: "created" });
    await wait();
    emit("PatchGenerated", { files: 2, additions: 126, deletions: 31 });
    await wait();
    emit("TestStarted", { command: "npm test" });
    await wait();
    emit("TestFinished", { command: "npm test", passed: 184, failed: 0, exit_code: 0 });

    const action = `git push origin ${d.branch}`;
    const payload = { repository: d.repository, branch: d.branch, force: false };
    this.approvalAction = { action, payload };
    this.approval = await makeApprovalRequest({
      user_id: d.userId,
      session_id: d.sessionId,
      task_id: d.taskId,
      action,
      action_payload: payload,
      policy_version: "demo-1",
      risk_level: "HIGH",
    });
    emit("ApprovalRequested", { action, approval_id: this.approval.approval_id }, "WAITING_FOR_APPROVAL");

    const decided = await this.waitForDecision();
    if (!decided) {
      emit("ApprovalDenied", { action }, "PAUSED");
      return;
    }

    emit("ApprovalGranted", { action }, "RUNNING");
    await wait();
    emit("CommitCreated", { message: `feat: ${d.branch} (demo)`, branch: d.branch });
    await wait();
    emit("TestStarted", { command: "npm test", phase: "final verification" }, "TESTING");
    await wait();
    emit("TestFinished", { command: "npm test", passed: 184, failed: 0, exit_code: 0 });
    await wait();
    emit("PRCreated", { url: `https://github.com/${d.repository}/pull/demo`, draft: true }, "REVIEW_READY");
    await wait();
    emit("AgentCompleted", { summary: "All checks passed; draft PR created.", tests: { passed: 184, failed: 0 } }, "COMPLETED");
  }

  private waitForDecision(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const poll = (): void => {
        if (this.decision === "granted") {
          resolve(true);
          return;
        }
        if (this.decision === "denied") {
          resolve(false);
          return;
        }
        setTimeout(poll, 50);
      };
      poll();
    });
  }
}
