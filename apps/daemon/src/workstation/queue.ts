import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface QueuedTask {
  taskId: string;
  createdAt: string;
  payload: unknown;
  state: "queued" | "claimed";
}

export class DurableQueue {
  private tasks: QueuedTask[] = [];

  constructor(private readonly filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
    this.tasks = this.read();
  }

  enqueue(taskId: string, payload: unknown, createdAt: string = new Date().toISOString()): void {
    this.tasks.push({ taskId, createdAt, payload, state: "queued" });
    this.write();
  }

  list(): QueuedTask[] {
    return [...this.tasks];
  }

  claim(taskId: string): QueuedTask | null {
    const task = this.tasks.find((t) => t.taskId === taskId && t.state === "queued");
    if (task === undefined) return null;
    task.state = "claimed";
    this.write();
    return task;
  }

  private read(): QueuedTask[] {
    if (!existsSync(this.filePath)) return [];
    const content = readFileSync(this.filePath, "utf-8").trim();
    if (content.length === 0) return [];
    return content.split("\n").map((line) => JSON.parse(line) as QueuedTask);
  }

  private write(): void {
    writeFileSync(this.filePath, this.tasks.map((t) => JSON.stringify(t)).join("\n") + "\n", { encoding: "utf-8" });
  }
}

export function queuePath(dataDir: string): string {
  return join(dataDir, "queue", "tasks.jsonl");
}
