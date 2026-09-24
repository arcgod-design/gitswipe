import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { makeEvent, type EventEnvelope, type JarvisEventType } from "@jarvis/protocol";

export class WorkstationJournal {
  private sequence = 0;

  constructor(private readonly filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
    this.sequence = this.bootSequence();
  }

  latest(): number {
    return this.sequence;
  }

  emit(input: {
    type: JarvisEventType;
    user_id: string;
    workstation_id: string;
    task_id?: string | null;
    session_id?: string | null;
    payload?: Record<string, unknown>;
    source?: EventEnvelope["source"];
  }): EventEnvelope {
    const envelope = makeEvent({
      type: input.type,
      user_id: input.user_id as never,
      workstation_id: input.workstation_id as never,
      task_id: (input.task_id ?? null) as never,
      session_id: (input.session_id ?? null) as never,
      sequence: this.sequence + 1,
      payload: input.payload,
      source: input.source,
    });
    this.append(envelope);
    return envelope;
  }

  append(envelope: EventEnvelope): void {
    if (envelope.sequence !== this.sequence + 1) {
      throw new Error(`journal sequence gap: expected ${this.sequence + 1}, got ${envelope.sequence}`);
    }
    this.sequence = envelope.sequence;
    const existing = existsSync(this.filePath) ? readFileSync(this.filePath, "utf-8") : "";
    writeFileSync(this.filePath, existing + `${JSON.stringify(envelope)}\n`, { encoding: "utf-8" });
  }

  readAll(): EventEnvelope[] {
    return this.parseFile(this.filePath);
  }

  readFrom(cursor: number, sessionId?: string): EventEnvelope[] {
    return this.parseFile(this.filePath).filter(
      (e) => e.sequence > cursor && (sessionId === undefined || e.session_id === sessionId),
    );
  }

  snapshot(sessionId: string): { session_id: string; last_sequence: number; events: EventEnvelope[] } | null {
    const all = this.parseFile(this.filePath).filter((e) => e.session_id === sessionId);
    if (all.length === 0) return null;
    return { session_id: sessionId, last_sequence: all[all.length - 1]!.sequence, events: all };
  }

  private bootSequence(): number {
    const all = this.parseFile(this.filePath);
    return all.length > 0 ? all[all.length - 1]!.sequence : 0;
  }

  private parseFile(path: string): EventEnvelope[] {
    if (!existsSync(path)) return [];
    const content = readFileSync(path, "utf-8").trim();
    if (content.length === 0) return [];
    return content.split("\n").map((line) => JSON.parse(line) as EventEnvelope);
  }
}

export function journalPath(dataDir: string): string {
  return join(dataDir, "journal", "events.jsonl");
}
