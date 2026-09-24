import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { GitHubItem, NormalizedIssue, NormalizedPullRequest } from "./entities.js";

export interface CandidateRecord {
  key: string;
  kind: "issue" | "pr";
  repo_full_name: string;
  number: number;
  payload: GitHubItem;
  first_seen_at: string;
  last_sync_at: string;
}

export class JsonlCandidateStore {
  constructor(private readonly filePath: string) {
    mkdirSync(dirname(this.filePath), { recursive: true });
  }

  append(record: CandidateRecord): void {
    const line = `${JSON.stringify(record)}\n`;
    writeFileSync(this.filePath, existsSync(this.filePath) ? readFileSync(this.filePath, "utf-8") + line : line, {
      encoding: "utf-8",
    });
  }

  upsert(record: CandidateRecord): void {
    const all = this.readAll();
    const idx = all.findIndex((r) => r.key === record.key);
    if (idx >= 0) {
      const existing = all[idx]!;
      all[idx] = { ...record, first_seen_at: existing.first_seen_at };
    } else {
      all.push(record);
    }
    this.writeAll(all);
  }

  readAll(): CandidateRecord[] {
    if (!existsSync(this.filePath)) return [];
    const content = readFileSync(this.filePath, "utf-8");
    if (content.trim().length === 0) return [];
    return content
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as CandidateRecord);
  }

  private writeAll(records: CandidateRecord[]): void {
    const tmp = `${this.filePath}.tmp`;
    writeFileSync(tmp, records.map((r) => JSON.stringify(r)).join("\n") + (records.length > 0 ? "\n" : ""), {
      encoding: "utf-8",
    });
    renameSync(tmp, this.filePath);
  }
}

export function makeCandidateKey(item: NormalizedIssue | NormalizedPullRequest): string {
  return `${item.kind}:${item.repo_full_name}:${item.number}`;
}

export function makeCandidateRecord(item: GitHubItem, now: Date = new Date()): CandidateRecord {
  const record: CandidateRecord = {
    key: makeCandidateKey(item),
    kind: item.kind,
    repo_full_name: item.repo_full_name,
    number: item.number,
    payload: item,
    first_seen_at: now.toISOString(),
    last_sync_at: now.toISOString(),
  };
  return record;
}
