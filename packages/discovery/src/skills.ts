import type { SwipeAction } from "@jarvis/protocol";
import type { SwipeRecord } from "./swipes.js";

export interface SkillGraph {
  languages: Record<string, number>;
  likedTopics: Record<string, number>;
  rejectedLanguages: Record<string, number>;
  lastTouched?: Record<string, number>;
}

export interface RecencyOptions {
  now?: Date;
  halfLifeDays?: number;
}

export type OutcomeResult = "completed" | "failed";

export function emptyGraph(): SkillGraph {
  return { languages: {}, likedTopics: {}, rejectedLanguages: {}, lastTouched: {} };
}

export function seedFromLanguages(graph: SkillGraph, languages: readonly (string | null)[]): SkillGraph {
  const next = clone(graph);
  for (const lang of languages) {
    if (lang === null) continue;
    next.languages[lang] = (next.languages[lang] ?? 0) + 1;
    touch(next, lang);
  }
  return next;
}

const TOPIC_STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "then", "when", "will",
  "add", "adds", "into", "onto", "over", "under", "after", "before", "issue",
  "bug", "help", "wanted", "first", "good", "problem", "while", "does",
  "your", "you", "are", "not", "fix", "make", "should", "must", "very",
]);

export function topicTags(labels: readonly string[], title: string): string[] {
  const raw = [...labels, title].join(" ").toLowerCase();
  const tokens = raw.split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !TOPIC_STOPWORDS.has(t));
  return [...new Set(tokens)].slice(0, 6);
}

export function applySwipe(
  graph: SkillGraph,
  swipe: SwipeRecord,
  candidateLanguage: string | null,
  candidateLabels: readonly string[],
  candidateTitle?: string | null,
): SkillGraph {
  const next = clone(graph);
  const topics = candidateTitle !== undefined && candidateTitle !== null ? topicTags(candidateLabels, candidateTitle) : candidateLabels.map((l) => l.toLowerCase());
  switch (swipe.action) {
    case "right":
    case "work_started":
    case "work_completed":
    case "save":
      if (candidateLanguage) {
        next.languages[candidateLanguage] = (next.languages[candidateLanguage] ?? 0) + 3;
        touch(next, candidateLanguage);
      }
      for (const topic of topics) {
        next.likedTopics[topic] = (next.likedTopics[topic] ?? 0) + 1;
        touch(next, topic);
      }
      break;
    case "left":
      if (candidateLanguage) {
        next.languages[candidateLanguage] = (next.languages[candidateLanguage] ?? 0) - 1;
        touch(next, candidateLanguage);
      }
      break;
    case "why_not_wrong_stack":
      if (candidateLanguage) {
        next.rejectedLanguages[candidateLanguage] = (next.rejectedLanguages[candidateLanguage] ?? 0) + 3;
        touch(next, candidateLanguage);
      }
      break;
    case "why_not_too_hard":
    case "why_not_not_interesting":
    case "why_not_already_known":
      if (candidateLanguage) {
        next.languages[candidateLanguage] = (next.languages[candidateLanguage] ?? 0) - 2;
        touch(next, candidateLanguage);
      }
      break;
    default:
      break;
  }
  prune(next);
  return next;
}

export function applyOutcome(
  graph: SkillGraph,
  outcome: { language: string | null; labels: readonly string[]; title: string; result: OutcomeResult; at?: Date },
): SkillGraph {
  const next = clone(graph);
  const topics = topicTags(outcome.labels, outcome.title);
  const languageDelta = outcome.result === "completed" ? 5 : -2;
  const topicDelta = outcome.result === "completed" ? 2 : -1;
  if (outcome.language) {
    next.languages[outcome.language] = (next.languages[outcome.language] ?? 0) + languageDelta;
    touch(next, outcome.language);
  }
  for (const topic of topics) {
    next.likedTopics[topic] = (next.likedTopics[topic] ?? 0) + topicDelta;
    touch(next, topic);
  }
  prune(next);
  return next;
}

export function effectiveWeight(
  graph: SkillGraph,
  key: string,
  options: RecencyOptions = {},
): number {
  const weight = graph.languages[key] ?? graph.likedTopics[key] ?? 0;
  if (weight <= 0) return 0;
  const touched = graph.lastTouched?.[key];
  if (touched === undefined) return weight;
  const now = options.now ?? new Date();
  const halfLifeDays = options.halfLifeDays ?? 30;
  const ageDays = Math.max(0, (now.getTime() - touched) / 86_400_000);
  return weight * Math.pow(0.5, ageDays / halfLifeDays);
}

export function dominantLanguages(graph: SkillGraph, minWeight = 1, options: RecencyOptions = {}): string[] {
  return Object.entries(graph.languages)
    .filter(([lang]) => effectiveWeight(graph, lang, options) >= minWeight && effectiveWeight(graph, lang, options) > 0)
    .map(([lang]) => lang);
}

export function skillMatch(graph: SkillGraph, language: string | null, options: RecencyOptions = {}): number {
  if (language === null) return 0.3;
  if (graph.rejectedLanguages[language] !== undefined) return 0;
  const weight = effectiveWeight(graph, language, options);
  if (weight <= 0) return 0.2;
  const max = Math.max(...Object.keys(graph.languages).map((k) => effectiveWeight(graph, k, options)), 1);
  return 0.3 + 0.7 * (weight / max);
}

export interface TopicMatchResult {
  score: number;
  matched: string[];
}

export function topicMatch(graph: SkillGraph, topics: readonly string[], options: RecencyOptions = {}): TopicMatchResult {
  if (topics.length === 0) return { score: 0, matched: [] };
  const matched: string[] = [];
  let best = 0;
  const maxLiked = Math.max(...Object.keys(graph.likedTopics).map((k) => effectiveWeight(graph, k, options)), 1);
  for (const topic of topics) {
    const weight = effectiveWeight(graph, topic, options);
    if (weight <= 0) continue;
    matched.push(topic);
    best = Math.max(best, Math.min(1, weight / maxLiked));
  }
  return { score: round(matched.length > 0 ? best * Math.min(1, matched.length / 2) : 0), matched };
}

export function swipeActionIsPositive(action: SwipeAction): boolean {
  return action === "right" || action === "work_started" || action === "work_completed" || action === "save";
}

function touch(graph: SkillGraph, key: string): void {
  if (graph.lastTouched === undefined) graph.lastTouched = {};
  graph.lastTouched[key] = Date.now();
}

function prune(graph: SkillGraph): void {
  for (const key of Object.keys(graph.languages)) {
    if (graph.languages[key]! <= 0) delete graph.languages[key];
  }
  for (const key of Object.keys(graph.likedTopics)) {
    if (graph.likedTopics[key]! <= 0) delete graph.likedTopics[key];
  }
}

function clone(graph: SkillGraph): SkillGraph {
  return {
    languages: { ...graph.languages },
    likedTopics: { ...graph.likedTopics },
    rejectedLanguages: { ...graph.rejectedLanguages },
    lastTouched: { ...(graph.lastTouched ?? {}) },
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
