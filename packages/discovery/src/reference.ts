import type { Candidate } from "./candidate.js";
import { jaccard, tokenize } from "./dedup.js";

export interface ReferenceReason {
  type: "same_language" | "same_topic" | "shared_labels" | "similar_title";
  value: string;
}

export interface ReferenceCandidate {
  candidate: Candidate;
  relevance: number;
  reasons: ReferenceReason[];
}

export interface ReferenceInput {
  references: readonly Candidate[];
  projectLanguage: string | null;
  projectTopics: readonly string[];
  projectTitleTokens: ReadonlySet<string>;
}

export const MIN_REFERENCE_RELEVANCE = 0.3;

export function findReferences(input: ReferenceInput): ReferenceCandidate[] {
  return input.references
    .map((candidate) => {
      const reasons: ReferenceReason[] = [];
      let relevance = 0;
      if (candidate.language !== null && candidate.language === input.projectLanguage) {
        relevance += 0.4;
        reasons.push({ type: "same_language", value: candidate.language });
      }
      const titleTokens = tokenize(candidate.title);
      const titleOverlap = jaccard(titleTokens, input.projectTitleTokens);
      if (titleOverlap >= 0.2) {
        relevance += titleOverlap;
        reasons.push({ type: "similar_title", value: `overlap ${titleOverlap.toFixed(2)}` });
      }
      const sharedLabels = candidate.labels.filter((l) => input.projectTopics.includes(l));
      if (sharedLabels.length > 0) {
        relevance += 0.15 * sharedLabels.length;
        reasons.push({ type: "shared_labels", value: sharedLabels.join(", ") });
      }
      if (reasons.length === 0 && input.projectTopics.length > 0) {
        const topicMatch = input.projectTopics.find(
          (t) => candidate.title.toLowerCase().includes(t.toLowerCase()) || candidate.body.toLowerCase().includes(t.toLowerCase()),
        );
        if (topicMatch !== undefined) {
          relevance += 0.2;
          reasons.push({ type: "same_topic", value: topicMatch });
        }
      }
      return { candidate, relevance: Math.min(1, Math.round(relevance * 100) / 100), reasons };
    })
    .filter((r) => r.reasons.length > 0 && r.relevance >= MIN_REFERENCE_RELEVANCE)
    .sort((a, b) => b.relevance - a.relevance);
}
