import { describe, expect, it } from "vitest";
import { classifyCommand, defaultRules, filesystemGuards } from "../src/commands.js";
import { evaluate } from "../src/evaluate.js";

const rules = defaultRules();

function decide(argv: string[]) {
  const actions = classifyCommand(argv);
  return actions.map((action) => evaluate(rules, action));
}

describe("policy table (contract §118)", () => {
  it("git status -> ALLOW", () => {
    expect(decide(["git", "status"])[0]).toMatchObject({ decision: "ALLOW" });
  });

  it("git push origin feature branch -> APPROVAL_REQUIRED", () => {
    expect(decide(["git", "push", "origin", "feat/issue-12-server-pagination"])[0]).toMatchObject({
      decision: "APPROVAL_REQUIRED",
    });
  });

  it("git push --force -> DENY", () => {
    expect(decide(["git", "push", "--force", "origin", "main"])[0]).toMatchObject({ decision: "DENY" });
    expect(decide(["git", "push", "-f", "origin", "main"])[0]).toMatchObject({ decision: "DENY" });
  });

  it("git remote changes -> DENY", () => {
    expect(decide(["git", "remote", "set-url", "origin", "https://evil.example"])[0]).toMatchObject({ decision: "DENY" });
  });

  it("npm test -> ALLOW", () => {
    expect(decide(["npm", "test"])[0]).toMatchObject({ decision: "ALLOW" });
  });

  it("curl unknown domain -> APPROVAL_REQUIRED", () => {
    expect(decide(["curl", "https://unknown.example/data"])[0]).toMatchObject({ decision: "APPROVAL_REQUIRED" });
  });

  it("npm install -> APPROVAL_REQUIRED (dependency installs are gated)", () => {
    expect(decide(["npm", "install", "left-pad"])[0]).toMatchObject({ decision: "APPROVAL_REQUIRED" });
  });

  it("docker run --privileged -> DENY, docker build -> ALLOW", () => {
    expect(decide(["docker", "run", "--privileged", "alpine"])[0]).toMatchObject({ decision: "DENY" });
    expect(decide(["docker", "build", "."])[0]).toMatchObject({ decision: "ALLOW" });
  });

  it("rm -> APPROVAL_REQUIRED (deletion is gated)", () => {
    expect(decide(["rm", "dist/bundle.js"])[0]).toMatchObject({ decision: "APPROVAL_REQUIRED" });
  });
});

describe("secret path guard", () => {
  it("reading SSH keys is a secrets action (default-unmatched -> approval; guard flags it)", () => {
    const [action] = filesystemGuards("C:/Users/arc/.ssh/id_rsa");
    expect(action).toMatchObject({ scope: "secrets", action_type: "secret.path" });
    expect(evaluate(rules, action).decision).toBe("APPROVAL_REQUIRED");
  });

  it("normal files classify as filesystem reads", () => {
    const [action] = filesystemGuards("C:/work/repo/issue-12/src/index.ts");
    expect(action).toMatchObject({ scope: "filesystem", action_type: "file.read" });
  });
});

describe("safe defaults", () => {
  it("unmatched actions require approval, never silent allow (ADR 0003)", () => {
    const result = evaluate(rules, { scope: "process", action_type: "unknown-binary" });
    expect(result).toEqual({ decision: "APPROVAL_REQUIRED", rule_id: null, reason: "no matching rule; default safe" });
  });

  it("results are explainable — every decision names its rule", () => {
    for (const result of decide(["git", "commit", "-m", "x"])) {
      if (result.rule_id !== null) {
        expect(result.reason.length).toBeGreaterThan(0);
      }
    }
  });
});
