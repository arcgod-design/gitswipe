import { execFile } from "node:child_process";
import { statfs } from "node:fs";
import { promisify } from "node:util";
import { defaultRules } from "@jarvis/policy";

const execFileAsync = promisify(execFile);

export interface WorkstationHealth {
  ok: boolean;
  platform: string;
  nodeVersion: string;
  gitVersion: string | null;
  diskFreeBytes: number | null;
  policyRules: number;
  agents: { id: string; available: boolean }[];
  policyVersion: string;
  heartbeatAt: string;
}

export async function gatherHealth(dataDir: string, agents: readonly string[] = ["opencode"]): Promise<WorkstationHealth> {
  const gitVersion = await execFileAsync("git", ["--version"])
    .then(({ stdout }) => stdout.trim())
    .catch(() => null);

  const diskFreeBytes = await new Promise<number | null>((resolve) => {
    statfs(dataDir, (err, stats) => {
      if (err !== undefined && err !== null) {
        resolve(null);
        return;
      }
      resolve(stats.bsize * stats.bavail);
    });
  });

  const agentChecks = await Promise.all(
    agents.map(async (id) => {
      switch (id) {
        case "opencode":
          try {
            await execFileAsync("opencode", ["--version"], { timeout: 5_000 });
            return { id, available: true };
          } catch {
            return { id, available: false };
          }
        default:
          return { id, available: false };
      }
    }),
  );

  return {
    ok: gitVersion !== null && diskFreeBytes !== null,
    platform: process.platform,
    nodeVersion: process.versions.node,
    gitVersion,
    diskFreeBytes,
    policyRules: defaultRules().length,
    agents: agentChecks,
    policyVersion: "1",
    heartbeatAt: new Date().toISOString(),
  };
}
