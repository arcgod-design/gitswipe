import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CandidateRecord, NormalizedIssue, NormalizedRepository } from "@jarvis/github";
import { makeCandidateKey } from "@jarvis/github";
import { JsonlCandidateStore } from "@jarvis/github";
import { buildCandidate, candidatesFromRecords, classifyIssue, issueClarity } from "../src/candidate.js";
import { JsonlSwipeStore, isWhyNot } from "../src/swipes.js";
import { applySwipe, emptyGraph, seedFromLanguages, skillMatch } from "../src/skills.js";
import { rankFeed } from "../src/rank.js";
import { buildFeedPage, toFeedCard } from "../src/feed.js";

const repo = (fullName: string, language: string | null): NormalizedRepository => ({
  id: 1,
  owner: fullName.split("/")[0] ?? "o",
  name: fullName.split("/")[1] ?? "r",
  full_name: fullName,
  default_branch: "main",
  description: null,
  language,
  topics: [],
  stargazers_count: 10,
  open_issues_count: 1,
  archived: false,
  license_spdx: "MIT",
  pushed_at: new Date().toISOString(),
  html_url: `https://github.com/${fullName}`,
});

const issue = (n: number, fullName: string, over: Partial<NormalizedIssue> = {}): NormalizedIssue => ({
  kind: "issue",
  repo_full_name: fullName,
  number: n,
  state: "open",
  title: `Issue ${n}`,
  body: "A sufficiently long body describing the problem with reproduction steps and context.",
  labels: ["help wanted"],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  closed_at: null,
  comments: 1,
  html_url: `https://github.com/${fullName}/issues/${n}`,
  stale: false,
  ...over,
});

const candidateFor = (n: number, fullName: string, language: string | null, over: Partial<NormalizedIssue> = {}) =>
  buildCandidate(issue(n, fullName, over), repo(fullName, language));

describe("candidate classification (contract s9.1)", () => {
  it("open fresh issue = EXISTING_ISSUE; open untouched >90d = STALE_ISSUE; closed never stale", () => {
    const fresh = classifyIssue(issue(1, "o/r"));
    expect(fresh).toBe("EXISTING_ISSUE");
    const stale = classifyIssue(issue(2, "o/r", { stale: true }));
    expect(stale).toBe("STALE_ISSUE");
    const closed = classifyIssue(issue(3, "o/r", { state: "closed", closed_at: new Date().toISOString() }));
    expect(closed).toBe("EXISTING_ISSUE");
  });

  it("issue clarity rewards longer bodies and welcoming labels", () => {
    expect(issueClarity(candidateFor(1, "o/r", "Rust"))).toBeGreaterThanOrEqual(0.6);
    const bare = buildCandidate(issue(1, "o/r", { labels: [], body: "" }), repo("o/r", "Rust"));
    expect(issueClarity(bare)).toBe(0);
  });

  it("candidatesFromRecords maps stored records through repo metadata", () => {
    const dir = mkdtempSync(join(tmpdir(), "jvs-disc-"));
    const store = new JsonlCandidateStore(join(dir, "c.jsonl"));
    const py = issue(1, "o/py");
    const rec: CandidateRecord = {
      key: makeCandidateKey(py),
      kind: "issue",
      repo_full_name: "o/py",
      number: 1,
      payload: py,
      first_seen_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
    };
    store.upsert(rec);
    const candidates = candidatesFromRecords(store.readAll(), new Map([["o/py", repo("o/py", "Python")]]));
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.language).toBe("Python");
  });
});

describe("swipe store", () => {
  it("round-trips records and validates the action vocabulary", () => {
    const dir = mkdtempSync(join(tmpdir(), "jvs-sw-"));
    const store = new JsonlSwipeStore(join(dir, "swipes.jsonl"));
    store.append({
      candidate_key: "issue:o/r:1",
      action: "right",
      at: new Date().toISOString(),
    });
    store.append({
      candidate_key: "issue:o/r:2",
      action: "why_not_wrong_stack",
      reason: "I don't write Rust",
      at: new Date().toISOString(),
    });
    const all = store.readAll();
    expect(all).toHaveLength(2);
    expect(isWhyNot(all[1]!.action)).toBe(true);
    expect(() =>
      store.append({ candidate_key: "x", action: "teleported" as never, at: new Date().toISOString() }),
    ).toThrow();
  });
});

describe("skill graph (contract s14 - learned, never claimed objective)", () => {
  it("right-swipes boost a language; wrong-stack rejects it to zero match", () => {
    let graph = seedFromLanguages(emptyGraph(), ["TypeScript", "TypeScript"]);
    const swipe = { candidate_key: "issue:o/py:1", action: "right" as const, at: new Date().toISOString() };
    graph = applySwipe(graph, swipe, "Python", []);
    expect(skillMatch(graph, "Python")).toBeGreaterThan(0.6);
    expect(skillMatch(graph, "TypeScript")).toBeGreaterThan(0.3);

    const reject = { candidate_key: "issue:o/rs:9", action: "why_not_wrong_stack" as const, at: new Date().toISOString() };
    graph = applySwipe(graph, reject, "Rust", []);
    expect(skillMatch(graph, "Rust")).toBe(0);
  });
});

describe("rankFeed (exit test: swipe changes the next ranking)", () => {
  const candidates = [
    candidateFor(1, "o/py-repo", "Python"),
    candidateFor(2, "o/rs-repo", "Rust"),
    candidateFor(3, "o/ts-repo", "TypeScript"),
  ];

  it("ranks with explainable reasons; cards carry skill_match + clarity", () => {
    const graph = seedFromLanguages(emptyGraph(), ["TypeScript"]);
    const outcome = rankFeed(candidates, graph, []);
    expect(outcome.feed.length).toBeGreaterThan(0);
    const top = outcome.feed[0]!;
    expect(top.candidate.language).toBe("TypeScript");
    expect(top.reasons.some((r) => r.type === "skill_match" && r.positive)).toBe(true);
    for (const card of outcome.feed) {
      expect(card.reasons.every((r) => typeof r.value !== "undefined")).toBe(true);
    }
  });

  const cands = [
    candidateFor(1, "o/py-repo", "Python"),
    candidateFor(2, "o/rs-repo", "Rust"),
    candidateFor(10, "o/ts-a", "TypeScript"),
    candidateFor(11, "o/ts-b", "TypeScript"),
  ];

  it("a right-swipe measurably changes the next ranking", () => {
    const graph = seedFromLanguages(emptyGraph(), ["TypeScript", "TypeScript", "Python"]);
    const before = rankFeed(cands, graph, []);
    expect(before.feed[0]!.candidate.language).toBe("TypeScript");
    const swiped = before.feed[0]!;
    const pythonBefore = skillMatch(graph, "Python");

    const swipe = {
      candidate_key: swiped.candidate.key,
      action: "right" as const,
      at: new Date().toISOString(),
    };
    const boosted = applySwipe(graph, swipe, swiped.candidate.language, swiped.candidate.labels);
    const after = rankFeed(cands, boosted, [swipe]);

    expect(after.feed.some((c) => c.candidate.key === swiped.candidate.key)).toBe(false);
    expect(after.feed[0]!.candidate.language).toBe("TypeScript");
    expect(skillMatch(boosted, "Python")).toBeLessThan(pythonBefore);
  });

  it("rejected stacks drop to whyNot with showAnyway + explicit reasons", () => {
    let graph = seedFromLanguages(emptyGraph(), ["Python"]);
    graph = applySwipe(graph, { candidate_key: "x", action: "why_not_wrong_stack" as const, at: new Date().toISOString() }, "Rust", []);
    const outcome = rankFeed(candidates, graph, []);
    const rustCard = outcome.whyNot.find((c) => c.candidate.language === "Rust");
    expect(rustCard).toBeDefined();
    expect(rustCard?.showAnyway).toBe(true);
    expect(rustCard?.reasons.some((r) => r.type === "skill_match" && !r.positive)).toBe(true);
  });

  it("diversity caps the feed per language and repo; overflow lands in whyNot with a diversity reason", () => {
    const many = [
      candidateFor(1, "o/py", "Python"),
      candidateFor(2, "o/py", "Python"),
      candidateFor(3, "o/py", "Python"),
      candidateFor(4, "o/py", "Python"),
      candidateFor(5, "o/ts", "TypeScript"),
    ];
    const graph = seedFromLanguages(emptyGraph(), ["Python", "TypeScript"]);
    const outcome = rankFeed(many, graph, [], { maxLanguagePerFeed: 3, maxPerRepo: 2 });
    expect(outcome.feed.filter((c) => c.candidate.language === "Python").length).toBeLessThanOrEqual(3);
    expect(outcome.feed.filter((c) => c.candidate.repoFullName === "o/py").length).toBeLessThanOrEqual(2);
    expect(outcome.whyNot.some((c) => c.reasons.some((r) => r.value === "feed diversity cap reached"))).toBe(true);
  });

  it("already-swiped candidates never reappear (swipe persistence)", () => {
    const graph = seedFromLanguages(emptyGraph(), ["Python"]);
    const swipes = [{ candidate_key: "issue:o/py-repo:1", action: "right" as const, at: new Date().toISOString() }];
    const outcome = rankFeed(candidates, graph, swipes);
    expect(outcome.feed.some((c) => c.candidate.key === "issue:o/py-repo:1")).toBe(false);
  });
});

describe("feed page (card contract s9.2)", () => {
  it("produces schema-valid cards with scores as recommendation signals", () => {
    const graph = seedFromLanguages(emptyGraph(), ["TypeScript"]);
    const outcome = rankFeed([candidateFor(1, "o/ts", "TypeScript")], graph, []);
    const page = buildFeedPage(outcome);
    expect(page.feed).toHaveLength(1);
    expect(page.feed[0]!.kind).toBe("EXISTING_ISSUE");
    expect(page.feed[0]!.score).toBeGreaterThan(0);
    expect(page.generatedAt).toBeTruthy();
    expect(() => toFeedCard(outcome.feed[0]!)).not.toThrow();
  });
});
