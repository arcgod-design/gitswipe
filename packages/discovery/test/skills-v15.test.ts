import { describe, expect, it } from "vitest";
import {
  applyOutcome,
  applySwipe,
  effectiveWeight,
  emptyGraph,
  seedFromLanguages,
  skillMatch,
  topicMatch,
  topicTags,
  type SkillGraph,
} from "../src/skills.js";
import { rankFeed } from "../src/rank.js";
import type { Candidate } from "../src/candidate.js";

const DAY = 86_400_000;

function candidate(over: Partial<Candidate> & Pick<Candidate, "key" | "title">): Candidate {
  return {
    kind: "EXISTING_ISSUE",
    repoFullName: "demo/repo",
    number: 1,
    body: "A clear body with acceptance criteria and enough detail to describe the requested change.",
    labels: ["help wanted"],
    language: "TypeScript",
    updatedAt: new Date().toISOString(),
    stalenessDays: 0,
    archived: false,
    htmlUrl: "https://github.com/demo/repo/issues/1",
    ...over,
  };
}

describe("self-learning v1.5 - topic tags", () => {
  it("extracts topics from labels + title, filters stopwords, dedupes", () => {
    const tags = topicTags(["bug", "help wanted"], "Add exponential backoff to webhook retries");
    expect(tags).toContain("backoff");
    expect(tags).toContain("webhook");
    expect(tags).toContain("retries");
    expect(tags).not.toContain("bug");
    expect(tags).not.toContain("add");
    expect(tags).not.toContain("help");
    expect(tags).not.toContain("wanted");
  });

  it("swipe with a title feeds title tokens into likedTopics", () => {
    const g = applySwipe(
      emptyGraph(),
      { candidate_key: "k", action: "right", at: new Date().toISOString() },
      "Rust",
      ["parser"],
      "Improve the wasm parser error messages",
    );
    expect(g.likedTopics["parser"]).toBe(1);
    expect(g.likedTopics["wasm"]).toBe(1);
  });
});

describe("self-learning v1.5 - outcome feedback (Execute closes into Discover)", () => {
  it("a completed session boosts more than a right swipe (finishing beats liking)", () => {
    const swipeAt = new Date().toISOString();
    const swiped = applySwipe(emptyGraph(), { candidate_key: "k", action: "right", at: swipeAt }, "TypeScript", [], "Fix websocket retry loop");
    const completed = applyOutcome(emptyGraph(), { language: "TypeScript", labels: [], title: "Fix websocket retry loop", result: "completed" });
    expect(completed.languages["TypeScript"]!).toBeGreaterThan(swiped.languages["TypeScript"]!);
    expect(completed.likedTopics["websocket"]!).toBeGreaterThan(swiped.likedTopics["websocket"]!);
  });

  it("a failed session decays the signals", () => {
    const g = seedFromLanguages(emptyGraph(), ["Rust"]);
    const failed = applyOutcome(g, { language: "Rust", labels: [], title: "Fix pool leak", result: "failed" });
    expect(failed.languages["Rust"]).toBeUndefined();
  });
});

describe("self-learning v1.5 - recency decay", () => {
  it("a recent small weight beats an old large one (30-day half-life)", () => {
    const now = new Date("2026-10-05T00:00:00.000Z");
    const graph: SkillGraph = {
      languages: { TypeScript: 4, Python: 2 },
      likedTopics: {},
      rejectedLanguages: {},
      lastTouched: { TypeScript: now.getTime() - 40 * DAY, Python: now.getTime() },
    };
    expect(effectiveWeight(graph, "TypeScript", { now })).toBeLessThan(effectiveWeight(graph, "Python", { now }));
    expect(skillMatch(graph, "Python", { now })).toBeGreaterThan(skillMatch(graph, "TypeScript", { now }));
  });

  it("no lastTouched means no decay (v0 graphs stay valid)", () => {
    const graph: SkillGraph = { languages: { Rust: 3 }, likedTopics: {}, rejectedLanguages: {} };
    expect(effectiveWeight(graph, "Rust")).toBe(3);
  });
});

describe("self-learning v1.5 - exit test replayed on outcomes", () => {
  it("a COMPLETED session measurably changes the next ranking and names its topics", () => {
    const poolCard = candidate({
      key: "issue:demo/repo:10",
      number: 10,
      title: "Connection pool leaks sockets on forced disconnect",
      labels: ["networking"],
    });
    const chartsCard = candidate({
      key: "issue:demo/repo:11",
      number: 11,
      title: "Dashboard charts flash empty state on slow networks",
      labels: ["frontend"],
    });

    const graph = seedFromLanguages(emptyGraph(), ["TypeScript"]);
    const before = rankFeed([poolCard, chartsCard], graph, []);
    const poolBefore = before.feed.find((c) => c.candidate.key === poolCard.key)!;
    const chartsBefore = before.feed.find((c) => c.candidate.key === chartsCard.key)!;
    expect(poolBefore.reasons.some((r) => r.type === "domain_match")).toBe(false);

    const learned = applyOutcome(graph, {
      language: "TypeScript",
      labels: poolCard.labels,
      title: poolCard.title,
      result: "completed",
    });
    const after = rankFeed([poolCard, chartsCard], learned, []);
    const poolAfter = after.feed.find((c) => c.candidate.key === poolCard.key)!;
    const chartsAfter = after.feed.find((c) => c.candidate.key === chartsCard.key)!;

    expect(poolAfter.score).toBeGreaterThan(poolBefore.score);
    expect(poolAfter.reasons.some((r) => r.type === "domain_match")).toBe(true);
    expect(chartsAfter.score).toBe(chartsBefore.score);
  });
});

describe("self-learning v1.5 - topicMatch shape", () => {
  it("returns matched topics and a scaled score", () => {
    const g = applySwipe(emptyGraph(), { candidate_key: "k", action: "right", at: new Date().toISOString() }, null, ["auth"], "Refactor the auth token refresh flow");
    const tm = topicMatch(g, topicTags(["auth"], "Refactor the auth token refresh flow"));
    expect(tm.matched.length).toBeGreaterThan(0);
    expect(tm.score).toBeGreaterThan(0);
  });

  it("empty topics score zero", () => {
    expect(topicMatch(emptyGraph(), [])).toEqual({ score: 0, matched: [] });
  });
});
