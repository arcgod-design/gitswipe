import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { SessionState } from "@jarvis/protocol";

export const CHECKPOINT_PHASES = [
  "TASK_ACCEPTED",
  "REPO_PREPARED",
  "ANALYSIS_COMPLETE",
  "IMPLEMENTATION_STARTED",
  "IMPLEMENTATION_CHECKPOINT",
  "TEST_CHECKPOINT",
  "REVIEW_CHECKPOINT",
  "APPROVAL_CHECKPOINT",
  "FINALIZATION",
] as const;

export type CheckpointPhase = (typeof CHECKPOINT_PHASES)[number];

export interface Checkpoint {
  taskId: string;
  sessionId: string;
  phase: CheckpointPhase;
  state: SessionState;
  worktreePath: string;
  recordedAt: string;
}

export class CheckpointStore {
  constructor(private readonly dataDir: string) {
    mkdirSync(dirname(this.filePath()), { recursive: true });
  }

  private filePath(): string {
    return join(this.dataDir, "checkpoints.jsonl");
  }

  record(checkpoint: Checkpoint): void {
    mkdirSync(dirname(this.filePath()), { recursive: true });
    const existing = existsSync(this.filePath()) ? readFileSync(this.filePath(), "utf-8") : "";
    writeFileSync(this.filePath(), existing + `${JSON.stringify(checkpoint)}\n`, { encoding: "utf-8" });
  }

  latestForTask(taskId: string): Checkpoint | null {
    const all = this.readAll().filter((c) => c.taskId === taskId);
    return all.length > 0 ? all[all.length - 1]! : null;
  }

  readAll(): Checkpoint[] {
    if (!existsSync(this.filePath())) return [];
    const content = readFileSync(this.filePath(), "utf-8").trim();
    if (content.length === 0) return [];
    return content.split("\n").map((line) => JSON.parse(line) as Checkpoint);
  }
}
