import {
  assertTransition,
  newId,
  type AgentCapabilities,
  type ApprovalRequest,
  type EventEnvelope,
  type JarvisEventType,
  type JarvisSession,
  type RiskLevel,
  type SessionId,
  type SessionState,
  type TaskId,
} from "@jarvis/protocol";
import type { AdapterEvent, AgentAdapter, TaskContext } from "./adapter.js";
import type { CheckpointPhase, CheckpointStore } from "./checkpoint.js";

export interface JournalLike {
  emit(input: {
    type: JarvisEventType;
    user_id: string;
    workstation_id: string;
    task_id?: string | null;
    session_id?: string | null;
    payload?: Record<string, unknown>;
    source?: EventEnvelope["source"];
  }): EventEnvelope;
}

export interface CreateGatewaySessionInput {
  taskId?: TaskId;
  repository: string;
  branch: string;
  worktreePath: string;
  prompt: string;
  validationCommands: readonly string[];
  userId: string;
  workstationId: string;
  riskLevel?: RiskLevel;
}

const ADAPTER_EVENT_TO_JARVIS: Record<AdapterEvent["kind"], { type: JarvisEventType; state?: SessionState } | null> = {
  "thinking-summary": { type: "AgentThinkingSummary" },
  command: { type: "CommandFinished" },
  "file-changed": { type: "FileChanged" },
  patch: { type: "PatchGenerated" },
  "test-started": { type: "TestStarted", state: "TESTING" },
  "test-result": { type: "TestFinished" },
  "review-ready": { type: "PRCreated", state: "REVIEW_READY" },
  "approval-request": { type: "ApprovalRequested", state: "WAITING_FOR_APPROVAL" },
  message: { type: "AgentMessage" },
  completed: { type: "AgentCompleted", state: "COMPLETED" },
  failed: { type: "AgentFailed", state: "FAILED" },
};

export class AgentGateway {
  private readonly sessions = new Map<SessionId, GatewaySession>();

  constructor(
    private readonly deps: {
      adapter: AgentAdapter;
      journal: JournalLike;
      checkpoints: CheckpointStore | null;
      checkpointPhases?: Record<string, CheckpointPhase>;
    },
  ) {}

  capabilities(): AgentCapabilities {
    return this.deps.adapter.capabilities();
  }

  async adapterHealth(): Promise<{ ok: boolean; detail: string }> {
    return this.deps.adapter.available();
  }

  getSession(id: SessionId): GatewaySession | null {
    return this.sessions.get(id) ?? null;
  }

  listSessions(): GatewaySession[] {
    return [...this.sessions.values()];
  }

  async createSession(input: CreateGatewaySessionInput): Promise<GatewaySession> {
    const taskId = input.taskId ?? newId("task");
    const sessionId = newId("sess");
    const session = new GatewaySession({
      sessionId,
      taskId,
      userId: input.userId,
      workstationId: input.workstationId,
      repository: input.repository,
      adapter: this.deps.adapter,
      journal: this.deps.journal,
      checkpoints: this.deps.checkpoints,
      riskLevel: input.riskLevel ?? "HIGH",
    });
    this.sessions.set(sessionId, session);
    session.transition("QUEUED");
    session.emit("TaskQueued", {});
    session.transition("PREFLIGHT");
    session.emit("PreflightStarted", { checks: ["repository reachable", "git present", "policy loaded"] });
    session.transition("STARTING");
    session.emit("PreflightPassed", { checks_passed: 3 });
    session.transition("RUNNING");
    session.emit("AgentStarted", { repository: input.repository, agent: this.deps.adapter.id });

    const context: TaskContext = {
      repository: input.repository,
      branch: input.branch,
      worktreePath: input.worktreePath,
      prompt: input.prompt,
      validationCommands: input.validationCommands,
    };
    this.deps.adapter.start(context, (event) => session.onAdapterEvent(event));
    return session;
  }
}

export class GatewaySession {
  private state: SessionState = "CREATED";
  private approval: ApprovalRequest | null = null;
  private approvalAction: { action: string; payload: Record<string, unknown> } | null = null;
  private readonly listeners: Array<(envelope: EventEnvelope) => void> = [];

  constructor(private readonly meta: {
    sessionId: SessionId;
    taskId: TaskId;
    userId: string;
    workstationId: string;
    repository: string;
    adapter: AgentAdapter;
    journal: JournalLike;
    checkpoints: CheckpointStore | null;
    riskLevel: RiskLevel;
  }) {}

  jarvisSession(): JarvisSession {
    return {
      jarvis_session_id: this.meta.sessionId,
      user_id: this.meta.userId as never,
      workstation_id: this.meta.workstationId as never,
      task_id: this.meta.taskId,
      repository_id: this.meta.repository as never,
      worktree_id: "wt_pending" as never,
      agent_type: this.meta.adapter.id,
      agent_session_id: null,
      state: this.state,
      event_cursor: 0,
      created_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    };
  }

  currentState(): SessionState {
    return this.state;
  }

  pendingApproval(): ApprovalRequest | null {
    return this.approval;
  }

  subscribe(listener: (envelope: EventEnvelope) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  emit(type: JarvisEventType, payload: Record<string, unknown>): EventEnvelope {
    const envelope = this.meta.journal.emit({
      type,
      user_id: this.meta.userId,
      workstation_id: this.meta.workstationId,
      task_id: this.meta.taskId,
      session_id: this.meta.sessionId,
      payload,
      source: "workstation",
    });
    for (const listener of this.listeners) listener(envelope);
    return envelope;
  }

  transition(to: SessionState): void {
    assertTransition(this.state, to);
    this.state = to;
    this.meta.checkpoints?.record({
      taskId: this.meta.taskId,
      sessionId: this.meta.sessionId,
      phase: this.phaseForState(to),
      state: to,
      worktreePath: "",
      recordedAt: new Date().toISOString(),
    });
  }

  async onAdapterEvent(event: AdapterEvent): Promise<void> {
    const mapping = ADAPTER_EVENT_TO_JARVIS[event.kind];
    if (mapping === null) return;
    if (event.kind === "approval-request") {
      this.approvalAction = { action: event.action, payload: event.payload };
      const approval = await import("@jarvis/protocol").then((p) =>
        p.makeApprovalRequest({
          user_id: this.meta.userId,
          session_id: this.meta.sessionId,
          task_id: this.meta.taskId,
          action: event.action,
          action_payload: event.payload,
          policy_version: "1",
          risk_level: this.meta.riskLevel,
        }),
      );
      this.approval = approval;
      this.transition("WAITING_FOR_APPROVAL");
      this.emit(mapping.type, { action: event.action, approval_id: approval.approval_id });
      return;
    }
    if (mapping.state !== undefined && mapping.state !== this.state) {
      this.transition(mapping.state);
    }
    this.emit(mapping.type, eventToPayload(event));
  }

  async decide(approve: boolean): Promise<{ ok: boolean; reason?: string }> {
    const approval = this.approval;
    const action = this.approvalAction;
    if (approval === null || action === null) {
      return { ok: false, reason: "no pending approval" };
    }
    const { verifyApprovalBinding } = await import("@jarvis/protocol");
    const binding = await verifyApprovalBinding({
      approval,
      action: action.action,
      action_payload: action.payload,
    });
    if (!binding.ok) {
      return { ok: false, reason: `approval rejected: ${binding.reason}` };
    }
    this.approval = { ...approval, status: approve ? "granted" : "denied" };
    this.meta.adapter.decideApproval(approve);
    if (approve) {
      if (this.state !== "RUNNING") this.transition("RUNNING");
      this.emit("ApprovalGranted", { action: action.action });
    } else {
      if (this.state !== "PAUSED") this.transition("PAUSED");
      this.emit("ApprovalDenied", { action: action.action });
    }
    this.approval = null;
    this.approvalAction = null;
    return { ok: true };
  }

  followUp(message: string): void {
    this.meta.adapter.followUp(message);
  }

  pause(): void {
    this.transition("PAUSED");
    this.emit("AgentPaused", {});
  }

  resume(): void {
    this.transition("RUNNING");
    this.emit("AgentResumed", {});
  }

  stop(): void {
    this.meta.adapter.stop();
    this.transition("CANCELLED");
    this.emit("AgentFailed", { reason: "stopped by user" });
  }

  private phaseForState(state: SessionState): CheckpointPhase {
    switch (state) {
      case "QUEUED":
        return "TASK_ACCEPTED";
      case "PREFLIGHT":
        return "REPO_PREPARED";
      case "RUNNING":
        return "IMPLEMENTATION_STARTED";
      case "TESTING":
        return "TEST_CHECKPOINT";
      case "REVIEW_READY":
        return "REVIEW_CHECKPOINT";
      case "WAITING_FOR_APPROVAL":
        return "APPROVAL_CHECKPOINT";
      case "COMPLETED":
        return "FINALIZATION";
      default:
        return "IMPLEMENTATION_CHECKPOINT";
    }
  }
}

function eventToPayload(event: AdapterEvent): Record<string, unknown> {
  switch (event.kind) {
    case "thinking-summary":
      return { summary: event.summary };
    case "command":
      return { command: event.command, exit_code: event.exitCode };
    case "file-changed":
      return { path: event.path, change: event.change };
    case "patch":
      return { files: event.files, additions: event.additions, deletions: event.deletions };
    case "test-started":
      return { command: event.command };
    case "test-result":
      return { command: event.command, passed: event.passed, failed: event.failed, exit_code: event.exitCode };
    case "review-ready":
      return { draft: event.prDraft };
    case "message":
      return { text: event.text };
    case "completed":
      return { summary: event.summary };
    case "failed":
      return { reason: event.reason };
    case "approval-request":
      return { action: event.action };
  }
}
