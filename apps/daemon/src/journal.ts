import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { EventEnvelope } from "@jarvis/protocol";

export class SessionJournal {
  private sequence = 0;

  constructor(private readonly filePath: string) {
    mkdirSync(dirname(this.filePath), { recursive: true });
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
    if (!existsSync(this.filePath)) return [];
    const content = readFileSync(this.filePath, "utf-8").trim();
    if (content.length === 0) return [];
    return content.split("\n").map((line) => JSON.parse(line) as EventEnvelope);
  }

  readFrom(fromSequence: number): EventEnvelope[] {
    return this.readAll().filter((e) => e.sequence > fromSequence);
  }

  latest(): number {
    return this.sequence;
  }
}
