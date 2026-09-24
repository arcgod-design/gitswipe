import { z } from "zod";
import type { EventId, SessionId, TaskId, UserId, WorkstationId } from "./ids.js";

export const EVENT_TYPES = [
  "TaskCreated",
  "TaskQueued",
  "PreflightStarted",
  "PreflightPassed",
  "PreflightFailed",
  "AgentStarted",
  "AgentMessage",
  "AgentThinkingSummary",
  "CommandRequested",
  "CommandStarted",
  "CommandFinished",
  "FileChanged",
  "FileCreated",
  "FileDeleted",
  "PatchGenerated",
  "TestStarted",
  "TestFinished",
  "ApprovalRequested",
  "ApprovalGranted",
  "ApprovalDenied",
  "AgentPaused",
  "AgentResumed",
  "AgentTakenOver",
  "AgentReturnedToJarvis",
  "AgentCompleted",
  "AgentFailed",
  "WorkstationConnected",
  "WorkstationDisconnected",
  "PRCreated",
  "CommitCreated",
] as const;

export type JarvisEventType = (typeof EVENT_TYPES)[number];

export const EventEnvelopeSchema = z.object({
  event_id: z.string().min(1),
  event_version: z.literal(1),
  type: z.enum(EVENT_TYPES),
  occurred_at: z.string().datetime(),
  user_id: z.string().min(1),
  workstation_id: z.string().min(1),
  task_id: z.string().min(1).nullable(),
  session_id: z.string().min(1).nullable(),
  sequence: z.number().int().nonnegative(),
  payload: z.record(z.unknown()),
  source: z.enum(["workstation", "control", "client"]),
});

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export interface MakeEventInput {
  type: JarvisEventType;
  user_id: UserId;
  workstation_id: WorkstationId;
  task_id?: TaskId | null;
  session_id?: SessionId | null;
  sequence: number;
  payload?: Record<string, unknown>;
  source?: EventEnvelope["source"];
}

export function makeEvent(input: MakeEventInput): EventEnvelope {
  return EventEnvelopeSchema.parse({
    event_id: `evt_${crypto.randomUUID()}` satisfies EventId,
    event_version: 1,
    type: input.type,
    occurred_at: new Date().toISOString(),
    user_id: input.user_id,
    workstation_id: input.workstation_id,
    task_id: input.task_id ?? null,
    session_id: input.session_id ?? null,
    sequence: input.sequence,
    payload: input.payload ?? {},
    source: input.source ?? "workstation",
  });
}

export const EVENT_HISTORY_GAP = "EVENT_HISTORY_GAP" as const;
