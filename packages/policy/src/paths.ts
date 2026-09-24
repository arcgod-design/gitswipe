export function normalizePath(input: string): string {
  const withForwardSlashes = input.replace(/\\/g, "/");
  const isAbsolute = withForwardSlashes.startsWith("/") || /^[a-zA-Z]:\//.test(withForwardSlashes);
  const leading = withForwardSlashes.startsWith("/") ? "/" : "";
  const parts = withForwardSlashes.split("/").filter((p) => p.length > 0);
  const out: string[] = [];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      if (out.length > 0 && out[out.length - 1] !== "..") out.pop();
      else if (!isAbsolute) out.push("..");
      continue;
    }
    out.push(part);
  }
  const joined = out.join("/");
  if (isAbsolute) return leading + joined;
  return joined || ".";
}

export function isInside(path: string, roots: readonly string[]): boolean {
  const normalized = normalizePath(path).toLowerCase();
  const drivePrefix = /^([a-z]):\/(.*)$/.exec(normalized);
  return roots.some((root) => {
    const normalizedRoot = normalizePath(root).toLowerCase();
    const rootDrive = /^([a-z]):\/(.*)$/.exec(normalizedRoot);
    if (drivePrefix && rootDrive) {
      if (drivePrefix[1] !== rootDrive[1]) return false;
      return isPrefix(drivePrefix[2] ?? "", rootDrive[2] ?? "");
    }
    if (drivePrefix || rootDrive) return false;
    return isPrefix(normalized, normalizedRoot);
  });
}

function isPrefix(path: string, root: string): boolean {
  if (root === "" || root === ".") return false;
  if (path === root) return true;
  return path.startsWith(root.endsWith("/") ? root : root + "/");
}

const BLOCKED_BASENAMES = new Set(["id_rsa", "id_ed25519", "id_ecdsa", "known_hosts", ".env", "credentials", "credentials.db"]);

export const DEFAULT_BLOCKED_SEGMENTS = [
  ".ssh/",
  ".aws/",
  ".gnupg/",
  ".docker/config",
  "passwords",
  "login data",
  "key4.db",
  "logins.json",
];

export function isBlockedPath(path: string, extra: readonly string[] = []): boolean {
  const normalized = normalizePath(path).toLowerCase();
  const basename = normalized.split("/").pop() ?? "";
  if (BLOCKED_BASENAMES.has(basename)) return true;
  const segments = [...DEFAULT_BLOCKED_SEGMENTS, ...extra.map((s) => s.toLowerCase())];
  return segments.some((seg) => normalized.includes(seg));
}
