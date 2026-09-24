import type { RankingReason } from "@jarvis/protocol";
import type { Candidate } from "./candidate.js";
import { daysSince, issueClarity } from "./candidate.js";
import type { SkillGraph } from "./skills.js";
import { skillMatch } from "./skills.js";
import type { SwipeRecord } from "./swipes.js";

export interface RankedCard {
  candidate: Candidate;
  score: number;
  reasons: RankingReason[];
  showAnyway: boolean;
}

export interface RankOptions {
  minScore?: number;
  maxLanguagePerFeed?: number;
  maxPerRepo?: number;
  now?: Date;
}

export interface RankOutcome {
  feed: RankedCard[];
  whyNot: RankedCard[];
}

export function rankFeed(
  candidates: readonly Candidate[],
  graph: SkillGraph,
  swipes: readonly SwipeRecord[],
  options: RankOptions = {},
): RankOutcome {
  const minScore = options.minScore ?? 0.45;
  const now = options.now ?? new Date();
  const swipedKeys = new Set(swipes.map((s) => s.candidate_key));
  const likedLanguages = new Set(
    swipes
      .filter((s) => s.action === "right" || s.action === "work_started" || s.action === "save")
      .map((s) => s.candidate_key),
  );

  const scored: RankedCard[] = candidates
    .filter((c) => !c.archived)
    .filter((c) => !swipedKeys.has(c.key))
    .map((candidate) => {
      const reasons: RankingReason[] = [];
      let score = 0;

      const match = skillMatch(graph, candidate.language);
      score += match * 0.45;
      if (match >= 0.6) {
        reasons.push({ type: "skill_match", value: round(match), positive: true });
      } else if (graph.rejectedLanguages[candidate.language ?? ""] !== undefined) {
        reasons.push({ type: "skill_match", value: round(match), positive: false });
      }

      const clarity = issueClarity(candidate);
      score += clarity * 0.25;
      if (clarity >= 0.6) reasons.push({ type: "issue_clarity", value: round(clarity), positive: true });

      const ageDays = daysSince(candidate.updatedAt, now);
      const freshness = Math.max(0, 1 - ageDays / 365);
      score += freshness * 0.2;
      if (ageDays > 180) reasons.push({ type: "risk", value: `issue untouched ${ageDays}d`, positive: false });

      if (likedLanguages.size > 0 && candidate.language !== null && similarToLiked(candidate, swipes, candidates)) {
        score += 0.1;
        reasons.push({ type: "saved_similarity", value: round(0.1), positive: true });
      }

      if (candidate.kind === "STALE_ISSUE") {
        reasons.push({ type: "risk", value: "stale issue - maintainer may be inactive", positive: false });
      }

      return { candidate, score: round(score), reasons, showAnyway: false };
    })
    .sort((a, b) => b.score - a.score);

  const feed: RankedCard[] = [];
  const whyNot: RankedCard[] = [];
  const languageCounts: Record<string, number> = {};
  const repoCounts: Record<string, number> = {};
  const maxLang = options.maxLanguagePerFeed ?? 3;
  const maxRepo = options.maxPerRepo ?? 2;

  for (const card of scored) {
    if (card.score < minScore) {
      whyNot.push({ ...card, showAnyway: true });
      continue;
    }
    const lang = card.candidate.language ?? "unknown";
    const repo = card.candidate.repoFullName;
    if ((languageCounts[lang] ?? 0) >= maxLang || (repoCounts[repo] ?? 0) >= maxRepo) {
      whyNot.push({
        ...card,
        showAnyway: true,
        reasons: [
          ...card.reasons,
          { type: "language_match", value: "feed diversity cap reached", positive: false },
        ],
      });
      continue;
    }
    languageCounts[lang] = (languageCounts[lang] ?? 0) + 1;
    repoCounts[repo] = (repoCounts[repo] ?? 0) + 1;
    feed.push(card);
  }

  return { feed, whyNot };
}

function similarToLiked(candidate: Candidate, swipes: readonly SwipeRecord[], all: readonly Candidate[]): boolean {
  const likedKeys = new Set(
    swipes
      .filter((s) => s.action === "right" || s.action === "work_started" || s.action === "save")
      .map((s) => s.candidate_key),
  );
  if (likedKeys.size === 0) return false;
  const likedCandidates = all.filter((c) => likedKeys.has(c.key));
  return likedCandidates.some(
    (liked) => liked.language !== null && liked.language === candidate.language && liked.key !== candidate.key,
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
