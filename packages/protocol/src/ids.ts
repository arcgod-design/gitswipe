export type UserId = `usr_${string}`;
export type WorkstationId = `ws_${string}`;
export type TaskId = `task_${string}`;
export type SessionId = `sess_${string}`;
export type OpportunityId = `opp_${string}`;
export type EventId = `evt_${string}`;
export type ApprovalId = `apr_${string}`;
export type RepositoryId = `repo_${string}`;
export type WorktreeId = `wt_${string}`;
export type FindingId = `fnd_${string}`;
export type DeviceId = `dev_${string}`;
export type RuleId = `rule_${string}`;
export type AgentSessionId = string;

export function newId<T extends string>(prefix: T): `${T}_${string}` {
  return `${prefix}_${crypto.randomUUID()}`;
}
