import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { SWIPE_ACTIONS, type SwipeAction } from "@jarvis/protocol";

export const SwipeRecordSchema = z.object({
  candidate_key: z.string().min(1),
  action: z.enum(SWIPE_ACTIONS),
  reason: z.string().optional(),
  at: z.string().datetime(),
});

export type SwipeRecord = z.infer<typeof SwipeRecordSchema>;

export class JsonlSwipeStore {
  constructor(private readonly filePath: string) {
    mkdirSync(dirname(this.filePath), { recursive: true });
  }

  append(record: SwipeRecord): void {
    SwipeRecordSchema.parse(record);
    const existing = existsSync(this.filePath) ? readFileSync(this.filePath, "utf-8") : "";
    writeFileSync(this.filePath, existing + `${JSON.stringify(record)}\n`, { encoding: "utf-8" });
  }

  readAll(): SwipeRecord[] {
    if (!existsSync(this.filePath)) return [];
    const content = readFileSync(this.filePath, "utf-8").trim();
    if (content.length === 0) return [];
    return content
      .split("\n")
      .map((line) => SwipeRecordSchema.parse(JSON.parse(line)));
  }

  replaceAll(records: SwipeRecord[]): void {
    const tmp = `${this.filePath}.tmp`;
    writeFileSync(tmp, records.map((r) => JSON.stringify(SwipeRecordSchema.parse(r))).join("\n") + "\n", {
      encoding: "utf-8",
    });
    renameSync(tmp, this.filePath);
  }
}

export const WHY_NOT_REASONS = [
  "why_not_too_hard",
  "why_not_not_interesting",
  "why_not_already_known",
  "why_not_wrong_stack",
] as const;

export function isWhyNot(action: SwipeAction): action is (typeof WHY_NOT_REASONS)[number] {
  return (WHY_NOT_REASONS as readonly string[]).includes(action);
}
