import type { PolicyAction, PolicyResult, PolicyRule } from "@jarvis/protocol";

export function matchPattern(pattern: string, target: string): boolean {
  const regex = new RegExp(
    "^" +
      pattern
        .split("*")
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*") +
      "$",
  );
  return regex.test(target);
}

export function evaluate(rules: readonly PolicyRule[], action: PolicyAction): PolicyResult {
  const enabled = rules
    .filter((r) => r.enabled)
    .filter((r) => r.scope === action.scope)
    .filter((r) => r.action_type === action.action_type || r.action_type === "*")
    .sort((a, b) => b.priority - a.priority);

  for (const rule of enabled) {
    if (rule.target_pattern !== null) {
      if (action.target === undefined || action.target === null) continue;
      if (!matchPattern(rule.target_pattern, action.target)) continue;
    }
    return { decision: rule.decision, rule_id: rule.rule_id, reason: rule.description };
  }
  return {
    decision: "APPROVAL_REQUIRED",
    rule_id: null,
    reason: "no matching rule; default safe",
  };
}
