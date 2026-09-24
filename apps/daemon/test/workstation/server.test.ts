import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../../src/workstation/config.js";
import { loadOrCreateIdentity } from "../../src/workstation/identity.js";
import { PairingService } from "../../src/workstation/pairing.js";
import { WorkstationJournal, journalPath } from "../../src/workstation/journal.js";
import { DurableQueue, queuePath } from "../../src/workstation/queue.js";
import { gatherHealth } from "../../src/workstation/health.js";
import { startWorkstationServer, type WorkstationServerHandle } from "../../src/workstation/server.js";

let dataDir: string;
let handle: WorkstationServerHandle | null = null;
let base: string;

beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "jvs-w05srv-"));
  const port = await freePort();
  handle = await boot(port);
  base = `http://127.0.0.1:${port}`;
});

afterEach(async () => {
  await handle?.close();
  handle = null;
  rmSync(dataDir, { recursive: true, force: true });
});

async function freePort(): Promise<number> {
  const net = await import("node:net");
  return new Promise<number>((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = addr && typeof addr === "object" ? addr.port : 0;
      srv.close(() => resolve(port));
    });
    srv.once("error", reject);
  });
}

async function boot(port: number): Promise<WorkstationServerHandle> {
  const config = loadConfig({ env: { JARVIS_PORT: String(port), JARVIS_DATA_DIR: dataDir } });
  const identity = loadOrCreateIdentity(config.dataDir);
  const pairing = new PairingService(config.dataDir, config.pairingTtlMs);
  const journal = new WorkstationJournal(journalPath(config.dataDir));
  const queue = new DurableQueue(queuePath(config.dataDir));
  return startWorkstationServer({
    config,
    identity,
    pairing,
    journal,
    queue,
    health: () => gatherHealth(config.dataDir),
  });
}

async function pairViaHttp(label: string): Promise<{ deviceId: string; token: string }> {
  const pairing = new PairingService(dataDir, 10 * 60 * 1_000);
  const { code } = pairing.issueCode();
  const res = await fetch(`${base}/api/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, label }),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as { deviceId: string; token: string };
}

describe("E3+E5 production server", () => {
  it("healthz is open but reveals nothing; API requires a paired device token", async () => {
    const health = await fetch(`${base}/healthz`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true, protocol: "jarvis-workstation", version: "1.0" });

    const unauth = await fetch(`${base}/api/workstation`);
    expect(unauth.status).toBe(401);

    const badToken = await fetch(`${base}/api/workstation`, { headers: { Authorization: "Bearer deadbeef" } });
    expect(badToken.status).toBe(401);
  });

  it("rejects cross-origin requests (CORS lock, s149)", async () => {
    const res = await fetch(`${base}/api/workstation`, {
      headers: { Origin: "https://evil.example", Authorization: "Bearer x" },
    });
    expect(res.status).toBe(403);
  });

  it("pair -> authed workstation report -> revoke kills the token", async () => {
    const { token } = await pairViaHttp("pitch laptop");
    const res = await fetch(`${base}/api/workstation`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    const report = (await res.json()) as {
      workstationId: string;
      pairedDeviceId: string;
      bind: string;
      protocol: string;
      journalLatest: number;
      gitVersion: string;
      diskFreeBytes: number;
    };
    expect(report.bind).toBe("loopback");
    expect(report.protocol).toBe("jarvis-workstation");
    expect(report.journalLatest).toBeGreaterThan(0);
    expect(report.gitVersion).toMatch(/^git version/);
    expect(report.workstationId).toMatch(/^dev_/);
    expect(report.pairedDeviceId).toMatch(/^dev_/);

    const pairing = new PairingService(dataDir, 60_000);
    expect(pairing.revoke(report.pairedDeviceId)).toBe(true);
    const revoked = await fetch(`${base}/api/workstation`, { headers: { Authorization: `Bearer ${token}` } });
    expect(revoked.status).toBe(401);
  });

  it("global events replay from a cursor after reconnect (the s120 exit scenario)", async () => {
    const { token } = await pairViaHttp("reconnecting client");
    const auth = { Authorization: `Bearer ${token}` };

    const first = await fetch(`${base}/api/sessions?from=0`, { headers: auth });
    const firstBody = (await first.json()) as { latest: number };
    expect(firstBody.latest).toBeGreaterThanOrEqual(1);

    const second = await fetch(`${base}/api/sessions?from=${firstBody.latest}`, { headers: auth });
    const secondBody = (await second.json()) as { events: Array<{ sequence: number }>; latest: number };
    expect(secondBody.events).toHaveLength(0);

    const full = await fetch(`${base}/api/sessions?from=0`, { headers: auth });
    const fullBody = (await full.json()) as { events: Array<{ sequence: number; type: string }> };
    const sequences = fullBody.events.map((e) => e.sequence);
    expect(sequences).toEqual([...sequences].sort((a, b) => a - b));
    expect(fullBody.events[0]!.type).toBe("WorkstationConnected");
  });

  it("SSE stream tails the global journal and reconnect resumes from the last cursor", async () => {
    const { token } = await pairViaHttp("sse client");
    const auth = { Authorization: `Bearer ${token}` };

    const res = await fetch(`${base}/api/events?from=0`, { headers: auth });
    expect(res.status).toBe(200);
    const reader = res.body!.getReader();
    const first = await reader.read();
    const text = new TextDecoder().decode(first.value);
    expect(text).toContain("WorkstationConnected");
    const firstSeq = (JSON.parse(text.trim().split("\n")[0]!.slice(5)) as { sequence: number }).sequence;
    await reader.cancel();

    await pairViaHttp("second device");
    const journal = new WorkstationJournal(journalPath(dataDir));

    const resumed = await fetch(`${base}/api/events?from=${firstSeq}`, { headers: auth });
    const reader2 = resumed.body!.getReader();
    const chunk = await reader2.read();
    const text2 = new TextDecoder().decode(chunk.value);
    expect(text2).toContain(`"sequence":${journal.latest()}`);
    expect(text2).not.toContain(`"sequence":${firstSeq}`);
    await reader2.cancel();
  });
});
