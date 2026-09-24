import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, describeBind } from "../../src/workstation/config.js";
import { loadOrCreateIdentity, sha256 } from "../../src/workstation/identity.js";
import { PairingService } from "../../src/workstation/pairing.js";
import { WorkstationJournal, journalPath } from "../../src/workstation/journal.js";
import { DurableQueue, queuePath } from "../../src/workstation/queue.js";
import { gatherHealth } from "../../src/workstation/health.js";
import { startWorkstationServer } from "../../src/workstation/server.js";

let dataDir: string;

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), "jvs-w05-"));
});

afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

describe("E1 config (contract s116 precedence)", () => {
  it("defaults to loopback and standard port; env overrides; malformed env is a hard error", () => {
    const defaults = loadConfig({ env: {} });
    expect(defaults.bind).toBe("127.0.0.1");
    expect(defaults.port).toBe(7420);
    expect(describeBind(defaults)).toBe("loopback");

    const overridden = loadConfig({ env: { JARVIS_BIND: "0.0.0.0", JARVIS_PORT: "8000" } });
    expect(overridden.bind).toBe("0.0.0.0");
    expect(describeBind(overridden)).toBe("lan");
    expect(overridden.port).toBe(8000);

    expect(() => loadConfig({ env: { JARVIS_PORT: "not-a-port" } })).toThrow();
  });
});

describe("E2 identity + pairing (contract s23)", () => {
  it("device identity is durable across restarts and self-verifies", () => {
    const first = loadOrCreateIdentity(dataDir);
    const second = loadOrCreateIdentity(dataDir);
    expect(first.deviceId).toBe(second.deviceId);
    expect(first.publicKeyPem).toBe(second.publicKeyPem);
    expect(first.deviceId).toMatch(/^dev_/);
  });

  it("corrupted identity (swapped key) is detected, not silently trusted", () => {
    loadOrCreateIdentity(dataDir);
    const other = generateKeyPairSync("ed25519");
    const keyPath = join(dataDir, "identity", "device-ed25519.pem");
    writeFileSync(keyPath, other.privateKey.export({ type: "pkcs8", format: "pem" }));
    expect(() => loadOrCreateIdentity(dataDir)).toThrow(/identity corruption/);
  });

  it("pairing codes are single-use, expire, and yield revocable devices with hashed tokens", () => {
    const pairing = new PairingService(dataDir, 10 * 60 * 1_000);
    const { code } = pairing.issueCode();

    const result = pairing.pair(code, "test phone");
    expect(result.ok).toBe(true);
    if (result.ok) {
      const token = result.token;
      const device = pairing.verifyToken(token);
      expect(device?.label).toBe("test phone");
      const onDisk = readFileSync(join(dataDir, "pairing", "devices.jsonl"), "utf-8");
      expect(onDisk).not.toContain(token);
      expect(onDisk).toContain(sha256(token));

      expect(pairing.pair(code, "replay attacker")).toEqual({ ok: false, reason: "pairing code already used" });
      expect(pairing.revoke(result.deviceId)).toBe(true);
      expect(pairing.verifyToken(token)).toBeNull();
      expect(pairing.list()).toHaveLength(0);
    }

    const expired = new PairingService(dataDir, 1);
    const expiredCode = expired.issueCode().code;
    expect(expired.pair(expiredCode, "late client", Date.now() + 5_000)).toEqual({
      ok: false,
      reason: "pairing code expired",
    });
  });

  it("devices survive a service restart (durable registry)", () => {
    const first = new PairingService(dataDir, 60_000);
    const { code } = first.issueCode();
    const paired = first.pair(code, "phone");
    expect(paired.ok).toBe(true);

    const second = new PairingService(dataDir, 60_000);
    expect(second.list()).toHaveLength(1);
    if (paired.ok) {
      expect(second.verifyToken(paired.token)?.deviceId).toBe(paired.deviceId);
    }
  });
});

describe("E4 journal (contract s120/s121 replay + restart survival)", () => {
  it("global monotonic sequence, cursor replay, and restart recovery", () => {
    const journal = new WorkstationJournal(journalPath(dataDir));
    const first = journal.emit({ type: "WorkstationConnected", user_id: "usr_local", workstation_id: "ws_x" });
    const second = journal.emit({ type: "TaskCreated", user_id: "usr_local", workstation_id: "ws_x", task_id: "task_1" });
    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    expect(journal.latest()).toBe(2);
    expect(journal.readFrom(1).map((e) => e.sequence)).toEqual([2]);

    const restarted = new WorkstationJournal(journalPath(dataDir));
    expect(restarted.latest()).toBe(2);
    const third = restarted.emit({ type: "WorkstationConnected", user_id: "usr_local", workstation_id: "ws_x" });
    expect(third.sequence).toBe(3);
    expect(restarted.readFrom(0)).toHaveLength(3);
    expect(() => restarted.append({ ...third, sequence: 99 })).toThrow(/sequence gap/);
  });
});

describe("E6 durable queue (contract s111/s112)", () => {
  it("queued tasks survive restart; claimed tasks stay claimed", () => {
    const queue = new DurableQueue(queuePath(dataDir));
    queue.enqueue("task_a", { key: "issue:demo/x:1" });
    queue.enqueue("task_b", { key: "issue:demo/x:2" });

    const restarted = new DurableQueue(queuePath(dataDir));
    expect(restarted.list().map((t) => t.taskId)).toEqual(["task_a", "task_b"]);
    expect(restarted.claim("task_a")?.taskId).toBe("task_a");

    const afterClaim = new DurableQueue(queuePath(dataDir));
    expect(afterClaim.claim("task_a")).toBeNull();
    expect(afterClaim.list()).toHaveLength(2);
  });

  it("health report gathers git, disk, policy, agents", async () => {
    const report = await gatherHealth(dataDir, ["opencode"]);
    expect(report.platform).toBe(process.platform);
    expect(report.gitVersion).toMatch(/^git version/);
    expect(report.diskFreeBytes).toBeGreaterThan(0);
    expect(report.policyRules).toBeGreaterThan(0);
    expect(report.agents[0]?.id).toBe("opencode");
  });
});
