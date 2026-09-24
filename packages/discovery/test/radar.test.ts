import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { GitHubClient } from "@jarvis/github";
import { TokenGitHubAuth } from "@jarvis/github";
import { radarFromCandidates, scanTodoMarkers, fetchAdvisories } from "../src/radar.js";
import type { Candidate } from "../src/candidate.js";

const projectCandidate = (n: number, stale: boolean): Candidate => ({
  key: `issue:o/proj:${n}`,
  kind: stale ? "STALE_ISSUE" : "EXISTING_ISSUE",
  repoFullName: "o/proj",
  number: n,
  title: `Project issue ${n}`,
  body: "body",
  labels: [],
  language: "TypeScript",
  updatedAt: new Date().toISOString(),
  stalenessDays: stale ? 120 : 0,
  archived: false,
  htmlUrl: `https://github.com/o/proj/issues/${n}`,
});

describe("project radar (contract s13)", () => {
  it("only touches the registered project's repo; stale issues become attention items", () => {
    const candidates = [
      projectCandidate(1, false),
      projectCandidate(2, true),
      { ...projectCandidate(3, false), repoFullName: "o/other" },
    ];
    const items = radarFromCandidates("o/proj", candidates);
    expect(items).toHaveLength(2);
    const stale = items.find((i) => i.type === "stale_issue");
    expect(stale?.severity).toBe("attention");
    expect(stale?.sourceUrl).toContain("o/proj");
    expect(items.some((i) => i.title === "Project issue 1" && i.type === "related_issue")).toBe(true);
  });

  it("TODO/FIXME scanner reports line numbers and content", () => {
    const content = ["const x = 1;", "// TODO: handle reconnect", "function f() {", "  // FIXME: race condition", "}"].join("\n");
    const items = scanTodoMarkers(content, "o/proj", "src/ws.ts");
    expect(items).toHaveLength(2);
    expect(items[0]?.title).toContain("TODO in src/ws.ts:2");
    expect(items[1]?.detail).toContain("race condition");
  });

  it("advisories come from the repo-scoped dependabot endpoint with source links (never invented)", async () => {
    let server: Server | null = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify([
          { ghsa_id: "GHSA-xxxx", severity: "high", summary: "RCE in dep", html_url: "https://github.com/advisories/GHSA-xxxx", state: "open" },
          { ghsa_id: "GHSA-yyyy", severity: "low", summary: "fixed already", html_url: "https://github.com/advisories/GHSA-yyyy", state: "fixed" },
        ]),
      );
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const addr = server!.address();
    const client = new GitHubClient({
      baseUrl: `http://127.0.0.1:${addr && typeof addr === "object" ? addr.port : 0}`,
      auth: new TokenGitHubAuth({ env: { GITHUB_TOKEN: "ghp_x" } }),
    });
    const items = await fetchAdvisories(client, "o/proj");
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toContain("GHSA-xxxx");
    expect(items[0]?.sourceUrl).toBe("https://github.com/advisories/GHSA-xxxx");
    server!.closeAllConnections();
    server!.close();
    server = null;
  });
});
