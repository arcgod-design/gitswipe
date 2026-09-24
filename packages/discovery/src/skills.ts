import type { SwipeAction } from "@jarvis/protocol";
import type { SwipeRecord } from "./swipes.js";

export interface SkillGraph {
  languages: Record<string, number>;
  likedTopics: Record<string, number>;
  rejectedLanguages: Record<string, number>;
}

export function emptyGraph(): SkillGraph {
  return { languages: {}, likedTopics: {}, rejectedLanguages: {} };
}

export function seedFromLanguages(graph: SkillGraph, languages: readonly (string | null)[]): SkillGraph {
  const next = clone(graph);
  for (const lang of languages) {
    if (lang === null) continue;
    next.languages[lang] = (next.languages[lang] ?? 0) + 1;
  }
  return next;
}

export function applySwipe(graph: SkillGraph, swipe: SwipeRecord, candidateLanguage: string | null, candidateLabels: readonly string[]): SkillGraph {
  const next = clone(graph);
  switch (swipe.action) {
    case "right":
    case "work_started":
    case "work_completed":
    case "save":
      if (candidateLanguage) next.languages[candidateLanguage] = (next.languages[candidateLanguage] ?? 0) + 3;
      for (const label of candidateLabels) next.likedTopics[label] = (next.likedTopics[label] ?? 0) + 1;
      break;
    case "left":
      if (candidateLanguage) next.languages[candidateLanguage] = (next.languages[candidateLanguage] ?? 0) - 1;
      break;
    case "why_not_wrong_stack":
      if (candidateLanguage) next.rejectedLanguages[candidateLanguage] = (next.rejectedLanguages[candidateLanguage] ?? 0) + 3;
      break;
    case "why_not_too_hard":
    case "why_not_not_interesting":
    case "why_not_already_known":
      if (candidateLanguage) next.languages[candidateLanguage] = (next.languages[candidateLanguage] ?? 0) - 2;
      break;
    default:
      break;
  }
  for (const key of Object.keys(next.languages)) {
    if (next.languages[key]! <= 0) delete next.languages[key];
  }
  return next;
}

export function dominantLanguages(graph: SkillGraph, minWeight = 1): string[] {
  return Object.entries(graph.languages)
    .filter(([, weight]) => weight >= minWeight)
    .map(([lang]) => lang);
}

export function skillMatch(graph: SkillGraph, language: string | null): number {
  if (language === null) return 0.3;
  const weight = graph.languages[language] ?? 0;
  if (graph.rejectedLanguages[language] !== undefined) return 0;
  if (weight <= 0) return 0.2;
  const max = Math.max(...Object.values(graph.languages), 1);
  return 0.3 + 0.7 * (weight / max);
}

export function swipeActionIsPositive(action: SwipeAction): boolean {
  return action === "right" || action === "work_started" || action === "work_completed" || action === "save";
}

function clone(graph: SkillGraph): SkillGraph {
  return {
    languages: { ...graph.languages },
    likedTopics: { ...graph.likedTopics },
    rejectedLanguages: { ...graph.rejectedLanguages },
  };
}
