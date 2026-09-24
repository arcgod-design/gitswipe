export interface ParsedBlock {
  event?: string;
  data: string[];
}

export function parseSseChunk(chunk: string, carry: string): { blocks: ParsedBlock[]; carry: string } {
  const buffer = carry + chunk;
  const blocks: ParsedBlock[] = [];
  let rest = buffer;
  let boundary: number;
  while ((boundary = rest.indexOf("\n\n")) >= 0) {
    const block = rest.slice(0, boundary);
    rest = rest.slice(boundary + 2);
    const parsed: ParsedBlock = { data: [] };
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) parsed.event = line.slice(6).trim();
      if (line.startsWith("data:")) parsed.data.push(line.slice(5).trim());
    }
    blocks.push(parsed);
  }
  return { blocks, carry: rest };
}
