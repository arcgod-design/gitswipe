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

function serve(): never {
  process.stderr.write(
    "jarvisd: long-running workstation service ships in WEEK-05 (weeks/WEEK-05.md). " +
      "Nothing is listening; refusing to pretend. Use 'check', 'health', 'github', 'secret', or 'demo'.\n",
  );
  process.exit(2);
}

async function demoCommand(args: string[]): Promise<void> {
  const portFlag = args.find((a) => a.startsWith("--port="));
  const port = portFlag ? Number.parseInt(portFlag.slice("--port=".length), 10) : 7420;
  const { startDemoServer } = await import("./demo-server.js");
  const handle = await startDemoServer({ port, dataDir: join(dataDir(), "demo") });
  process.stdout.write(
    [
      "",
      "  GITSWIPE DEMO — fixture data, not connected to GitHub",
      "",
      `  url:   http://127.0.0.1:${handle.port}`,
      `  token: ${handle.token}`,
      "",
      "  Every response carries x-demo-mode: true.",
      "  Demo data dir is isolated; no real credentials are read.",
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
  case "demo":
    await demoCommand(process.argv.slice(3));
    break;
  case "serve":
    serve();
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
        "  jarvisd demo [--port=N] start the pitch demo (fixture data, loopback only)",
        "  jarvisd serve          start the workstation service (WEEK-05)",
        "",
      ].join("\n"),
    );
    break;
}
