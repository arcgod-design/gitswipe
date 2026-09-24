import { z } from "zod";
import { newId } from "./ids.js";

export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    out[key] = sortValue(record[key]);
  }
  return out;
}

export async function hashAction(action: unknown): Promise<string> {
  const data = new TextEncoder().encode(canonicalJson(action));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const ApprovalRequestSchema = z.object({
  approval_id: z.string().min(1),
  user_id: z.string().min(1),
  session_id: z.string().min(1),
  task_id: z.string().min(1),
  action: z.string().min(1),
  action_hash: z.string().length(64),
  action_payload_hash: z.string().length(64),
  policy_version: z.string().min(1),
  risk_level: z.enum(RISK_LEVELS),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  status: z.enum(["pending", "granted", "denied", "expired"]),
});

export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

export interface MakeApprovalInput {
  user_id: string;
  session_id: string;
  task_id: string;
  action: string;
  action_payload: unknown;
  policy_version: string;
  risk_level: RiskLevel;
  ttl_ms?: number;
}

export async function makeApprovalRequest(input: MakeApprovalInput): Promise<ApprovalRequest> {
  const now = Date.now();
  const expires = new Date(now + (input.ttl_ms ?? 10 * 60 * 1000)).toISOString();
  return ApprovalRequestSchema.parse({
    approval_id: newId("apr"),
    user_id: input.user_id,
    session_id: input.session_id,
    task_id: input.task_id,
    action: input.action,
    action_hash: await hashAction(input.action),
    action_payload_hash: await hashAction(input.action_payload),
    policy_version: input.policy_version,
    risk_level: input.risk_level,
    created_at: new Date(now).toISOString(),
    expires_at: expires,
    status: "pending",
  });
}

export function isApprovalExpired(approval: ApprovalRequest, at: Date = new Date()): boolean {
  return at.getTime() >= Date.parse(approval.expires_at);
}

export interface ApprovalDecisionInput {
  approval: ApprovalRequest;
  action: string;
  action_payload: unknown;
  at?: Date;
}

export async function verifyApprovalBinding(input: ApprovalDecisionInput): Promise<
  | { ok: true; approval: ApprovalRequest }
  | { ok: false; reason: "expired" | "action_mismatch" | "payload_mismatch" | "already_decided" }
> {
  const { approval } = input;
  const at = input.at ?? new Date();
  if (isApprovalExpired(approval, at)) return { ok: false, reason: "expired" };
  if (approval.status !== "pending") return { ok: false, reason: "already_decided" };
  if ((await hashAction(input.action)) !== approval.action_hash) return { ok: false, reason: "action_mismatch" };
  if ((await hashAction(input.action_payload)) !== approval.action_payload_hash) {
    return { ok: false, reason: "payload_mismatch" };
  }
  return { ok: true, approval };
}
