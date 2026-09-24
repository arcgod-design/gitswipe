import { createServer, type Server } from "node:http";
import { z } from "zod";
import { isProtocolCompatible, WORKSTATION_PROTOCOL, WORKSTATION_PROTOCOL_VERSION } from "@jarvis/protocol";
import type { WorkstationConfig } from "./config.js";
import { describeBind } from "./config.js";
import type { DeviceIdentity } from "./identity.js";
import type { PairingService } from "./pairing.js";
import type { WorkstationJournal } from "./journal.js";
import type { DurableQueue } from "./queue.js";
import type { WorkstationHealth } from "./health.js";

export interface WorkstationServerHandle {
  server: Server;
  port: number;
  close(): Promise<void>;
}

const ALLOWED_ORIGINS = (port: number): string[] => [
  `http://127.0.0.1:${port}`,
  `http://localhost:${port}`,
];

export function startWorkstationServer(deps: {
  config: WorkstationConfig;
  identity: DeviceIdentity;
  pairing: PairingService;
  journal: WorkstationJournal;
  queue: DurableQueue;
  health: () => Promise<WorkstationHealth>;
}): Promise<WorkstationServerHandle> {
  const { config, identity, pairing, journal, queue, health } = deps;

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

    respond(404, { error: "not found" });
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
