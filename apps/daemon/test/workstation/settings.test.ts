import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../../src/workstation/config.js";
import { loadOrCreateIdentity } from "../../src/workstation/identity.js";
import { PairingService } from "../../src/workstation/pairing.js";
import { WorkstationJournal, journalPath } from "../../src/workstation/journal.js";
import { DurableQueue, queuePath } from "../../src/workstation/queue.js";
import { gatherHealth } from "../../src/workstation/health.js";
import { startWorkstationServer, type WorkstationServerHandle } from "../../src/workstation/server.js";
import {
  defaultWorkRoot,
  loadSettings,
  resolveWorkRoot,
  saveSettings,
  validateAndPrepareWorkRoot,
} from "../../src/workstation/settings.js";
import { MemorySecretStore } from "@jarvis/providers";

let dataDir: string;
let handle: WorkstationServerHandle | null = null;
let base: string;
let authHeaders: Record<string, string>;

beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "jvs-wsettings-"));
  const port = await freePort();
  const config = loadConfig({ env: { JARVIS_PORT: String(port), JARVIS_DATA_DIR: dataDir } });
  handle = await startWorkstationServer({
    config,
    identity: loadOrCreateIdentity(config.dataDir),
    pairing: new PairingService(config.dataDir, config.pairingTtlMs),
    journal: new WorkstationJournal(journalPath(config.dataDir)),
    queue: new DurableQueue(queuePath(config.dataDir)),
    health: () => gatherHealth(config.dataDir),
    secretStore: new MemorySecretStore(),
  });
  base = `http://127.0.0.1:${port}`;

  const pairing = new PairingService(dataDir, 10 * 60 * 1_000);
  const { code } = pairing.issueCode();
  const res = await fetch(`${base}/api/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, label: "settings test" }),
  });
  const paired = (await res.json()) as { token: string };
  authHeaders = { Authorization: `Bearer ${paired.token}`, "Content-Type": "application/json" };
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

describe("settings module", () => {
  it("round-trips settings.json atomically and keeps unknown fields out", () => {
    const dir = mkdtempSync(join(tmpdir(), "jvs-settings-mod-"));
    try {
      expect(loadSettings(dir)).toEqual({});
      saveSettings(dir, { providerId: "nvidia-nim", model: "nvidia/nemotron-3-super-120b-a12b" });
      expect(loadSettings(dir)).toEqual({ providerId: "nvidia-nim", model: "nvidia/nemotron-3-super-120b-a12b" });
      saveSettings(dir, { workRoot: join(dir, "ws") });
      expect(loadSettings(dir)).toEqual({
        providerId: "nvidia-nim",
        model: "nvidia/nemotron-3-super-120b-a12b",
        workRoot: join(dir, "ws"),
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("resolveWorkRoot: user folder wins, default auto-creates", () => {
    const userRoot = join(dataDir, "my-ssoc-folder");
    const result = resolveWorkRoot(dataDir);
    expect(result.isDefault).toBe(true);
    expect(result.path).toBe(defaultWorkRoot(dataDir));
    expect(statSync(result.path).isDirectory()).toBe(true);

    saveSettings(dataDir, { workRoot: userRoot });
    const custom = resolveWorkRoot(dataDir);
    expect(custom).toEqual({ path: userRoot, isDefault: false });
    expect(statSync(userRoot).isDirectory()).toBe(true);
  });

  it("validateAndPrepareWorkRoot: absolute required, creates missing, rejects files", () => {
    expect(validateAndPrepareWorkRoot("relative/path")).not.toBeNull();
    expect(validateAndPrepareWorkRoot(join(dataDir, "brand-new"))).toBeNull();
    expect(statSync(join(dataDir, "brand-new")).isDirectory()).toBe(true);

    const filePath = join(dataDir, "a-file.txt");
    writeFileSync(filePath, "x");
    expect(validateAndPrepareWorkRoot(filePath)).not.toBeNull();
  });
});

describe("settings API routes", () => {
  it("GET /api/settings returns defaults (workroot default, no provider)", async () => {
    const res = await fetch(`${base}/api/settings`, { headers: authHeaders });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.workRootDefault).toBe(true);
    expect(body.providerId).toBeNull();
    expect(body.keyConfigured).toBe(false);
    expect(Array.isArray(body.presets)).toBe(true);
    expect((body.presets as { id: string }[]).some((p) => p.id === "nvidia-nim")).toBe(true);
  });

  it("requires auth", async () => {
    const res = await fetch(`${base}/api/settings`);
    expect(res.status).toBe(401);
  });

  it("stores + masks a provider key, sets provider defaults, deletes the key", async () => {
    const keyRes = await fetch(`${base}/api/settings/provider/key`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ providerId: "nvidia-nim", apiKey: "nvapi-test-key-123456789" }),
    });
    expect(keyRes.status).toBe(200);
    const keyBody = (await keyRes.json()) as { keyMasked: string };
    expect(keyBody.keyMasked).not.toContain("nvapi-test-key-123456789");

    const provRes = await fetch(`${base}/api/settings/provider`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ providerId: "nvidia-nim", model: "nvidia/nemotron-3-super-120b-a12b" }),
    });
    expect(provRes.status).toBe(200);

    const state = (await (await fetch(`${base}/api/settings`, { headers: authHeaders })).json()) as Record<string, unknown>;
    expect(state.providerId).toBe("nvidia-nim");
    expect(state.model).toBe("nvidia/nemotron-3-super-120b-a12b");
    expect(state.keyConfigured).toBe(true);

    const delRes = await fetch(`${base}/api/settings/provider/key/delete`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ providerId: "nvidia-nim" }),
    });
    expect(delRes.status).toBe(200);
    const after = (await (await fetch(`${base}/api/settings`, { headers: authHeaders })).json()) as Record<string, unknown>;
    expect(after.keyConfigured).toBe(false);
  });

  it("rejects unknown providers and short keys", async () => {
    const badProvider = await fetch(`${base}/api/settings/provider`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ providerId: "does-not-exist", model: "m" }),
    });
    expect(badProvider.status).toBe(400);

    const shortKey = await fetch(`${base}/api/settings/provider/key`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ providerId: "nvidia-nim", apiKey: "short" }),
    });
    expect(shortKey.status).toBe(400);
  });

  it("provider test: no key -> honest 400; with key -> tested (mock-independent failure is ok=false, not 500)", async () => {
    await fetch(`${base}/api/settings/provider`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ providerId: "nvidia-nim", model: "nvidia/nemotron-3-super-120b-a12b" }),
    });
    const noKey = await fetch(`${base}/api/settings/provider/test`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ providerId: "nvidia-nim", model: "nvidia/nemotron-3-super-120b-a12b" }),
    });
    expect(noKey.status).toBe(400);

    await fetch(`${base}/api/settings/provider/key`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ providerId: "nvidia-nim", apiKey: "nvapi-obviously-fake-key-000" }),
    });
    const test = await fetch(`${base}/api/settings/provider/test`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ providerId: "nvidia-nim", model: "nvidia/nemotron-3-super-120b-a12b" }),
    });
    expect(test.status).toBe(200);
    const body = (await test.json()) as { ok: boolean; detail?: string };
    expect(body.ok).toBe(false);
    expect(typeof body.detail).toBe("string");
  });

  it("workroot: sets a custom folder, persists across restart, rejects relative paths", async () => {
    const custom = join(dataDir, "ssoc-work");
    const set = await fetch(`${base}/api/settings/workroot`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ path: custom }),
    });
    expect(set.status).toBe(200);
    expect(statSync(custom).isDirectory()).toBe(true);

    const bad = await fetch(`${base}/api/settings/workroot`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ path: "relative/no" }),
    });
    expect(bad.status).toBe(400);

    const state = (await (await fetch(`${base}/api/settings`, { headers: authHeaders })).json()) as Record<string, unknown>;
    expect(state.workRoot).toBe(custom);
    expect(state.workRootDefault).toBe(false);
    expect(loadSettings(dataDir).workRoot).toBe(custom);
  });
});

describe("origin allowlist + CORS (phone WebView is a cross-origin client, ADR 0009)", () => {
  it("capacitor origin: preflight gets 204 + allow headers; authed GET gets CORS headers", async () => {
    const pre = await fetch(`${base}/api/settings`, {
      method: "OPTIONS",
      headers: { Origin: "capacitor://localhost", "Access-Control-Request-Method": "POST" },
    });
    expect(pre.status).toBe(204);
    expect(pre.headers.get("Access-Control-Allow-Origin")).toBe("capacitor://localhost");
    expect(pre.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");

    const get = await fetch(`${base}/healthz`, { headers: { Origin: "capacitor://localhost" } });
    expect(get.status).toBe(200);
    expect(get.headers.get("Access-Control-Allow-Origin")).toBe("capacitor://localhost");
  });

  it("unknown origins stay locked out (403, s149 preserved)", async () => {
    const res = await fetch(`${base}/healthz`, { headers: { Origin: "https://evil.example" } });
    expect(res.status).toBe(403);
  });

  it("origins from settings.json are honored after restart", async () => {
    const port = await freePort();
    const dir = mkdtempSync(join(tmpdir(), "jvs-worigins-"));
    try {
      saveSettings(dir, { allowedOrigins: ["https://demo.example"] });
      const config = loadConfig({ env: { JARVIS_PORT: String(port), JARVIS_DATA_DIR: dir } });
      const handle2 = await startWorkstationServer({
        config,
        identity: loadOrCreateIdentity(config.dataDir),
        pairing: new PairingService(config.dataDir, config.pairingTtlMs),
        journal: new WorkstationJournal(journalPath(config.dataDir)),
        queue: new DurableQueue(queuePath(config.dataDir)),
        health: () => gatherHealth(config.dataDir),
      });
      try {
        const ok = await fetch(`http://127.0.0.1:${port}/healthz`, {
          headers: { Origin: "https://demo.example" },
        });
        expect(ok.status).toBe(200);
        expect(ok.headers.get("Access-Control-Allow-Origin")).toBe("https://demo.example");
        const denied = await fetch(`http://127.0.0.1:${port}/healthz`, {
          headers: { Origin: "https://other.example" },
        });
        expect(denied.status).toBe(403);
      } finally {
        await handle2.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("env-configured origins land in config (JARVIS_ALLOWED_ORIGINS)", () => {
    const cfg = loadConfig({ env: { JARVIS_ALLOWED_ORIGINS: "https://a.example, https://b.example" } });
    expect(cfg.allowedOrigins).toEqual(["https://a.example", "https://b.example"]);
  });
});
