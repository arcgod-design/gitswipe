import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sha256 } from "./identity.js";

export interface PairedDevice {
  deviceId: `dev_${string}`;
  label: string;
  tokenHash: string;
  createdAt: string;
  revoked: boolean;
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function newCode(): string {
  const bytes = randomBytes(8);
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}`;
}

export class PairingService {
  private readonly codesPath: string;
  private readonly devicesPath: string;
  private pending: Array<{ code: string; expiresAt: number; used: boolean }> = [];
  private devices: PairedDevice[] = [];

  constructor(dataDir: string, private readonly ttlMs: number) {
    const dir = join(dataDir, "pairing");
    mkdirSync(dir, { recursive: true });
    this.codesPath = join(dir, "pairing-codes.jsonl");
    this.devicesPath = join(dir, "devices.jsonl");
    this.pending = this.readLines(this.codesPath).map((line) => JSON.parse(line) as { code: string; expiresAt: number; used: boolean });
    this.devices = this.readLines(this.devicesPath).map((line) => JSON.parse(line) as PairedDevice);
  }

  issueCode(label = "unknown client"): { code: string; expiresAt: number } {
    const now = Date.now();
    this.pending = this.pending.filter((entry) => entry.expiresAt >= now && !entry.used);
    const entry = { code: newCode(), expiresAt: now + this.ttlMs, used: false };
    this.pending.push(entry);
    this.writeLines(this.codesPath, this.pending);
    void label;
    return { code: entry.code, expiresAt: entry.expiresAt };
  }

  pair(code: string, label: string, now: number = Date.now()): { ok: true; deviceId: string; token: string } | { ok: false; reason: string } {
    this.pending = this.readLines(this.codesPath).map(
      (line) => JSON.parse(line) as { code: string; expiresAt: number; used: boolean },
    );
    const entry = this.pending.find((c) => c.code === code);
    if (entry === undefined) return { ok: false, reason: "unknown pairing code" };
    if (entry.used) return { ok: false, reason: "pairing code already used" };
    if (entry.expiresAt < now) return { ok: false, reason: "pairing code expired" };

    entry.used = true;
    this.writeLines(this.codesPath, this.pending);
    const token = randomBytes(32).toString("hex");
    const device: PairedDevice = {
      deviceId: `dev_${randomUUID()}`,
      label,
      tokenHash: sha256(token),
      createdAt: new Date().toISOString(),
      revoked: false,
    };
    this.devices.push(device);
    this.writeLines(this.devicesPath, this.devices);
    return { ok: true, deviceId: device.deviceId, token };
  }

  verifyToken(token: string): PairedDevice | null {
    this.devices = this.readLines(this.devicesPath).map((line) => JSON.parse(line) as PairedDevice);
    const hash = sha256(token);
    const device = this.devices.find((d) => d.tokenHash === hash);
    if (device === undefined || device.revoked) return null;
    return device;
  }

  list(): PairedDevice[] {
    this.devices = this.readLines(this.devicesPath).map((line) => JSON.parse(line) as PairedDevice);
    return this.devices.filter((d) => !d.revoked);
  }

  revoke(deviceId: string): boolean {
    this.devices = this.readLines(this.devicesPath).map((line) => JSON.parse(line) as PairedDevice);
    const device = this.devices.find((d) => d.deviceId === deviceId);
    if (device === undefined || device.revoked) return false;
    device.revoked = true;
    this.writeLines(this.devicesPath, this.devices);
    return true;
  }

  private readLines(path: string): string[] {
    if (!existsSync(path)) return [];
    const content = readFileSync(path, "utf-8").trim();
    return content.length === 0 ? [] : content.split("\n");
  }

  private writeLines(path: string, entries: unknown[]): void {
    writeFileSync(path, entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length > 0 ? "\n" : ""), {
      encoding: "utf-8",
    });
  }
}
