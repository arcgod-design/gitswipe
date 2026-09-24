import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

export interface CreateWorktreeInput {
  repoPath: string;
  branch: string;
  workspaceRoot: string;
  repoSlug: string;
  issueNumber: number | null;
}

export interface WorktreeRef {
  worktreeId: `wt_${string}`;
  repoPath: string;
  worktreePath: string;
  branch: string;
  createdAt: string;
}

export function branchNameFor(issueNumber: number | null, title: string, taskSlug: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  if (issueNumber !== null) {
    return `feat/issue-${issueNumber}-${slug || "task"}`;
  }
  return `feat/jarvis-${taskSlug}-${slug || "task"}`;
}

export class WorktreeManager {
  constructor(private readonly workspaceRoot: string) {
    mkdirSync(workspaceRoot, { recursive: true });
  }

  async create(input: Omit<CreateWorktreeInput, "workspaceRoot">): Promise<WorktreeRef> {
    const issueDir = input.issueNumber !== null ? `issue-${input.issueNumber}` : `task-${input.repoSlug}`;
    const parent = join(this.workspaceRoot, input.repoSlug);
    const worktreePath = join(parent, issueDir);
    if (existsSync(worktreePath)) {
      throw new Error(`worktree already exists: ${worktreePath}`);
    }
    mkdirSync(parent, { recursive: true });
    await execFileAsync("git", ["-C", input.repoPath, "worktree", "add", "-b", input.branch, worktreePath]);
    return {
      worktreeId: `wt_${worktreePath.replace(/[^a-z0-9]/gi, "").slice(-12)}` as `wt_${string}`,
      repoPath: input.repoPath,
      worktreePath,
      branch: input.branch,
      createdAt: new Date().toISOString(),
    };
  }

  async verify(ref: WorktreeRef): Promise<{ ok: boolean; detail: string }> {
    if (!existsSync(ref.worktreePath)) {
      return { ok: false, detail: "worktree path missing" };
    }
    try {
      const { stdout } = await execFileAsync("git", ["-C", ref.worktreePath, "status", "--porcelain"]);
      void stdout;
      const branch = await execFileAsync("git", ["-C", ref.worktreePath, "rev-parse", "--abbrev-ref", "HEAD"]);
      if (branch.stdout.trim() !== ref.branch) {
        return { ok: false, detail: `branch mismatch: ${branch.stdout.trim()}` };
      }
      return { ok: true, detail: "clean worktree on the expected branch" };
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : "verification failed" };
    }
  }

  async cleanup(ref: WorktreeRef, opts: { preserve: boolean }): Promise<void> {
    if (opts.preserve) return;
    await execFileAsync("git", ["-C", ref.repoPath, "worktree", "remove", "--force", ref.worktreePath]).catch(() => undefined);
    await execFileAsync("git", ["-C", ref.repoPath, "branch", "-D", ref.branch]).catch(() => undefined);
  }

  async runPrepushGates(ref: WorktreeRef, commands: readonly string[]): Promise<{ ok: boolean; results: Array<{ command: string; exitCode: number | null }> }> {
    const results: Array<{ command: string; exitCode: number | null }> = [];
    let ok = true;
    for (const command of commands) {
      try {
        const parts = command.split(" ");
        await execFileAsync(parts[0] ?? "true", parts.slice(1), { cwd: ref.worktreePath });
        results.push({ command, exitCode: 0 });
      } catch (err) {
        ok = false;
        const code = (err as { code?: number }).code ?? null;
        results.push({ command, exitCode: typeof code === "number" ? code : null });
      }
    }
    return { ok, results };
  }
}

export function writeLedgerEntry(workspaceRoot: string, entry: Record<string, unknown>): void {
  const ledgerPath = join(workspaceRoot, "ledger.jsonl");
  const existing = existsSync(ledgerPath) ? readFileSync(ledgerPath, "utf-8") : "";
  writeFileSync(ledgerPath, existing + `${JSON.stringify(entry)}\n`, { encoding: "utf-8" });
}
