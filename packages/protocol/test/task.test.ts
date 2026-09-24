import { describe, expect, it } from "vitest";
import { TaskContractSchema, canTransitionTask, toMarkdown } from "../src/task.js";
import { FindingRecordSchema, OPPORTUNITY_KINDS, SWIPE_ACTIONS, UNIQUENESS_DISCLAIMER } from "../src/opportunity.js";

const contract = {
  contract_version: 1 as const,
  task_id: "task_0001",
  repository: "owner/project",
  base_branch: "main",
  task_source: { kind: "github_issue" as const, ref: "#123" },
  goal: "Implement websocket reconnect backoff.",
  problem_statement: "Reconnect path retries immediately with no backoff.",
  relevant_context: ["issue #87", "PR #451"],
  relevant_files: ["src/ws/reconnect.ts", "tests/ws.test.ts"],
  constraints: ["preserve public API"],
  acceptance_criteria: ["exponential backoff", "max retry count", "tests cover timeout races"],
  validation_commands: ["npm test", "npm lint"],
  security_policy: ["do not push", "do not access credentials"],
  expected_output: ["changes", "tests", "diff summary"],
  git_workflow: {
    worktree_root: "C:/work/project/issue-123",
    branch: "feat/issue-123-reconnect-backoff",
    fork_remote: "origin" as const,
    upstream_remote: "upstream" as const,
    commit_identity: { name: "Archit Adish Gupta", email: "arcgod-design@users.noreply.github.com" },
    closing_keyword: "closes #123",
    pr_base_branch: "main",
    prepush_gates: ["npm test", "npm lint"],
  },
};

describe("task contract", () => {
  it("validates the full contract", () => {
    expect(() => TaskContractSchema.parse(contract)).not.toThrow();
  });

  it("rejects missing acceptance criteria and bad branch names", () => {
    expect(TaskContractSchema.safeParse({ ...contract, acceptance_criteria: [] }).success).toBe(false);
    expect(
      TaskContractSchema.safeParse({
        ...contract,
        git_workflow: { ...contract.git_workflow, branch: "jarvis/task-1" },
      }).success,
    ).toBe(false);
  });

  it("renders readable markdown with the untrusted-content rule", () => {
    const md = toMarkdown(TaskContractSchema.parse(contract));
    expect(md).toContain("JARVIS TASK CONTRACT");
    expect(md).toContain("feat/issue-123-reconnect-backoff");
    expect(md).toContain("untrusted data");
  });

  it("task lifecycle follows contract §163", () => {
    const path = ["DISCOVERED", "SAVED", "ACCEPTED", "CONTRACT_GENERATED", "PREFLIGHT", "EXECUTING", "TESTING", "REVIEW_READY", "APPROVED", "FINALIZED"] as const;
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransitionTask(path[i]!, path[i + 1]!)).toBe(true);
    }
    expect(canTransitionTask("DISCOVERED", "EXECUTING")).toBe(false);
    expect(canTransitionTask("EXECUTING", "PAUSED")).toBe(true);
    expect(canTransitionTask("FAILED", "EXECUTING")).toBe(true);
  });
});

describe("opportunity model", () => {
  it("exposes the 8 kinds and swipe vocabulary from contract §9", () => {
    expect(OPPORTUNITY_KINDS).toHaveLength(8);
    expect(SWIPE_ACTIONS).toContain("why_not_too_hard");
    expect(UNIQUENESS_DISCLAIMER).toContain("not a proven unique issue");
  });

  it("finding records require evidence and confidence bounds", () => {
    const finding = {
      finding_id: "fnd_1",
      repository: "owner/project",
      summary: "retry path has no backoff",
      problem_statement: "",
      hypothesis: "",
      confidence: 0.83,
      evidence: [{ kind: "code" as const, location: "src/ws/reconnect.ts:42-83", description: "no backoff" }],
      related_issues: ["#392"],
      related_prs: [],
      related_commits: [],
      code_locations: ["src/ws/reconnect.ts:42"],
      duplicate_status: "no_match_found" as const,
      status: "candidate" as const,
      created_at: new Date().toISOString(),
      analysis_model: "test-model",
      analysis_version: "1",
    };
    expect(() => FindingRecordSchema.parse(finding)).not.toThrow();
    expect(FindingRecordSchema.safeParse({ ...finding, confidence: 1.5 }).success).toBe(false);
    expect(FindingRecordSchema.safeParse({ ...finding, evidence: [] }).success).toBe(false);
  });
});
