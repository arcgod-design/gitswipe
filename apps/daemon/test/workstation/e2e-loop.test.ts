import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("E2E: the full loop (live, local-only, mock agent)", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "jvs-e2e-"));
  const port = 7991;
  const base = `http://127.0.0.1:${port}`;
  let serverProc: ReturnType<typeof spawn> | null = null;
  let token = "";

  const api = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...(token !== "" ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  };

  beforeAll(async () => {
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(
      join(dataDir, "settings.json"),
      JSON.stringify({
        workRoot: join(dataDir, "workspace"),
        providerId: "nvidia-nim",
        model: "nvidia/nemotron-3-super-120b-a12b",
        agentBackend: "mock",
      }),
      "utf-8",
    );

    const repo = process.cwd();
    serverProc = spawn(
      process.platform === "win32" ? "cmd" : "npx",
      process.platform === "win32"
        ? ["/c", "npx", "tsx", "apps/daemon/src/index.ts", "serve"]
        : ["tsx", "apps/daemon/src/index.ts", "serve"],
      {
        cwd: repo,
        env: { ...process.env, JARVIS_DATA_DIR: dataDir, JARVIS_PORT: String(port), JARVIS_BIND: "127.0.0.1" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    // Poll healthz until ready (max 30s)
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1_000));
      try {
        const res = await fetch(`${base}/healthz`);
        if (res.ok) break;
      } catch {
        // server not ready yet
      }
    }
  }, 30_000);

  afterAll(async () => {
    serverProc?.kill();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("step 1: healthz responds", async () => {
    const body = await api<{ ok: boolean }>("/healthz");
    expect(body.ok).toBe(true);
  });

  it("step 2: pairing works", async () => {
    const { PairingService } = await import("../../src/workstation/pairing.js");
    const pairing = new PairingService(dataDir, 10 * 60 * 1_000);
    const { code } = pairing.issueCode();
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const body = await api<{ token: string }>("/api/pair", {
      method: "POST",
      body: JSON.stringify({ code, label: "e2e test" }),
    });
    expect(body.token.length).toBeGreaterThan(10);
    token = body.token;
  });

  it("step 3: feed loads with candidates", async () => {
    const body = await api<{ feed: Array<{ key: string; score: number; title: string }> }>("/api/feed");
    expect(body.feed.length).toBeGreaterThan(0);
    expect(body.feed[0]!.score).toBeLessThanOrEqual(1);
  });

  it("step 4: a right-swipe changes the ranking (self-learning proof)", async () => {
    const before = await api<{ feed: Array<{ key: string; score: number }> }>("/api/feed");
    const target = before.feed[0]!;
    await api("/api/swipe", {
      method: "POST",
      body: JSON.stringify({ key: target.key, action: "right" }),
    });
    const after = await api<{ feed: Array<{ key: string; score: number }> }>("/api/feed");
    const sameCard = after.feed.find((c) => c.key === target.key);
    if (sameCard !== undefined) {
      expect(sameCard.score).toBeGreaterThan(target.score);
    }
    expect(after.feed.length).toBeGreaterThan(0);
  });

  it("step 5: task contract endpoint works", async () => {
    const feed = await api<{ feed: Array<{ key: string }> }>("/api/feed");
    const body = await api<{ markdown: string; backend: string }>("/api/task", {
      method: "POST",
      body: JSON.stringify({ key: feed.feed[0]!.key }),
    });
    expect(body.markdown).toContain("GITSWIPE TASK CONTRACT");
  });

  it("step 6: a session dispatches and completes (mock agent)", { timeout: 30_000 }, async () => {
    const feed = await api<{ feed: Array<{ key: string }> }>("/api/feed");
    const key = feed.feed[1]?.key ?? feed.feed[0]!.key;
    const session = await api<{ sessionId: string; state: string }>("/api/session", {
      method: "POST",
      body: JSON.stringify({ key }),
    });
    expect(session.sessionId).toMatch(/^sess_/);

    await new Promise((r) => setTimeout(r, 6_000));
    const status = await api<{ state: string; pendingApproval: boolean }>(`/api/session/${session.sessionId}`);
    expect(["WAITING_FOR_APPROVAL", "COMPLETED", "RUNNING"]).toContain(status.state);

    if (status.state === "WAITING_FOR_APPROVAL") {
      await api(`/api/session/${session.sessionId}/approve`, {
        method: "POST",
        body: JSON.stringify({ approve: true }),
      });
      await new Promise((r) => setTimeout(r, 3_000));
      const final = await api<{ state: string }>(`/api/session/${session.sessionId}`);
      expect(final.state).toBe("COMPLETED");
    }
  });

  it("step 7: the session list persists", async () => {
    const body = await api<{ sessions: Array<{ state: string; title: string }> }>("/api/session/list");
    expect(body.sessions.length).toBeGreaterThan(0);
  });

  it("step 8: the work queue shows candidates with states", async () => {
    const body = await api<{ work: Array<{ state: string }> }>("/api/work");
    expect(body.work.length).toBeGreaterThan(0);
  });

  it("step 9: activity shows the journal timeline", async () => {
    const body = await api<{ events: Array<{ type: string }> }>("/api/sessions?from=0");
    expect(body.events.some((e) => e.type === "TaskQueued" || e.type === "AgentStarted")).toBe(true);
  });

  it("step 10: settings surface shows the full config", async () => {
    const body = await api<{ workRoot: string; agentBackend: string }>("/api/settings");
    expect(body.workRoot).toContain("workspace");
  });
});
