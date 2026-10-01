import { createServer, type Server } from "node:http";
import { z } from "zod";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { isProtocolCompatible, WORKSTATION_PROTOCOL, WORKSTATION_PROTOCOL_VERSION } from "@jarvis/protocol";
import type { WorkstationConfig } from "./config.js";
import { describeBind } from "./config.js";
import type { DeviceIdentity } from "./identity.js";
import type { PairingService } from "./pairing.js";
import type { WorkstationJournal } from "./journal.js";
import type { DurableQueue } from "./queue.js";
import type { WorkstationHealth } from "./health.js";
import type { GatewaySession } from "@jarvis/agents";
import type { FeedCard } from "@jarvis/discovery";

export interface WorkstationServerHandle {
  server: Server;
  port: number;
  close(): Promise<void>;
}

const ALLOWED_ORIGINS = (port: number): string[] => [
  `http://127.0.0.1:${port}`,
  `http://localhost:${port}`,
];

export interface ProductionFeedEngine {
  feed(): { feed: FeedCard[]; whyNot: FeedCard[]; generatedAt: string };
  swipe(key: string, action: string): { feed: FeedCard[]; whyNot: FeedCard[]; generatedAt: string };
  reset(): void;
}

export interface ProductionSessionManager {
  createSession(candidateKey: string): Promise<{ sessionId: string; state: string }>;
  getSession(id: string): { currentState(): string; pendingApproval(): unknown; decide(approve: boolean): Promise<{ ok: boolean; reason?: string }> } | null;
  decide(id: string, approve: boolean): Promise<{ ok: boolean; reason?: string }>;
}

export function startWorkstationServer(deps: {
  config: WorkstationConfig;
  identity: DeviceIdentity;
  pairing: PairingService;
  journal: WorkstationJournal;
  queue: DurableQueue;
  health: () => Promise<WorkstationHealth>;
  feedEngine?: ProductionFeedEngine;
  sessionManager?: ProductionSessionManager;
}): Promise<WorkstationServerHandle> {
  const { config, identity, pairing, journal, queue, health, feedEngine, sessionManager } = deps;

  const server = createServer((req, res) => {
    void handle(req, res).catch((err: unknown) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : "internal error" }));
    });
  });

  async function handle(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse): Promise<void> {
    const origin = req.headers.origin;
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const respond = (status: number, body: unknown, headers: Record<string, string> = {}): void => {
      res.writeHead(status, { "Content-Type": "application/json", ...headers });
      res.end(JSON.stringify(body));
    };

    if (origin !== undefined && !ALLOWED_ORIGINS(config.port).includes(origin)) {
      respond(403, { error: "origin not allowed" });
      return;
    }

    if (req.method === "GET" && url.pathname === "/healthz") {
      respond(200, { ok: true, protocol: WORKSTATION_PROTOCOL, version: WORKSTATION_PROTOCOL_VERSION });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/pair") {
      const body = (await readJson(req)) as Record<string, unknown>;
      const parsed = z
        .object({ code: z.string().min(1), label: z.string().min(1).max(64) })
        .safeParse(body);
      if (!parsed.success) {
        respond(400, { error: "invalid pair payload" });
        return;
      }
      const result = pairing.pair(parsed.data.code, parsed.data.label);
      if (!result.ok) {
        respond(401, { error: result.reason });
        return;
      }
      journal.emit({
        type: "WorkstationConnected",
        user_id: "usr_local",
        workstation_id: identity.deviceId,
        payload: { deviceId: result.deviceId, label: parsed.data.label },
        source: "workstation",
      });
      respond(200, { deviceId: result.deviceId, token: result.token });
      return;
    }

    if (!url.pathname.startsWith("/api/")) {
      serveStatic(res, url.pathname, resolve(dirname(fileURLToPath(import.meta.url)), "../../public"));
      return;
    }

    const device = pairing.verifyToken(bearerToken(req));
    if (device === null) {
      respond(401, { error: "unauthorized: pair a device first (POST /api/pair)" });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/workstation") {
      const [report, bind] = [await health(), describeBind(config)];
      respond(200, {
        ...report,
        workstationId: identity.deviceId,
        pairedDeviceId: device.deviceId,
        label: device.label,
        bind,
        protocol: WORKSTATION_PROTOCOL,
        version: WORKSTATION_PROTOCOL_VERSION,
        protocolCompatible: isProtocolCompatible({ protocol: WORKSTATION_PROTOCOL, version: WORKSTATION_PROTOCOL_VERSION }),
        journalLatest: journal.latest(),
        queuedTasks: queue.list().length,
        devices: pairing.list().length,
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/events") {
      await streamEvents(req, res, url);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/sessions") {
      const from = Number.parseInt(url.searchParams.get("from") ?? "0", 10);
      respond(200, { events: journal.readFrom(Number.isNaN(from) ? 0 : from), latest: journal.latest() });
      return;
    }

    if (feedEngine !== undefined) {
      if (req.method === "GET" && url.pathname === "/api/feed") {
        respond(200, feedEngine.feed());
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/swipe") {
        const body = (await readJson(req)) as Record<string, unknown>;
        const parsed = z.object({ key: z.string().min(1), action: z.string().min(1) }).safeParse(body);
        if (!parsed.success) {
          respond(400, { error: "invalid swipe payload" });
          return;
        }
        respond(200, feedEngine.swipe(parsed.data.key, parsed.data.action));
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/feed/reset") {
        feedEngine.reset();
        respond(200, { reset: true });
        return;
      }
    }

    if (sessionManager !== undefined) {
      if (req.method === "POST" && url.pathname === "/api/session") {
        const body = (await readJson(req)) as Record<string, unknown>;
        const parsed = z.object({ key: z.string().min(1) }).safeParse(body);
        if (!parsed.success) {
          respond(400, { error: "invalid session payload" });
          return;
        }
        try {
          const result = await sessionManager.createSession(parsed.data.key);
          respond(200, result);
        } catch (err) {
          respond(500, { error: err instanceof Error ? err.message : "session creation failed" });
        }
        return;
      }

      const sessionMatch = /^\/api\/session\/([^/]+)(\/(events|approve))?$/.exec(url.pathname);
      if (sessionMatch !== null) {
        const sessionId = sessionMatch[1] ?? "";
        const action = sessionMatch[3] as "events" | "approve" | undefined;

        if (action === "events" && req.method === "GET") {
          await streamSessionEvents(res, url, sessionId);
          return;
        }
        if (action === "approve" && req.method === "POST") {
          const body = (await readJson(req)) as Record<string, unknown>;
          const parsed = z.object({ approve: z.boolean() }).safeParse(body);
          if (!parsed.success) {
            respond(400, { error: "invalid approve payload" });
            return;
          }
          const outcome = await sessionManager.decide(sessionId, parsed.data.approve);
          if (!outcome.ok) {
            respond(409, { error: outcome.reason ?? "approval failed" });
            return;
          }
          respond(200, { decision: parsed.data.approve ? "granted" : "denied" });
          return;
        }
        if (action === undefined && req.method === "GET") {
          const session = sessionManager.getSession(sessionId);
          if (session === null) {
            respond(404, { error: "unknown session" });
            return;
          }
          respond(200, {
            sessionId,
            state: session.currentState(),
            pendingApproval: session.pendingApproval() !== null,
          });
          return;
        }
      }
    }

    respond(404, { error: "not found" });
  }

  function serveStatic(res: import("node:http").ServerResponse, pathname: string, webRoot: string): void {
    const MIME: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".woff2": "font/woff2",
      ".json": "application/json",
      ".png": "image/png",
      ".ico": "image/x-icon",
    };
    const clean = pathname === "/" ? "/index.html" : pathname;
    const target = resolve(webRoot, `.${clean}`);
    if (!target.startsWith(webRoot)) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("forbidden");
      return;
    }
    let isFile = false;
    try {
      isFile = statSync(target).isFile();
    } catch {
      isFile = false;
    }
    if (!isFile) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("not found - run 'npm run build:web' to build the UI");
      return;
    }
    const type = MIME[extname(target).toLowerCase()] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(readFileSync(target));
  }

  async function streamSessionEvents(res: import("node:http").ServerResponse, url: URL, sessionId: string): Promise<void> {
    const from = Number.parseInt(url.searchParams.get("from") ?? "0", 10);
    let cursor = Number.isNaN(from) ? 0 : from;
    let stopped = false;
    res.on("close", () => {
      stopped = true;
    });
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
    const send = (envelope: unknown): void => {
      res.write(`data: ${JSON.stringify(envelope)}\n\n`);
    };
    const poll = (): void => {
      if (stopped) return;
      for (const envelope of journal.readFrom(cursor, sessionId)) {
        send(envelope);
        cursor = envelope.sequence;
      }
      const session = sessionManager?.getSession(sessionId);
      const state = session?.currentState();
      if (state === "COMPLETED" || state === "FAILED" || state === "CANCELLED" || state === "PAUSED") {
        res.write("event: done\ndata: {}\n\n");
        res.end();
        return;
      }
      setTimeout(poll, 120);
    };
    poll();
  }

  async function streamEvents(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, url: URL): Promise<void> {
    const from = Number.parseInt(url.searchParams.get("from") ?? "0", 10);
    let cursor = Number.isNaN(from) ? 0 : from;
    let stopped = false;
    res.on("close", () => {
      stopped = true;
    });
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    });
    const send = (envelope: unknown): void => {
      res.write(`data: ${JSON.stringify(envelope)}\n\n`);
    };
    const poll = (): void => {
      if (stopped) return;
      for (const envelope of journal.readFrom(cursor)) {
        send(envelope);
        cursor = envelope.sequence;
      }
      setTimeout(poll, 200);
    };
    void req;
    poll();
  }

  return new Promise<WorkstationServerHandle>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.bind, () => {
      resolve({
        server,
        port: config.port,
        close: () =>
          new Promise<void>((res, rej) => {
            server.closeAllConnections();
            server.close((err) => (err !== undefined ? rej(err) : res()));
          }),
      });
    });
  });
}

function bearerToken(req: import("node:http").IncomingMessage): string {
  const auth = req.headers.authorization ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

function readJson(req: import("node:http").IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => (data += chunk.toString()));
    req.on("end", () => {
      try {
        resolve(data.length === 0 ? {} : JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}
