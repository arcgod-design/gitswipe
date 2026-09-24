export const FAILURE_CATEGORIES = [
  "NETWORK_FAILURE",
  "PROVIDER_FAILURE",
  "AGENT_PROCESS_FAILURE",
  "AGENT_PROTOCOL_FAILURE",
  "DEPENDENCY_FAILURE",
  "TEST_FAILURE",
  "BUILD_FAILURE",
  "PERMISSION_FAILURE",
  "POLICY_DENIAL",
  "GITHUB_STATE_CHANGED",
  "WORKTREE_FAILURE",
  "DISK_FAILURE",
  "AUTH_FAILURE",
  "RATE_LIMITED",
  "TIMEOUT",
  "UNKNOWN",
] as const;

export type FailureCategory = (typeof FAILURE_CATEGORIES)[number];

export class JarvisError extends Error {
  constructor(
    public readonly category: FailureCategory,
    message: string,
  ) {
    super(`[${category}] ${message}`);
    this.name = "JarvisError";
  }
}
