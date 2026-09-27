import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { makeApprovalRequest, verifyGrantedApproval, type ApprovalRequest } from "@jarvis/protocol";
import { classifyCommand, defaultRules, evaluate, isBlockedPath, isInside } from "@jarvis/policy";
import type { PolicyResult, PolicyRule } from "@jarvis/protocol";
import type { AuditJournal } from "./audit.js";

const execFileAsync = promisify(execFile);

export interface GateContext {
  actor: string;
  sessionId: string | null;
  taskId: string | null;
  policyVersion: string;
}

export interface GateRequest {
  argv: readonly string[];
  cwd: string;
  allowedRoots: readonly string[];
}

export type GateOutcome =
  | { kind: "allow"; result: PolicyResult }
  | { kind: "approval_required"; result: PolicyResult; approval: ApprovalRequest; action: string }
  | { kind: "deny"; result: PolicyResult; reason: string };

export interface ExecutionOutcome {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  refusalReason?: string;
}

export class ExecutionGate {
  private readonly rules: PolicyRule[];
  private readonly executedApprovals = new Set<string>();

  constructor(
    private readonly deps: {
      audit: AuditJournal;
      rules?: readonly PolicyRule[];
      maxOutputChars?: number;
    },
  ) {
    this.rules = deps.rules !== undefined ? [...deps.rules] : defaultRules();
  }

  private auditBlock(request: GateRequest, context: GateContext, detail: string, ruleId: string, reason: string): GateOutcome {
    this.deps.audit.record({
      actor: context.actor,
      session_id: context.sessionId,
      task_id: context.taskId,
      category: "action_blocked",
      action: request.argv.join(" "),
      decision: "DENY",
      detail,
      action_hash: null,
    });
    return { kind: "deny", result: { decision: "DENY", rule_id: ruleId, reason }, reason };
  }

  private denyCheck(request: GateRequest, context: GateContext): GateOutcome | null {
    const action = request.argv.join(" ");
    const first = classifyCommand([...request.argv])[0]!;
    const result = evaluate(this.rules, first);
    if (result.decision === "DENY") {
      return this.auditBlock(request, context, `${result.rule_id ?? "policy"}: ${result.reason}`, result.rule_id ?? "policy.deny", result.reason);
    }
    const pathArgs = request.argv.filter((a) => !a.startsWith("-"));
    for (const arg of pathArgs) {
      if (isBlockedPath(arg)) {
        return this.auditBlock(request, context, `blocked path: ${arg}`, "secret.path", `access to secret paths is denied: ${arg}`);
      }
      if (/[a-zA-Z]:[\\/]/.test(arg) || arg.startsWith("/") || arg.startsWith("~")) {
        if (!isInside(arg, request.allowedRoots)) {
          return this.auditBlock(request, context, `outside allowed roots: ${arg}`, "fs.sandbox", `path outside allowed roots: ${arg}`);
        }
      }
    }
    void action;
    return null;
  }

  async review(request: GateRequest, context: GateContext): Promise<GateOutcome> {
    const blocked = this.denyCheck(request, context);
    if (blocked !== null) return blocked;

    const action = request.argv.join(" ");
    const first = classifyCommand([...request.argv])[0]!;
    const result = evaluate(this.rules, first);
    if (result.decision === "APPROVAL_REQUIRED") {
      const approval = await makeApprovalRequest({
        user_id: context.actor,
        session_id: context.sessionId ?? "",
        task_id: context.taskId ?? "",
        action,
        action_payload: { argv: [...request.argv], cwd: request.cwd },
        policy_version: context.policyVersion,
        risk_level: "HIGH",
      });
      this.deps.audit.record({
        actor: context.actor,
        session_id: context.sessionId,
        task_id: context.taskId,
        category: "approval_requested",
        action,
        decision: "APPROVAL_REQUIRED",
        detail: result.reason,
        action_hash: approval.action_hash,
      });
      return { kind: "approval_required", result, approval, action };
    }

    this.deps.audit.record({
      actor: context.actor,
      session_id: context.sessionId,
      task_id: context.taskId,
      category: "policy_decision",
      action,
      decision: "ALLOW",
      detail: result.reason,
      action_hash: null,
    });
    return { kind: "allow", result };
  }

  async execute(request: GateRequest, context: GateContext): Promise<ExecutionOutcome> {
    const review = await this.review(request, context);
    if (review.kind === "deny") {
      return { ok: false, exitCode: null, stdout: "", stderr: "", refusalReason: review.reason };
    }
    if (review.kind === "approval_required") {
      return { ok: false, exitCode: null, stdout: "", stderr: "", refusalReason: "action requires approval; execute only after a granted approval" };
    }
    return this.run(request, context);
  }

  async executeAfterApproval(approval: ApprovalRequest, request: GateRequest, context: GateContext): Promise<ExecutionOutcome> {
    const action = request.argv.join(" ");
    const binding = await verifyGrantedApproval({
      approval,
      action,
      action_payload: { argv: [...request.argv], cwd: request.cwd },
    });
    if (!binding.ok) {
      this.deps.audit.record({
        actor: context.actor,
        session_id: context.sessionId,
        task_id: context.taskId,
        category: "action_blocked",
        action,
        decision: "REFUSED",
        detail: `approval binding rejected: ${binding.reason}`,
        action_hash: null,
      });
      return { ok: false, exitCode: null, stdout: "", stderr: "", refusalReason: `approval binding rejected: ${binding.reason}` };
    }
    if (this.executedApprovals.has(approval.approval_id)) {
      this.deps.audit.record({
        actor: context.actor,
        session_id: context.sessionId,
        task_id: context.taskId,
        category: "action_blocked",
        action,
        decision: "REFUSED",
        detail: `approval ${approval.approval_id} already executed`,
        action_hash: null,
      });
      return { ok: false, exitCode: null, stdout: "", stderr: "", refusalReason: "approval already executed" };
    }

    const drift = this.denyCheck(request, context);
    if (drift !== null && drift.kind === "deny") {
      return { ok: false, exitCode: null, stdout: "", stderr: "", refusalReason: `policy drifted to deny before execution: ${drift.reason}` };
    }

    const outcome = await this.run(request, context);
    this.executedApprovals.add(approval.approval_id);
    this.deps.audit.record({
      actor: context.actor,
      session_id: context.sessionId,
      task_id: context.taskId,
      category: "action_executed",
      action,
      decision: outcome.ok ? "ALLOW" : "FAILED",
      detail: outcome.ok ? "executed after approved binding" : `exit ${outcome.exitCode ?? "unknown"}`,
      action_hash: approval.action_hash,
    });
    return outcome;
  }

  private async run(request: GateRequest, context: GateContext): Promise<ExecutionOutcome> {
    void context;
    try {
      const { stdout, stderr } = await execFileAsync(request.argv[0] ?? "true", request.argv.slice(1), {
        cwd: request.cwd,
        timeout: 60_000,
        maxBuffer: 4 * 1024 * 1024,
      });
      const cap = this.deps.maxOutputChars ?? 8_000;
      return { ok: true, exitCode: 0, stdout: stdout.slice(0, cap), stderr: stderr.slice(0, cap) };
    } catch (err) {
      const e = err as { code?: number; stdout?: string; stderr?: string };
      return {
        ok: false,
        exitCode: typeof e.code === "number" ? e.code : null,
        stdout: e.stdout?.slice(0, 1_000) ?? "",
        stderr: e.stderr?.slice(0, 1_000) ?? "",
      };
    }
  }
}
