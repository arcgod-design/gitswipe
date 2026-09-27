import type { AdapterEvent, AgentAdapter, TaskContext } from "./adapter.js";

const STEP_MS_DEFAULT = 60;

export class MockAgentAdapter implements AgentAdapter {
  readonly id = "mock";
  readonly displayName = "Deterministic mock agent (contract s202)";

  private onEvent: ((event: AdapterEvent) => void) | null = null;
  private stopped = false;
  private decision: "granted" | "denied" | null = null;
  private readonly stepMs: number;

  constructor(stepMs: number = STEP_MS_DEFAULT) {
    this.stepMs = stepMs;
  }

  capabilities(): import("@jarvis/protocol").AgentCapabilities {
    return {
      followUp: true,
      pauseResume: true,
      interrupt: true,
      structuredEvents: true,
      worktreeIsolation: true,
    };
  }

  async available(): Promise<{ ok: boolean; detail: string }> {
    return { ok: true, detail: "deterministic; always available" };
  }

  start(context: TaskContext, onEvent: (event: AdapterEvent) => void): void {
    this.onEvent = onEvent;
    void this.run(context);
  }

  followUp(message: string): void {
    if (this.onEvent === null || this.stopped) return;
    this.onEvent({ kind: "message", text: `follow-up received: ${message}` });
    this.onEvent({ kind: "message", text: "inspected the changed path and re-ran the relevant tests; no further changes needed" });
  }

  decideApproval(approve: boolean): void {
    this.decision = approve ? "granted" : "denied";
  }

  stop(): void {
    this.stopped = true;
  }

  private async run(context: TaskContext): Promise<void> {
    const emit = (event: AdapterEvent): void => {
      if (this.stopped || this.onEvent === null) return;
      this.onEvent(event);
    };
    const wait = (): Promise<void> => new Promise((r) => setTimeout(r, this.stepMs));

    emit({ kind: "thinking-summary", summary: `Inspecting ${context.repository} in the isolated worktree before touching anything.` });
    await wait();
    emit({ kind: "file-changed", path: "src/ws/reconnect.ts", change: "modified" });
    await wait();
    emit({ kind: "file-changed", path: "tests/ws.test.ts", change: "created" });
    await wait();
    emit({ kind: "patch", files: 2, additions: 126, deletions: 31 });
    await wait();
    emit({ kind: "test-result", command: context.validationCommands[0] ?? "npm test", passed: 184, failed: 0, exitCode: 0 });
    emit({ kind: "approval-request", action: `git push origin ${context.branch}`, payload: { repository: context.repository, branch: context.branch, force: false } });

    const decided = await this.waitForDecision();
    if (this.stopped) return;
    if (!decided) {
      emit({ kind: "failed", reason: "approval denied" });
      return;
    }
    emit({ kind: "command", command: `git commit -m "feat: ${context.branch}"`, exitCode: 0 });
    await wait();
    emit({ kind: "test-started", command: context.validationCommands[0] ?? "npm test" });
    await wait();
    emit({ kind: "test-result", command: context.validationCommands[0] ?? "npm test", passed: 184, failed: 0, exitCode: 0 });
    await wait();
    emit({ kind: "review-ready", prDraft: true });
    await wait();
    emit({ kind: "completed", summary: "All checks passed; draft PR ready." });
  }

  private waitForDecision(): Promise<boolean> {
    return new Promise((resolve) => {
      const poll = (): void => {
        if (this.stopped) {
          resolve(false);
          return;
        }
        if (this.decision === "granted") {
          resolve(true);
          return;
        }
        if (this.decision === "denied") {
          resolve(false);
          return;
        }
        setTimeout(poll, 20);
      };
      poll();
    });
  }
}
