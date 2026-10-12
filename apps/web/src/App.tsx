import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Gear,
  House,
  Play,
  Robot,
  ShieldWarning,
  XCircle,
} from "@phosphor-icons/react";
import { LocalNotifications } from "@capacitor/local-notifications";
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
  | { name: "sessions" }
  | { name: "approvals" }
  | { name: "activity" }
  | { name: "work" }
  | { name: "projects" }
  | { name: "references" }
  | { name: "contract"; key: string }
  | { name: "session"; sessionId: string }
  | { name: "settings" };

interface SessionListItem {
  sessionId: string;
  repository: string;
  branch: string;
  title: string;
  state: string;
  pendingApproval: boolean;
  createdAt: string;
}

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
    <>
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
        <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
          <input
            className="pair-input"
            style={{ flex: 1, minWidth: 0 }}
            placeholder="XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => void (e.key === "Enter" && void pair())}
            aria-label="pairing code"
          />
          <button type="button" className="btn btn-primary" style={{ whiteSpace: "nowrap" }} onClick={() => void pair()} disabled={busy || code.length < 9}>
            {busy ? "Pairing..." : "Pair"}
          </button>
        </div>
        {error !== null ? <div className="error-state" style={{ marginTop: 16 }}>{error}</div> : null}
      </div>
    </>
  );
}

function FeedScreen({ onWork }: { onWork: (key: string) => void }): React.ReactNode {
  const [feed, setFeed] = useState<FeedPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<FeedCard | null>(null);
  const [leavingDir, setLeavingDir] = useState<"left" | "right">("left");
  const effectiveFeed = feed !== null ? (feed.feed.length > 0 ? feed.feed : feed.whyNot) : [];
  const showingWhyNot = feed !== null && feed.feed.length === 0 && feed.whyNot.length > 0;
  const top = effectiveFeed[0];
  const next = effectiveFeed[1];

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
      const target = top;
      setLeavingDir(direction);
      setLeaving(target);
      try {
        const page = await call<FeedPage>("/api/swipe", {
          method: "POST",
          body: JSON.stringify({ key: target.key, action: direction === "right" ? "right" : "left" }),
        });
        setFeed(page);
      } catch {
        void loadFeed();
      } finally {
        setTimeout(() => {
          setLeaving(null);
          if (direction === "right") onWork(target.key);
        }, 280);
      }
    },
    [top, leaving, loadFeed, onWork],
  );

  const cardRef = useRef<HTMLElement | null>(null);
  const drag = useRef<{ startX: number; dx: number } | null>(null);
  const stampPass = useRef<HTMLSpanElement | null>(null);
  const stampWork = useRef<HTMLSpanElement | null>(null);

  const onCardPointerDown = (e: React.PointerEvent<HTMLElement>): void => {
    if (leaving !== null || top === undefined) return;
    drag.current = { startX: e.clientX, dx: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onCardPointerMove = (e: React.PointerEvent<HTMLElement>): void => {
    if (drag.current === null || cardRef.current === null) return;
    const dx = e.clientX - drag.current.startX;
    drag.current.dx = dx;
    cardRef.current.style.transition = "none";
    cardRef.current.style.transform = `translateX(${dx}px) rotate(${dx * 0.05}deg)`;
    if (stampPass.current !== null) stampPass.current.style.opacity = String(Math.max(0, Math.min(1, -dx / 90)));
    if (stampWork.current !== null) stampWork.current.style.opacity = String(Math.max(0, Math.min(1, dx / 90)));
  };

  const onCardPointerUp = (): void => {
    if (drag.current === null) return;
    const { dx } = drag.current;
    drag.current = null;
    if (stampPass.current !== null) stampPass.current.style.opacity = "0";
    if (stampWork.current !== null) stampWork.current.style.opacity = "0";
    if (dx > 90) {
      if (cardRef.current !== null) {
        cardRef.current.style.transition = "transform 300ms ease, opacity 300ms ease";
        cardRef.current.style.transform = "translateX(120%) rotate(6deg)";
        cardRef.current.style.opacity = "0";
      }
      void swipe("right");
    } else if (dx < -90) {
      if (cardRef.current !== null) {
        cardRef.current.style.transition = "transform 300ms ease, opacity 300ms ease";
        cardRef.current.style.transform = "translateX(-120%) rotate(-6deg)";
        cardRef.current.style.opacity = "0";
      }
      void swipe("left");
    } else if (cardRef.current !== null) {
      cardRef.current.style.transition = "transform 220ms ease";
      cardRef.current.style.transform = "";
    }
  };

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
        <div className="big">No cards right now.</div>
        <div>Sync your GitHub repos on the workstation - or swipe data resets when it restarts.</div>
      </div>
    );
  }

  const renderCard = (card: FeedCard, isTop: boolean, isLeaving: boolean, dir: "left" | "right" | null): React.ReactNode => (
    <article
      key={card.key}
      ref={isTop ? cardRef : undefined}
      className={`feed-card card ${isTop ? "" : "next"} ${isLeaving ? `leaving ${dir ?? ""}` : ""}`}
      aria-hidden={!isTop}
      onPointerDown={isTop ? onCardPointerDown : undefined}
      onPointerMove={isTop ? onCardPointerMove : undefined}
      onPointerUp={isTop ? onCardPointerUp : undefined}
      onPointerCancel={isTop ? onCardPointerUp : undefined}
      style={isTop ? { touchAction: "pan-y" } : undefined}
    >
      {isTop ? (
        <>
          <span className="stamp stamp-pass" ref={stampPass} aria-hidden="true">PASS</span>
          <span className="stamp stamp-work" ref={stampWork} aria-hidden="true">WORK</span>
        </>
      ) : null}
      <div className="chip-row">
        <span className="chip kind">{card.kind.replace("_", " ")}</span>
        {card.showAnyway ? <span className="chip chip-warn">below your bar - shown anyway</span> : null}
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
      {showingWhyNot ? (
        <p className="hint swipe-hint">nothing cleared your match bar yet - showing the best available anyway</p>
      ) : null}
      <div className="feed-stack">
        {next !== undefined ? renderCard(next, false, false, null) : null}
        {leaving !== null ? renderCard(leaving, true, true, leavingDir) : null}
        {leaving === null && top !== undefined ? renderCard(top, true, false, null) : null}
      </div>
      <p className="hint swipe-hint">drag the card left to pass - right to work</p>
    </section>
  );
}

function stateClass(state: string): string {
  if (state === "COMPLETED") return "s-terminal";
  if (state === "FAILED") return "s-failed";
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

interface TaskView {
  markdown: string;
  backend: string;
  modelChain: string[] | null;
  analysisUsed: boolean;
  branch: string;
}

function ContractScreen({ candidateKey, onDispatch, onBack }: { candidateKey: string; onDispatch: () => void; onBack: () => void }): React.ReactNode {
  const [task, setTask] = useState<TaskView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    void call<TaskView>("/api/task", { method: "POST", body: JSON.stringify({ key: candidateKey }) })
      .then(setTask)
      .catch((err) => setError(err instanceof Error ? err.message : "could not build the task contract"));
  }, [candidateKey]);

  return (
    <section>
      <div className="contract-head">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={16} /> Back to feed
        </button>
        <h2 className="screen-title">Task contract</h2>
      </div>
      {error !== null ? <div className="error-state" style={{ marginTop: 16 }}>{error}</div> : null}
      {task === null && error === null ? (
        <div className="card" style={{ padding: 24, marginTop: 18 }}>
          <div className="contract-section">
            <h3>AI analysis</h3>
            <p className="mono-value">{`the analysis model is reading the issue and writing the task prompt...`}</p>
          </div>
        </div>
      ) : null}
      {task !== null ? (
        <>
          <div className="chip-row" style={{ marginTop: 14 }}>
            <span className={`chip ${task.backend === "opencode" ? "chip-live" : "chip-warn"}`}>
              {task.backend === "opencode" ? "live agent (opencode)" : "simulated agent (demo)"}
            </span>
            {task.analysisUsed ? <span className="chip">ai-refined contract</span> : <span className="chip chip-warn">deterministic contract</span>}
            <span className="chip">{task.branch}</span>
          </div>
          {task.modelChain !== null ? (
            <p className="hint" style={{ marginTop: 10 }}>model chain: {task.modelChain.join(" -> ")}</p>
          ) : null}
          <div className="card contract-card" style={{ marginTop: 14 }}>
            <pre className="contract-markdown">{task.markdown}</pre>
          </div>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={dispatching}
              onClick={() => {
                setDispatching(true);
                onDispatch();
              }}
            >
              <Play size={16} weight="fill" /> {dispatching ? "Dispatching..." : "Dispatch to the coding agent"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onBack}>Not now</button>
          </div>
        </>
      ) : null}
    </section>
  );
}

function SessionsScreen({ onOpen, onBack, pendingOnly = false }: { onOpen: (sessionId: string) => void; onBack: () => void; pendingOnly?: boolean }): React.ReactNode {
  const [sessions, setSessions] = useState<SessionListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((): void => {
    void call<{ sessions: SessionListItem[] }>("/api/session/list")
      .then((r) => setSessions(pendingOnly ? r.sessions.filter((s) => s.pendingApproval) : r.sessions))
      .catch((err) => setError(err instanceof Error ? err.message : "could not load sessions"));
  }, [pendingOnly]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4_000);
    return () => clearInterval(t);
  }, [load]);

  const stateChip = (s: SessionListItem): React.ReactNode => {
    if (s.pendingApproval) return <span className="chip chip-warn">NEEDS APPROVAL</span>;
    if (s.state === "COMPLETED") return <span className="chip chip-live">completed</span>;
    if (s.state === "FAILED") return <span className="chip" style={{ color: "var(--danger)", borderColor: "rgba(228,105,79,0.5)" }}>failed</span>;
    if (s.state === "RUNNING") return <span className="chip">running</span>;
    return <span className="chip">{s.state.toLowerCase()}</span>;
  };

  return (
    <section>
      <div className="contract-head">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={16} /> Back to feed
        </button>
        <h2 className="screen-title">Agents</h2>
      </div>
      {error !== null ? <div className="error-state" style={{ marginTop: 16 }}>{error}</div> : null}
      {sessions === null && error === null ? <div className="loading-skeleton" aria-label="loading" /> : null}
      {sessions !== null && sessions.length === 0 ? (
        <div className="card" style={{ padding: 24, marginTop: 18 }}>
          <div className="contract-section">
            <h3>{pendingOnly ? "No approvals waiting" : "No agent sessions yet"}</h3>
            <p className="hint">{pendingOnly ? "When an agent finishes and wants to push, the exact action lands here for your decision." : "Swipe right on a card in the feed and tap Work on this - the session lands here, live."}</p>
          </div>
        </div>
      ) : null}
      {sessions !== null && sessions.length > 0
        ? sessions.map((s) => (
            <button
              key={s.sessionId}
              type="button"
              className="card session-item"
              style={{ padding: 18, marginTop: 14, textAlign: "left", width: "100%" }}
              onClick={() => onOpen(s.sessionId)}
            >
              <div className="chip-row">
                {stateChip(s)}
                <span className="chip">{s.repository}</span>
              </div>
              <div className="session-title">{s.title}</div>
              <div className="session-meta">{s.branch} - {new Date(s.createdAt).toLocaleTimeString([], { hour12: false })}</div>
            </button>
          ))
        : null}
    </section>
  );
}

interface WorkItem {
  key: string;
  repo: string;
  number: number;
  title: string;
  language: string | null;
  state: string;
  sessionId: string | null;
}

interface ProjectCard {
  repo: string;
  candidates: number;
  radarCount: number;
  issuesOpen: number;
  stale: number;
  radar: Array<{ kind: string; summary: string; detail?: string; severity?: string }>;
}

function ProjectsScreen({ onBack }: { onBack: () => void }): React.ReactNode {
  const [projects, setProjects] = useState<ProjectCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void call<{ projects: ProjectCard[] }>("/api/projects")
      .then((r) => setProjects(r.projects))
      .catch((err) => setError(err instanceof Error ? err.message : "failed"));
  }, []);

  return (
    <section>
      <div className="contract-head">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={16} /> Back to feed
        </button>
        <h2 className="screen-title">Projects</h2>
      </div>
      {error !== null ? <div className="error-state" style={{ marginTop: 16 }}>{error}</div> : null}
      {projects !== null && projects.length === 0 ? (
        <div className="card" style={{ padding: 24, marginTop: 18 }}>
          <div className="contract-section">
            <h3>No projects registered</h3>
            <p className="hint">Add repos in Workstation {"->"} Feed repositories - their radar findings land here.</p>
          </div>
        </div>
      ) : null}
      {projects !== null && projects.length > 0
        ? projects.map((p) => (
            <div key={p.repo} className="card" style={{ padding: 20, marginTop: 16 }}>
              <div className="chip-row">
                <span className="chip kind">{p.repo}</span>
                <span className="chip">{p.issuesOpen} open</span>
                <span className="chip">{p.stale} stale</span>
                <span className="chip">{p.radarCount} radar</span>
              </div>
              {p.radar.length > 0 ? (
                <div className="reasons" style={{ marginTop: 12 }}>
                  {p.radar.map((r, i) => (
                    <div key={i} className="reason pos">
                      <span className="sign">!</span>
                      <span>{r.kind}: {r.summary}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="hint" style={{ marginTop: 10 }}>No radar findings - the repo looks healthy.</p>
              )}
            </div>
          ))
        : null}
    </section>
  );
}

interface ReferenceCard {
  key: string;
  repo: string;
  title: string;
  relevance: number;
  reasons: Array<{ type: string; value: string }>;
}

function ReferencesScreen({ onBack }: { onBack: () => void }): React.ReactNode {
  const [refs, setRefs] = useState<ReferenceCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void call<{ references: ReferenceCard[] }>("/api/references")
      .then((r) => setRefs(r.references))
      .catch((err) => setError(err instanceof Error ? err.message : "failed"));
  }, []);

  return (
    <section>
      <div className="contract-head">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={16} /> Back to feed
        </button>
        <h2 className="screen-title">References</h2>
      </div>
      <p className="hint" style={{ marginTop: 8 }}>Repos worth learning from - not contribution targets.</p>
      {error !== null ? <div className="error-state" style={{ marginTop: 16 }}>{error}</div> : null}
      {refs !== null && refs.length === 0 ? (
        <div className="card" style={{ padding: 24, marginTop: 18 }}>
          <div className="contract-section">
            <h3>No references yet</h3>
            <p className="hint">As your swipes build the skill graph, repos relevant to your work surface here with reasons.</p>
          </div>
        </div>
      ) : null}
      {refs !== null && refs.length > 0
        ? refs.map((r) => (
            <div key={r.key} className="card" style={{ padding: 20, marginTop: 16 }}>
              <div className="chip-row">
                <span className="chip kind">REFERENCE</span>
                <span className="chip">{r.repo}</span>
                <span className="chip">{Math.round(r.relevance * 100)}% relevant</span>
              </div>
              <div className="session-title">{r.title}</div>
              <div className="reasons" style={{ marginTop: 10 }}>
                {r.reasons.map((reason, i) => (
                  <div key={i} className="reason pos">
                    <span className="sign">+</span>
                    <span>{reason.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        : null}
    </section>
  );
}

function WorkScreen({ onOpenSession, onBack }: { onOpenSession: (sessionId: string) => void; onBack: () => void }): React.ReactNode {
  const [work, setWork] = useState<WorkItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((): void => {
    void call<{ work: WorkItem[] }>("/api/work")
      .then((r) => setWork(r.work))
      .catch((err) => setError(err instanceof Error ? err.message : "failed"));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  const stateChip = (s: string): React.ReactNode => {
    if (s === "COMPLETED") return <span className="chip chip-live">completed</span>;
    if (s === "FAILED") return <span className="chip" style={{ color: "var(--danger)" }}>failed</span>;
    if (s === "RUNNING") return <span className="chip">running</span>;
    if (s === "WAITING_FOR_APPROVAL") return <span className="chip chip-warn">needs approval</span>;
    return <span className="chip">saved</span>;
  };

  return (
    <section>
      <div className="contract-head">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={16} /> Back to feed
        </button>
        <h2 className="screen-title">Work</h2>
      </div>
      {error !== null ? <div className="error-state" style={{ marginTop: 16 }}>{error}</div> : null}
      {work !== null && work.length === 0 ? (
        <div className="card" style={{ padding: 24, marginTop: 18 }}>
          <div className="contract-section">
            <h3>No saved work yet</h3>
            <p className="hint">Swipe right on a card - it lands here as saved, then moves through running / approval / completed as the agent works.</p>
          </div>
        </div>
      ) : null}
      {work !== null && work.length > 0
        ? work.map((w) => (
            <button
              key={w.key}
              type="button"
              className="card session-item"
              style={{ padding: 18, marginTop: 14, textAlign: "left", width: "100%" }}
              onClick={() => w.sessionId !== null ? onOpenSession(w.sessionId) : undefined}
            >
              <div className="chip-row">
                {stateChip(w.state)}
                <span className="chip">{w.repo}</span>
                {w.language !== null ? <span className="chip">{w.language}</span> : null}
              </div>
              <div className="session-title">{w.title}</div>
              <div className="session-meta">#{w.number}{w.state !== "SAVED" && w.sessionId !== null ? ` - tap to open the session` : ""}</div>
            </button>
          ))
        : null}
    </section>
  );
}

function ActivityScreen({ onBack }: { onBack: () => void }): React.ReactNode {
  const [events, setEvents] = useState<SessionEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void call<{ events: SessionEvent[] }>("/api/sessions?from=0")
      .then((r) => setEvents(r.events.filter((e) => e.type !== "WorkstationConnected").slice(-80).reverse()))
      .catch((err) => setError(err instanceof Error ? err.message : "failed"));
  }, []);

  return (
    <section>
      <div className="contract-head">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={16} /> Back to feed
        </button>
        <h2 className="screen-title">Activity</h2>
      </div>
      {error !== null ? <div className="error-state" style={{ marginTop: 16 }}>{error}</div> : null}
      {events !== null && events.length === 0 ? (
        <div className="card" style={{ padding: 24, marginTop: 18 }}>
          <div className="contract-section">
            <h3>No activity yet</h3>
            <p className="hint">Sessions, approvals, swipes and connections land here as they happen.</p>
          </div>
        </div>
      ) : null}
      {events !== null && events.length > 0 ? (
        <div className="card" style={{ marginTop: 18, padding: "14px 18px" }}>
          <div className="timeline">
            {events.map((e) => (
              <div key={e.event_id} className="event-row">
                <span className="event-time">
                  {new Date(e.occurred_at).toLocaleTimeString([], { hour12: false })}
                </span>
                <span>
                  <span className="event-type">{e.type}</span>
                  {eventDetail(e).length > 0 ? <span className="event-detail">- {eventDetail(e)}</span> : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SessionScreen({ sessionId, onBack }: { sessionId: string; onBack: () => void }): React.ReactNode {
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [state, setState] = useState("RUNNING");
  const done = useRef(false);

  useEffect(() => {
    const push = (e: SessionEvent): void => {
      setEvents((prev) => [...prev, e]);
      if (e.type === "AgentCompleted") setState("COMPLETED");
      else if (e.type === "AgentFailed") setState("FAILED");
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
  const completed = state === "COMPLETED";
  const failedEvent = events.filter((e) => e.type === "AgentFailed").at(-1);
  const failed = state === "FAILED";

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

      {failed ? (
        <div className="approval" style={{ borderColor: "rgba(228,105,79,0.45)", background: "rgba(228,105,79,0.07)" }}>
          <div className="reason pos" style={{ fontWeight: 600, color: "var(--text)" }}>
            <XCircle size={18} weight="fill" style={{ color: "var(--danger)" }} /> The session failed.
          </div>
          {failedEvent !== undefined && typeof failedEvent.payload.reason === "string" ? (
            <p className="hint" style={{ marginTop: 8 }}>{failedEvent.payload.reason}</p>
          ) : null}
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
  agentBackend: string;
  agentModelChain: string[] | null;
  feedRepos: string[] | null;
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
  const [agentBackend, setAgentBackend] = useState("mock");
  const [agentChainText, setAgentChainText] = useState("");
  const [agentMsg, setAgentMsg] = useState<string | null>(null);
  const [reposText, setReposText] = useState("");
  const [reposMsg, setReposMsg] = useState<string | null>(null);

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
        setAgentBackend(s.agentBackend);
        setAgentChainText((s.agentModelChain ?? []).join(", "));
        setReposText((s.feedRepos ?? []).join("\n"));
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
          <span className="chip kind">agent</span>
          <span className={`chip ${agentBackend === "opencode" ? "chip-live" : "chip-warn"}`}>
            {agentBackend === "opencode" ? "opencode (live dispatch)" : "simulated (demo timeline)"}
          </span>
        </div>
        <div className="contract-section">
          <h3>Coding agent</h3>
          <div className="form-row">
            <label htmlFor="agent-backend">Backend</label>
            <select id="agent-backend" className="form-input" value={agentBackend} onChange={(e) => setAgentBackend(e.target.value)}>
              <option value="mock">Simulated agent (demo timeline - no real code)</option>
              <option value="opencode">OpenCode (live - the agent really codes)</option>
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="agent-chain">Model chain (comma-separated, first is primary; leave empty for the default NVIDIA chain)</label>
            <input
              id="agent-chain"
              className="form-input"
              type="text"
              value={agentChainText}
              onChange={(e) => setAgentChainText(e.target.value)}
              placeholder="nvidia/nvidia/nemotron-3-super-120b-a12b, nvidia/nvidia/deepseek-ai/deepseek-v4.1-flash"
              autoComplete="off"
            />
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy !== null}
              onClick={() => {
                setBusy("agent");
                const chain = agentChainText.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
                void call<{ backend: string; note: string }>("/api/settings/agent", {
                  method: "POST",
                  body: JSON.stringify({ backend: agentBackend, ...(chain.length > 0 ? { modelChain: chain } : {}) }),
                })
                  .then((r) => setAgentMsg(`saved: ${r.backend} - ${r.note}`))
                  .catch((err) => setAgentMsg(err instanceof Error ? err.message : "save failed"))
                  .finally(() => setBusy(null));
              }}
            >
              Save agent
            </button>
          </div>
          {agentMsg !== null ? <div className="notice" style={{ marginTop: 10 }}>{agentMsg}</div> : null}
        </div>
        <div className="contract-section">
          <h3>Feed repositories</h3>
          <p className="hint">One per line (owner/name). The feed ingests open issues from these repos. Empty = your own repos.</p>
          <div className="form-row">
            <label htmlFor="feed-repos">Repositories</label>
            <textarea
              id="feed-repos"
              className="form-input"
              rows={4}
              value={reposText}
              onChange={(e) => setReposText(e.target.value)}
              placeholder={"expressjs/express\nvercel/next.js"}
            />
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy !== null}
              onClick={() => {
                setBusy("repos");
                const repos = reposText.split(/[\n,]/).map((s) => s.trim()).filter((s) => s.length > 0);
                void call<{ repos: string[]; note: string }>("/api/settings/feedrepos", {
                  method: "POST",
                  body: JSON.stringify({ repos }),
                })
                  .then((r) => setReposMsg(`saved ${r.repos.length} repos - ${r.note}`))
                  .catch((err) => setReposMsg(err instanceof Error ? err.message : "save failed"))
                  .finally(() => setBusy(null));
              }}
            >
              Save repositories
            </button>
          </div>
          {reposMsg !== null ? <div className="notice" style={{ marginTop: 10 }}>{reposMsg}</div> : null}
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
  const [workError, setWorkError] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const seenStates = useRef<Set<string>>(new Set());
  const pendingApprovalsRef = useRef(0);

  useEffect(() => {
    if (!paired) return;
    const notify = (title: string, body: string): void => {
      void (async () => {
        try {
          const perm = await LocalNotifications.requestPermissions();
          if (perm.display !== "granted") return;
          await LocalNotifications.schedule({ notifications: [{ id: Date.now(), title, body, schedule: { at: new Date(Date.now() + 100) } }] });
        } catch {
          // notifications are a progressive enhancement - never block the UI
        }
      })();
    };
    const check = (): void => {
      void call<{ sessions: Array<{ sessionId: string; title: string; state: string; pendingApproval: boolean }> }>("/api/session/list")
        .then((r) => {
          const pendingCount = r.sessions.filter((s) => s.pendingApproval).length;
          if (pendingCount > pendingApprovalsRef.current) {
            notify("GitSwipe: approval needed", "An agent finished its work and is waiting for your decision.");
          }
          pendingApprovalsRef.current = pendingCount;
          for (const s of r.sessions) {
            const key = `${s.sessionId}:${s.state}`;
            if (seenStates.current.has(key)) continue;
            if (seenStates.current.size > 0) {
              if (s.state === "COMPLETED") notify("GitSwipe: agent completed", s.title);
              if (s.state === "FAILED") notify("GitSwipe: agent failed", s.title);
            }
            seenStates.current.add(key);
          }
          setPendingApprovals(pendingCount);
        })
        .catch(() => undefined);
    };
    check();
    const t = setInterval(check, 8_000);
    return () => clearInterval(t);
  }, [paired]);



  useEffect(() => {
    if (paired) setScreen({ name: "feed" });
  }, [paired]);

  const onPaired = (t: string): void => {
    token.save(t);
    setPaired(true);
  };

  const onWork = (key: string): void => {
    setScreen({ name: "contract", key });
  };

  const onDispatch = (): void => {
    if (screen.name !== "contract") return;
    const key = screen.key;
    void call<{ sessionId: string; state: string }>("/api/session", {
      method: "POST",
      body: JSON.stringify({ key }),
    })
      .then(({ sessionId }) => setScreen({ name: "session", sessionId }))
      .catch((err) => setWorkError(err instanceof Error ? err.message : "could not start the session"));
  };

  return (
    <div className={`app ${paired ? "app-shell" : ""}`}>
      {!paired || screen.name === "pair" ? (
        <PairScreen onPaired={onPaired} />
      ) : null}
      {paired ? (
        <>
          <aside className="sidebar">
            <span className="wordmark side-wordmark">
              Git<span className="swipe">Swipe</span>
            </span>
            <nav className="side-nav">
              <button type="button" className={`side-item ${screen.name === "feed" ? "active" : ""}`} onClick={() => setScreen({ name: "feed" })}>
                <House size={18} /> Discover
              </button>
              <button type="button" className={`side-item ${screen.name === "sessions" || screen.name === "approvals" ? "active" : ""}`} onClick={() => setScreen({ name: "sessions" })}>
                <Robot size={18} /> Agents
                {pendingApprovals > 0 ? <span className="nav-badge">{pendingApprovals}</span> : null}
              </button>
              <button type="button" className={`side-item ${screen.name === "approvals" ? "active" : ""}`} onClick={() => setScreen({ name: "approvals" })}>
                <CheckCircle size={18} /> Approvals
                {pendingApprovals > 0 ? <span className="nav-badge">{pendingApprovals}</span> : null}
              </button>
              <span className="side-sep" />
              <button type="button" className={`side-item ${screen.name === "work" ? "active" : ""}`} onClick={() => setScreen({ name: "work" })}>
                <Play size={18} /> Work
              </button>
              <button type="button" className={`side-item ${screen.name === "projects" ? "active" : ""}`} onClick={() => setScreen({ name: "projects" })}>
                <House size={18} /> Projects
              </button>
              <button type="button" className={`side-item ${screen.name === "references" ? "active" : ""}`} onClick={() => setScreen({ name: "references" })}>
                <CheckCircle size={18} /> References
              </button>
              <button type="button" className={`side-item ${screen.name === "activity" ? "active" : ""}`} onClick={() => setScreen({ name: "activity" })}>
                <Play size={18} /> Activity
              </button>
              <span className="side-sep" />
              <button type="button" className={`side-item ${screen.name === "settings" ? "active" : ""}`} onClick={() => setScreen({ name: "settings" })}>
                <Gear size={18} /> Workstation
              </button>
            </nav>
          </aside>
          <main className="main-pane">
            <header className="mobile-header">
              <span className="wordmark">
                Git<span className="swipe">Swipe</span>
              </span>
            </header>
            {screen.name === "feed" ? (
              <>
                {workError !== null ? (
                  <div className="error-state" style={{ marginTop: 16 }}>
                    {workError}
                    <button type="button" className="btn btn-quiet" style={{ marginLeft: 12 }} onClick={() => setWorkError(null)}>dismiss</button>
                  </div>
                ) : null}
                <FeedScreen onWork={onWork} />
              </>
            ) : null}
            {screen.name === "contract" ? (
              <ContractScreen
                candidateKey={screen.key}
                onDispatch={onDispatch}
                onBack={() => setScreen({ name: "feed" })}
              />
            ) : null}
            {screen.name === "sessions" ? (
              <SessionsScreen
                onOpen={(sessionId) => setScreen({ name: "session", sessionId })}
                onBack={() => setScreen({ name: "feed" })}
              />
            ) : null}
            {screen.name === "approvals" ? (
              <SessionsScreen
                pendingOnly
                onOpen={(sessionId) => setScreen({ name: "session", sessionId })}
                onBack={() => setScreen({ name: "feed" })}
              />
            ) : null}
            {screen.name === "activity" ? (
              <ActivityScreen onBack={() => setScreen({ name: "feed" })} />
            ) : null}
            {screen.name === "work" ? (
              <WorkScreen
                onOpenSession={(sessionId) => setScreen({ name: "session", sessionId })}
                onBack={() => setScreen({ name: "feed" })}
              />
            ) : null}
            {screen.name === "projects" ? (
              <ProjectsScreen onBack={() => setScreen({ name: "feed" })} />
            ) : null}
            {screen.name === "references" ? (
              <ReferencesScreen onBack={() => setScreen({ name: "feed" })} />
            ) : null}
            {screen.name === "session" ? (
              <SessionScreen sessionId={screen.sessionId} onBack={() => setScreen({ name: "feed" })} />
            ) : null}
            {screen.name === "settings" ? <SettingsScreen /> : null}
          </main>
          <nav className="tabbar">
            <button type="button" className={`tab-item ${screen.name === "feed" ? "active" : ""}`} onClick={() => setScreen({ name: "feed" })}>
              <House size={20} /> Feed
            </button>
            <button type="button" className={`tab-item ${screen.name === "sessions" || screen.name === "approvals" ? "active" : ""}`} onClick={() => setScreen({ name: "sessions" })}>
              <Robot size={20} /> Agents
              {pendingApprovals > 0 ? <span className="nav-badge">{pendingApprovals}</span> : null}
            </button>
            <button type="button" className={`tab-item ${screen.name === "settings" ? "active" : ""}`} onClick={() => setScreen({ name: "settings" })}>
              <Gear size={20} /> Workstation
            </button>
          </nav>
        </>
      ) : null}
    </div>
  );
}
