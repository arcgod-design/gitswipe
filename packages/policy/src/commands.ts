import type { PolicyAction, PolicyRule } from "@jarvis/protocol";
import { isBlockedPath } from "./paths.js";

export function classifyCommand(argv: readonly string[]): PolicyAction[] {
  if (argv.length === 0) {
    return [{ scope: "process", action_type: "unknown", target: null }];
  }
  const program = (argv[0] ?? "").toLowerCase();
  const args = argv.slice(1);
  switch (program) {
    case "git":
      return [classifyGit(args)];
    case "npm":
    case "pnpm":
    case "yarn":
    case "bun":
      return [classifyPackageManager(program, args)];
    case "cat":
    case "type":
    case "less":
    case "more":
      return [{ scope: "filesystem", action_type: "file.read", target: findPathArg(args) }];
    case "curl":
    case "wget":
    case "invoke-webrequest":
      return [{ scope: "network", action_type: "http.request", target: findUrlArg(args) }];
    case "rm":
    case "del":
    case "remove-item":
      return [{ scope: "filesystem", action_type: "file.delete", target: findPathArg(args) }];
    case "docker":
      return [classifyDocker(args)];
    default:
      return [{ scope: "process", action_type: "exec", target: program }];
  }
}

function classifyGit(args: readonly string[]): PolicyAction {
  const sub = (args[0] ?? "").toLowerCase();
  const rest = args.slice(1);
  switch (sub) {
    case "status":
    case "diff":
    case "log":
    case "show":
    case "branch":
      return { scope: "git" as const, action_type: "git.read", target: null };
    case "push":
      if (rest.some((a) => a === "--force" || a === "-f")) {
        return { scope: "git" as const, action_type: "git.push.force", target: null };
      }
      return { scope: "git" as const, action_type: "git.push", target: null };
    case "commit":
      return { scope: "git" as const, action_type: "git.commit", target: null };
    case "checkout":
    case "switch":
      return { scope: "git" as const, action_type: "git.branch", target: null };
    case "remote":
      return { scope: "git" as const, action_type: "git.remote", target: null };
    default:
      return { scope: "git" as const, action_type: `git.${sub || "unknown"}`, target: null };
  }
}

function classifyPackageManager(program: string, args: readonly string[]): PolicyAction {
  const sub = (args[0] ?? "").toLowerCase();
  if (sub === "install" || sub === "add" || sub === "i" || sub === "update" || sub === "upgrade") {
    return { scope: "process" as const, action_type: "package.install", target: program };
  }
  return { scope: "process" as const, action_type: "package.script", target: program };
}

function classifyDocker(args: readonly string[]): PolicyAction {
  const sub = (args[0] ?? "").toLowerCase();
  if (sub === "build") return { scope: "process" as const, action_type: "docker.build", target: null };
  if (sub === "run" && args.some((a) => a === "--privileged")) {
    return { scope: "process" as const, action_type: "docker.run.privileged", target: null };
  }
  if (sub === "run") return { scope: "process" as const, action_type: "docker.run", target: null };
  return { scope: "process" as const, action_type: `docker.${sub || "unknown"}`, target: null };
}

function findPathArg(args: readonly string[]): string | null {
  const flagLess = args.filter((a) => !a.startsWith("-"));
  return (flagLess[0] as string | undefined) ?? null;
}

function findUrlArg(args: readonly string[]): string | null {
  const url = args.find((a) => /^https?:\/\//i.test(a) || a.includes("."));
  return url ?? null;
}

let nextRuleId = 0;
function rule(
  scope: PolicyRule["scope"],
  action_type: string,
  decision: PolicyRule["decision"],
  description: string,
  priority: number,
  target_pattern: string | null = null,
): PolicyRule {
  nextRuleId += 1;
  return {
    rule_id: `rule_default_${String(nextRuleId).padStart(3, "0")}`,
    scope,
    action_type,
    target_pattern,
    decision,
    priority,
    enabled: true,
    description,
  };
}

export function defaultRules(): PolicyRule[] {
  return [
    rule("git", "git.read", "ALLOW", "git read operations are safe", 10),
    rule("git", "git.branch", "ALLOW", "branch creation is safe", 10),
    rule("git", "git.commit", "APPROVAL_REQUIRED", "commits require user approval by default", 20),
    rule("git", "git.push", "APPROVAL_REQUIRED", "pushes require user approval", 20),
    rule("git", "git.push.force", "DENY", "force pushes are blocked", 100),
    rule("git", "git.remote", "DENY", "changing remotes is blocked", 100),
    rule("filesystem", "file.read", "ALLOW", "reads inside the worktree are safe", 10, "*"),
    rule("process", "package.script", "ALLOW", "running repo scripts (test/lint/build) is safe", 10),
    rule("process", "docker.build", "ALLOW", "docker builds are safe", 10),
    rule("process", "docker.run", "ALLOW", "plain docker run is safe", 10),
    rule("process", "docker.run.privileged", "DENY", "privileged containers are blocked", 100),
    rule("process", "package.install", "APPROVAL_REQUIRED", "dependency installs require approval", 30),
    rule("filesystem", "file.delete", "APPROVAL_REQUIRED", "deletions require approval", 30),
    rule("network", "http.request", "APPROVAL_REQUIRED", "external network requests require approval", 30),
  ];
}

export function filesystemGuards(path: string): PolicyAction[] {
  if (isBlockedPath(path)) {
    return [{ scope: "secrets", action_type: "secret.path", target: path }];
  }
  return [{ scope: "filesystem", action_type: "file.read", target: path }];
}
