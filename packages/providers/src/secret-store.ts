import { execFile, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface SecretStore {
  readonly kind: string;
  set(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}

export class MemorySecretStore implements SecretStore {
  readonly kind = "memory";
  private readonly data = new Map<string, string>();

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async list(): Promise<string[]> {
    return [...this.data.keys()].sort();
  }
}

export class DpapiFileSecretStore implements SecretStore {
  readonly kind = "dpapi-file";
  private readonly filePath: string;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.filePath = join(dataDir, "secrets.dpapi.json");
  }

  async set(key: string, value: string): Promise<void> {
    const blob = await dpapiProtect(value);
    const all = this.readAll();
    all[key] = blob;
    writeFileSync(this.filePath, JSON.stringify(all), { encoding: "utf-8" });
  }

  async get(key: string): Promise<string | null> {
    const blob = this.readAll()[key];
    if (blob === undefined) return null;
    return dpapiUnprotect(blob);
  }

  async delete(key: string): Promise<void> {
    const all = this.readAll();
    delete all[key];
    writeFileSync(this.filePath, JSON.stringify(all), { encoding: "utf-8" });
  }

  async list(): Promise<string[]> {
    return Object.keys(this.readAll()).sort();
  }

  private readAll(): Record<string, string> {
    if (!existsSync(this.filePath)) return {};
    return JSON.parse(readFileSync(this.filePath, "utf-8")) as Record<string, string>;
  }
}

async function dpapiProtect(plain: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$b=[Convert]::FromBase64String($env:JVS_IN);" +
        "Add-Type -AssemblyName System.Security;" +
        "$p=[Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);" +
        "[Convert]::ToBase64String($p)",
    ],
    { env: { ...process.env, JVS_IN: Buffer.from(plain, "utf-8").toString("base64") }, windowsHide: true },
  );
  return stdout.trim();
}

async function dpapiUnprotect(blob: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$b=[Convert]::FromBase64String($env:JVS_IN);" +
        "Add-Type -AssemblyName System.Security;" +
        "$u=[Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);" +
        "[Text.Encoding]::UTF8.GetString($u)",
    ],
    { env: { ...process.env, JVS_IN: blob }, windowsHide: true },
  );
  return stdout.replace(/\r?\n$/, "");
}

export const SECRET_SERVICE = "gitswipe";

export class KeychainSecretStore implements SecretStore {
  readonly kind = "keychain";

  async set(key: string, value: string): Promise<void> {
    await execFileAsync("security", ["add-generic-password", "-U", "-s", SECRET_SERVICE, "-a", key, "-w", value]);
  }

  async get(key: string): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync("security", [
        "find-generic-password",
        "-s",
        SECRET_SERVICE,
        "-a",
        key,
        "-w",
      ]);
      return stdout.replace(/\r?\n$/, "");
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await execFileAsync("security", ["delete-generic-password", "-s", SECRET_SERVICE, "-a", key]).catch(() => {});
  }

  async list(): Promise<string[]> {
    return [];
  }
}

export class LibsecretSecretStore implements SecretStore {
  readonly kind = "libsecret";

  async set(key: string, value: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("secret-tool", ["store", "--label=gitswipe", "service", SECRET_SERVICE, "key", key], {
        stdio: ["pipe", "ignore", "ignore"],
      });
      child.on("error", reject);
      child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`secret-tool exited ${code ?? "unknown"}`))));
      child.stdin.write(`${value}\n`);
      child.stdin.end();
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync("secret-tool", ["lookup", "service", SECRET_SERVICE, "key", key]);
      const value = stdout.replace(/\r?\n$/, "");
      return value.length > 0 ? value : null;
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await execFileAsync("secret-tool", ["clear", "service", SECRET_SERVICE, "key", key]).catch(() => {});
  }

  async list(): Promise<string[]> {
    return [];
  }
}

export function createSecretStore(opts: { platform?: NodeJS.Platform; dataDir: string }): SecretStore {
  const platform = opts.platform ?? process.platform;
  if (platform === "win32") return new DpapiFileSecretStore(opts.dataDir);
  if (platform === "darwin") return new KeychainSecretStore();
  return new LibsecretSecretStore();
}
