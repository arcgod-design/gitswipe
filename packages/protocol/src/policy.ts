import { z } from "zod";

export type PolicyDecision = "ALLOW" | "APPROVAL_REQUIRED" | "DENY";

export const POLICY_SCOPES = [
  "filesystem",
  "commands",
  "git",
  "network",
  "process",
  "secrets",
] as const;

export type PolicyScope = (typeof POLICY_SCOPES)[number];

export const PolicyRuleSchema = z.object({
  rule_id: z.string().min(1),
  scope: z.enum(POLICY_SCOPES),
  action_type: z.string().min(1),
  target_pattern: z.string().nullable(),
  decision: z.enum(["ALLOW", "APPROVAL_REQUIRED", "DENY"]),
  priority: z.number().int(),
  enabled: z.boolean(),
  description: z.string().min(1),
});

export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

export const PolicyResultSchema = z.object({
  decision: z.enum(["ALLOW", "APPROVAL_REQUIRED", "DENY"]),
  rule_id: z.string().nullable(),
  reason: z.string().min(1),
});

export type PolicyResult = z.infer<typeof PolicyResultSchema>;

export interface PolicyAction {
  scope: PolicyScope;
  action_type: string;
  target?: string | null;
}
