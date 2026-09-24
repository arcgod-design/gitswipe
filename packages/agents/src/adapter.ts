import type { AgentCapabilities } from "@jarvis/protocol";

export type AdapterEvent =
  | { kind: "thinking-summary"; summary: string }
  | { kind: "command"; command: string; exitCode: number | null }
  | { kind: "file-changed"; path: string; change: "modified" | "created" | "deleted" }
  | { kind: "patch"; files: number; additions: number; deletions: number }
  | { kind: "test-started"; command: string }
  | { kind: "test-result"; command: string; passed: number; failed: number; exitCode: number }
  | { kind: "review-ready"; prDraft: boolean }
  | { kind: "approval-request"; action: string; payload: Record<string, unknown> }
  | { kind: "message"; text: string }
  | { kind: "completed"; summary: string }
  | { kind: "failed"; reason: string };

export interface TaskContext {
  repository: string;
  branch: string;
  worktreePath: string;
  prompt: string;
  validationCommands: readonly string[];
  sessionTitle?: string;
}

export function sessionTitleFor(repository: string, issueNumber: number | null, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  const label = issueNumber !== null ? `Issue #${issueNumber}` : "task";
  return `GitSwipe: ${label} - ${repository}${slug.length > 0 ? ` (${slug})` : ""}`;
}

export interface AgentAdapter {
  readonly id: string;
  readonly displayName: string;
  capabilities(): AgentCapabilities;
  start(context: TaskContext, onEvent: (event: AdapterEvent) => void): void;
  followUp(message: string): void;
  decideApproval(approve: boolean): void;
  stop(): void;
  available(): Promise<{ ok: boolean; detail: string }>;
}

export async function probeBinary(binary: string, args: readonly string[] = ["--version"]): Promise<{ ok: boolean; detail: string }> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  try {
    const { stdout } = await promisify(execFile)(binary, [...args], { timeout: 5_000 });
    return { ok: true, detail: stdout.trim().split("\n")[0] ?? "available" };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "unavailable" };
  }
}
