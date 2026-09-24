import type { GitHubClient } from "@jarvis/github";
import type { Candidate } from "./candidate.js";
import { daysSince } from "./candidate.js";

export const RADAR_ITEM_TYPES = [
  "related_issue",
  "stale_issue",
  "dependency_advisory",
  "todo_marker",
  "possible_improvement",
] as const;

export type RadarItemType = (typeof RADAR_ITEM_TYPES)[number];

export interface RadarItem {
  type: RadarItemType;
  repoFullName: string;
  title: string;
  detail: string;
  sourceUrl: string | null;
  severity: "info" | "attention" | "advisory";
  detectedAt: string;
}

export interface AdvisorySummary {
  ghsaId: string;
  severity: string;
  summary: string;
  url: string;
  affects: string;
}

export function radarFromCandidates(projectRepo: string, candidates: readonly Candidate[], now: Date = new Date()): RadarItem[] {
  const items: RadarItem[] = [];
  for (const candidate of candidates) {
    if (candidate.repoFullName !== projectRepo) continue;
    if (candidate.kind === "STALE_ISSUE") {
      items.push({
        type: "stale_issue",
        repoFullName: candidate.repoFullName,
        title: candidate.title,
        detail: `open and untouched for ${daysSince(candidate.updatedAt, now)} days`,
        sourceUrl: candidate.htmlUrl,
        severity: "attention",
        detectedAt: now.toISOString(),
      });
    } else {
      items.push({
        type: "related_issue",
        repoFullName: candidate.repoFullName,
        title: candidate.title,
        detail: "related GitHub issue in a registered project",
        sourceUrl: candidate.htmlUrl,
        severity: "info",
        detectedAt: now.toISOString(),
      });
    }
  }
  return items;
}

export const TODO_PATTERN = /\b(TODO|FIXME|HACK|XXX)\b[:\s]/g;

export function scanTodoMarkers(content: string, repoFullName: string, filePath: string, now: Date = new Date()): RadarItem[] {
  const items: RadarItem[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    TODO_PATTERN.lastIndex = 0;
    const match = TODO_PATTERN.exec(lines[i]!);
    if (match !== null) {
      items.push({
        type: "todo_marker",
        repoFullName,
        title: `${match[1]} in ${filePath}:${i + 1}`,
        detail: lines[i]!.trim().slice(0, 160),
        sourceUrl: null,
        severity: "info",
        detectedAt: now.toISOString(),
      });
    }
  }
  return items;
}

interface RawAdvisory {
  ghsa_id: string;
  security_advisory_id?: number;
  severity: string;
  summary?: string;
  html_url: string;
  state?: string;
}

export async function fetchAdvisories(client: GitHubClient, repoFullName: string, now: Date = new Date()): Promise<RadarItem[]> {
  const res = await client.get<RawAdvisory[]>(`/repos/${repoFullName}/dependabot/alerts`, { perPage: 40 });
  if (res.data === null) return [];
  const nowIso = now.toISOString();
  return res.data
    .filter((alert) => (alert.state ?? "open") === "open")
    .map((alert) => ({
      type: "dependency_advisory" as const,
      repoFullName,
      title: `Advisory ${alert.ghsa_id}: ${alert.severity}`,
      detail: alert.summary ?? "no summary provided by the advisory source",
      sourceUrl: alert.html_url,
      severity: "advisory" as const,
      detectedAt: nowIso,
    }));
}
