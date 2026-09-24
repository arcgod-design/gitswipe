import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createSecretStore,
  DpapiFileSecretStore,
  KeychainSecretStore,
  LibsecretSecretStore,
  MemorySecretStore,
} from "../src/secret-store.js";
import { maskKey, resolveApiKey } from "../src/key-resolver.js";

describe("MemorySecretStore", () => {
  it("round-trips, lists sorted, deletes", async () => {
    const store = new MemorySecretStore();
    await store.set("provider:openai", "sk-test");
    await store.set("provider:anthropic", "ak-test");
    expect(await store.get("provider:openai")).toBe("sk-test");
    expect(await store.list()).toEqual(["provider:anthropic", "provider:openai"]);
    await store.delete("provider:openai");
    expect(await store.get("provider:openai")).toBeNull();
  });
});

describe("factory", () => {
  it("picks the platform store", () => {
    expect(createSecretStore({ platform: "win32", dataDir: join(tmpdir(), "x") })).toBeInstanceOf(DpapiFileSecretStore);
    expect(createSecretStore({ platform: "darwin", dataDir: join(tmpdir(), "x") })).toBeInstanceOf(KeychainSecretStore);
    expect(createSecretStore({ platform: "linux", dataDir: join(tmpdir(), "x") })).toBeInstanceOf(LibsecretSecretStore);
  });
});

describe.skipIf(process.platform !== "win32")("DpapiFileSecretStore (live DPAPI, win32 only)", () => {
  it("round-trips a value through real DPAPI and never stores it in plaintext", async () => {
    const dir = mkdtempSync(join(tmpdir(), "jvs-secrets-"));
    const store = new DpapiFileSecretStore(dir);
    await store.set("provider:openai", "sk-live-secret-value");
    expect(await store.get("provider:openai")).toBe("sk-live-secret-value");
    expect(await store.list()).toEqual(["provider:openai"]);
    const { readFileSync } = await import("node:fs");
    const raw = readFileSync(join(dir, "secrets.dpapi.json"), "utf-8");
    expect(raw).not.toContain("sk-live-secret-value");
    await store.delete("provider:openai");
    expect(await store.get("provider:openai")).toBeNull();
  });
});

describe("key resolution", () => {
  it("os-store wins; env is flagged dev; none when absent", async () => {
    const store = new MemorySecretStore();
    expect(await resolveApiKey("openai", store, {})).toEqual({ source: "none" });
    expect(await resolveApiKey("openai", store, { OPENAI_API_KEY: "sk-env" })).toEqual({
      key: "sk-env",
      source: "env-dev",
    });
    await store.set("provider:openai", "sk-stored");
    expect(await resolveApiKey("openai", store, { OPENAI_API_KEY: "sk-env" })).toEqual({
      key: "sk-stored",
      source: "os-store",
    });
  });

  it("maskKey never reveals the middle", () => {
    expect(maskKey("sk-1234567890abcdef")).toBe("sk-1...cdef");
    expect(maskKey("short")).toBe("****");
  });
});
