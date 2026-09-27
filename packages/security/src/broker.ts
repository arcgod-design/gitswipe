import { createHash, randomUUID } from "node:crypto";
import type { SecretStore } from "@jarvis/providers";
import type { AuditJournal } from "./audit.js";

export interface CredentialLease {
  leaseId: `lease_${string}`;
  purpose: "github.push" | "github.pr" | "provider.call";
  actionHash: string;
  expiresAt: number;
  used: boolean;
}

export interface LeaseRequest {
  purpose: CredentialLease["purpose"];
  actionHash: string;
  ttlMs?: number;
}

export type LeaseOutcome = { ok: true; lease: CredentialLease } | { ok: false; reason: string };
export type RedeemOutcome = { ok: true; token: string } | { ok: false; reason: string };

const DEFAULT_TTL_MS = 5 * 60 * 1_000;

export class CredentialBroker {
  constructor(
    private readonly deps: {
      store: SecretStore;
      audit: AuditJournal;
      secretKey: string;
      clock?: () => number;
    },
  ) {}

  async requestLease(request: LeaseRequest, actor: string): Promise<LeaseOutcome> {
    const token = await this.deps.store.get(this.deps.secretKey);
    if (token === null) {
      return { ok: false, reason: `no credential stored under ${this.deps.secretKey}` };
    }
    const now = this.deps.clock?.() ?? Date.now();
    const lease: CredentialLease = {
      leaseId: `lease_${randomUUID()}`,
      purpose: request.purpose,
      actionHash: request.actionHash,
      expiresAt: now + (request.ttlMs ?? DEFAULT_TTL_MS),
      used: false,
    };
    this.deps.audit.record({
      actor,
      session_id: null,
      task_id: null,
      category: "credential_leased",
      action: request.purpose,
      decision: "LEASED",
      detail: `lease ${lease.leaseId} bound to action ${request.actionHash.slice(0, 12)}..., expires ${new Date(lease.expiresAt).toISOString()}`,
      action_hash: request.actionHash,
    });
    return { ok: true, lease };
  }

  async redeem(lease: CredentialLease, actionHash: string, actor: string): Promise<RedeemOutcome> {
    const now = this.deps.clock?.() ?? Date.now();
    const deny = (detail: string, reason: string): RedeemOutcome => {
      this.deps.audit.record({
        actor,
        session_id: null,
        task_id: null,
        category: "credential_denied",
        action: lease.purpose,
        decision: "DENIED",
        detail,
        action_hash: actionHash,
      });
      return { ok: false, reason };
    };

    if (lease.used) return deny(`lease ${lease.leaseId} already redeemed`, "lease already redeemed");
    if (lease.expiresAt < now) return deny(`lease ${lease.leaseId} expired`, "lease expired");
    if (lease.actionHash !== actionHash) {
      return deny(`lease ${lease.leaseId} is bound to a different action`, "lease is bound to a different action");
    }

    const token = await this.deps.store.get(this.deps.secretKey);
    if (token === null) return deny("credential vanished from the store", "credential unavailable");

    lease.used = true;
    this.deps.audit.record({
      actor,
      session_id: null,
      task_id: null,
      category: "credential_redeemed",
      action: lease.purpose,
      decision: "REDEEMED",
      detail: `lease ${lease.leaseId} redeemed for its bound action; token hash ${sha256Short(token)}`,
      action_hash: actionHash,
    });
    return { ok: true, token };
  }
}

function sha256Short(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
