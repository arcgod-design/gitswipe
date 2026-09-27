import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemorySecretStore } from "@jarvis/providers";
import { AuditJournal, auditPath } from "../src/audit.js";
import { CredentialBroker } from "../src/broker.js";
import { redactDeep, redactOrWithhold, redactText, scanSecrets } from "../src/redaction.js";

function makeBroker(clock?: () => number, token = "ghp_abcdefghijklmnopqrstuvwxyz123456"): CredentialBroker {
  const dir = mkdtempSync(join(tmpdir(), "jvs-broker-"));
  const store = new MemorySecretStore();
  void store.set("github:token", token);
  const audit = new AuditJournal(auditPath(dir));
  return new CredentialBroker({ store, audit, secretKey: "github:token", clock });
}

describe("CredentialBroker (s27: scoped, single-use, audited, never ambient)", () => {
  const actionHash = "a".repeat(64);

  it("lease -> redeem vends the token exactly once; audit carries the hash, never the token", async () => {
    const broker = makeBroker();
    const lease = await broker.requestLease({ purpose: "github.push", actionHash }, "usr_test");
    expect(lease.ok).toBe(true);
    if (!lease.ok) return;

    const vend = await broker.redeem(lease.lease, actionHash, "usr_test");
    expect(vend.ok).toBe(true);
    if (vend.ok) expect(vend.token).toBe("ghp_abcdefghijklmnopqrstuvwxyz123456");

    const again = await broker.redeem(lease.lease, actionHash, "usr_test");
    expect(again).toEqual({ ok: false, reason: "lease already redeemed" });
  });

  it("expired leases are refused", async () => {
    let now = 1_000_000;
    const broker = makeBroker(() => now);
    const lease = await broker.requestLease({ purpose: "github.pr", actionHash, ttlMs: 1_000 }, "usr_test");
    if (!lease.ok) throw new Error("expected lease");
    now += 5_000;
    const vend = await broker.redeem(lease.lease, actionHash, "usr_test");
    expect(vend).toEqual({ ok: false, reason: "lease expired" });
  });

  it("a lease bound to action A refuses to vend for action B", async () => {
    const broker = makeBroker();
    const lease = await broker.requestLease({ purpose: "github.push", actionHash }, "usr_test");
    if (!lease.ok) throw new Error("expected lease");
    const other = await broker.redeem(lease.lease, "b".repeat(64), "usr_test");
    expect(other).toEqual({ ok: false, reason: "lease is bound to a different action" });
  });

  it("missing credentials produce no lease at all", async () => {
    const dir = mkdtempSync(join(tmpdir(), "jvs-empty-"));
    const broker = new CredentialBroker({
      store: new MemorySecretStore(),
      audit: new AuditJournal(auditPath(dir)),
      secretKey: "github:token",
    });
    const lease = await broker.requestLease({ purpose: "github.push", actionHash }, "usr_test");
    expect(lease).toEqual({ ok: false, reason: "no credential stored under github:token" });
  });

  it("no secret material ever lands in the audit trail", async () => {
    const dir = mkdtempSync(join(tmpdir(), "jvs-auditcheck-"));
    const store = new MemorySecretStore();
    await store.set("github:token", "sk-supersecretvalue123456");
    const audit = new AuditJournal(auditPath(dir));
    const broker = new CredentialBroker({ store, audit, secretKey: "github:token" });
    const lease = await broker.requestLease({ purpose: "provider.call", actionHash }, "usr_test");
    if (!lease.ok) throw new Error("expected lease");
    await broker.redeem(lease.lease, actionHash, "usr_test");
    const raw = readFileSync(auditPath(dir), "utf-8");
    expect(raw).not.toContain("sk-supersecretvalue123456");
    expect(raw).toContain("credential_leased");
    expect(raw).toContain("credential_redeemed");
  });
});

describe("redaction (s74/s145)", () => {
  it("redacts every supported secret family", () => {
    const text =
      "token=ghp_AAbbCCddEEffGGhhIIjjKKllMMnnOOppQQ; PAT github_pat_11_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh\n" +
      "key sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXX and sk-proj-aaaaaaaaaaaaaaaaaaaa\n" +
      "aws AKIAIOSFODNN7EXAMPLE / google AIzaSyA1234567890abcdefghijklmnopqrstuv\n" +
      "jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c\n" +
      "Authorization: Bearer abcdef1234567890abcdef\n";
    const redacted = redactText(text);
    expect(redacted).not.toContain("ghp_");
    expect(redacted).not.toContain("github_pat_");
    expect(redacted).not.toContain("sk-ant-");
    expect(redacted).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(redacted).not.toContain("AIzaSy");
    expect(redacted).not.toContain("eyJhbGci");
    expect(redacted).not.toContain("Bearer abcdef");
    expect(redacted.split("***REDACTED***").length - 1).toBeGreaterThanOrEqual(7);
  });

  it("redacts private key blocks whole", () => {
    const text = "pre -----BEGIN RSA PRIVATE KEY-----\nMIIEow\n-----END RSA PRIVATE KEY----- post";
    expect(redactText(text)).not.toContain("MIIEow");
  });

  it("does not mangle ordinary text", () => {
    const text = "On branch main\nnothing to commit, working tree clean\npassword: null\n";
    expect(redactText(text)).toBe(text);
  });

  it("scanSecrets counts hits; two or more families withholds the output", () => {
    const single = scanSecrets("my key ghp_AAbbCCddEEffGGhhIIjjKKllMMnnOOppQQ here");
    expect(single).toHaveLength(1);
    const dangerous = "ghp_AAbbCCddEEffGGhhIIjjKKllMMnnOOppQQ and sk-ant-aaaaaaaaaaaaaaaaaaaa";
    const out = redactOrWithhold(dangerous);
    expect(out.withheld).toBe(true);
    expect(out.redacted).toContain("withheld");
    const mild = redactOrWithhold("just the one ghp_AAbbCCddEEffGGhhIIjjKKllMMnnOOppQQ");
    expect(mild.withheld).toBe(false);
    expect(mild.redacted).toContain("***REDACTED***");
  });

  it("redactDeep sanitizes nested journal payloads (the workstation journal path)", () => {
    const payload = {
      summary: "pushed with token ghp_ZZyyXXwwVVuuTTssRRqqPPooNNmmLLkk",
      nested: { command: "git push", output: "ok using sk-111111111111111111111111" },
      list: ["clean line", "Authorization: Bearer 0123456789abcdef0123"],
    };
    const out = redactDeep(payload) as typeof payload;
    expect(JSON.stringify(out)).not.toContain("ghp_");
    expect(JSON.stringify(out)).not.toContain("sk-111111");
    expect(JSON.stringify(out)).not.toContain("Bearer 0123");
    expect(out.nested.command).toBe("git push");
    expect(out.list[0]).toBe("clean line");
  });
});
