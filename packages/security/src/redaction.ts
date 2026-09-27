export interface SecretPattern {
  id: string;
  pattern: RegExp;
  label: string;
}

export const SECRET_PATTERNS: readonly SecretPattern[] = [
  { id: "github_pat", pattern: /\b(ghp_[A-Za-z0-9]{20,})\b/g, label: "GitHub token" },
  { id: "github_fine_pat", pattern: /\b(github_pat_[A-Za-z0-9_]{20,})\b/g, label: "GitHub fine-grained token" },
  { id: "openai_key", pattern: /\b(sk-[A-Za-z0-9_-]{20,})\b/g, label: "OpenAI-style API key" },
  { id: "anthropic_key", pattern: /\b(sk-ant-[A-Za-z0-9_-]{20,})\b/g, label: "Anthropic key" },
  { id: "aws_access", pattern: /\b(AKIA[0-9A-Z]{16})\b/g, label: "AWS access key id" },
  { id: "google_key", pattern: /\b(AIza[0-9A-Za-z_-]{30,})\b/g, label: "Google API key" },
  { id: "slack_token", pattern: /\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/g, label: "Slack token" },
  { id: "jwt", pattern: /\b(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g, label: "JWT" },
  { id: "private_key_block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, label: "private key block" },
  { id: "bearer", pattern: /\b(Bearer\s+[A-Za-z0-9._~+/=-]{16,})/g, label: "bearer token" },
  { id: "generic_secret_assignment", pattern: /\b(password|secret|token|api_key|apikey)\s*[:=]\s*["']([^\s"']{8,})["']/gi, label: "secret assignment" },
];

export const REDACTED = "***REDACTED***";

export interface ScanHit {
  id: string;
  label: string;
  count: number;
}

export function scanSecrets(text: string): ScanHit[] {
  const hits: ScanHit[] = [];
  for (const p of SECRET_PATTERNS) {
    const matches = text.match(p.pattern);
    if (matches !== null && matches.length > 0) {
      hits.push({ id: p.id, label: p.label, count: matches.length });
    }
  }
  return hits;
}

export function redactText(text: string): string {
  let out = text;
  for (const p of SECRET_PATTERNS) {
    out = out.replace(p.pattern, (_m, ...groups) => {
      void groups;
      return REDACTED;
    });
  }
  return out;
}

export function redactDeep(value: unknown): unknown {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[redactText(k)] = redactDeep(v);
    }
    return out;
  }
  return value;
}

export function redactOrWithhold(text: string): { redacted: string; withheld: boolean; hits: ScanHit[] } {
  const hits = scanSecrets(text);
  if (hits.length >= 2) {
    return { redacted: "[output withheld: potential secrets detected]", withheld: true, hits };
  }
  return { redacted: redactText(text), withheld: false, hits };
}
