export interface FeedReason {
  type: string;
  value: number | string;
  positive: boolean;
}

export interface FeedCard {
  kind: string;
  key: string;
  repo: string;
  number: number;
  title: string;
  language: string | null;
  labels: string[];
  score: number;
  reasons: FeedReason[];
  showAnyway: boolean;
  updated_at: string;
  html_url: string;
}

export interface FeedPage {
  demo: boolean;
  notice: string;
  feed: FeedCard[];
  whyNot: FeedCard[];
  generatedAt: string;
}

export interface GitWorkflow {
  worktree_root: string;
  branch: string;
  fork_remote: string;
  upstream_remote: string;
  commit_identity: { name: string; email: string };
  closing_keyword?: string;
  pr_base_branch: string;
  prepush_gates: string[];
}

export interface TaskContract {
  contract_version: number;
  task_id: string;
  repository: string;
  base_branch: string;
  task_source: { kind: string; ref?: string };
  goal: string;
  problem_statement: string;
  relevant_context: string[];
  relevant_files: string[];
  constraints: string[];
  acceptance_criteria: string[];
  validation_commands: string[];
  security_policy: string[];
  expected_output: string[];
  git_workflow: GitWorkflow;
}

export interface SessionEvent {
  event_id: string;
  type: string;
  occurred_at: string;
  sequence: number;
  payload: Record<string, unknown>;
}

export const token = {
  read(): string | null {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("token");
    if (fromUrl !== null && fromUrl.length > 0) {
      sessionStorage.setItem("gitswipe_token", fromUrl);
      params.delete("token");
      const next = params.toString();
      window.history.replaceState(null, "", next.length > 0 ? `?${next}` : window.location.pathname);
    }
    return sessionStorage.getItem("gitswipe_token");
  },
};

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const t = token.read();
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(t !== null ? { Authorization: `Bearer ${t}` } : {}),
      ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, body.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export const api = {
  feed: () => call<FeedPage>("/api/feed"),
  swipe: (key: string, action: string) =>
    call<FeedPage>("/api/swipe", { method: "POST", body: JSON.stringify({ key, action }) }),
  task: (key: string) =>
    call<{ demo: boolean; contract: TaskContract; markdown: string }>("/api/task", {
      method: "POST",
      body: JSON.stringify({ key }),
    }),
  startSession: (key: string) =>
    call<{ demo: boolean; sessionId: string; state: string }>("/api/session", {
      method: "POST",
      body: JSON.stringify({ key }),
    }),
  sessionStatus: (id: string) =>
    call<{ demo: boolean; sessionId: string; state: string; pendingApproval: boolean; events: number }>(
      `/api/session/${id}`,
    ),
  decide: (id: string, approve: boolean) =>
    call<{ demo: boolean; sessionId: string; decision: string }>(`/api/session/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ approve }),
    }),
  resetDemo: () => call<{ demo: boolean; reset: boolean }>("/api/demo/reset", { method: "POST" }),
};

export async function openEventStream(
  sessionId: string,
  from: number,
  onEvent: (event: SessionEvent) => void,
  onDone: () => void,
): Promise<() => void> {
  const t = token.read();
  const res = await fetch(`/api/session/${sessionId}/events?from=${from}`, {
    headers: t !== null ? { Authorization: `Bearer ${t}` } : {},
  });
  if (!res.ok || res.body === null) {
    throw new ApiError(res.status, `event stream failed: HTTP ${res.status}`);
  }
  const { parseSseChunk } = await import("./sse.js");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let carry = "";
  let cancelled = false;

  void (async () => {
    while (!cancelled) {
      const { done, value } = await reader.read();
      if (done) break;
      const { blocks, carry: next } = parseSseChunk(decoder.decode(value, { stream: true }), carry);
      carry = next;
      for (const block of blocks) {
        if (block.event !== undefined) onDone();
        for (const payload of block.data) {
          if (payload === "{}") continue;
          onEvent(JSON.parse(payload) as SessionEvent);
        }
      }
    }
  })();

  return () => {
    cancelled = true;
    void reader.cancel();
  };
}
