import { execFile } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import type { AIProvider } from "@jarvis/providers";
import {
  createProvider,
  createSecretStore,
  maskKey,
  resolveApiKey,
  type SecretStore,
} from "@jarvis/providers";
import { GitHubClient, TokenGitHubAuth, GITHUB_TOKEN_KEY } from "@jarvis/github";

const execFileAsync = promisify(execFile);

const VERSION = "0.1.0";

function dataDir(): string {
  const dir = process.env.JARVIS_DATA_DIR ?? "./data";
  mkdirSync(dir, { recursive: true });
  return dir;
}

function secretStore(): SecretStore {
  return createSecretStore({ dataDir: join(dataDir(), "secrets") });
}

async function preflightLite(): Promise<void> {
  const failures: string[] = [];

  try {
    const { stdout } = await execFileAsync("git", ["--version"]);
    process.stdout.write(`git: ${stdout.trim()}\n`);
  } catch {
    failures.push("git not found on PATH");
  }

  const major = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  process.stdout.write(`node: ${process.versions.node}\n`);
  if (major < 22) failures.push(`node >= 22 required (found ${process.versions.node})`);

  try {
    const { defaultRules } = await import("@jarvis/policy");
    process.stdout.write(`policy: ${defaultRules().length} default rules loaded\n`);
  } catch {
    failures.push("policy engine failed to load");
  }

  if (failures.length > 0) {
    process.stderr.write(`preflight FAILED:\n${failures.map((f) => `- ${f}`).join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write("preflight: OK\n");
}

async function healthCommand(): Promise<void> {
  const store = secretStore();
  const configured = (process.env.JARVIS_PROVIDERS ?? "ollama")
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const providers: AIProvider[] = [];
  for (const id of configured) {
    const key = await resolveApiKey(id, store);
    if (key.source === "env-dev") {
      process.stderr.write(`note: ${id} key from env (.env) — dev mode; move it into the OS store via 'jarvisd secret set provider:${id}'\n`);
    }
    try {
      providers.push(createProvider({ providerId: id, apiKey: key.key }));
    } catch (err) {
      process.stderr.write(`${id}: skipped (${err instanceof Error ? err.message : String(err)})\n`);
    }
  }
  let failed = 0;
  for (const provider of providers) {
    const status = await provider.healthCheck();
    const line = `${provider.id.padEnd(12)} ${status.ok ? "OK " : "FAIL"} ${status.detail}${status.latencyMs !== undefined ? ` (${status.latencyMs}ms)` : ""}\n`;
    process.stdout.write(line);
    if (!status.ok) failed += 1;
  }
  if (providers.length === 0) {
    process.stderr.write("no providers configured (set JARVIS_PROVIDERS=comma,list)\n");
    process.exit(1);
  }
  process.exit(failed > 0 ? 1 : 0);
}

async function readStdinLine(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8").replace(/\r?\n$/, "");
}

async function secretCommand(args: string[]): Promise<void> {
  const [sub, key] = args;
  const store = secretStore();
  if (sub === "set" && key) {
    const value = await readStdinLine();
    if (value.length === 0) {
      process.stderr.write("no value provided on stdin\n");
      process.exit(1);
    }
    await store.set(key, value);
    process.stdout.write(`stored: ${key} (${store.kind})\n`);
    return;
  }
  if (sub === "get" && key) {
    const value = await store.get(key);
    process.stdout.write(value === null ? "not found\n" : `${maskKey(value)} (${store.kind})\n`);
    return;
  }
  if (sub === "delete" && key) {
    await store.delete(key);
    process.stdout.write(`deleted: ${key}\n`);
    return;
  }
  if (sub === "list") {
    for (const k of await store.list()) process.stdout.write(`${k}\n`);
    return;
  }
  process.stderr.write(
    ["usage:", "  jarvisd secret set <key>     (value on stdin)", "  jarvisd secret get <key>     (masked)", "  jarvisd secret delete <key>", "  jarvisd secret list", ""].join("\n"),
  );
  process.exit(1);
}

async function githubCheckCommand(): Promise<void> {
  const store = secretStore();
  const token = await store.get(GITHUB_TOKEN_KEY);
  const envToken = process.env.GITHUB_TOKEN;
  if (token) {
    process.stdout.write(`github token: ${maskKey(token)} (os-store, ${store.kind})\n`);
  } else if (envToken) {
    process.stderr.write("github token: env GITHUB_TOKEN — dev mode; move it to the OS store via 'jarvisd secret set github:token'\n");
  } else {
    process.stderr.write("no GitHub token configured. Set one: 'jarvisd secret set github:token' (paste the fine-grained PAT on stdin)\n");
    process.exit(1);
  }
  const client = new GitHubClient({ auth: new TokenGitHubAuth({ store }) });
  try {
    const res = await client.get<{ login: string }>("/user");
    const user = res.data?.login ?? "unknown";
    const rate = client.rateBudget();
    process.stdout.write(`authenticated as: ${user}\n`);
    process.stdout.write(`rate budget: ${rate.remaining ?? "?"}/${rate.limit ?? "?"}\n`);
    process.exit(0);
  } catch (err) {
    process.stderr.write(`github check failed: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}

async function githubCommand(args: string[]): Promise<void> {
  const sub = (args[0] ?? "").replace(/^--/, "");
  if (sub === "check") {
    await githubCheckCommand();
    return;
  }
  process.stderr.write(
    ["usage:", "  jarvisd github check   verify token + print login + rate budget", ""].join("\n"),
  );
  process.exit(1);
}

async function serveCommand(): Promise<void> {
  const { loadConfig } = await import("./workstation/config.js");
  const { loadOrCreateIdentity } = await import("./workstation/identity.js");
  const { PairingService } = await import("./workstation/pairing.js");
  const { WorkstationJournal, journalPath } = await import("./workstation/journal.js");
  const { DurableQueue, queuePath } = await import("./workstation/queue.js");
  const { gatherHealth } = await import("./workstation/health.js");
  const server = await import("./workstation/server.js");
  const startWorkstationServer = server.startWorkstationServer;

  const config = loadConfig();
  const identity = loadOrCreateIdentity(config.dataDir);
  const pairing = new PairingService(config.dataDir, config.pairingTtlMs);
  const journal = new WorkstationJournal(journalPath(config.dataDir));
  const queue = new DurableQueue(queuePath(config.dataDir));

  const feedEngine = await buildProductionFeed(config.dataDir);
  const sessionManager = await buildProductionSessions(config.dataDir, journal, identity);

  const handle = await startWorkstationServer({
    config,
    identity,
    pairing,
    journal,
    queue,
    health: () => gatherHealth(config.dataDir),
    feedEngine,
    sessionManager,
  });

  process.stdout.write(
    [
      "",
      `  GitSwipe workstation — serving on ${config.bind}:${config.port} (${identity.deviceId})`,
      `  journal: ${journal.latest()} events recovered | queue: ${queue.list().length} tasks recovered`,
      `  UI: ${feedEngine !== undefined ? "feed + sessions wired" : "feed engine unavailable"}`,
      "",
      "  Pair a device: jarvisd pair   then POST /api/pair from the client.",
      "  Stop with Ctrl+C.",
      "",
    ].join("\n"),
  );
  const shutdown = () => {
    void handle.close().finally(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function pairCommand(): Promise<void> {
  const { loadConfig } = await import("./workstation/config.js");
  const { PairingService } = await import("./workstation/pairing.js");
  const config = loadConfig();
  const pairing = new PairingService(config.dataDir, config.pairingTtlMs);
  const { code, expiresAt } = pairing.issueCode();
  const minutes = Math.round((expiresAt - Date.now()) / 60_000);
  process.stdout.write(`\n  PAIRING CODE\n  ${code}\n  expires in ${minutes} min, single use\n  data dir: ${config.dataDir}\n\n`);
}

async function devicesCommand(args: string[]): Promise<void> {
  const { loadConfig } = await import("./workstation/config.js");
  const { PairingService } = await import("./workstation/pairing.js");
  const config = loadConfig();
  const pairing = new PairingService(config.dataDir, config.pairingTtlMs);
  const sub = args[0] ?? "";
  if (sub === "list") {
    const devices = pairing.list();
    if (devices.length === 0) {
      process.stdout.write(`no paired devices (data dir: ${config.dataDir})\n`);
      return;
    }
    for (const d of devices) {
      process.stdout.write(`${d.deviceId}  ${d.label}  ${d.createdAt}\n`);
    }
    process.stdout.write(`data dir: ${config.dataDir}\n`);
    return;
  }
  if (sub === "revoke" && args[1] !== undefined) {
    const ok = pairing.revoke(args[1]);
    process.stdout.write(ok ? `revoked: ${args[1]}\n` : `unknown device: ${args[1]}\n`);
    process.exitCode = ok ? 0 : 1;
    return;
  }
  process.stderr.write("usage:\n  jarvisd devices list\n  jarvisd devices revoke <deviceId>\n");
  process.exit(1);
}

const arg = (process.argv[2] ?? "").replace(/^--/, "");
switch (arg) {
  case "version":
    process.stdout.write(`jarvisd ${VERSION} (node ${process.versions.node}, ${process.platform})\n`);
    break;
  case "check":
    await preflightLite();
    break;
  case "health":
    await healthCommand();
    break;
  case "github":
    await githubCommand(process.argv.slice(3));
    break;
  case "secret":
    await secretCommand(process.argv.slice(3));
    break;
  case "serve":
    await serveCommand();
    break;
  case "pair":
    await pairCommand();
    break;
  case "devices":
    await devicesCommand(process.argv.slice(3));
    break;
  default:
    process.stdout.write(
      [
        `jarvisd ${VERSION} — GitSwipe workstation entrypoint`,
        "",
        "  jarvisd version        print version",
        "  jarvisd check          toolchain preflight-lite",
        "  jarvisd health         provider health (JARVIS_PROVIDERS=comma,list)",
        "  jarvisd github check   verify GitHub token + print login + rate budget",
        "  jarvisd secret <cmd>   BYOK key store (OS credential store)",
        "  jarvisd serve          start the workstation service (loopback default)",
        "  jarvisd pair           issue a single-use pairing code (10 min)",
        "  jarvisd devices <cmd>  list | revoke <deviceId>",
        "  jarvisd demo [--port=N] start the pitch demo (fixture data, loopback only)",
        "",
      ].join("\n"),
    );
    break;
}

async function buildProductionFeed(dataDir: string): Promise<import("./workstation/server.js").ProductionFeedEngine | undefined> {
  try {
    const discovery = await import("@jarvis/discovery");
    const buildCandidate = discovery.buildCandidate;
    const rankFeed = discovery.rankFeed;
    const buildFeedPage = discovery.buildFeedPage;
    const applySwipe = discovery.applySwipe;
    const emptyGraph = discovery.emptyGraph;
    const seedFromLanguages = discovery.seedFromLanguages;
    const JsonlSwipeStore = discovery.JsonlSwipeStore;
    const { join } = await import("node:path");

    const swipeStore = new JsonlSwipeStore(join(dataDir, "swipes.jsonl"));
    const candidates = buildFixtureCandidates(buildCandidate);
    let graph = seedFromLanguages(emptyGraph(), ["TypeScript", "TypeScript", "Python"]);
    const candidateByKey = new Map(candidates.map((c) => [c.key, c]));

    return {
      feed() {
        const outcome = rankFeed(candidates, graph, swipeStore.readAll());
        return { feed: outcome.feed.map(discovery.toFeedCard), whyNot: outcome.whyNot.map(discovery.toFeedCard), generatedAt: new Date().toISOString() };
      },
      swipe(key: string, action: string) {
        const candidate = candidateByKey.get(key);
        if (candidate !== undefined) {
          swipeStore.append({ candidate_key: key, action: action as never, at: new Date().toISOString() });
          graph = applySwipe(graph, { candidate_key: key, action: action as never, at: new Date().toISOString() }, candidate.language, candidate.labels);
        }
        const outcome = rankFeed(candidates, graph, swipeStore.readAll());
        return { feed: outcome.feed.map(discovery.toFeedCard), whyNot: outcome.whyNot.map(discovery.toFeedCard), generatedAt: new Date().toISOString() };
      },
      reset() {
        swipeStore.replaceAll([]);
        graph = seedFromLanguages(emptyGraph(), ["TypeScript", "TypeScript", "Python"]);
      },
    };
  } catch (err) {
    process.stderr.write(`feed engine unavailable: ${err instanceof Error ? err.message : String(err)}\n`);
    return undefined;
  }
}

function buildFixtureCandidates(buildCandidate: (item: import("@jarvis/github").NormalizedIssue, repo: import("@jarvis/github").NormalizedRepository | null) => import("@jarvis/discovery").Candidate): import("@jarvis/discovery").Candidate[] {
  const now = new Date().toISOString();
  const issues: import("@jarvis/github").NormalizedIssue[] = [
    { kind: "issue", repo_full_name: "demo/acme-api-server", number: 301, state: "open", title: "Add exponential backoff to webhook retries", body: "Webhook delivery retries immediately on failure. Acceptance: configurable max retries, exponential delay, tests for the retry loop.", labels: ["bug", "help wanted"], created_at: now, updated_at: now, closed_at: null, comments: 3, html_url: "https://github.com/demo/acme-api-server/issues/301", stale: false },
    { kind: "issue", repo_full_name: "demo/orbit-dashboard", number: 501, state: "open", title: "Dashboard charts flash empty state on slow networks", body: "On 3G the charts mount before data arrives. Add skeleton loaders with a minimum display window.", labels: ["bug", "frontend", "help wanted"], created_at: now, updated_at: now, closed_at: null, comments: 2, html_url: "https://github.com/demo/orbit-dashboard/issues/501", stale: false },
    { kind: "issue", repo_full_name: "demo/rustkube", number: 71, state: "open", title: "Connection pool leaks sockets on forced disconnect", body: "Forced TCP disconnects leave sockets in the pool forever. Add a liveness probe with a reaper task.", labels: ["bug", "networking", "help wanted"], created_at: now, updated_at: now, closed_at: null, comments: 1, html_url: "https://github.com/demo/rustkube/issues/71", stale: true },
  ];
  const repos = new Map<string, import("@jarvis/github").NormalizedRepository>([
    ["demo/acme-api-server", { id: 9001, owner: "demo", name: "acme-api-server", full_name: "demo/acme-api-server", default_branch: "main", description: null, language: "Python", topics: ["backend", "api"], stargazers_count: 340, open_issues_count: 12, archived: false, license_spdx: "MIT", pushed_at: now, html_url: "https://github.com/demo/acme-api-server" }],
    ["demo/orbit-dashboard", { id: 9002, owner: "demo", name: "orbit-dashboard", full_name: "demo/orbit-dashboard", default_branch: "main", description: null, language: "TypeScript", topics: ["frontend", "react"], stargazers_count: 812, open_issues_count: 27, archived: false, license_spdx: "MIT", pushed_at: now, html_url: "https://github.com/demo/orbit-dashboard" }],
    ["demo/rustkube", { id: 9003, owner: "demo", name: "rustkube", full_name: "demo/rustkube", default_branch: "main", description: null, language: "Rust", topics: ["kubernetes", "cli"], stargazers_count: 95, open_issues_count: 5, archived: false, license_spdx: "Apache-2.0", pushed_at: now, html_url: "https://github.com/demo/rustkube" }],
  ]);
  return issues.map((item) => buildCandidate(item, repos.get(item.repo_full_name) ?? null));
}

async function buildProductionSessions(dataDir: string, journal: import("./workstation/journal.js").WorkstationJournal, identity: import("./workstation/identity.js").DeviceIdentity): Promise<import("./workstation/server.js").ProductionSessionManager | undefined> {
  try {
    const agents = await import("@jarvis/agents");
    const discovery = await import("@jarvis/discovery");
    const { join } = await import("node:path");

    const adapter = new agents.MockAgentAdapter(60);
    const checkpoints = new agents.CheckpointStore(join(dataDir, "checkpoints"));
    const candidates = buildFixtureCandidates(discovery.buildCandidate);
    const candidateByKey = new Map(candidates.map((c) => [c.key, c]));

    const gateway = new agents.AgentGateway({ adapter, journal, checkpoints });
    type SessionLike = { currentState(): string; pendingApproval(): unknown; decide(approve: boolean): Promise<{ ok: boolean; reason?: string }> };
    const sessions = new Map<string, SessionLike>();

    return {
      async createSession(candidateKey: string) {
        const candidate = candidateByKey.get(candidateKey);
        if (candidate === undefined) {
          throw new Error(`unknown candidate: ${candidateKey}`);
        }
        const slug = candidate.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
        const session = await gateway.createSession({
          repository: candidate.repoFullName,
          branch: `feat/issue-${candidate.number}-${slug}`,
          worktreePath: join(dataDir, "worktrees", candidate.repoFullName.split("/")[1] ?? "repo", `issue-${candidate.number}`),
          prompt: candidate.body,
          validationCommands: ["npm test"],
          userId: "usr_local",
          workstationId: identity.deviceId,
        });
        const id = session.jarvisSession().jarvis_session_id;
        sessions.set(id, session);
        return { sessionId: id, state: session.currentState() };
      },
      getSession(id: string) {
        return sessions.get(id) ?? null;
      },
      async decide(id: string, approve: boolean) {
        const session = sessions.get(id);
        if (session === undefined) {
          return { ok: false, reason: "unknown session" };
        }
        return session.decide(approve);
      },
    };
  } catch (err) {
    process.stderr.write(`session manager unavailable: ${err instanceof Error ? err.message : String(err)}\n`);
    return undefined;
  }
}
