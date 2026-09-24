import type { AgentSessionId, RepositoryId, SessionId, TaskId, UserId, WorkstationId, WorktreeId } from "./ids.js";
import type { EventEnvelope } from "./events.js";
import type { SessionState } from "./session.js";

export interface AgentCapabilities {
  followUp: boolean;
  pauseResume: boolean;
  interrupt: boolean;
  structuredEvents: boolean;
  worktreeIsolation: boolean;
}

export interface CreateSessionRequest {
  task_id: TaskId;
  repository: string;
  worktree_path: string;
  agent_type: string;
  prompt: string;
}

export interface TestResults {
  command: string;
  passed: number;
  failed: number;
  exit_code: number | null;
  finished_at: string;
}

export interface UsageSummary {
  input_tokens?: number;
  output_tokens?: number;
  duration_ms?: number;
}

export interface TerminalChunk {
  stream: "stdout" | "stderr";
  sequence: number;
  timestamp: string;
  text: string;
  redacted: boolean;
}

export interface JarvisSession {
  jarvis_session_id: SessionId;
  user_id: UserId;
  workstation_id: WorkstationId;
  task_id: TaskId;
  repository_id: RepositoryId;
  worktree_id: WorktreeId;
  agent_type: string;
  agent_session_id: AgentSessionId | null;
  state: SessionState;
  event_cursor: number;
  created_at: string;
  last_activity_at: string;
}

export interface AgentGateway {
  createSession(req: CreateSessionRequest): Promise<JarvisSession>;
  getSession(id: SessionId): Promise<JarvisSession>;
  sendPrompt(id: SessionId, prompt: string): Promise<void>;
  sendFollowUp(id: SessionId, message: string): Promise<void>;
  interrupt(id: SessionId): Promise<void>;
  pause(id: SessionId): Promise<void>;
  resume(id: SessionId): Promise<void>;
  stop(id: SessionId): Promise<void>;
  subscribeEvents(id: SessionId, from_sequence: number): AsyncIterable<EventEnvelope>;
  getLogs(id: SessionId, from_sequence: number): Promise<TerminalChunk[]>;
  getDiff(id: SessionId): Promise<string>;
  getChangedFiles(id: SessionId): Promise<string[]>;
  getTestResults(id: SessionId): Promise<TestResults | null>;
  getUsage(id: SessionId): Promise<UsageSummary>;
  closeSession(id: SessionId): Promise<void>;
}

export interface AgentAdapter {
  readonly id: string;
  readonly displayName: string;
  capabilities(): AgentCapabilities;
  healthCheck(): Promise<{ ok: boolean; detail: string }>;
}
