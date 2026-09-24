import { describe, expect, it } from "vitest";
import { parseSseChunk } from "../src/sse.js";

describe("parseSseChunk (shared SSE parser)", () => {
  it("parses complete blocks and carries partial tails", () => {
    const first = parseSseChunk('data: {"a":1}\n\nevent: done\ndata: {}\n\nda', "");
    expect(first.blocks).toEqual([
      { event: undefined, data: ['{"a":1}'] },
      { event: "done", data: ["{}"] },
    ]);
    expect(first.carry).toBe("da");

    const second = parseSseChunk('ta: {"b":2}\n\n', first.carry);
    expect(second.blocks).toEqual([{ event: undefined, data: ['{"b":2}'] }]);
    expect(second.carry).toBe("");
  });

  it("handles events split across chunk boundaries without losing data", () => {
    const part1 = parseSseChunk('data: {"seq', "");
    const part2 = parseSseChunk('uence":1}\n\n', part1.carry);
    expect(part1.blocks).toEqual([]);
    expect(JSON.parse(part2.blocks[0]!.data[0]!)).toEqual({ sequence: 1 });
  });

  it("ignores comment lines and empty payloads are preserved as-is", () => {
    const result = parseSseChunk(": keep-alive\ndata: x\n\n", "");
    expect(result.blocks).toEqual([{ event: undefined, data: ["x"] }]);
  });
});
