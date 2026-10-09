import { spawn, type ChildProcess } from "node:child_process";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import type { AdapterEvent, AgentAdapter, TaskContext } from "./adapter.js";
import { probeBinary } from "./adapter.js";

const execFileAsync = promisify(execFile);

export function resolveOpenCodeBinary(): string {
  if (process.platform === "win32") {
    const globalNpm = join(process.env.APPDATA ?? "", "npm", "node_modules", "opencode-ai", "bin", "opencode.exe");
    if (existsSync(globalNpm)) return globalNpm;
  }
  return "opencode";
}

export interface OpenCodeAdapterOptions {
  serverUrl?: string;
  modelChain?: readonly string[];
  probeBinary?: (binary: string, args?: readonly string[]) => Promise<{ ok: boolean; detail: string }>;
  fetch?: typeof globalThis.fetch;
  spawnFn?: typeof spawn;
  maxRunMs?: number;
}

export const DEFAULT_OPENCODE_MODEL_CHAIN = [
  "nvidia/nvidia/nemotron-3.5-lightning-30b-a3b",
  "nvidia/nvidia/nemotron-3-super-120b-a12b",
] as const;

export const OPENCODE_TAKEOVER_NOTE =
  "Takeover: CLI-initiated sessions appear in the OpenCode Desktop app via the shared session database; from a terminal run 'opencode session list' then 'opencode session resume <agent_session_id>' (the one-way /sessions quirk does not lose data). Verify flags against current docs at live-integration time (contract s18)." as const;

export function opencodeRunArgs(context: TaskContext, model: string): string[] {
  return [
    "run",
    "--dir",
    context.worktreePath,
    "--title",
    context.sessionTitle ?? `GitSwipe: ${context.repository}`,
    "--model",
    model,
    context.prompt,
  ];
}

interface RunState {
  context: TaskContext;
  onEvent: (event: AdapterEvent) => void;
  child: ChildProcess | null;
  settled: boolean;
  approvalAction: string | null;
}

export class OpenCodeAdapter implements AgentAdapter {
  readonly id = "opencode";
  readonly displayName = "OpenCode (live harness)";

  private readonly chain: readonly string[];
  private readonly doSpawn: typeof spawn;
  private state: RunState | null = null;
  opencodeSessionId: string | null = null;

  constructor(private readonly opts: OpenCodeAdapterOptions = {}) {
    this.chain = opts.modelChain ?? DEFAULT_OPENCODE_MODEL_CHAIN;
    this.doSpawn = opts.spawnFn ?? spawn;
  }

  capabilities(): import("@jarvis/protocol").AgentCapabilities {
    return {
      followUp: false,
      pauseResume: false,
      interrupt: true,
      structuredEvents: true,
      worktreeIsolation: true,
    };
  }

  async available(): Promise<{ ok: boolean; detail: string }> {
    const probe = this.opts.probeBinary ?? probeBinary;
    const cli = await probe(resolveOpenCodeBinary(), ["--version"]);
    if (!cli.ok) {
      return { ok: false, detail: "opencode CLI not found (global npm install or PATH); install it and retry" };
    }
    return cli;
  }

  async serverHealth(): Promise<{ ok: boolean; detail: string }> {
    const doFetch = this.opts.fetch ?? globalThis.fetch;
    const url = `${this.opts.serverUrl ?? "http://127.0.0.1:4096"}/health`;
    try {
      const res = await doFetch(url, { signal: AbortSignal.timeout(2_000) });
      return res.ok ? { ok: true, detail: `server reachable (HTTP ${res.status})` } : { ok: false, detail: `server responded HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : "server unreachable" };
    }
  }

  runCommandFor(context: TaskContext, model: string): { binary: string; args: string[] } {
    return { binary: "opencode", args: opencodeRunArgs(context, model) };
  }

  start(context: TaskContext, onEvent: (event: AdapterEvent) => void): void {
    if (this.state !== null && !this.state.settled) {
      onEvent({ kind: "failed", reason: "an opencode run is already active on this adapter" });
      return;
    }
    this.state = { context, onEvent, child: null, settled: false, approvalAction: null };
    void this.runWithFallback(context, onEvent);
  }

  followUp(_message: string): void {
    this.state?.onEvent({ kind: "message", text: "follow-ups land in the OpenCode Desktop app (shared session database) - resume the session there (ADR 0008 takeover note)" });
  }

  decideApproval(approve: boolean): void {
    const state = this.state;
    if (state === null || state.settled) return;
    if (state.approvalAction === null) return;
    void this.executeApproval(state, approve);
  }

  stop(): void {
    if (this.state?.child !== null && this.state?.child?.kill !== undefined) {
      this.state.child.kill();
    }
  }

  private async runWithFallback(context: TaskContext, onEvent: (event: AdapterEvent) => void): Promise<void> {
    for (let i = 0; i < this.chain.length; i += 1) {
      const model = this.chain[i]!;
      if (i > 0) onEvent({ kind: "message", text: `switching to fallback model: ${model}` });
      const outcome = await this.runOnce(context, onEvent, model);
      if (outcome === "ok" || outcome === "approved-flow") return;
      if (outcome === "terminal-failure") return;
      onEvent({ kind: "message", text: `model ${model} failed before producing work - trying the next in the chain` });
    }
    if (this.state !== null && !this.state.settled) {
      this.state.settled = true;
      onEvent({ kind: "failed", reason: `all models in the chain failed (${this.chain.join(", ")})` });
    }
  }

  private runOnce(context: TaskContext, onEvent: (event: AdapterEvent) => void, model: string): Promise<"ok" | "approved-flow" | "retry" | "terminal-failure"> {
    return new Promise((resolve) => {
      const { args } = this.runCommandFor(context, model);
      const prompt = args[args.length - 1] ?? "";
      const jsonArgs = [...args.slice(0, -1), "--format", "json", prompt];
      const child = this.doSpawn(resolveOpenCodeBinary(), jsonArgs, { cwd: context.worktreePath });
      if (this.state !== null) this.state.child = child;
      let producedOutput = false;
      let stderrTail = "";

      const timer = setTimeout(() => {
        if (this.state !== null && !this.state.settled) {
          this.state.settled = true;
          child.kill();
          onEvent({ kind: "failed", reason: `opencode run exceeded ${this.opts.maxRunMs ?? 1_800_000}ms` });
        }
        resolve("terminal-failure");
      }, this.opts.maxRunMs ?? 1_800_000);

      child.stdout?.on("data", (chunk: Buffer) => {
        const text = chunk.toString("utf-8");
        for (const raw of text.split(/\r?\n/)) {
          const line = raw.trim();
          if (line.length === 0) continue;
          producedOutput = true;
          this.emitJsonLine(line, onEvent);
        }
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        stderrTail = `${stderrTail}${chunk.toString("utf-8")}`.slice(-400);
      });
      child.on("error", (err) => {
        clearTimeout(timer);
        if (this.state !== null && this.state.settled) return resolve("terminal-failure");
        onEvent({ kind: "message", text: `opencode failed to start: ${err.message}` });
        resolve(producedOutput ? "terminal-failure" : "retry");
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (this.state !== null && this.state.settled) return resolve("terminal-failure");
        if (code !== 0 && !producedOutput) {
          onEvent({ kind: "message", text: `opencode exited ${code} before any output${stderrTail.length > 0 ? `: ${stderrTail.trim().slice(0, 200)}` : ""}` });
          return resolve("retry");
        }
        void this.finishRun(context, onEvent, code === 0);
        resolve("ok");
      });
    });
  }

  private emitJsonLine(line: string, onEvent: (event: AdapterEvent) => void): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as {
        type?: string;
        sessionID?: string;
        error?: { name?: string; message?: string };
        part?: { type?: string; text?: string; reason?: string; tokens?: { total?: number } };
      };
    } catch {
      onEvent({ kind: "message", text: line.slice(0, 300) });
      return;
    }
    const ev = parsed as { type?: string; sessionID?: string; error?: { name?: string; message?: string }; part?: { type?: string; text?: string; reason?: string; tokens?: { total?: number } } };
    if (this.opencodeSessionId === null && typeof ev.sessionID === "string") {
      this.opencodeSessionId = ev.sessionID;
      onEvent({ kind: "message", text: `opencode session ${ev.sessionID} - follow it live in the OpenCode Desktop app (shared session database)` });
    }
    if (ev.type === "error") {
      const reason = `${ev.error?.name ?? "opencode error"}: ${ev.error?.message ?? "unknown"}`;
      if (this.state !== null) this.state.settled = true;
      onEvent({ kind: "failed", reason });
      return;
    }
    const part = ev.part;
    if (part === undefined) return;
    if (part.type === "text" && typeof part.text === "string") {
      if (part.text.trim().length > 0) onEvent({ kind: "message", text: part.text.slice(0, 300) });
      return;
    }
    if (part.type === "step-start") {
      onEvent({ kind: "thinking-summary", summary: "agent step started" });
      return;
    }
    if (part.type === "step-finish") {
      const tokens = part.tokens?.total ?? 0;
      onEvent({ kind: "message", text: `step finished (${part.reason ?? "done"}, ${tokens} tokens)` });
      return;
    }
    onEvent({ kind: "thinking-summary", summary: `agent: ${part.type ?? "event"}` });
  }

  private async finishRun(context: TaskContext, onEvent: (event: AdapterEvent) => void, cleanExit: boolean): Promise<void> {
    try {
      const status = await execFileAsync("git", ["-C", context.worktreePath, "status", "--porcelain"], { timeout: 15_000 });
      for (const line of status.stdout.split(/\r?\n/)) {
        const path = line.slice(3).trim();
        if (path.length === 0) continue;
        onEvent({ kind: "file-changed", path, change: line.startsWith("??") ? "created" : "modified" });
      }
      const shortstat = await execFileAsync("git", ["-C", context.worktreePath, "diff", "--shortstat"], { timeout: 15_000 }).catch(() => undefined);
      if (shortstat !== undefined && shortstat.stdout.trim().length > 0) {
        const files = /(\d+) files? changed/.exec(shortstat.stdout);
        const adds = /(\d+) insertions?/.exec(shortstat.stdout);
        const dels = /(\d+) deletions?/.exec(shortstat.stdout);
        onEvent({ kind: "patch", files: files ? Number(files[1]) : 0, additions: adds ? Number(adds[1]) : 0, deletions: dels ? Number(dels[1]) : 0 });
      }
    } catch {
      onEvent({ kind: "message", text: "could not inspect the worktree after the run" });
    }

    if (!cleanExit) {
      if (this.state !== null) this.state.settled = true;
      onEvent({ kind: "failed", reason: "opencode exited with errors" });
      return;
    }

    for (const command of context.validationCommands) {
      onEvent({ kind: "test-started", command });
      try {
        const res = await promisify(execFile)(command, [], { cwd: context.worktreePath, shell: true, timeout: 300_000 });
        onEvent({ kind: "test-result", command, passed: 1, failed: 0, exitCode: 0 });
        void res;
      } catch (err) {
        const e = err as { code?: number | string };
        const exitCode = typeof e.code === "number" ? e.code : 1;
        onEvent({ kind: "test-result", command, passed: 0, failed: 1, exitCode });
      }
    }

    const branch = context.branch;
    const pushCommand = `git push origin ${branch}`;
    if (this.state !== null) this.state.approvalAction = pushCommand;
    onEvent({ kind: "review-ready", prDraft: false });
    onEvent({ kind: "approval-request", action: pushCommand, payload: { branch, worktreePath: context.worktreePath } });
  }

  private async executeApproval(state: RunState, approve: boolean): Promise<void> {
    if (!approve) {
      state.settled = true;
      state.onEvent({ kind: "command", command: `${state.approvalAction} (denied)`, exitCode: null });
      state.onEvent({ kind: "completed", summary: `push denied by the user - branch ${state.context.branch} stays local in ${state.context.worktreePath}` });
      return;
    }
    const command = state.approvalAction ?? `git push origin ${state.context.branch}`;
    try {
      await execFileAsync("git", ["-C", state.context.worktreePath, "push", "origin", state.context.branch], { timeout: 120_000 });
      state.onEvent({ kind: "command", command, exitCode: 0 });
      state.settled = true;
      state.onEvent({ kind: "completed", summary: `branch ${state.context.branch} pushed to origin (fork) - open the PR from your fork; commits carry (closes #N) keywords per the ssoc pattern` });
    } catch (err) {
      state.onEvent({ kind: "command", command, exitCode: 1 });
      state.settled = true;
      state.onEvent({
        kind: "completed",
        summary: `push failed: ${err instanceof Error ? err.message.slice(0, 200) : "unknown"} - likely no fork remote (origin) for this repo. Branch ${state.context.branch} with the real work is preserved locally.`,
      });
    }
  }
}
