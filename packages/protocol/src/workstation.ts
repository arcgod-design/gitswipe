export const WORKSTATION_PROTOCOL = "jarvis-workstation" as const;
export const WORKSTATION_PROTOCOL_VERSION = "1.0" as const;

export const WORKSTATION_CAPABILITIES = [
  "opencode",
  "harness",
  "docker",
  "git",
  "python",
  "node",
  "rust",
  "go",
  "android-sdk",
  "terminal-streaming",
  "filesystem-sandbox",
  "network-policy",
] as const;

export type WorkstationCapability = (typeof WORKSTATION_CAPABILITIES)[number];

export interface HandshakeHello {
  protocol: typeof WORKSTATION_PROTOCOL;
  version: `${number}.${number}`;
  device_id: `dev_${string}`;
  capabilities: WorkstationCapability[];
}

export interface HandshakeChallenge {
  session_nonce: string;
}

export interface HandshakeAccepted {
  policy_version: string;
  connection_id: string;
}

export interface HandshakeReady {
  capabilities: WorkstationCapability[];
}

export interface HandshakeSync {
  last_event_cursor: number;
  pending_tasks: string[];
}

export function isProtocolCompatible(hello: Pick<HandshakeHello, "protocol" | "version">): boolean {
  if (hello.protocol !== WORKSTATION_PROTOCOL) return false;
  const [major] = hello.version.split(".").map((n) => Number.parseInt(n, 10));
  const [ours] = WORKSTATION_PROTOCOL_VERSION.split(".").map((n) => Number.parseInt(n, 10));
  return major === ours;
}
