import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const VERSION = "0.1.0";

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

function serve(): never {
  process.stderr.write(
    "jarvisd: long-running workstation service ships in WEEK-05 (weeks/WEEK-05.md). " +
      "Nothing is listening; refusing to pretend. Use --check or --version.\n",
  );
  process.exit(2);
}

const arg = (process.argv[2] ?? "").replace(/^--/, "");
switch (arg) {
  case "version":
    process.stdout.write(`jarvisd ${VERSION} (node ${process.versions.node}, ${process.platform})\n`);
    break;
  case "check":
    await preflightLite();
    break;
  case "serve":
    serve();
    break;
  default:
    process.stdout.write(
      [
        `jarvisd ${VERSION} — Jarvis workstation entrypoint`,
        "",
        "  jarvisd version   print version",
        "  jarvisd check     toolchain preflight-lite",
        "  jarvisd serve     start the workstation service (WEEK-05)",
        "",
      ].join("\n"),
    );
    break;
}
