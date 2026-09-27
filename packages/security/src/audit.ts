import { z } from "zod";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const AUDIT_CATEGORIES = [
  "policy_decision",
  "action_blocked",
  "approval_requested",
  "approval_granted",
  "approval_denied",
  "action_executed",
  "credential_leased",
  "credential_redeemed",
  "credential_denied",
  "pairing",
  "push",
  "pr_created",
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export const AuditRecordSchema = z.object({
  audit_id: z.number().int().positive(),
  at: z.string().datetime(),
  actor: z.string().min(1),
  session_id: z.string().nullable(),
  task_id: z.string().nullable(),
  category: z.enum(AUDIT_CATEGORIES),
  action: z.string(),
  decision: z.string().nullable(),
  detail: z.string(),
  action_hash: z.string().nullable(),
});

export type AuditRecord = z.infer<typeof AuditRecordSchema>;

export class AuditJournal {
  private nextId = 1;

  constructor(private readonly filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
    this.nextId = this.bootId();
  }

  record(entry: Omit<AuditRecord, "audit_id" | "at"> & { at?: string }): AuditRecord {
    const record = AuditRecordSchema.parse({
      audit_id: this.nextId,
      at: entry.at ?? new Date().toISOString(),
      actor: entry.actor,
      session_id: entry.session_id,
      task_id: entry.task_id,
      category: entry.category,
      action: entry.action,
      decision: entry.decision,
      detail: entry.detail,
      action_hash: entry.action_hash,
    });
    this.nextId += 1;
    const existing = existsSync(this.filePath) ? readFileSync(this.filePath, "utf-8") : "";
    writeFileSync(this.filePath, existing + `${JSON.stringify(record)}\n`, { encoding: "utf-8" });
    return record;
  }

  readAll(): AuditRecord[] {
    if (!existsSync(this.filePath)) return [];
    const content = readFileSync(this.filePath, "utf-8").trim();
    if (content.length === 0) return [];
    return content.split("\n").map((line) => AuditRecordSchema.parse(JSON.parse(line)));
  }

  private bootId(): number {
    const all = this.readAll();
    return all.length > 0 ? all[all.length - 1]!.audit_id + 1 : 1;
  }
}

export function auditPath(dataDir: string): string {
  return join(dataDir, "audit", "audit.jsonl");
}
