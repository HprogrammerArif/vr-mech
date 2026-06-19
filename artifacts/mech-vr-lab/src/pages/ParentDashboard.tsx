import { useState, useEffect } from "react";
import {
  Shield, ShieldCheck, AlertCircle, User, Clock, MapPin, MessageSquare,
  Bell, ChevronDown, ChevronUp, Eye, EyeOff, Mail, Phone,
  LogIn, AlertTriangle, CheckCircle, XCircle, Activity, BookOpen,
  BarChart2, MessageCircle, Timer,
} from "lucide-react";
import TrustBadge from "@/components/TrustBadge";
import type { TrustBadge as TrustBadgeType } from "@/lib/safety";

interface DarioSessionEntry {
  sessionId: string;
  sessionTitle: string;
  messageCount: number;
  careersDiscussed: string[];
  conversationExcerpt: Array<{ role: string; content: string }>;
  sessionStartedAt: string;
  sessionEndedAt: string;
  loggedAt: string;
}

interface QuizAttempt {
  topic: string;
  category: string;
  simulationSlug: string;
  correct: boolean;
  xpAwarded: number;
  attemptedAt: string;
}

interface ParentDashboardData {
  parent: { name: string; email: string; messagingPaused: boolean };
  student: {
    id: string; name: string; grade: number; graduationYear: number;
    schoolName: string; careerInterests: string[];
    verificationTier: string; createdAt: string;
    supervisedModeUntil: string;
  } | null;
  trust: {
    score: number; badge: string; tier2Flags: number; tier3Flags: number;
    schoolEmailVerified: boolean; parentVerified: boolean;
    updatedAt: string;
  } | null;
  flags: Array<{
    id: number; tier: number; category: string; messageContent: string;
    aiReasoning: string; status: string; createdAt: string;
    parentNotified: boolean;
  }>;
  contactExchanges: Array<{
    id: number; detectedType: string; messageContent: string;
    warningSeen: boolean; sentAnyway: boolean; createdAt: string;
  }>;
  loginHistory: Array<{
    id: number; city: string; region: string; country: string;
    suspicious: boolean; createdAt: string;
  }>;
  notifications: Array<{
    id: number; type: string; subject: string; sent: boolean; createdAt: string;
  }>;
  activityTime: { todayMinutes: number; weekMinutes: number; totalMinutes: number };
  darioSessions: DarioSessionEntry[];
  quizResults: {
    totalAttempted: number;
    totalCorrect: number;
    byCategory: Array<{ category: string; attempted: number; correct: number }>;
    recentAttempts: QuizAttempt[];
  };
}

const TIER_COLORS: Record<number, { color: string; bg: string; label: string }> = {
  1: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", label: "Tier 1 — Logged" },
  2: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", label: "Tier 2 — Warning" },
  3: { color: "#f97316", bg: "rgba(249,115,22,0.1)", label: "Tier 3 — Suspended" },
  4: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "Tier 4 — Critical" },
};

const CATEGORY_LABELS: Record<string, string> = {
  engineering: "Engineering", business: "Business", healthcare: "Healthcare",
  trades: "Trades", technology: "Technology", law: "Law",
  science: "Science", "life-advice": "Life Advice",
};

function fmt(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function StatCard({ icon, label, value, sub, color = "#f5a524" }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}20`, color }}>{icon}</div>
        <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">{label}</span>
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function Section({ title, children, defaultOpen = true, accent }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; accent?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${accent ?? "rgba(255,255,255,0.08)"}` }}>
      <button
        className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/5"
        style={{ background: "rgba(255,255,255,0.03)" }}
        onClick={() => setOpen(v => !v)}>
        <span className="font-black text-white text-sm uppercase tracking-wide">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open && <div className="p-6">{children}</div>}
    </div>
  );
}

function AccuracyBar({ correct, total }: { correct: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
  const color = pct >= 70 ? "#4ade80" : pct >= 50 ? "#fbbf24" : "#f97316";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{pct}%</span>
    </div>
  );
}

export default function ParentDashboard() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [data, setData] = useState<ParentDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pauseLoading, setPauseLoading] = useState(false);
  const [pauseSuccess, setPauseSuccess] = useState("");
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  /* Auto-detect token from URL */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) { setToken(t); loadDashboard(t); }
  }, []);

  async function loadDashboard(t: string) {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/safety/parent-dashboard?token=${encodeURIComponent(t)}`);
      if (!res.ok) { const e = await res.json() as { error: string }; throw new Error(e.error); }
      setData(await res.json() as ParentDashboardData);
      setToken(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally { setLoading(false); }
  }

  async function handlePauseMessaging() {
    if (!token) return;
    setPauseLoading(true);
    try {
      const res = await fetch("/api/safety/parent/pause-messaging", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, hours: 24 }),
      });
      if (res.ok) { setPauseSuccess("Messaging paused for 24 hours."); }
    } catch { /* noop */ }
    finally { setPauseLoading(false); }
  }

  const badge = (data?.trust?.badge ?? "new") as TrustBadgeType;
  const openFlags = data?.flags.filter(f => f.status === "open") ?? [];
  const criticalFlags = openFlags.filter(f => f.tier >= 3);

  /* ── Login Screen ── */
  if (!token || error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "radial-gradient(ellipse at top, #0d1f3c 0%, #0a1428 80%)" }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ background: "rgba(245,165,36,0.1)", border: "1px solid rgba(245,165,36,0.3)" }}>
              <ShieldCheck className="h-8 w-8" style={{ color: "#f5a524" }} />
            </div>
            <h1 className="text-2xl font-black text-white">Parent Dashboard</h1>
            <p className="text-slate-400 text-sm mt-2">1WayMirror — Safety Portal</p>
          </div>
          <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {error && (
              <div className="mb-4 p-3 rounded-xl text-sm text-red-300 flex items-center gap-2"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
              </div>
            )}
            <p className="text-slate-300 text-sm mb-4">
              Enter the access link or token sent to your email when your student joined 1WayMirror.
            </p>
            <input
              type="text" value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              placeholder="Paste your access token here…"
              className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none mb-4"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
            />
            <button
              onClick={() => loadDashboard(tokenInput.trim())}
              disabled={!tokenInput.trim() || loading}
              className="w-full py-3 rounded-xl font-black text-sm transition-all hover:scale-105 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #f5a524, #ea580c)", color: "#0a1428" }}>
              {loading ? "Loading…" : "View Dashboard"}
            </button>
          </div>
          <p className="text-center text-slate-500 text-xs mt-6">
            Need a new access link? Contact{" "}
            <a href="mailto:one.waymirror@outlook.com" className="text-blue-400 hover:underline">
              one.waymirror@outlook.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "#0a1428" }}>
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-3">🛡️</div>
          <div className="text-slate-400">Loading parent dashboard…</div>
        </div>
      </div>
    );
  }

  const at = data?.activityTime;
  const qr = data?.quizResults;
  const accuracy = qr && qr.totalAttempted > 0
    ? Math.round((qr.totalCorrect / qr.totalAttempted) * 100) : 0;

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at top, #0d1f3c 0%, #0a1428 60%)" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 sm:px-6"
        style={{ background: "rgba(10,20,40,0.97)", borderBottom: "1px solid rgba(245,165,36,0.12)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-5xl mx-auto h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5" style={{ color: "#f5a524" }} />
            <span className="font-black text-white text-sm">Parent Safety Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            {criticalFlags.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                <AlertTriangle className="h-3 w-3" /> {criticalFlags.length} Alert{criticalFlags.length !== 1 ? "s" : ""}
              </span>
            )}
            <span className="text-slate-400 text-xs hidden sm:block">
              Hi, {data?.parent.name ?? "Parent"}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Student Overview Card */}
        {data?.student && (
          <div className="rounded-2xl p-6"
            style={{ background: "linear-gradient(135deg, rgba(29,78,216,0.2), rgba(245,165,36,0.1))", border: "1px solid rgba(245,165,36,0.2)" }}>
            <div className="flex flex-wrap items-start gap-4 justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: "rgba(245,165,36,0.15)", border: "1px solid rgba(245,165,36,0.3)" }}>
                  🎓
                </div>
                <div>
                  <div className="font-black text-white text-xl">{data.student.name}</div>
                  <div className="text-slate-400 text-sm">
                    Grade {data.student.grade} · Class of {data.student.graduationYear}
                    {data.student.schoolName && ` · ${data.student.schoolName}`}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <TrustBadge badge={badge} score={data.trust?.score} showScore showLabel />
                    {data.parent.messagingPaused && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                        Messaging Paused
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {!data.parent.messagingPaused && (
                <button
                  onClick={handlePauseMessaging}
                  disabled={pauseLoading}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                  {pauseLoading ? "Pausing…" : "Pause Messaging 24h"}
                </button>
              )}
            </div>
            {pauseSuccess && (
              <div className="mt-3 text-sm text-green-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> {pauseSuccess}
              </div>
            )}
            {data.student.careerInterests && data.student.careerInterests.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Career Interests</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.student.careerInterests.map(i => (
                    <span key={i} className="text-xs px-2 py-1 rounded-lg font-medium"
                      style={{ background: "rgba(245,165,36,0.1)", color: "#f5a524", border: "1px solid rgba(245,165,36,0.2)" }}>
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<Shield className="h-4 w-4" />} label="Trust Score"
            value={data?.trust?.score ?? "–"} sub={`/100 · ${badge} student`} />
          <StatCard icon={<Timer className="h-4 w-4" />} label="Time Today"
            value={at ? fmt(at.todayMinutes) : "–"} sub={at ? `${fmt(at.weekMinutes)} this week` : "tracked by minute"}
            color="#60a5fa" />
          <StatCard icon={<BookOpen className="h-4 w-4" />} label="Quiz Accuracy"
            value={qr?.totalAttempted ? `${accuracy}%` : "–"}
            sub={qr?.totalAttempted ? `${qr.totalCorrect}/${qr.totalAttempted} correct` : "no attempts yet"}
            color={accuracy >= 70 ? "#4ade80" : accuracy >= 50 ? "#fbbf24" : "#f97316"} />
          <StatCard icon={<Bell className="h-4 w-4" />} label="Open Flags"
            value={openFlags.length} sub="requiring review"
            color={openFlags.length > 0 ? "#f97316" : "#4ade80"} />
        </div>

        {/* Critical Alerts */}
        {criticalFlags.length > 0 && (
          <div className="rounded-2xl p-5"
            style={{ background: "rgba(239,68,68,0.06)", border: "2px solid rgba(239,68,68,0.35)" }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span className="font-black text-red-400 text-sm uppercase tracking-wide">
                {criticalFlags.length} Critical Alert{criticalFlags.length !== 1 ? "s" : ""} Requiring Attention
              </span>
            </div>
            <div className="space-y-3">
              {criticalFlags.map(f => (
                <div key={f.id} className="rounded-xl p-4"
                  style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: TIER_COLORS[f.tier].bg, color: TIER_COLORS[f.tier].color, border: `1px solid ${TIER_COLORS[f.tier].color}40` }}>
                      TIER {f.tier}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-semibold capitalize">{f.category.replace(/_/g, " ")}</div>
                      <div className="text-slate-400 text-xs mt-1">{f.aiReasoning}</div>
                      {f.messageContent && (
                        <div className="mt-2 p-2 rounded-lg text-xs font-mono text-slate-300 break-all"
                          style={{ background: "rgba(255,255,255,0.04)" }}>
                          "{f.messageContent.slice(0, 200)}"
                        </div>
                      )}
                      <div className="text-slate-500 text-xs mt-2">{new Date(f.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <a href="mailto:one.waymirror@outlook.com?subject=Safety Review Request"
                className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                <Mail className="h-4 w-4" /> Contact Safety Team
              </a>
            </div>
          </div>
        )}

        {/* ── Activity Time ── */}
        <Section title="Platform Activity" defaultOpen={true} accent="rgba(96,165,250,0.2)">
          {!at || at.totalMinutes === 0 ? (
            <div className="text-center py-6">
              <Timer className="h-8 w-8 mx-auto mb-2 text-slate-600" />
              <p className="text-slate-400 text-sm">Time tracking starts once your student logs in.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Today", value: fmt(at.todayMinutes), color: "#60a5fa" },
                { label: "This Week", value: fmt(at.weekMinutes), color: "#818cf8" },
                { label: "All Time", value: fmt(at.totalMinutes), color: "#a78bfa" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-4 text-center"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Dario AI Sessions ── */}
        <Section title={`AI Counselor Conversations (${data?.darioSessions?.length ?? 0})`} defaultOpen={true} accent="rgba(168,85,247,0.2)">
          {!data?.darioSessions?.length ? (
            <div className="text-center py-6">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-slate-600" />
              <p className="text-slate-400 text-sm">No Dario AI conversations logged yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.darioSessions.map(s => {
                const isExpanded = expandedSession === s.sessionId;
                const careers = Array.isArray(s.careersDiscussed) ? s.careersDiscussed as string[] : [];
                const excerpt = Array.isArray(s.conversationExcerpt)
                  ? (s.conversationExcerpt as Array<{ role: string; content: string }>)
                  : [];
                const flaggedInSession = data.flags.filter(f =>
                  s.sessionStartedAt && s.sessionEndedAt &&
                  new Date(f.createdAt) >= new Date(s.sessionStartedAt) &&
                  new Date(f.createdAt) <= new Date(s.sessionEndedAt)
                );
                const hasFlag = flaggedInSession.length > 0;
                return (
                  <div key={s.sessionId} className="rounded-xl overflow-hidden"
                    style={{
                      background: hasFlag ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${hasFlag ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
                    }}>
                    <button className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                      onClick={() => setExpandedSession(isExpanded ? null : s.sessionId)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white text-sm font-semibold truncate">{s.sessionTitle || "Career Session"}</span>
                          {hasFlag && (
                            <span className="text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                              style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}>
                              ⚠ Flagged Content
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" /> {s.messageCount} messages
                          </span>
                          {careers.length > 0 && (
                            <span>Careers: {careers.slice(0, 3).join(", ")}{careers.length > 3 ? ` +${careers.length - 3}` : ""}</span>
                          )}
                          <span>{s.loggedAt ? new Date(s.loggedAt).toLocaleDateString() : ""}</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        {/* Flagged messages from this session */}
                        {hasFlag && (
                          <div className="mt-3">
                            <div className="text-xs font-bold text-red-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Flagged Content in This Session
                            </div>
                            {flaggedInSession.map(f => (
                              <div key={f.id} className="rounded-lg p-3 mb-2"
                                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-black px-1.5 py-0.5 rounded"
                                    style={{ background: TIER_COLORS[f.tier]?.bg, color: TIER_COLORS[f.tier]?.color }}>
                                    T{f.tier}
                                  </span>
                                  <span className="text-xs text-slate-300 capitalize">{f.category.replace(/_/g, " ")}</span>
                                </div>
                                <div className="text-xs text-slate-400">{f.aiReasoning}</div>
                                {f.messageContent && (
                                  <div className="mt-1 p-2 rounded text-xs font-mono text-slate-300 break-all"
                                    style={{ background: "rgba(0,0,0,0.3)" }}>
                                    "{f.messageContent.slice(0, 200)}"
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Conversation excerpt */}
                        {excerpt.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                              Conversation Excerpt
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {excerpt.slice(0, 8).map((msg, i) => (
                                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                                  <div className={`max-w-xs rounded-xl px-3 py-2 text-xs ${
                                    msg.role === "user"
                                      ? "text-white" : "text-slate-200"
                                  }`} style={{
                                    background: msg.role === "user"
                                      ? "rgba(29,78,216,0.4)" : "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                  }}>
                                    <div className="text-[10px] font-bold mb-0.5 opacity-60">
                                      {msg.role === "user" ? "Student" : "Dario AI"}
                                    </div>
                                    {(msg.content ?? "").slice(0, 200)}
                                    {(msg.content ?? "").length > 200 ? "…" : ""}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ── Quiz / Simulation Results ── */}
        <Section title={`Quiz Results (${qr?.totalAttempted ?? 0} attempts)`} defaultOpen={true} accent="rgba(74,222,128,0.2)">
          {!qr?.totalAttempted ? (
            <div className="text-center py-6">
              <BarChart2 className="h-8 w-8 mx-auto mb-2 text-slate-600" />
              <p className="text-slate-400 text-sm">No quiz attempts yet — results appear as your student completes simulations.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Overall stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Attempts", value: qr.totalAttempted, color: "#60a5fa" },
                  { label: "Correct", value: qr.totalCorrect, color: "#4ade80" },
                  { label: "Accuracy", value: `${accuracy}%`, color: accuracy >= 70 ? "#4ade80" : accuracy >= 50 ? "#fbbf24" : "#f97316" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* By category */}
              {qr.byCategory.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Performance by Category</div>
                  <div className="space-y-2.5">
                    {qr.byCategory.sort((a, b) => b.attempted - a.attempted).map(cat => (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white">{CATEGORY_LABELS[cat.category] ?? cat.category}</span>
                          <span className="text-xs text-slate-400">{cat.correct}/{cat.attempted}</span>
                        </div>
                        <AccuracyBar correct={cat.correct} total={cat.attempted} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent attempts */}
              {qr.recentAttempts.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Recent Quiz Activity</div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {qr.recentAttempts.map((a, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        {a.correct
                          ? <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                          : <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-xs font-medium truncate">{a.topic}</div>
                          <div className="text-slate-500 text-[10px] capitalize">
                            {CATEGORY_LABELS[a.category] ?? a.category}
                            {a.simulationSlug && ` · ${a.simulationSlug}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {a.xpAwarded > 0 && (
                            <span className="text-[10px] font-bold" style={{ color: "#f5a524" }}>+{a.xpAwarded}XP</span>
                          )}
                          <span className="text-slate-600 text-[10px]">{new Date(a.attemptedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Activity Flags */}
        <Section title={`Safety Flags (${data?.flags.length ?? 0})`} defaultOpen={openFlags.length > 0}>
          {!data?.flags.length ? (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
              <p className="text-slate-400 text-sm">No flags on record — all clear!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.flags.map(f => {
                const cfg = TIER_COLORS[f.tier] ?? TIER_COLORS[1];
                return (
                  <div key={f.id} className="rounded-xl p-4 flex items-start gap-3"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: `${cfg.color}20`, color: cfg.color }}>
                      T{f.tier}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-semibold capitalize">
                          {f.category.replace(/_/g, " ")}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${f.status === "open" ? "text-orange-400" : "text-green-400"}`}>
                          {f.status}
                        </span>
                      </div>
                      <div className="text-slate-400 text-xs mt-1">{f.aiReasoning}</div>
                      {f.messageContent && (
                        <div className="mt-2 p-2 rounded text-xs font-mono text-slate-300 break-all"
                          style={{ background: "rgba(255,255,255,0.04)" }}>
                          "{f.messageContent.slice(0, 200)}"
                        </div>
                      )}
                      <div className="text-slate-500 text-xs mt-1">{new Date(f.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Contact Exchanges */}
        <Section title={`Contact Info Exchanges (${data?.contactExchanges.length ?? 0})`} defaultOpen={false}>
          {!data?.contactExchanges.length ? (
            <p className="text-slate-400 text-sm text-center py-4">No contact exchanges detected.</p>
          ) : (
            <div className="space-y-3">
              {data.contactExchanges.map(c => (
                <div key={c.id} className="rounded-xl p-4"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-semibold capitalize">
                        {c.detectedType.replace(/_/g, " ")}
                      </div>
                      <div className="mt-1 p-2 rounded-lg text-xs font-mono text-slate-300 break-all"
                        style={{ background: "rgba(255,255,255,0.04)" }}>
                        "{c.messageContent.slice(0, 150)}"
                      </div>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span style={{ color: c.warningSeen ? "#4ade80" : "#94a3b8" }}>
                          {c.warningSeen ? "✓ Warning seen" : "Warning not shown"}
                        </span>
                        <span style={{ color: c.sentAnyway ? "#f97316" : "#4ade80" }}>
                          {c.sentAnyway ? "Sent anyway" : "Cancelled"}
                        </span>
                        <span className="text-slate-500">{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Login History */}
        <Section title={`Login History (${data?.loginHistory.length ?? 0})`} defaultOpen={false}>
          {!data?.loginHistory.length ? (
            <p className="text-slate-400 text-sm text-center py-4">No login history yet.</p>
          ) : (
            <div className="space-y-2">
              {data.loginHistory.map(l => (
                <div key={l.id} className="flex items-center gap-3 py-2 px-3 rounded-xl"
                  style={{ background: l.suspicious ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.03)" }}>
                  <MapPin className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <div className="flex-1 text-sm">
                    <span className="text-white">{[l.city, l.region, l.country].filter(Boolean).join(", ") || "Unknown location"}</span>
                    {l.suspicious && <span className="ml-2 text-xs text-red-400">⚠ Suspicious</span>}
                  </div>
                  <span className="text-slate-500 text-xs">{new Date(l.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Notifications */}
        <Section title={`Notifications (${data?.notifications.length ?? 0})`} defaultOpen={false}>
          {!data?.notifications.length ? (
            <p className="text-slate-400 text-sm text-center py-4">No notifications sent yet.</p>
          ) : (
            <div className="space-y-2">
              {data.notifications.map(n => (
                <div key={n.id} className="flex items-center gap-3 py-3 px-4 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Mail className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm truncate">{n.subject}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  <span className={`text-xs flex-shrink-0 ${n.sent ? "text-green-400" : "text-yellow-400"}`}>
                    {n.sent ? "Sent" : "Queued"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <div className="text-center text-slate-600 text-xs pb-8">
          1WayMirror Safety Portal · Read-only parent view ·{" "}
          <a href="mailto:one.waymirror@outlook.com" className="hover:text-slate-400">Contact safety team</a>
        </div>
      </div>
    </div>
  );
}
