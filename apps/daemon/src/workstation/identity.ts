import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface DeviceIdentity {
  deviceId: `dev_${string}`;
  publicKeyPem: string;
}

export function loadOrCreateIdentity(dataDir: string): DeviceIdentity {
  const dir = join(dataDir, "identity");
  const keyPath = join(dir, "device-ed25519.pem");
  const idPath = join(dir, "device-id.json");
  mkdirSync(dir, { recursive: true });

  if (!existsSync(keyPath) || !existsSync(idPath)) {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    writeFileSync(keyPath, privateKey.export({ type: "pkcs8", format: "pem" }), { encoding: "utf-8", mode: 0o600 });
    const identity: DeviceIdentity = {
      deviceId: `dev_${randomUUID()}`,
      publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    };
    writeFileSync(idPath, JSON.stringify(identity), { encoding: "utf-8" });
    return identity;
  }

  const stored = JSON.parse(readFileSync(idPath, "utf-8")) as { deviceId: string; publicKeyPem: string };
  const priv = createPrivateKey(readFileSync(keyPath, "utf-8"));
  const pub = createPublicKey(priv);
  const publicKeyPem = pub.export({ type: "spki", format: "pem" }).toString();
  if (stored.publicKeyPem !== publicKeyPem) {
    throw new Error("identity corruption: stored public key does not match the private key on disk");
  }
  return { deviceId: stored.deviceId as `dev_${string}`, publicKeyPem };
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
