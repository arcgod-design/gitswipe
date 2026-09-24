import { z } from "zod";

export const ConfigSchema = z.object({
  bind: z.string().default("127.0.0.1"),
  port: z.number().int().min(1).max(65535).default(7420),
  dataDir: z.string().default("./data"),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  pairingTtlMs: z.number().int().positive().default(10 * 60 * 1_000),
});

export type WorkstationConfig = z.infer<typeof ConfigSchema>;

export interface ConfigSources {
  env?: Record<string, string | undefined>;
  overrides?: Partial<WorkstationConfig>;
}

export function loadConfig(sources: ConfigSources = {}): WorkstationConfig {
  const env = sources.env ?? process.env;
  const parsed = ConfigSchema.parse({
    bind: env.JARVIS_BIND,
    port: env.JARVIS_PORT !== undefined ? Number.parseInt(env.JARVIS_PORT, 10) : undefined,
    dataDir: env.JARVIS_DATA_DIR,
    logLevel: env.JARVIS_LOG_LEVEL,
    pairingTtlMs: undefined,
    ...sources.overrides,
  });
  return parsed;
}

export function describeBind(config: WorkstationConfig): string {
  if (config.bind === "127.0.0.1" || config.bind === "localhost" || config.bind === "::1") {
    return "loopback";
  }
  return "lan";
}
