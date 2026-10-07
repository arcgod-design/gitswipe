import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Gear,
  House,
  Play,
  ShieldWarning,
  XCircle,
} from "@phosphor-icons/react";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "./styles.css";

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
  feed: FeedCard[];
  whyNot: FeedCard[];
  generatedAt: string;
}

export interface SessionEvent {
  event_id: string;
  type: string;
  occurred_at: string;
  sequence: number;
  session_id: string | null;
  payload: Record<string, unknown>;
}

const token = {
  read(): string | null {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("token");
    if (fromUrl !== null && fromUrl.length > 0) {
      localStorage.setItem("gitswipe_token", fromUrl);
      params.delete("token");
      const next = params.toString();
      window.history.replaceState(null, "", next.length > 0 ? `?${next}` : window.location.pathname);
    }
    return localStorage.getItem("gitswipe_token");
  },
  save(t: string): void {
    localStorage.setItem("gitswipe_token", t);
  },
  clear(): void {
    localStorage.removeItem("gitswipe_token");
  },
};

const base = {
  read(): string {
    const stored = localStorage.getItem("gitswipe_base");
    return stored !== null && stored.length > 0 ? stored : "";
  },
  save(url: string): void {
    localStorage.setItem("gitswipe_base", url.trim().replace(/\/+$/, ""));
  },
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const t = token.read();
  const res = await fetch(base.read() + path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(t !== null ? { Authorization: `Bearer ${t}` } : {}),
      ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

function openStream(
  sessionId: string,
  onEvent: (event: SessionEvent) => void,
  onDone: () => void,
): () => void {
  const t = token.read();
  let cancelled = false;
  void (async () => {
    try {
      const res = await fetch(`${base.read()}/api/session/${sessionId}/events?from=0`, {
        headers: t !== null ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!res.ok || res.body === null) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary: number;
        while ((boundary = buffer.indexOf("\n\n")) >= 0) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) {
              onDone();
              continue;
            }
            if (line.startsWith("data:")) {
              const payload = line.slice(5).trim();
              if (payload === "{}") continue;
              try {
                onEvent(JSON.parse(payload) as SessionEvent);
              } catch {
                // skip malformed events
              }
            }
          }
        }
      }
    } catch {
      // stream ended or failed — don't crash the UI
    }
  })();
  return () => {
    cancelled = true;
  };
}

type Screen =
  | { name: "pair" }
  | { name: "feed" }
  | { name: "session"; sessionId: string }
  | { name: "settings" };

function reasonText(r: FeedReason): string {
  switch (r.type) {
    case "skill_match":
      return typeof r.value === "number" && r.value >= 0.6
        ? "matches your strongest languages"
        : "weak match to your skill history";
    case "issue_clarity":
      return "clear problem statement and welcoming labels";
    case "saved_similarity":
      return "similar to issues you liked before";
    case "risk":
      return String(r.value);
    default:
      return `${r.type}: ${r.value}`;
  }
}

function PairScreen({ onPaired }: { onPaired: (t: string) => void }): React.ReactNode {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("browser");
  const [workstationUrl, setWorkstationUrl] = useState(base.read());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pair = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      base.save(workstationUrl);
      const result = await call<{ deviceId: string; token: string }>("/api/pair", {
        method: "POST",
        body: JSON.stringify({ code, label }),
      });
      token.save(result.token);
      onPaired(result.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "pairing failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <span className="wordmark">
          Git<span className="swipe">Swipe</span>
        </span>
      </header>
      <div className="card" style={{ padding: 32, marginTop: 24 }}>
        <h2 className="screen-title">Pair your device</h2>
        <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
          Run <code className="mono-value">jarvisd pair</code> on your workstation, then enter the code below.
          The code is single-use and expires in 10 minutes.
        </p>
        <div className="form-row">
          <label htmlFor="workstation-url">Workstation URL (mobile only — leave empty in the workstation browser)</label>
          <input
            id="workstation-url"
            className="form-input"
            type="url"
            inputMode="url"
            placeholder="http://100.x.y.z:7420"
            value={workstationUrl}
            onChange={(e) => setWorkstationUrl(e.target.value)}
            aria-label="workstation url"
          />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <input
            className="pair-input"
            placeholder="XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => void (e.key === "Enter" && void pair())}
            aria-label="pairing code"
          />
          <button type="button" className="btn btn-primary" onClick={() => void pair()} disabled={busy || code.length < 9}>
            {busy ? "Pairing..." : "Pair"}
          </button>
        </div>
        {error !== null ? <div className="error-state" style={{ marginTop: 16 }}>{error}</div> : null}
      </div>
    </div>
  );
}

function FeedScreen({ onWork }: { onWork: (key: string) => void }): React.ReactNode {
  const [feed, setFeed] = useState<FeedPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<FeedCard | null>(null);
  const top = feed?.feed[0];
  const next = feed?.feed[1];

  const loadFeed = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const page = await call<FeedPage>("/api/feed");
      setFeed(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not load feed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const swipe = useCallback(
    async (direction: "left" | "right"): Promise<void> => {
      if (top === undefined || leaving !== null) return;
      setLeaving(top);
      try {
        const page = await call<FeedPage>("/api/swipe", {
          method: "POST",
          body: JSON.stringify({ key: top.key, action: direction === "right" ? "right" : "left" }),
        });
        setFeed(page);
      } catch {
        void loadFeed();
      } finally {
        setTimeout(() => setLeaving(null), 300);
      }
    },
    [top, leaving, loadFeed],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "ArrowLeft") void swipe("left");
      if (e.key === "ArrowRight") void swipe("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [swipe]);

  if (error !== null) return <div className="error-state">{error}</div>;
  if (loading && feed === null) return <div className="loading-skeleton" aria-label="loading" />;
  if (top === undefined) {
    return (
      <div className="empty-state">
        <div className="big">That's every card in the feed.</div>
        <div>Swipe data resets when the workstation restarts.</div>
      </div>
    );
  }

  const renderCard = (card: FeedCard, isTop: boolean, isLeaving: boolean, dir: "left" | "right" | null): React.ReactNode => (
    <article
      key={card.key}
      className={`feed-card card ${isTop ? "" : "next"} ${isLeaving ? `leaving ${dir ?? ""}` : ""}`}
      aria-hidden={!isTop}
    >
      <div className="chip-row">
        <span className="chip kind">{card.kind.replace("_", " ")}</span>
        {card.language !== null ? <span className="chip">{card.language}</span> : null}
        {card.labels.slice(0, 3).map((l) => (
          <span key={l} className="chip">{l}</span>
        ))}
      </div>
      <h3 className="card-title">{card.title}</h3>
      <div className="card-repo">{card.repo} #{card.number}</div>
      <div className="score-row">
        <span className="score-num">{card.score.toFixed(2)}</span>
        <div className="score-bar" role="img" aria-label={`match score ${card.score.toFixed(2)}`}>
          <div style={{ width: `${Math.round(card.score * 100)}%` }} />
        </div>
      </div>
      <div className="reasons">
        {card.reasons.map((r, i) => (
          <div key={i} className={`reason ${r.positive ? "pos" : "neg"}`}>
            <span className="sign">{r.positive ? "+" : "-"}</span>
            <span>{reasonText(r)}</span>
          </div>
        ))}
      </div>
      {isTop ? (
        <div className="swipe-actions">
          <button type="button" className="btn btn-ghost" onClick={() => void swipe("left")}>
            Pass
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onWork(card.key)}>
            <Play size={16} weight="fill" /> Work on this
          </button>
        </div>
      ) : null}
    </article>
  );

  return (
    <section>
      <div className="feed-stack">
        {leaving !== null ? renderCard(leaving, true, true, "left") : null}
        {leaving === null && top !== undefined ? renderCard(top, true, false, null) : null}
        {next !== undefined ? renderCard(next, false, false, null) : null}
      </div>
      <p className="hint">
        <span className="kbd">←</span> pass <span className="kbd">→</span> next card
      </p>
    </section>
  );
}

function stateClass(state: string): string {
  if (state === "COMPLETED") return "s-terminal";
  if (state === "PAUSED") return "s-paused";
  if (state === "WAITING_FOR_APPROVAL") return "s-waiting";
  if (state === "RUNNING" || state === "TESTING") return "s-running";
  return "";
}

function eventDetail(e: SessionEvent): string {
  const p = e.payload;
  if (typeof p.summary === "string") return p.summary;
  if (typeof p.path === "string") return `${p.path}${typeof p.change === "string" ? ` (${p.change})` : ""}`;
  if (typeof p.command === "string") {
    const passed = typeof p.passed === "number" ? ` ${p.passed} passed` : "";
    return `${p.command}${passed}`;
  }
  if (typeof p.action === "string") return p.action;
  if (typeof p.checks_passed === "number") return `${p.checks_passed} checks passed`;
  if (typeof p.url === "string") return p.url;
  return "";
}

function SessionScreen({ sessionId, onBack }: { sessionId: string; onBack: () => void }): React.ReactNode {
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [state, setState] = useState("RUNNING");
  const done = useRef(false);

  useEffect(() => {
    const push = (e: SessionEvent): void => {
      setEvents((prev) => [...prev, e]);
      if (e.type === "AgentCompleted" || e.type === "AgentFailed") setState("COMPLETED");
      else if (e.type === "ApprovalRequested") setState("WAITING_FOR_APPROVAL");
      else if (e.type === "ApprovalDenied") setState("PAUSED");
      else if (e.type === "ApprovalGranted" || e.type === "AgentStarted") setState("RUNNING");
    };
    const finish = (): void => {
      if (done.current) return;
      done.current = true;
    };
    const cancel = openStream(sessionId, push, finish);
    return () => {
      done.current = true;
      cancel();
    };
  }, [sessionId]);

  const waiting = state === "WAITING_FOR_APPROVAL";
  const completed = events.some((e) => e.type === "AgentCompleted");

  const decide = (approve: boolean): void => {
    void call(`/api/session/${sessionId}/approve`, {
      method: "POST",
      body: JSON.stringify({ approve }),
    }).catch(() => undefined);
    setState("RUNNING");
  };

  return (
    <section>
      <div className="top-row">
        <h2 className="screen-title">Agent session</h2>
        <button type="button" className="btn-quiet btn" onClick={onBack}>
          <ArrowLeft size={15} /> Back
        </button>
      </div>
      <div className="chip-row" style={{ marginTop: 14 }}>
        <span className={`state-badge ${stateClass(state)}`}>{state}</span>
      </div>

      {waiting ? (
        <div className="approval" role="alertdialog" aria-label="action requires approval">
          <div className="reason pos" style={{ fontWeight: 600, color: "var(--text)" }}>
            <ShieldWarning size={18} weight="fill" style={{ color: "var(--warn)" }} /> The agent wants to push. Approve the exact action:
          </div>
          <div className="action-code">
            git push origin {String(events.find((e) => e.type === "ApprovalRequested")?.payload.branch ?? "...")}
          </div>
          <div className="row">
            <button type="button" className="btn btn-danger" onClick={() => decide(false)}>
              <XCircle size={17} weight="bold" /> Deny
            </button>
            <button type="button" className="btn btn-primary" onClick={() => decide(true)}>
              <CheckCircle size={17} weight="fill" /> Approve
            </button>
          </div>
        </div>
      ) : null}

      {completed ? (
        <div className="approval" style={{ borderColor: "rgba(34,197,94,0.45)", background: "rgba(34,197,94,0.07)" }}>
          <div className="reason pos" style={{ fontWeight: 600, color: "var(--text)" }}>
            <CheckCircle size={18} weight="fill" style={{ color: "var(--accent)" }} /> Session complete.
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 18, padding: "14px 18px" }}>
        <h3 className="contract-section" style={{ marginTop: 0 }}>Event stream (live)</h3>
        <div className="timeline">
          {events.map((e) => (
            <div key={e.event_id} className="event-row">
              <span className="event-time">
                {new Date(e.occurred_at).toLocaleTimeString([], { hour12: false })}
              </span>
              <span>
                <span className="event-type">{e.type}</span>
                {eventDetail(e).length > 0 ? <span className="event-detail">— {eventDetail(e)}</span> : null}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface ProviderPreset {
  id: string;
  displayName: string;
}

interface SettingsState {
  workRoot: string;
  workRootDefault: boolean;
  providerId: string | null;
  model: string | null;
  keyConfigured: boolean;
  keyMasked: string | null;
  presets: ProviderPreset[];
}

function SettingsScreen(): React.ReactNode {
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [workRoot, setWorkRoot] = useState("");
  const [workRootDefault, setWorkRootDefault] = useState(false);
  const [workRootInput, setWorkRootInput] = useState("");
  const [workRootMsg, setWorkRootMsg] = useState<string | null>(null);

  const [presets, setPresets] = useState<ProviderPreset[]>([]);
  const [providerId, setProviderId] = useState("nvidia-nim");
  const [model, setModel] = useState("nvidia/nemotron-3-super-120b-a12b");
  const [keyMasked, setKeyMasked] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [providerMsg, setProviderMsg] = useState<string | null>(null);
  const [providerOk, setProviderOk] = useState<boolean | null>(null);

  const reload = useCallback(() => {
    void call<Record<string, unknown>>("/api/workstation")
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "failed"));
    void call<SettingsState>("/api/settings")
      .then((s) => {
        setWorkRoot(s.workRoot);
        setWorkRootDefault(s.workRootDefault);
        if (s.providerId !== null) setProviderId(s.providerId);
        if (s.model !== null) setModel(s.model);
        setKeyMasked(s.keyMasked);
        setPresets(s.presets);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "failed"));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveProvider = (): void => {
    setBusy("provider");
    void call<{ providerId: string; model: string }>("/api/settings/provider", {
      method: "POST",
      body: JSON.stringify({ providerId, model }),
    })
      .then(() => {
        setProviderOk(null);
        setProviderMsg(`provider saved: ${providerId} · ${model}`);
      })
      .catch((err) => {
        setProviderOk(false);
        setProviderMsg(err instanceof Error ? err.message : "save failed");
      })
      .finally(() => setBusy(null));
  };

  const saveKey = (): void => {
    setBusy("key");
    void call<{ providerId: string; keyMasked: string }>("/api/settings/provider/key", {
      method: "POST",
      body: JSON.stringify({ providerId, apiKey: keyInput }),
    })
      .then((r) => {
        setKeyMasked(r.keyMasked);
        setKeyInput("");
        setProviderOk(true);
        setProviderMsg(`key stored for ${providerId} (${r.keyMasked}) - encrypted in the OS secret store`);
      })
      .catch((err) => {
        setProviderOk(false);
        setProviderMsg(err instanceof Error ? err.message : "key store failed");
      })
      .finally(() => setBusy(null));
  };

  const removeKey = (): void => {
    setBusy("key");
    void call<{ providerId: string; deleted: boolean }>("/api/settings/provider/key/delete", {
      method: "POST",
      body: JSON.stringify({ providerId }),
    })
      .then(() => {
        setKeyMasked(null);
        setProviderOk(true);
        setProviderMsg(`key removed for ${providerId}`);
      })
      .catch((err) => {
        setProviderOk(false);
        setProviderMsg(err instanceof Error ? err.message : "key delete failed");
      })
      .finally(() => setBusy(null));
  };

  const testProvider = (): void => {
    setBusy("test");
    setProviderOk(null);
    setProviderMsg("testing provider...");
    void call<{ ok: boolean; detail?: string; latencyMs?: number; model?: string; reply?: string; error?: string }>(
      "/api/settings/provider/test",
      { method: "POST", body: JSON.stringify({ providerId, model }) },
    )
      .then((r) => {
        setProviderOk(r.ok);
        setProviderMsg(
          r.ok
            ? `${providerId} OK - ${r.detail ?? ""} (${r.latencyMs ?? 0}ms) · ${r.model ?? ""} replied: ${r.reply ?? ""}`
            : `test failed: ${r.error ?? r.detail ?? "unknown error"}`,
        );
      })
      .catch((err) => {
        setProviderOk(false);
        setProviderMsg(err instanceof Error ? err.message : "test failed");
      })
      .finally(() => setBusy(null));
  };

  const saveWorkRoot = (): void => {
    setBusy("workroot");
    setWorkRootMsg(null);
    void call<{ workRoot: string }>("/api/settings/workroot", {
      method: "POST",
      body: JSON.stringify({ path: workRootInput }),
    })
      .then((r) => {
        setWorkRoot(r.workRoot);
        setWorkRootDefault(false);
        setWorkRootInput("");
        setWorkRootMsg(`workspace set to ${r.workRoot}`);
      })
      .catch((err) => setWorkRootMsg(err instanceof Error ? err.message : "workspace update failed"))
      .finally(() => setBusy(null));
  };

  return (
    <section>
      <h2 className="screen-title">Workstation</h2>
      {error !== null ? <div className="error-state" style={{ marginTop: 16 }}>{error}</div> : null}
      {report !== null ? (
        <div className="card" style={{ padding: 24, marginTop: 18 }}>
          <div className="chip-row">
            <span className="chip kind">workstation</span>
            <span className="chip">{String(report.bind ?? "loopback")}</span>
            <span className="chip">{String(report.protocol ?? "")} {String(report.version ?? "")}</span>
          </div>
          <div className="contract-section">
            <h3>Health</h3>
            <p className="mono-value">
              git {String(report.gitVersion ?? "n/a")} · node {String(report.nodeVersion ?? "n/a")} · disk free {String(report.diskFreeBytes ?? "n/a")} bytes
            </p>
            <p className="mono-value">
              policy {String(report.policyRules ?? "n/a")} rules · journal seq {String(report.journalLatest ?? "n/a")} · devices {String(report.devices ?? "n/a")}
            </p>
          </div>
          <div className="contract-section">
            <h3>Paired device</h3>
            <p className="mono-value">
              {String(report.pairedDeviceId ?? "n/a")} — {String(report.label ?? "unknown")}
            </p>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ padding: 24, marginTop: 18 }}>
        <div className="chip-row">
          <span className="chip kind">byok</span>
          <span className="chip">{keyMasked !== null ? `key ${keyMasked}` : "no key stored"}</span>
        </div>
        <div className="contract-section">
          <h3>AI provider</h3>
          <div className="form-row">
            <label htmlFor="provider-select">Provider</label>
            <select
              id="provider-select"
              className="form-input"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
            >
              {presets.length > 0 ? (
                presets.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayName}</option>
                ))
              ) : (
                <option value={providerId}>{providerId}</option>
              )}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="model-input">Model</label>
            <input
              id="model-input"
              className="form-input"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" disabled={busy !== null} onClick={saveProvider}>
              Save provider
            </button>
            <button type="button" className="btn btn-quiet" disabled={busy !== null} onClick={testProvider}>
              {busy === "test" ? "Testing..." : "Test provider"}
            </button>
          </div>
          <div className="form-row">
            <label htmlFor="key-input">API key</label>
            <input
              id="key-input"
              className="form-input"
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              autoComplete="off"
            />
          </div>
          <p className="mono-value">
            {keyMasked !== null
              ? `key stored: ${keyMasked} (OS secret store - never leaves this machine)`
              : "paste a key and store it - it is encrypted in the OS credential store, never written to disk in plaintext"}
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" disabled={busy !== null || keyInput.length < 8} onClick={saveKey}>
              Store key
            </button>
            <button type="button" className="btn btn-danger" disabled={busy !== null || keyMasked === null} onClick={removeKey}>
              Remove key
            </button>
          </div>
          {providerMsg !== null ? (
            <div className={providerOk === false ? "error-state" : "notice"} style={{ marginTop: 12 }}>
              {providerMsg}
            </div>
          ) : null}
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginTop: 18 }}>
        <div className="chip-row">
          <span className="chip kind">workspace</span>
          <span className="chip">{workRootDefault ? "default folder" : "custom folder"}</span>
        </div>
        <div className="contract-section">
          <h3>Workspace root</h3>
          <p className="mono-value">{workRoot}</p>
          <p className="hint">
            Repos and worktrees live inside this folder. Set your own (an existing GitHub work folder is fine) or leave
            it unset to use the default. GitSwipe never touches anything outside it.
          </p>
          <div className="form-row">
            <label htmlFor="workroot-input">Workspace folder (absolute path)</label>
            <input
              id="workroot-input"
              className="form-input"
              type="text"
              value={workRootInput}
              onChange={(e) => setWorkRootInput(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" disabled={busy !== null || workRootInput.length < 3} onClick={saveWorkRoot}>
              Set workspace
            </button>
          </div>
          {workRootMsg !== null ? (
            <div className="notice" style={{ marginTop: 12 }}>{workRootMsg}</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "pair" });
  const [paired, setPaired] = useState(token.read() !== null);

  useEffect(() => {
    if (paired) setScreen({ name: "feed" });
  }, [paired]);

  const onPaired = (t: string): void => {
    token.save(t);
    setPaired(true);
  };

  const onWork = (key: string): void => {
    void call<{ sessionId: string; state: string }>("/api/session", {
      method: "POST",
      body: JSON.stringify({ key }),
    })
      .then(({ sessionId }) => setScreen({ name: "session", sessionId }))
      .catch(() => undefined);
  };

  return (
    <div className="app">
      <header className="header">
        <span className="wordmark">
          Git<span className="swipe">Swipe</span>
        </span>
        {paired ? (
          <>
            <span className="spacer" />
            <button type="button" className={`btn btn-ghost btn-nav ${screen.name === "feed" ? "active" : ""}`} onClick={() => setScreen({ name: "feed" })}>
              <House size={16} /> Feed
            </button>
            <button type="button" className={`btn btn-ghost btn-nav ${screen.name === "settings" ? "active" : ""}`} onClick={() => setScreen({ name: "settings" })}>
              <Gear size={16} /> Workstation
            </button>
          </>
        ) : null}
      </header>
      {!paired || screen.name === "pair" ? (
        <PairScreen onPaired={onPaired} />
      ) : null}
      {paired && screen.name === "feed" ? <FeedScreen onWork={onWork} /> : null}
      {paired && screen.name === "session" ? (
        <SessionScreen sessionId={screen.sessionId} onBack={() => setScreen({ name: "feed" })} />
      ) : null}
      {paired && screen.name === "settings" ? <SettingsScreen /> : null}
    </div>
  );
}
