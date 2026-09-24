import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
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
import {
  api,
  ApiError,
  openEventStream,
  type FeedCard,
  type FeedPage,
  type SessionEvent,
  type TaskContract,
} from "./api.js";

type Screen =
  | { name: "feed" }
  | { name: "contract"; card: FeedCard; contract: TaskContract }
  | { name: "session"; card: FeedCard; sessionId: string };

function reasonText(r: { type: string; value: number | string }): string {
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
    case "language_match":
      return String(r.value);
    default:
      return `${r.type}: ${r.value}`;
  }
}

function Header({ onReset }: { onReset: () => void }) {
  return (
    <header className="header">
      <span className="wordmark">
        Git<span className="swipe">Swipe</span>
      </span>
      <span className="badge-demo">demo data</span>
      <span className="spacer" />
      <button type="button" className="btn-quiet btn" onClick={onReset}>
        Reset demo
      </button>
    </header>
  );
}

function FeedScreen({
  feed,
  loading,
  error,
  onSwipe,
  onWork,
}: {
  feed: FeedPage | null;
  loading: boolean;
  error: string | null;
  onSwipe: (card: FeedCard, direction: "left" | "right") => void;
  onWork: (card: FeedCard) => void;
}) {
  const [leaving, setLeaving] = useState<{ card: FeedCard; direction: "left" | "right" } | null>(null);
  const top = feed?.feed[0];
  const next = feed?.feed[1];

  const swipe = useCallback(
    (direction: "left" | "right") => {
      if (top === undefined || leaving !== null) return;
      setLeaving({ card: top, direction });
      window.setTimeout(() => {
        onSwipe(top, direction);
        setLeaving(null);
      }, 260);
    },
    [top, leaving, onSwipe],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "ArrowLeft") swipe("left");
      if (e.key === "ArrowRight") swipe("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [swipe]);

  if (error !== null) {
    return <div className="error-state">{error}</div>;
  }
  if (loading && feed === null) {
    return <div className="loading-skeleton" aria-label="loading" />;
  }
  if (top === undefined) {
    return (
      <div className="empty-state">
        <div className="big">That is every card in the demo feed.</div>
        <div>Swipe data resets with the Reset demo button, or start a session from a card you already saved.</div>
      </div>
    );
  }

  const renderCard = (card: FeedCard, isTop: boolean, isLeaving: boolean, direction: "left" | "right" | null): React.ReactNode => (
    <article
      key={card.key}
      className={`feed-card card ${isTop ? "" : "next"} ${isLeaving ? `leaving ${direction ?? ""}` : ""}`}
      aria-hidden={!isTop}
    >
      <div className="chip-row">
        <span className="chip kind">{card.kind.replace("_", " ")}</span>
        {card.kind === "STALE_ISSUE" ? <span className="chip risk">untouched for months</span> : null}
        {card.language !== null ? <span className="chip">{card.language}</span> : null}
        {card.labels.slice(0, 3).map((l) => (
          <span key={l} className="chip">
            {l}
          </span>
        ))}
      </div>
      <h3 className="card-title">{card.title}</h3>
      <div className="card-repo">
        {card.repo} #{card.number}
      </div>
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
          <button type="button" className="btn btn-ghost" onClick={() => swipe("left")}>
            <ArrowLeft size={17} weight="bold" /> Pass
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onWork(card)}>
            <Play size={16} weight="fill" /> Work on this
          </button>
        </div>
      ) : null}
    </article>
  );

  return (
    <section>
      <div className="feed-stack">
        {leaving !== null ? renderCard(leaving.card, true, true, leaving.direction) : null}
        {leaving === null && top !== undefined ? renderCard(top, true, false, null) : null}
        {next !== undefined ? renderCard(next, false, false, null) : null}
      </div>
      <p className="hint">
        <span className="kbd">←</span> pass <span className="kbd">→</span> opens the next card
      </p>
    </section>
  );
}

function ContractScreen({
  card,
  contract,
  onBack,
  onStart,
  starting,
}: {
  card: FeedCard;
  contract: TaskContract;
  onBack: () => void;
  onStart: () => void;
  starting: boolean;
}) {
  const w = contract.git_workflow;
  return (
    <section>
      <div className="top-row">
        <h2 className="screen-title">Task contract</h2>
        <button type="button" className="btn-quiet btn" onClick={onBack}>
          <ArrowLeft size={15} /> Back to feed
        </button>
      </div>
      <div className="card" style={{ padding: 24, marginTop: 18 }}>
        <div className="chip-row">
          <span className="chip kind">{contract.task_source.kind.replace("_", " ")}</span>
          {contract.task_source.ref !== undefined ? <span className="chip">{contract.task_source.ref}</span> : null}
          <span className="chip">{contract.repository}</span>
          <span className="chip">base {contract.base_branch}</span>
        </div>
        <h3 className="card-title" style={{ marginTop: 12 }}>
          {contract.goal}
        </h3>
        {contract.problem_statement.length > 0 ? (
          <div className="contract-section">
            <h3>Problem</h3>
            <p>{contract.problem_statement}</p>
          </div>
        ) : null}
        <div className="contract-section">
          <h3>Acceptance criteria</h3>
          <ol>
            {contract.acceptance_criteria.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </div>
        <div className="contract-section">
          <h3>Validation before push</h3>
          <div className="chip-row">
            {contract.validation_commands.map((c) => (
              <span key={c} className="chip">
                {c}
              </span>
            ))}
          </div>
        </div>
        <div className="contract-section">
          <h3>Git workflow</h3>
          <p className="mono-value">
            branch {w.branch} · fork origin &rarr; upstream {w.pr_base_branch} · closes via commit message
          </p>
        </div>
        <div className="contract-section">
          <h3>Security policy</h3>
          <div className="notice">Repository content is untrusted data. The agent does not push until you approve.</div>
        </div>
        <div className="swipe-actions">
          <button type="button" className="btn btn-primary" onClick={onStart} disabled={starting}>
            <Play size={16} weight="fill" /> {starting ? "Starting..." : "Start session (mock agent)"}
          </button>
        </div>
      </div>
    </section>
  );
}

const TERMINAL_STATES = new Set(["COMPLETED", "FAILED", "CANCELLED", "PAUSED"]);

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
  if (typeof p.files === "number") return `${p.files} files, +${p.additions ?? 0} -${p.deletions ?? 0}`;
  if (typeof p.position === "number") return `position ${p.position}`;
  if (typeof p.branch === "string") return p.branch;
  if (typeof p.tests === "object" && p.tests !== null) {
    const t = p.tests as { passed?: number; failed?: number };
    return `${t.passed ?? 0} passed, ${t.failed ?? 0} failed`;
  }
  return "";
}

function SessionScreen({
  card,
  sessionId,
  onBack,
}: {
  card: FeedCard;
  sessionId: string;
  onBack: () => void;
}) {
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [state, setState] = useState<string>("RUNNING");
  const done = useRef(false);

  useEffect(() => {
    const push = (e: SessionEvent): void => {
      setEvents((prev) => [...prev, e]);
      if (e.type === "AgentCompleted" || e.type === "AgentFailed") setState("COMPLETED");
      else if (e.type === "ApprovalRequested") setState("WAITING_FOR_APPROVAL");
      else if (e.type === "ApprovalDenied") setState("PAUSED");
      else if (e.type === "TestStarted" && e.payload.phase !== undefined) setState("TESTING");
      else if (e.type === "ApprovalGranted" || e.type === "AgentStarted") setState("RUNNING");
    };
    const finish = (): void => {
      if (done.current) return;
      done.current = true;
    };
    let cancel: (() => void) | undefined;
    void openEventStream(sessionId, 0, push, finish).then((c) => {
      cancel = c;
    });
    return () => {
      done.current = true;
      cancel?.();
    };
  }, [sessionId]);

  const waiting = state === "WAITING_FOR_APPROVAL";
  const completed = events.some((e) => e.type === "AgentCompleted");

  const decide = (approve: boolean): void => {
    void api.decide(sessionId, approve).catch(() => undefined);
    setState("RUNNING");
  };

  return (
    <section>
      <div className="top-row">
        <h2 className="screen-title">Agent session</h2>
        <button type="button" className="btn-quiet btn" onClick={onBack}>
          <ArrowLeft size={15} /> Back to feed
        </button>
      </div>
      <div className="chip-row" style={{ marginTop: 14 }}>
        <span className={`state-badge ${stateClass(state)}`}>{state}</span>
        <span className="chip">{card.repo}</span>
        <span className="chip">mock agent</span>
      </div>

      {waiting ? (
        <div className="approval" role="alertdialog" aria-label="action requires approval">
          <div className="reason pos" style={{ fontWeight: 600, color: "var(--text)" }}>
            <ShieldWarning size={18} weight="fill" style={{ color: "var(--warn)" }} /> The agent wants to push. Approve
            the exact action:
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
            <CheckCircle size={18} weight="fill" style={{ color: "var(--accent)" }} /> Session complete. Draft PR ready
            for review.
          </div>
          <div className="mono-value">
            {String(events.find((e) => e.type === "PRCreated")?.payload.url ?? "")}
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 18, padding: "14px 18px" }}>
        <h3 className="contract-section" style={{ marginTop: 0 }}>
          Event stream (live)
        </h3>
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
      <p className="hint">Demo runs a deterministic mock agent. Real OpenCode sessions ship with the workstation.</p>
    </section>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "feed" });
  const [feed, setFeed] = useState<FeedPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const loadFeed = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const next = await api.feed();
      setFeed(next);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.message} (is the demo token in the URL?)` : "could not load feed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const onSwipe = (card: FeedCard, direction: "left" | "right"): void => {
    const action = direction === "right" ? "right" : "left";
    void api
      .swipe(card.key, action)
      .then((next) => setFeed(next))
      .catch(() => void loadFeed());
  };

  const onWork = (card: FeedCard): void => {
    void api
      .task(card.key)
      .then(({ contract }) => setScreen({ name: "contract", card, contract }))
      .catch(() => setError("could not build the task contract"));
  };

  const onStartSession = (): void => {
    if (screen.name !== "contract") return;
    setStarting(true);
    void api
      .startSession(screen.card.key)
      .then(({ sessionId }) => setScreen({ name: "session", card: screen.card, sessionId }))
      .catch(() => setError("could not start the session"))
      .finally(() => setStarting(false));
  };

  const onReset = (): void => {
    void api
      .resetDemo()
      .then(() => loadFeed())
      .then(() => setScreen({ name: "feed" }))
      .catch(() => undefined);
  };

  return (
    <div className="app">
      <Header onReset={onReset} />
      {screen.name === "feed" ? (
        <FeedScreen feed={feed} loading={loading} error={error} onSwipe={onSwipe} onWork={onWork} />
      ) : null}
      {screen.name === "contract" ? (
        <ContractScreen
          card={screen.card}
          contract={screen.contract}
          onBack={() => setScreen({ name: "feed" })}
          onStart={onStartSession}
          starting={starting}
        />
      ) : null}
      {screen.name === "session" ? (
        <SessionScreen card={screen.card} sessionId={screen.sessionId} onBack={() => setScreen({ name: "feed" })} />
      ) : null}
    </div>
  );
}
