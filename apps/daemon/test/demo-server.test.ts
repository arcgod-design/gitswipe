import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startDemoServer, type DemoServerHandle } from "../src/demo-server.js";

let handle: DemoServerHandle;
let base: string;
const headers: Record<string, string> = {};

beforeAll(async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "jvs-demo-"));
  handle = await startDemoServer({ port: 0, dataDir });
  base = `http://127.0.0.1:${handle.port}`;
  headers.Authorization = `Bearer ${handle.token}`;
});

afterAll(async () => {
  await handle.close();
});

describe("demo server M1 — auth + demo isolation", () => {
  it("healthz works without a token and advertises demo mode", async () => {
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-demo-mode")).toBe("true");
    const body = (await res.json()) as { ok: boolean; demo: boolean };
    expect(body).toEqual({ ok: true, demo: true });
  });

  it("API routes reject requests without the loopback token", async () => {
    const res = await fetch(`${base}/api/feed`);
    expect(res.status).toBe(401);
  });
});

describe("demo server M1 — feed from the real engine", () => {
  it("serves a ranked, explainable feed with the demo notice and fixture candidates", async () => {
    const res = await fetch(`${base}/api/feed`, { headers });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      demo: boolean;
      notice: string;
      feed: Array<{ key: string; score: number; reasons: Array<{ type: string; positive: boolean }> }>;
      whyNot: unknown[];
    };
    expect(body.demo).toBe(true);
    expect(body.notice).toContain("DEMO DATA");
    expect(body.feed.length).toBeGreaterThan(0);
    expect(body.feed.length).toBeLessThanOrEqual(6);
    for (const card of body.feed) {
      expect(card.score).toBeGreaterThan(0);
      expect(card.reasons.length).toBeGreaterThan(0);
      expect(card.key).toMatch(/^issue:demo\//);
    }
    const scores = body.feed.map((c) => c.score);
    expect([...scores]).toEqual([...scores].sort((a, b) => b - a));
  });

  it("stale issues are classified STALE_ISSUE and carry a risk reason", async () => {
    const res = await fetch(`${base}/api/feed`, { headers });
    const body = (await res.json()) as { feed: Array<{ kind: string; reasons: Array<{ type: string; positive: boolean }>; key: string }> };
    const stale = body.feed.find((c) => c.kind === "STALE_ISSUE");
    expect(stale).toBeDefined();
    expect(stale?.reasons.some((r) => r.type === "risk" && !r.positive)).toBe(true);
  });
});

describe("demo server M1 — swipes change the feed (exit-test through HTTP)", () => {
  it("a right-swipe persists, removes the card, and updates the next feed", async () => {
    const first = (await (await fetch(`${base}/api/feed`, { headers })).json()) as {
      feed: Array<{ key: string; language: string | null }>;
    };
    const target = first.feed[0]!;
    const swipeRes = await fetch(`${base}/api/swipe`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ key: target.key, action: "right" }),
    });
    expect(swipeRes.status).toBe(200);
    const after = (await swipeRes.json()) as { feed: Array<{ key: string }> };
    expect(after.feed.some((c) => c.key === target.key)).toBe(false);
    expect(after.demo).toBe(true);
  });

  it("rejects invalid actions and unknown keys", async () => {
    const badAction = await fetch(`${base}/api/swipe`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ key: "issue:demo/x:1", action: "teleported" }),
    });
    expect(badAction.status).toBe(400);

    const badKey = await fetch(`${base}/api/swipe`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ key: "issue:demo/ghost:999", action: "right" }),
    });
    expect(badKey.status).toBe(404);
  });
});

describe("demo server M1 — task contract generation", () => {
  it("builds a real TaskContract with the ssoc git workflow and renders markdown", async () => {
    const feed = (await (await fetch(`${base}/api/feed`, { headers })).json()) as {
      feed: Array<{ key: string; number: number }>;
    };
    const target = feed.feed[0]!;
    const res = await fetch(`${base}/api/task`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ key: target.key }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { demo: boolean; contract: Record<string, unknown>; markdown: string };
    expect(body.demo).toBe(true);
    expect(body.contract.contract_version).toBe(1);
    expect(body.contract.git_workflow).toMatchObject({
      fork_remote: "origin",
      upstream_remote: "upstream",
      commit_identity: { name: "Archit Adish Gupta", email: "arcgod-design@users.noreply.github.com" },
    });
    expect(String((body.contract.git_workflow as { branch: string }).branch)).toMatch(/^feat\/issue-\d+-/);
    expect(body.markdown).toContain("GITSWIPE TASK CONTRACT");
    expect(body.markdown).toContain("untrusted data");
  });

  it("404s for unknown candidate keys", async () => {
    const res = await fetch(`${base}/api/task`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ key: "issue:demo/ghost:999" }),
    });
    expect(res.status).toBe(404);
  });
});
