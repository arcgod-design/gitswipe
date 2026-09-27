import type { AdapterEvent, AgentAdapter, TaskContext } from "./adapter.js";
import { probeBinary } from "./adapter.js";

export interface OpenCodeAdapterOptions {
  serverUrl?: string;
  probeBinary?: (binary: string, args?: readonly string[]) => Promise<{ ok: boolean; detail: string }>;
  fetch?: typeof globalThis.fetch;
}

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

export class OpenCodeAdapter implements AgentAdapter {
  readonly id = "opencode";
  readonly displayName = "OpenCode (headless)";

  constructor(private readonly opts: OpenCodeAdapterOptions = {}) {}

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
    const probe = this.opts.probeBinary ?? probeBinary;
    const cli = await probe("opencode", ["--version"]);
    if (!cli.ok) {
      return { ok: false, detail: "opencode CLI not found on PATH; install it and retry" };
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

  start(_context: TaskContext, _onEvent: (event: AdapterEvent) => void): void {
    throw new Error("OpenCode runtime paths are PROTO until live-verified against a real opencode server (contract s203: test via mocks first; do not claim working until a live session runs)");
  }

  followUp(_message: string): void {
    throw new Error("PROTO: not wired to a live OpenCode session yet");
  }

  decideApproval(_approve: boolean): void {
    throw new Error("PROTO: not wired to a live OpenCode session yet");
  }

  stop(): void {
    throw new Error("PROTO: not wired to a live OpenCode session yet");
  }
}
