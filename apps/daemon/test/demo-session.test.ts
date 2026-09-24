import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startDemoServer, type DemoServerHandle } from "../src/demo-server.js";

let handle: DemoServerHandle;
let base: string;
let headers: Record<string, string>;

beforeAll(async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "jvs-m2-"));
  handle = await startDemoServer({ port: 0, dataDir });
  base = `http://127.0.0.1:${handle.port}`;
  headers = { Authorization: `Bearer ${handle.token}` };
});

afterAll(async () => {
  await handle.close();
});

interface TestEvent {
  event_id: string;
  type: string;
  sequence: number;
  payload: Record<string, unknown>;
}

async function openStream(sessionId: string, from = 0): Promise<{
  events: TestEvent[];
  done: boolean;
  pump: Promise<void>;
  close: () => Promise<void>;
}> {
  const res = await fetch(`${base}/api/session/${sessionId}/events?from=${from}`, { headers });
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain("text/event-stream");
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const state = { events: [] as TestEvent[], done: false, buffer: "" };

  async function pump(): Promise<void> {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      state.buffer += decoder.decode(value, { stream: true });
      let boundary: number;
      while ((boundary = state.buffer.indexOf("\n\n")) >= 0) {
        const block = state.buffer.slice(0, boundary);
        state.buffer = state.buffer.slice(boundary + 2);
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) state.done = true;
          if (line.startsWith("data:")) {
            const payload = line.slice(5).trim();
            if (payload === "{}") continue;
            state.events.push(JSON.parse(payload) as TestEvent);
          }
        }
      }
    }
  }

  const pumpPromise = pump().catch((err: unknown) => {
    throw err;
  });
  return {
    events: state.events,
    get done(): boolean {
      return state.done;
    },
    pump: pumpPromise,
    close: async () => {
      await reader.cancel();
    },
  };
}

function types(stream: { events: TestEvent[] }): string[] {
  return stream.events.map((e) => e.type);
}

async function waitFor(stream: { events: TestEvent[] }, predicate: (events: TestEvent[]) => boolean, timeoutMs = 5000): Promise<void> {
  const started = Date.now();
  while (!predicate(stream.events)) {
    if (Date.now() - started > timeoutMs) {
      throw new Error(`timeout waiting for events; got: ${types(stream).join(", ")}`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

async function createSession(key: string): Promise<string> {
  const res = await fetch(`${base}/api/session`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { sessionId: string; state: string };
  expect(body.state).toBe("CREATED");
  return body.sessionId;
}

async function firstFeedKey(): Promise<string> {
  const feed = (await (await fetch(`${base}/api/feed`, { headers })).json()) as { feed: Array<{ key: string }> };
  return feed.feed[0]!.key;
}

describe("M2 — session lifecycle through SSE + approval binding", () => {
  it("streams the scripted timeline, gates on approval, completes after approve", async () => {
    const key = await firstFeedKey();
    const sessionId = await createSession(key);
    const stream = await openStream(sessionId);

    await waitFor(stream, (events) => events.some((e) => e.type === "ApprovalRequested"));
    expect(types(stream)).toEqual([
      "TaskQueued",
      "PreflightStarted",
      "PreflightPassed",
      "AgentStarted",
      "AgentThinkingSummary",
      "FileChanged",
      "FileChanged",
      "PatchGenerated",
      "TestStarted",
      "TestFinished",
      "ApprovalRequested",
    ]);
    const approvalPayload = stream.events.find((e) => e.type === "ApprovalRequested")!.payload;
    expect(approvalPayload.action).toMatch(/^git push origin feat\/issue-\d+-/);

    const approve = await fetch(`${base}/api/session/${sessionId}/approve`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ approve: true }),
    });
    expect(approve.status).toBe(200);

    await waitFor(stream, (events) => events.some((e) => e.type === "AgentCompleted"));
    await stream.pump;
    expect(stream.done).toBe(true);
    expect(types(stream)).toEqual([
      "TaskQueued",
      "PreflightStarted",
      "PreflightPassed",
      "AgentStarted",
      "AgentThinkingSummary",
      "FileChanged",
      "FileChanged",
      "PatchGenerated",
      "TestStarted",
      "TestFinished",
      "ApprovalRequested",
      "ApprovalGranted",
      "CommitCreated",
      "TestStarted",
      "TestFinished",
      "PRCreated",
      "AgentCompleted",
    ]);

    const sequences = stream.events.map((e) => e.sequence);
    expect(sequences).toEqual([...sequences].sort((a, b) => a - b));
    expect(new Set(sequences).size).toBe(sequences.length);
    for (let i = 0; i < sequences.length; i++) {
      expect(sequences[i]).toBe(i + 1);
    }
  });

  it("replays the full journal from cursor 0 after completion (reconnect path)", async () => {
    const key = await firstFeedKey();
    const sessionId = await createSession(key);
    const first = await openStream(sessionId);
    void first.pump;
    await waitFor(first, (events) => events.some((e) => e.type === "ApprovalRequested"));
    await fetch(`${base}/api/session/${sessionId}/approve`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ approve: true }),
    });
    await waitFor(first, (events) => events.some((e) => e.type === "AgentCompleted"));
    await first.close();

    const replay = await openStream(sessionId, 0);
    await replay.pump;
    expect(replay.done).toBe(true);
    expect(replay.events).toHaveLength(17);
    expect(replay.events[0]!.type).toBe("TaskQueued");
    expect(replay.events[16]!.type).toBe("AgentCompleted");
  });

  it("deny transitions the session to PAUSED with an ApprovalDenied event; re-approve is 409", async () => {
    const key = await firstFeedKey();
    const sessionId = await createSession(key);
    const stream = await openStream(sessionId);
    await waitFor(stream, (events) => events.some((e) => e.type === "ApprovalRequested"));

    const deny = await fetch(`${base}/api/session/${sessionId}/approve`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ approve: false }),
    });
    expect(deny.status).toBe(200);

    await waitFor(stream, (events) => events.some((e) => e.type === "ApprovalDenied"));
    await stream.pump;
    expect(stream.done).toBe(true);
    expect(types(stream).slice(-1)).toEqual(["ApprovalDenied"]);

    const status = (await (await fetch(`${base}/api/session/${sessionId}`, { headers })).json()) as { state: string };
    expect(status.state).toBe("PAUSED");

    const reApprove = await fetch(`${base}/api/session/${sessionId}/approve`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ approve: true }),
    });
    expect(reApprove.status).toBe(409);
  });

  it("approve before the agent requests one is 409, and unknown sessions are 404", async () => {
    const key = await firstFeedKey();
    const sessionId = await createSession(key);
    const early = await fetch(`${base}/api/session/${sessionId}/approve`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ approve: true }),
    });
    expect(early.status).toBe(409);

    const ghost = await fetch(`${base}/api/session/sess_ghost/events`, { headers });
    expect(ghost.status).toBe(404);
  });

  it("demo reset wipes swipes and restores the original feed ordering (M4)", async () => {
    const before = (await (await fetch(`${base}/api/feed`, { headers })).json()) as { feed: Array<{ key: string }> };
    const target = before.feed[0]!;
    await fetch(`${base}/api/swipe`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ key: target.key, action: "right" }),
    });
    const swiped = (await (await fetch(`${base}/api/feed`, { headers })).json()) as { feed: Array<{ key: string }> };
    expect(swiped.feed.some((c) => c.key === target.key)).toBe(false);

    const reset = await fetch(`${base}/api/demo/reset`, { method: "POST", headers });
    expect(reset.status).toBe(200);
    const after = (await (await fetch(`${base}/api/feed`, { headers })).json()) as { feed: Array<{ key: string }> };
    expect(after.feed.some((c) => c.key === target.key)).toBe(true);
    expect(after.feed.map((c) => c.key)).toEqual(before.feed.map((c) => c.key));
  });
});
