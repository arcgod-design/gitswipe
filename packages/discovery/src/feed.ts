import { z } from "zod";
import { OPPORTUNITY_KINDS, type OpportunityKind } from "@jarvis/protocol";
import type { RankedCard, RankOutcome } from "./rank.js";

export const FeedCardSchema = z.object({
  kind: z.enum(OPPORTUNITY_KINDS),
  key: z.string().min(1),
  repo: z.string().min(1),
  number: z.number().int().positive(),
  title: z.string().min(1),
  language: z.string().nullable(),
  labels: z.array(z.string()),
  score: z.number().min(0).max(1),
  reasons: z.array(
    z.object({
      type: z.string(),
      value: z.union([z.number(), z.string()]),
      positive: z.boolean(),
    }),
  ),
  showAnyway: z.boolean(),
  updated_at: z.string(),
  html_url: z.string(),
});

export type FeedCard = z.infer<typeof FeedCardSchema>;

export interface FeedPage {
  feed: FeedCard[];
  whyNot: FeedCard[];
  generatedAt: string;
}

export function toFeedCard(card: RankedCard): FeedCard {
  return FeedCardSchema.parse({
    kind: card.candidate.kind,
    key: card.candidate.key,
    repo: card.candidate.repoFullName,
    number: card.candidate.number,
    title: card.candidate.title,
    language: card.candidate.language,
    labels: card.candidate.labels,
    score: card.score,
    reasons: card.reasons,
    showAnyway: card.showAnyway,
    updated_at: card.candidate.updatedAt,
    html_url: card.candidate.htmlUrl,
  });
}

export function buildFeedPage(outcome: RankOutcome, now: Date = new Date()): FeedPage {
  return {
    feed: outcome.feed.map(toFeedCard),
    whyNot: outcome.whyNot.map(toFeedCard),
    generatedAt: now.toISOString(),
  };
}

export type { OpportunityKind };
