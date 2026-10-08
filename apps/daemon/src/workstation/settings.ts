import { isAbsolute, join } from "node:path";
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";

export interface WorkstationSettings {
  workRoot?: string;
  providerId?: string;
  model?: string;
  allowedOrigins?: string[];
  feedRepos?: string[];
}

export function defaultWorkRoot(dataDir: string): string {
  return join(dataDir, "workspace");
}

export function loadSettings(dataDir: string): WorkstationSettings {
  try {
    const raw = JSON.parse(readFileSync(join(dataDir, "settings.json"), "utf-8")) as WorkstationSettings;
    return {
      workRoot: typeof raw.workRoot === "string" ? raw.workRoot : undefined,
      providerId: typeof raw.providerId === "string" ? raw.providerId : undefined,
      model: typeof raw.model === "string" ? raw.model : undefined,
      allowedOrigins: Array.isArray(raw.allowedOrigins)
        ? raw.allowedOrigins.filter((o) => typeof o === "string" && o.length > 0)
        : undefined,
      feedRepos: Array.isArray(raw.feedRepos)
        ? raw.feedRepos.filter((o) => typeof o === "string" && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(o))
        : undefined,
    };
  } catch {
    return {};
  }
}

export function saveSettings(dataDir: string, patch: WorkstationSettings): WorkstationSettings {
  const next: WorkstationSettings = { ...loadSettings(dataDir), ...patch };
  const tmp = join(dataDir, `settings.tmp-${Date.now()}.json`);
  writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`);
  renameSync(tmp, join(dataDir, "settings.json"));
  return next;
}

export function resolveWorkRoot(dataDir: string): { path: string; isDefault: boolean } {
  const settings = loadSettings(dataDir);
  if (settings.workRoot !== undefined && settings.workRoot.length > 0) {
    mkdirSync(settings.workRoot, { recursive: true });
    return { path: settings.workRoot, isDefault: false };
  }
  const path = defaultWorkRoot(dataDir);
  mkdirSync(path, { recursive: true });
  return { path, isDefault: true };
}

export function validateAndPrepareWorkRoot(path: string): string | null {
  if (!isAbsolute(path)) return "workspace path must be absolute";
  try {
    const st = statSync(path);
    if (!st.isDirectory()) return "path exists and is not a directory";
  } catch {
    try {
      mkdirSync(path, { recursive: true });
    } catch {
      return "cannot create the directory";
    }
  }
  return null;
}
