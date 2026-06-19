import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  MessageSquare, BarChart2, Map, Home, Mic, MicOff, Send, Plus, X,
  ChevronRight, Clock, Briefcase, CheckCircle2, Circle, TrendingUp,
  GraduationCap, DollarSign, Loader2, RotateCcw, Brain, FileText,
  MapPin, ListChecks, Volume2, VolumeX, Mail, ExternalLink, Star,
  Zap, Users, BookOpen, Target, RefreshCw, AlertTriangle, ChevronDown,
  type LucideIcon,
} from "lucide-react";
import {
  loadSessions, saveSession, loadRoadmap, saveRoadmap, appendRoadmapMilestones,
  loadPersonality, savePersonality, loadCareerReport, saveCareerReport,
  loadOpportunities, loadActionItems, appendActionItems,
  getDarioCreditsUsed, incrementDarioCreditsUsed,
  PHASE_ORDER, PHASE_LABELS, OPPORTUNITY_LABELS,
  type DarioSession, type DarioMessage, type RoadmapMilestone,
  type CareerCompareResult, type PersonalityInsight, type CareerReport,
  type Opportunity, type ActionItem,
} from "@/lib/darioData";
import { getProfile, getSubscriptionPlan, PLAN_DARIO_CREDITS, PLAN_LABELS, PLAN_COLORS, hasPlanFeature } from "@/lib/profile";
import { getAuthUser } from "@/lib/auth";
import ContactWarningModal from "@/components/ContactWarningModal";
import { detectContactExchange } from "@/lib/contactDetection";

type View = "chat" | "compare" | "roadmap" | "personality" | "report" | "opportunities" | "action-items";

function uuid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function sessionTitle(s: DarioSession): string {
  if (s.title && s.title !== "New Session") return s.title;
  if (s.careersDiscussed.length > 0) return s.careersDiscussed.slice(0, 2).join(" & ");
  const first = s.messages.find(m => m.role === "user");
  if (first) return first.content.slice(0, 40) + (first.content.length > 40 ? "…" : "");
  return "Career Session";
}

/** Build a compact summary of past sessions to send as memory context to Dario */
function buildPastContext(pastSessions: DarioSession[]): string {
  const ended = pastSessions.filter(s => s.endedAt).slice(-4);
  if (ended.length === 0) return "";
  return ended.map((s, i) => {
    const date = new Date(s.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const careers = s.careersDiscussed.length > 0
      ? ` Careers discussed: ${s.careersDiscussed.slice(0, 6).join(", ")}.`
      : "";
    const studentVoice = s.messages
      .filter(m => m.role === "user")
      .slice(0, 5)
      .map(m => `"${m.content.slice(0, 120)}"`)
      .join("; ");
    return `[Past session ${i + 1} — ${date}]${careers}${studentVoice ? ` Student said: ${studentVoice}` : ""}`;
  }).join("\n");
}

/* ── Speech recognition ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpeechRecognitionCtor: (new () => any) | null =
  (typeof window !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition)) || null;

/* ── TTS ── */
function getMaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const preferred = ["David", "James", "Daniel", "Alex", "Mark", "Google US English Male", "en-US-Male"];
  for (const name of preferred) {
    const v = voices.find(v => v.name.includes(name));
    if (v) return v;
  }
  return voices.find(v => v.lang.startsWith("en") && !v.name.toLowerCase().includes("female")) ?? null;
}
function speakText(text: string, enabled: boolean) {
  if (!enabled || typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  const voice = getMaleVoice();
  if (voice) utt.voice = voice;
  utt.pitch = 0.85;
  utt.rate = 0.95;
  utt.volume = 1;
  window.speechSynthesis.speak(utt);
}

/* ── Phase/color maps ── */
const PHASE_ICONS: Record<string, string> = {
  "0-3mo": "🎯", "3-6mo": "📈", "6-12mo": "🎓", "1-3yr": "💼", "3-5yr": "🗺️",
};
const PHASE_COLORS: Record<string, string> = {
  "0-3mo": "#f5a524", "3-6mo": "#3b82f6", "6-12mo": "#22d3ee", "1-3yr": "#a855f7", "3-5yr": "#4ade80",
};
const ACTION_CAT_COLORS: Record<ActionItem["category"], string> = {
  research: "#3b82f6", experience: "#f5a524", skills: "#22d3ee", network: "#a855f7", apply: "#4ade80",
};
const ACTION_CAT_ICONS: Record<ActionItem["category"], string> = {
  research: "🔬", experience: "🏢", skills: "⚡", network: "🤝", apply: "📝",
};

/* ── Dario avatar ── */
function DarioAvatar({ size = 48 }: { size?: number }) {
  return (
    <div className="rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl font-black"
      style={{ width: size, height: size, background: "linear-gradient(135deg,#7c3aed,#a855f7,#f5a524)" }}>
      🧑‍💼
    </div>
  );
}

/* ── Message bubble with optional typewriter ── */
function MessageBubble({ msg, typingId, typingText }: {
  msg: DarioMessage;
  typingId: string;
  typingText: string;
}) {
  const isUser = msg.role === "user";
  const isTyping = msg.id === typingId;
  const displayContent = isTyping ? typingText : msg.content;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""} mb-4`}>
      {!isUser && <DarioAvatar size={32} />}
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "rounded-tr-sm" : "rounded-tl-sm"}`}
        style={isUser
          ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }
          : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0" }}>
        {displayContent}
        {isTyping && displayContent.length < msg.content.length && (
          <span className="inline-block w-1.5 h-3.5 ml-0.5 rounded-sm animate-pulse"
            style={{ background: "#a855f7", verticalAlign: "middle" }} />
        )}
      </div>
      {isUser && (
        <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
          style={{ background: "#1e3a8a", border: "2px solid #f5a524", color: "white" }}>
          {(getProfile()?.name?.[0] ?? getAuthUser()?.name?.[0] ?? "Y").toUpperCase()}
        </div>
      )}
    </div>
  );
}

/* ── Career comparison card ── */
function CompareCard({ career, color }: { career: CareerCompareResult["career1"]; color: string }) {
  return (
    <div className="rounded-2xl p-5 flex-1" style={{ background: `${color}08`, border: `1px solid ${color}25` }}>
      <div className="text-base font-black mb-4" style={{ color }}>{career.name}</div>
      <div className="space-y-3">
        {[
          { icon: DollarSign, label: "Avg Salary",  value: career.avgSalary,        sub: career.salaryRange },
          { icon: TrendingUp, label: "Job Growth",   value: career.jobGrowth,         sub: "" },
          { icon: GraduationCap, label: "Education", value: career.educationRequired, sub: "" },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="flex items-start gap-2.5">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `${color}15` }}>
              <Icon className="h-3.5 w-3.5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide font-bold">{label}</div>
              <div className="text-sm font-bold text-white leading-tight">{value}</div>
              {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
            </div>
          </div>
        ))}
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wide font-bold mb-1.5">Key Skills</div>
          <div className="flex flex-wrap gap-1">
            {career.keySkills.map(s => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}>{s}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wide font-bold mb-1">A Typical Day</div>
          <div className="text-xs text-slate-400 leading-relaxed">{career.typicalDay}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wide font-bold mb-1">Entry Level</div>
          <div className="text-xs text-slate-400 leading-relaxed">{career.entryLevel}</div>
        </div>
        <div className="p-2.5 rounded-xl" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
          <div className="text-[10px] text-slate-500 uppercase tracking-wide font-bold mb-1">Why Students Choose This</div>
          <div className="text-xs leading-relaxed" style={{ color: "#c4b5fd" }}>{career.prosForStudents}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Roadmap timeline ── */
function RoadmapTimeline({ milestones, onToggle }: { milestones: RoadmapMilestone[]; onToggle: (id: string) => void }) {
  const grouped = PHASE_ORDER.map(phase => ({
    phase, label: PHASE_LABELS[phase],
    items: milestones.filter(m => m.phase === phase),
    color: PHASE_COLORS[phase], icon: PHASE_ICONS[phase],
  }));

  if (milestones.length === 0) return (
    <div className="rounded-2xl p-10 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}>
      <div className="text-4xl mb-3">🗺️</div>
      <div className="text-base font-bold text-white mb-1">No roadmap yet</div>
      <div className="text-sm text-slate-500">Complete a session with Dario and end it to generate your personalized career roadmap.</div>
    </div>
  );

  return (
    <div className="relative">
      <div className="absolute left-[27px] top-8 bottom-8 w-px"
        style={{ background: "linear-gradient(180deg, rgba(245,165,36,0.4), rgba(168,85,247,0.15))" }} />
      <div className="space-y-8">
        {grouped.map(({ phase, label, items, color, icon }) => (
          <div key={phase}>
            <div className="flex items-center gap-4 mb-3">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 z-10 relative"
                style={{ background: `${color}18`, border: `2px solid ${color}35` }}>{icon}</div>
              <div>
                <div className="text-base font-black text-white">{label}</div>
                <div className="text-xs text-slate-500">{items.length} milestone{items.length !== 1 ? "s" : ""}</div>
              </div>
            </div>
            <div className="ml-[70px] space-y-2">
              {items.length === 0 ? (
                <div className="px-4 py-3 rounded-xl text-xs text-slate-600"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)" }}>
                  No milestones yet for this phase
                </div>
              ) : items.map(m => (
                <div key={m.id}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-white/5 transition-colors group"
                  style={{ background: m.completed ? `${color}08` : "rgba(255,255,255,0.03)", border: `1px solid ${m.completed ? color + "30" : "rgba(255,255,255,0.08)"}` }}
                  onClick={() => onToggle(m.id)}>
                  <div className="mt-0.5 flex-shrink-0">
                    {m.completed ? <CheckCircle2 className="h-4 w-4" style={{ color }} /> : <Circle className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold" style={{ color: m.completed ? color : "white" }}>{m.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{m.description}</div>
                  </div>
                  <span className="text-[9px] uppercase tracking-wide font-bold flex-shrink-0 mt-1" style={{ color: m.completed ? color : "#475569" }}>
                    {m.completed ? "Done" : "Milestone"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── MAIN PAGE ── */
export default function DarioPage() {
  /* view */
  const [view, setView] = useState<View>("chat");

  /* sessions */
  const [sessions, setSessions] = useState<DarioSession[]>(() => loadSessions());
  const [activeSession, setActiveSession] = useState<DarioSession | null>(null);
  const [sessionState, setSessionState] = useState<"idle" | "active" | "ended">("idle");

  /* messages */
  const [messages, setMessages] = useState<DarioMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  /* typewriter */
  const [typingId, setTypingId] = useState<string>("");
  const [typingText, setTypingText] = useState<string>("");
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* TTS */
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const ttsRef = useRef(false);
  useEffect(() => { ttsRef.current = ttsEnabled; }, [ttsEnabled]);

  /* Credits */
  const [plan] = useState(() => getSubscriptionPlan());
  const planCredits = PLAN_DARIO_CREDITS[plan];
  const planLabel = PLAN_LABELS[plan];
  const planColor = PLAN_COLORS[plan];
  const [creditsUsed, setCreditsUsed] = useState(() => getDarioCreditsUsed());
  const creditsRemaining = Math.max(0, planCredits - creditsUsed);
  const darioUnlocked = plan !== "none" && plan !== "starter";
  const hasCredits = darioUnlocked && creditsRemaining > 0;

  const consumeCredit = useCallback(() => {
    if (plan === "none" || plan === "starter") return false;
    if (creditsRemaining <= 0) return false;
    const updated = incrementDarioCreditsUsed(1);
    setCreditsUsed(updated);
    return true;
  }, [plan, creditsRemaining]);
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {};
    }
  }, []);

  /* voice input */
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const voiceSupported = !!SpeechRecognitionCtor;

  /* roadmap */
  const [roadmap, setRoadmap] = useState<RoadmapMilestone[]>(() => loadRoadmap());
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);

  /* compare */
  const [career1, setCareer1] = useState("");
  const [career2, setCareer2] = useState("");
  const [compareResult, setCompareResult] = useState<CareerCompareResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState("");

  /* personality */
  const [personality, setPersonality] = useState<PersonalityInsight | null>(() => loadPersonality());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  /* career report */
  const [careerReport, setCareerReport] = useState<CareerReport | null>(() => loadCareerReport());
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState("");

  /* opportunities */
  const [opportunities, setOpportunities] = useState<Opportunity[]>(() => loadOpportunities());
  const [oppLocation, setOppLocation] = useState("");
  const [oppCareer, setOppCareer] = useState("");
  const [oppType, setOppType] = useState<Opportunity["type"]>("job-shadowing");
  const [isSearchingOpps, setIsSearchingOpps] = useState(false);
  const [oppError, setOppError] = useState("");
  const [expandedOpp, setExpandedOpp] = useState<string | null>(null);

  /* action items */
  const [actionItems, setActionItems] = useState<ActionItem[]>(() => loadActionItems());
  const [isGeneratingActions, setIsGeneratingActions] = useState(false);
  const [actionError, setActionError] = useState("");

  /* scroll */
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading, typingText]);

  /* ── typewriter effect ── */
  function startTypewriter(msg: DarioMessage) {
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    setTypingId(msg.id);
    setTypingText("");
    let idx = 0;
    const full = msg.content;
    typingIntervalRef.current = setInterval(() => {
      idx++;
      setTypingText(full.slice(0, idx));
      if (idx >= full.length) {
        clearInterval(typingIntervalRef.current!);
        typingIntervalRef.current = null;
        setTypingId("");
        setTypingText("");
      }
    }, 18);
  }
  useEffect(() => () => { if (typingIntervalRef.current) clearInterval(typingIntervalRef.current); }, []);

  /* ── log activity to server ── */
  const logActivity = useCallback((session: DarioSession, allSessions: DarioSession[]) => {
    const profile = getProfile();
    const auth = getAuthUser();
    // Build last 10 messages as conversation excerpt for admin visibility
    const conversationExcerpt = session.messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content.slice(0, 300),
    }));
    // All careers ever discussed across every session
    const allCareersEver = Array.from(new Set(
      allSessions.flatMap(s => s.careersDiscussed)
    ));
    void fetch("/api/dario/log-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: profile?.learnerId ?? auth?.email ?? "anonymous",
        userName: profile?.name ?? auth?.name ?? "Unknown",
        userEmail: profile?.email ?? auth?.email ?? "",
        sessionId: session.id,
        sessionTitle: sessionTitle(session),
        school: profile?.school ?? "",
        graduationYear: profile?.graduationYear ?? null,
        gpa: profile?.gpa ?? "",
        sat: profile?.sat ?? "",
        careerInterest: profile?.careerInterest ?? "",
        careersDiscussed: session.careersDiscussed,
        messageCount: session.messages.length,
        conversationExcerpt,
        opportunitiesSearched: opportunities.map(o => o.careerField).filter(Boolean),
        actionItemCount: actionItems.length,
        roadmapMilestoneCount: roadmap.length,
        totalSessionsCount: allSessions.length,
        allCareersEver,
        personalityGenerated: !!personality,
        reportGenerated: !!careerReport,
        sessionStartedAt: session.startedAt,
        sessionEndedAt: session.endedAt ?? new Date().toISOString(),
      }),
    }).catch(() => {});
  }, [opportunities, actionItems, personality, careerReport, roadmap]);

  /* ── start session ── */
  const startNewSession = useCallback(async () => {
    if (plan === "none" || plan === "starter") return;
    const session: DarioSession = {
      id: uuid(), title: "New Session", startedAt: new Date().toISOString(),
      messages: [], careersDiscussed: [], roadmapGenerated: false,
    };
    setActiveSession(session);
    setMessages([]);
    setSessionState("active");
    setIsLoading(true);
    try {
      const res = await fetch("/api/dario/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [], pastContext: buildPastContext(sessions) }),
      });
      const data = await res.json() as { message?: string };
      const greeting: DarioMessage = {
        id: uuid(), role: "assistant",
        content: data.message ?? "Hey! I'm Dario, your career guidance counselor. I'm really excited to help you figure out where you're headed. So tell me — what subjects or activities do you enjoy most, in school or just in your free time?",
        timestamp: new Date().toISOString(),
      };
      const updated = { ...session, messages: [greeting] };
      setMessages([greeting]);
      setActiveSession(updated);
      saveSession(updated);
      setSessions(loadSessions());
      startTypewriter(greeting);
      speakText(greeting.content, ttsRef.current);
    } catch {
      const fallback: DarioMessage = {
        id: uuid(), role: "assistant",
        content: "Hey! I'm Dario, your career guidance counselor. I'm here to help you explore careers that fit who you are. What subjects or activities do you enjoy most?",
        timestamp: new Date().toISOString(),
      };
      setMessages([fallback]);
      const updated = { ...session, messages: [fallback] };
      setActiveSession(updated);
      saveSession(updated);
      setSessions(loadSessions());
    } finally { setIsLoading(false); }
  }, []);

  /* ── send message ── */
  /* ── contact-exchange gate ── */
  const [contactWarning, setContactWarning] = useState<{ text: string; types: import("@/lib/contactDetection").DetectionType[] } | null>(null);

  const doSend = useCallback(async (text: string) => {
    if (!consumeCredit()) {
      const errMsg: DarioMessage = {
        id: uuid(), role: "assistant",
        content: plan === "none" || plan === "starter"
          ? "You need an active plan to chat with me. Head to Settings in your dashboard to choose a plan."
          : "You've used all your Dario credits this month. Upgrade your plan to keep chatting!",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, { id: uuid(), role: "user", content: text, timestamp: new Date().toISOString() }, errMsg]);
      return;
    }
    const userMsg: DarioMessage = { id: uuid(), role: "user", content: text, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);
    try {
      const pastContext = buildPastContext(sessions.filter(s => s.endedAt && s.id !== activeSession?.id));
      const res = await fetch("/api/dario/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          pastContext,
        }),
      });
      const data = await res.json() as { message?: string };
      const reply: DarioMessage = {
        id: uuid(), role: "assistant",
        content: data.message ?? "That's interesting! Tell me more about what you enjoy doing.",
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...newMessages, reply];
      setMessages(finalMessages);
      startTypewriter(reply);
      speakText(reply.content, ttsRef.current);
      const mentioned = extractCareers(reply.content);
      const updatedCareers = Array.from(new Set([...activeSession!.careersDiscussed, ...mentioned]));
      const updatedSession: DarioSession = {
        ...activeSession!, messages: finalMessages, careersDiscussed: updatedCareers,
        title: sessionTitle({ ...activeSession!, careersDiscussed: updatedCareers, messages: finalMessages }),
      };
      setActiveSession(updatedSession);
      saveSession(updatedSession);
      setSessions(loadSessions());

      /* Async moderation — non-blocking */
      void fetch("/api/safety/moderate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, studentId: getProfile()?.learnerId, context: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      }).catch(() => { /* noop */ });

    } catch {
      const err: DarioMessage = { id: uuid(), role: "assistant", content: "I had a quick connection issue. Could you repeat that?", timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, err]);
    } finally { setIsLoading(false); }
  }, [messages, sessions, activeSession]);

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading || !activeSession || typingId) return;

    /* Contact-exchange detection */
    const detection = detectContactExchange(text);
    if (detection.detected) {
      setContactWarning({ text, types: detection.types });
      return;
    }

    setInputText("");
    await doSend(text);
  }, [inputText, isLoading, activeSession, typingId, doSend]);

  /* ── end session ── */
  const endSession = useCallback(async () => {
    if (!activeSession) return;
    const ended: DarioSession = { ...activeSession, endedAt: new Date().toISOString(), messages };
    setActiveSession(ended);
    saveSession(ended);
    setSessionState("ended");
    const allSessionsNow = [...sessions.filter(s => s.id !== ended.id), ended];
    logActivity(ended, allSessionsNow);
    // Award Dario XP based on messages exchanged
    const xpEarned = Math.min(50, Math.max(5, Math.floor(messages.length * 2)));
    try {
      const darioXpKey = "1waymirror_dario_xp_v1";
      const prev = parseInt(localStorage.getItem(darioXpKey) ?? "0", 10);
      localStorage.setItem(darioXpKey, String(prev + xpEarned));
    } catch { /* noop */ }
    setIsGeneratingRoadmap(true);
    try {
      const res = await fetch("/api/dario/roadmap", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionMessages: messages.map(m => ({ role: m.role, content: m.content })),
          careersDiscussed: ended.careersDiscussed,
        }),
      });
      const data = await res.json() as { milestones?: { phase: string; phaseLabel: string; title: string; description: string }[] };
      if (data.milestones && data.milestones.length > 0) {
        const newMilestones: RoadmapMilestone[] = data.milestones.map(m => ({
          id: uuid(), phase: m.phase as RoadmapMilestone["phase"], phaseLabel: m.phaseLabel,
          title: m.title, description: m.description, completed: false, sessionId: activeSession.id,
        }));
        const all = appendRoadmapMilestones(newMilestones);
        setRoadmap(all);
        saveSession({ ...ended, roadmapGenerated: true });
        setSessions(loadSessions());
      }
    } catch { /* noop */ }
    finally { setIsGeneratingRoadmap(false); }
  }, [activeSession, messages, logActivity]);

  /* ── load past session ── */
  const loadPastSession = (s: DarioSession) => {
    setActiveSession(s);
    setMessages(s.messages);
    setSessionState(s.endedAt ? "ended" : "active");
    setView("chat");
  };

  /* ── toggle milestone ── */
  const toggleMilestone = (id: string) => {
    const updated = roadmap.map(m => m.id === id ? { ...m, completed: !m.completed } : m);
    setRoadmap(updated);
    saveRoadmap(updated);
  };

  /* ── voice input ── */
  const toggleVoice = () => {
    if (!SpeechRecognitionCtor) return;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const rec = new SpeechRecognitionCtor();
    rec.lang = "en-US";
    rec.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (ev: any) => { setInputText(ev.results[0][0].transcript); setIsListening(false); };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  /* ── career compare ── */
  const runComparison = async () => {
    if (!career1.trim() || !career2.trim()) return;
    if (!hasCredits) {
      setCompareError(!darioUnlocked ? "Dario Compare requires Explorer or higher. Upgrade your plan." : "No Dario credits remaining. Upgrade your plan.");
      return;
    }
    consumeCredit();
    setIsComparing(true); setCompareError(""); setCompareResult(null);
    try {
      const res = await fetch("/api/dario/compare", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ career1: career1.trim(), career2: career2.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      setCompareResult(await res.json() as CareerCompareResult);
      try { localStorage.setItem("1waymirror_dario_compare_used_v1", "true"); } catch { /* noop */ }
    } catch { setCompareError("Comparison failed. Check your career names and try again."); }
    finally { setIsComparing(false); }
  };

  /* ── personality ── */
  const runPersonalityAnalysis = async () => {
    const allMessages = sessions.flatMap(s => s.messages);
    if (allMessages.length < 4) { setAnalyzeError("Have at least one full conversation with Dario first."); return; }
    if (!hasPlanFeature(plan, "personality")) { setAnalyzeError("Personality Insights requires Builder or higher. Upgrade your plan."); return; }
    if (!hasCredits) { setAnalyzeError("No Dario credits remaining. Upgrade your plan."); return; }
    consumeCredit();
    setIsAnalyzing(true); setAnalyzeError("");
    try {
      const res = await fetch("/api/dario/personality", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allMessages: allMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as PersonalityInsight;
      const insight: PersonalityInsight = { ...data, generatedAt: new Date().toISOString() };
      savePersonality(insight);
      setPersonality(insight);
    } catch { setAnalyzeError("Analysis failed. Please try again."); }
    finally { setIsAnalyzing(false); }
  };

  /* ── career report ── */
  const runCareerReport = async () => {
    const allMessages = sessions.flatMap(s => s.messages);
    if (allMessages.length < 4) { setReportError("Have at least one full conversation with Dario first."); return; }
    if (!hasPlanFeature(plan, "career-report")) { setReportError("Career Report requires Builder or higher. Upgrade your plan."); return; }
    if (!hasCredits) { setReportError("No Dario credits remaining. Upgrade your plan."); return; }
    consumeCredit();
    setIsGeneratingReport(true); setReportError("");
    try {
      const careersDiscussed = Array.from(new Set(sessions.flatMap(s => s.careersDiscussed)));
      const res = await fetch("/api/dario/career-report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allMessages: allMessages.map(m => ({ role: m.role, content: m.content })),
          careersDiscussed, sessionCount: sessions.length,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as CareerReport;
      const report: CareerReport = { ...data, generatedAt: new Date().toISOString() };
      saveCareerReport(report);
      setCareerReport(report);
    } catch { setReportError("Report generation failed. Please try again."); }
    finally { setIsGeneratingReport(false); }
  };

  /* ── opportunities ── */
  const searchOpportunities = async () => {
    if (!oppLocation.trim() || !oppCareer.trim()) return;
    if (!hasPlanFeature(plan, "opportunities")) { setOppError("Opportunities Board requires Builder or higher. Upgrade your plan."); return; }
    if (!hasCredits) { setOppError("No Dario credits remaining. Upgrade your plan."); return; }
    consumeCredit();
    setIsSearchingOpps(true); setOppError("");
    const profile = getProfile();
    const auth = getAuthUser();
    const studentName = profile?.name ?? auth?.name ?? "";
    const studentEmail = profile?.email ?? auth?.email ?? "";
    try {
      const res = await fetch("/api/dario/opportunities", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: oppLocation.trim(), careerInterest: oppCareer.trim(), opportunityType: OPPORTUNITY_LABELS[oppType], studentName, studentEmail }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { opportunities: Omit<Opportunity, "id" | "savedAt">[] };
      const now = new Date().toISOString();
      const newOpps: Opportunity[] = data.opportunities.map(o => ({ ...o, id: uuid(), savedAt: now, type: oppType }));
      setOpportunities(prev => [...newOpps, ...prev]);
      const allOpps = [...newOpps, ...loadOpportunities()];
      try { localStorage.setItem("1waymirror_opportunities_v1", JSON.stringify(allOpps)); } catch { /* noop */ }
      setExpandedOpp(newOpps[0]?.id ?? null);
    } catch { setOppError("Search failed. Try adjusting your location or career field."); }
    finally { setIsSearchingOpps(false); }
  };

  /* ── action items ── */
  const generateActionItems = async () => {
    const allMessages = sessions.flatMap(s => s.messages);
    if (allMessages.length < 4) { setActionError("Have at least one full conversation with Dario first."); return; }
    if (!hasPlanFeature(plan, "action-items")) { setActionError("Action Items requires Builder or higher. Upgrade your plan."); return; }
    if (!hasCredits) { setActionError("No Dario credits remaining. Upgrade your plan."); return; }
    consumeCredit();
    setIsGeneratingActions(true); setActionError("");
    try {
      const careersDiscussed = Array.from(new Set(sessions.flatMap(s => s.careersDiscussed)));
      const res = await fetch("/api/dario/action-items", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allMessages: allMessages.map(m => ({ role: m.role, content: m.content })), careersDiscussed }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { items: { title: string; description: string; category: string; dueDate?: string }[] };
      const now = new Date().toISOString();
      const newItems: ActionItem[] = data.items.map(item => ({
        id: uuid(), title: item.title, description: item.description,
        category: item.category as ActionItem["category"], completed: false,
        dueDate: item.dueDate, createdAt: now,
      }));
      const all = appendActionItems(newItems);
      setActionItems(all);
    } catch { setActionError("Failed to generate action items. Please try again."); }
    finally { setIsGeneratingActions(false); }
  };

  const toggleActionItem = (id: string) => {
    const updated = actionItems.map(a => a.id === id ? { ...a, completed: !a.completed } : a);
    setActionItems(updated);
    try { localStorage.setItem("1waymirror_action_items_v1", JSON.stringify(updated)); } catch { /* noop */ }
  };

  /* ── career extraction ── */
  function extractCareers(text: string): string[] {
    const patterns = [
      /\b(software engineer|mechanical engineer|civil engineer|electrical engineer|aerospace engineer|biomedical engineer|chemical engineer|industrial engineer|environmental engineer)\b/gi,
      /\b(nurse practitioner|physician|pharmacist|physical therapist|radiologist|dentist|veterinarian|psychologist)\b/gi,
      /\b(data analyst|data scientist|cybersecurity|cloud engineer|UX designer|UI designer|product manager|AI engineer)\b/gi,
      /\b(lawyer|attorney|judge|detective|police officer|federal agent|prosecutor)\b/gi,
      /\b(financial analyst|investment banker|stock trader|accountant|economist|marketing manager)\b/gi,
      /\b(electrician|plumber|HVAC technician|carpenter|solar installer)\b/gi,
      /\b(neuroscientist|physicist|chemist|biologist|astronomer|oceanographer|geologist)\b/gi,
    ];
    const found: string[] = [];
    for (const pat of patterns) {
      const matches = text.match(pat);
      if (matches) found.push(...matches.map(m => m.toLowerCase()));
    }
    return [...new Set(found)];
  }

  const profile = getProfile();
  const auth = getAuthUser();
  const userName = profile?.name ?? auth?.name ?? "Explorer";
  const userEmail = profile?.email ?? auth?.email ?? "";
  const completedCount = roadmap.filter(m => m.completed).length;
  const totalSessions = sessions.length;
  const totalCareers = Array.from(new Set(sessions.flatMap(s => s.careersDiscussed))).length;
  const completedActions = actionItems.filter(a => a.completed).length;

  const builderPlus = hasPlanFeature(plan, "personality");
  const NAV_ITEMS: { v: View; icon: LucideIcon; label: string; locked?: boolean }[] = [
    { v: "chat",         icon: MessageSquare, label: "Chat with Dario" },
    { v: "compare",      icon: BarChart2,     label: "Compare Careers" },
    { v: "roadmap",      icon: Map,           label: "Career Roadmap" },
    { v: "personality",  icon: Brain,         label: "Personality Insights", locked: !builderPlus },
    { v: "report",       icon: FileText,      label: "Career Report",        locked: !builderPlus },
    { v: "opportunities",icon: MapPin,        label: "Opportunities",        locked: !builderPlus },
    { v: "action-items", icon: ListChecks,    label: "Action Items",         locked: !builderPlus },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "radial-gradient(ellipse at top, #0d1f3c 0%, #0a1428 60%)" }}>

      {/* ── Top Bar ── */}
      <header className="flex-shrink-0 h-14 flex items-center px-4 gap-3 z-30"
        style={{ background: "rgba(10,20,40,0.98)", borderBottom: "1px solid rgba(168,85,247,0.25)", backdropFilter: "blur(16px)" }}>
        <Link href="/replitopolis">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <Home className="h-3.5 w-3.5" /> Dashboard
          </button>
        </Link>
        <div className="w-px h-5 bg-white/10" />
        <div className="flex items-center gap-2">
          <DarioAvatar size={28} />
          <div>
            <div className="text-sm font-black text-white leading-none">Dario</div>
            <div className="text-[9px] text-purple-300 uppercase tracking-wider">AI Career Counselor</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
            <span><span className="font-bold text-white">{totalSessions}</span> sessions</span>
            <span><span className="font-bold text-white">{totalCareers}</span> careers explored</span>
            <span><span className="font-bold text-white">{completedCount}</span> milestones done</span>
          </div>
          {/* TTS toggle */}
          <button onClick={() => { setTtsEnabled(e => !e); if (ttsEnabled) window.speechSynthesis?.cancel(); }}
            title={ttsEnabled ? "Mute Dario's voice" : "Enable Dario's voice (male)"}
            className="h-8 w-8 rounded-xl flex items-center justify-center transition-all"
            style={ttsEnabled
              ? { background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }
              : { color: "#475569", border: "1px solid rgba(255,255,255,0.08)" }}>
            {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          {sessionState === "active" && (
            <button onClick={endSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
              <X className="h-3.5 w-3.5" /> End Session
            </button>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left Sidebar ── */}
        <aside className="flex-shrink-0 flex flex-col" style={{ width: 228, background: "rgba(8,16,32,0.95)", borderRight: "1px solid rgba(168,85,247,0.15)" }}>
          {/* Dario info */}
          <div className="p-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3 mb-3">
              <DarioAvatar size={40} />
              <div>
                <div className="text-sm font-black text-white">Dario</div>
                <div className="text-[10px] text-purple-400">Career Counselor · AI</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "Sessions",  value: totalSessions },
                { label: "Careers",   value: totalCareers },
                { label: "Goals",     value: completedCount },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-1.5 text-center"
                  style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)" }}>
                  <div className="text-xs font-black text-white">{s.value}</div>
                  <div className="text-[8px] text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Credits widget */}
          <div className="px-3 py-2.5 mx-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {!darioUnlocked ? (
              <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <div className="text-[10px] font-black text-red-400 uppercase tracking-wide mb-1">
                  {plan === "starter" ? "Dario Not Included" : "No Active Plan"}
                </div>
                <div className="text-[10px] text-slate-500 mb-2">
                  {plan === "starter"
                    ? "Dario AI requires Explorer or higher. Upgrade to unlock AI career guidance."
                    : "Upgrade to access Dario AI credits and unlock all features."}
                </div>
                <Link href="/upgrade">
                  <button className="w-full py-1.5 rounded-lg text-[10px] font-black text-center transition-all hover:opacity-90"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                    Upgrade to Explorer →
                  </button>
                </Link>
              </div>
            ) : (
              <div className="rounded-xl px-3 py-2.5" style={{ background: `${planColor}08`, border: `1px solid ${planColor}20` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wide" style={{ color: planColor }}>Dario Credits</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${planColor}18`, color: planColor }}>{planLabel}</span>
                  </div>
                  <span className="text-[10px] font-black" style={{ color: creditsRemaining > 5 ? planColor : "#ef4444" }}>
                    {creditsRemaining.toLocaleString()} left
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(0, (creditsRemaining / planCredits) * 100)}%`, background: creditsRemaining > 10 ? planColor : "#ef4444" }} />
                </div>
                <div className="text-[9px] text-slate-600">{creditsUsed} used of {planCredits.toLocaleString()} monthly credits</div>
                {creditsRemaining === 0 && (
                  <Link href="/upgrade">
                    <button className="w-full mt-1.5 py-1 rounded-lg text-[9px] font-black text-center"
                      style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                      Upgrade for more credits →
                    </button>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="px-2 py-2 overflow-y-auto flex-1">
            <div className="space-y-0.5 mb-3">
              {NAV_ITEMS.map(({ v, icon: Icon, label, locked }) => (
                <button key={v} onClick={() => setView(v)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left"
                  style={view === v
                    ? { background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.25)" }
                    : locked
                      ? { color: "#334155", border: "1px solid transparent" }
                      : { color: "#64748b", border: "1px solid transparent" }}>
                  <Icon className="h-4 w-4 flex-shrink-0" style={locked ? { opacity: 0.4 } : {}} />
                  <span className="flex-1 leading-tight" style={locked ? { opacity: 0.5 } : {}}>{label}</span>
                  {locked && (
                    <span className="text-[8px] font-black px-1 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.12)", color: "#7c3aed" }}>Builder+</span>
                  )}
                  {!locked && v === "roadmap" && roadmap.length > 0 && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(168,85,247,0.2)", color: "#a855f7" }}>{roadmap.length}</span>
                  )}
                  {!locked && v === "action-items" && actionItems.length > 0 && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(245,165,36,0.2)", color: "#f5a524" }}>{actionItems.filter(a => !a.completed).length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Sessions list */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} className="pt-2">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Past Sessions</span>
                <button onClick={startNewSession}
                  className="flex items-center gap-1 text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors">
                  <Plus className="h-3 w-3" /> New
                </button>
              </div>
              {sessions.length === 0 ? (
                <div className="px-2 py-3 text-[10px] text-slate-600 text-center">No sessions yet</div>
              ) : sessions.map(s => (
                <button key={s.id} onClick={() => loadPastSession(s)}
                  className="w-full text-left px-3 py-2 rounded-xl mb-0.5 transition-all hover:bg-white/5"
                  style={activeSession?.id === s.id
                    ? { background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }
                    : { border: "1px solid transparent" }}>
                  <div className="text-[11px] font-semibold text-white leading-tight truncate">{sessionTitle(s)}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="h-2.5 w-2.5 text-slate-600" />
                    <span className="text-[9px] text-slate-600">{shortDate(s.startedAt)}</span>
                    {s.roadmapGenerated && <span className="text-[9px] text-purple-500 font-bold">· roadmap ✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom controls */}
          <div className="p-3 space-y-1.5 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {voiceSupported && (
              <button onClick={toggleVoice}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={isListening
                  ? { background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }
                  : { color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>
                {isListening ? <><MicOff className="h-3.5 w-3.5" /> Stop Listening</> : <><Mic className="h-3.5 w-3.5" /> Voice Input</>}
              </button>
            )}
            <Link href="/replitopolis">
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-colors">
                <Home className="h-3.5 w-3.5" /> Back to Dashboard
              </button>
            </Link>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 min-w-0 flex flex-col">

          {/* ── CHAT VIEW ── */}
          {view === "chat" && (
            <>
              {!darioUnlocked ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                    style={{ background: "rgba(239,68,68,0.08)", border: "2px solid rgba(239,68,68,0.25)" }}>
                    <span className="text-5xl">🔒</span>
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">Dario AI Not Included</h2>
                  <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-2">
                    Your <span className="font-bold text-white">Starter</span> plan doesn't include Dario AI. Upgrade to <span className="font-bold" style={{ color: "#f5a524" }}>Explorer</span> or higher to unlock your personal AI career counselor.
                  </p>
                  <p className="text-slate-600 text-xs mb-8">Explorer: 200 credits/mo · Builder: 700 credits/mo · Accelerator: 1,200 credits/mo</p>
                  <div className="grid grid-cols-3 gap-4 mb-8 max-w-lg">
                    {[
                      { icon: "🎯", label: "Career Chat",         desc: "AI-powered counseling sessions" },
                      { icon: "⚖️", label: "Career Compare",      desc: "Side-by-side career analysis" },
                      { icon: "🗺️", label: "Career Roadmap",      desc: "Your personalized 5-year plan" },
                    ].map(item => (
                      <div key={item.label} className="rounded-2xl p-4 text-center opacity-50"
                        style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.15)" }}>
                        <div className="text-2xl mb-2">{item.icon}</div>
                        <div className="text-xs font-bold text-white mb-1">{item.label}</div>
                        <div className="text-[10px] text-slate-500">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                  <Link href="/upgrade?plan=explorer&from=starter">
                    <button
                      className="px-10 py-4 rounded-2xl text-base font-black transition-all hover:scale-[1.03]"
                      style={{ background: "linear-gradient(135deg,#f5a524,#ea580c)", color: "#0a1428", boxShadow: "0 0 30px rgba(245,165,36,0.35)" }}>
                      Upgrade to Explorer →
                    </button>
                  </Link>
                  <p className="text-slate-600 text-xs mt-3">Starting at $49.99/mo · 7-day free trial</p>
                </div>
              ) : sessionState === "idle" && sessions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <DarioAvatar size={80} />
                  <h2 className="text-2xl font-black text-white mt-5 mb-2">Start a Conversation with Dario</h2>
                  <p className="text-slate-400 text-sm max-w-md leading-relaxed mb-8">
                    Dario will help you discover your interests, explore careers, and build a plan for your future — one conversation at a time.
                  </p>
                  <div className="grid grid-cols-3 gap-4 mb-8 max-w-lg">
                    {[
                      { icon: "🎯", label: "Find Your Path",    desc: "Personalized career discovery" },
                      { icon: "🧠", label: "Personality Insights", desc: "Learn what makes you tick" },
                      { icon: "📍", label: "Find Opportunities", desc: "Internships, shadowing & more" },
                    ].map(item => (
                      <div key={item.label} className="rounded-2xl p-4 text-center"
                        style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.15)" }}>
                        <div className="text-2xl mb-2">{item.icon}</div>
                        <div className="text-xs font-bold text-white mb-1">{item.label}</div>
                        <div className="text-[10px] text-slate-500">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={startNewSession}
                    className="px-8 py-4 rounded-2xl text-base font-black transition-all hover:scale-[1.03]"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white", boxShadow: "0 0 30px rgba(168,85,247,0.35)" }}>
                    Begin Your First Session
                  </button>
                </div>
              ) : sessionState === "idle" && sessions.length > 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <DarioAvatar size={64} />
                  <h2 className="text-xl font-black text-white mt-4 mb-2">Welcome back, {userName.split(" ")[0]}!</h2>
                  <p className="text-slate-500 text-sm mb-6">Start a new session or select a past one from the sidebar.</p>
                  <button onClick={startNewSession}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all hover:scale-[1.02]"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }}>
                    <Plus className="h-4 w-4" /> New Session
                  </button>
                </div>
              ) : (
                <>
                  {/* Session header */}
                  <div className="flex-shrink-0 px-6 py-3 flex items-center gap-3"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {activeSession ? sessionTitle(activeSession) : "Session"}
                      </div>
                      {activeSession && (
                        <div className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1.5">
                          <Clock className="h-2.5 w-2.5" /> {shortDate(activeSession.startedAt)}
                          {activeSession.careersDiscussed.length > 0 && (
                            <> · <Briefcase className="h-2.5 w-2.5" /> {activeSession.careersDiscussed.slice(0, 3).join(", ")}</>
                          )}
                        </div>
                      )}
                    </div>
                    {ttsEnabled && (
                      <div className="text-[10px] text-purple-400 flex items-center gap-1">
                        <Volume2 className="h-3 w-3" /> Voice on
                      </div>
                    )}
                    {sessionState === "ended" && activeSession?.roadmapGenerated && (
                      <button onClick={() => setView("roadmap")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-[1.02]"
                        style={{ background: "rgba(168,85,247,0.12)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.25)" }}>
                        <Map className="h-3.5 w-3.5" /> View Roadmap
                      </button>
                    )}
                    {sessionState === "active" && (
                      <button onClick={endSession}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:bg-red-900/20 transition-colors">
                        <X className="h-3.5 w-3.5" /> End Session
                      </button>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    {messages.map(msg => (
                      <MessageBubble key={msg.id} msg={msg} typingId={typingId} typingText={typingText} />
                    ))}
                    {isLoading && (
                      <div className="flex gap-3 mb-4">
                        <DarioAvatar size={32} />
                        <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2"
                          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                          <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
                          <span className="text-xs text-slate-400">Dario is thinking…</span>
                        </div>
                      </div>
                    )}
                    {sessionState === "ended" && !isGeneratingRoadmap && (
                      <div className="flex justify-center my-4">
                        <div className="px-5 py-3 rounded-xl text-center"
                          style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                          <div className="text-xs font-bold text-purple-400 mb-1">Session ended</div>
                          {activeSession?.roadmapGenerated
                            ? <button onClick={() => setView("roadmap")} className="text-xs text-white font-semibold hover:text-purple-300 transition-colors flex items-center gap-1 mx-auto">
                                <Map className="h-3.5 w-3.5" /> View your career roadmap →
                              </button>
                            : <div className="text-[11px] text-slate-500">Start a new session to continue.</div>}
                        </div>
                      </div>
                    )}
                    {isGeneratingRoadmap && (
                      <div className="flex justify-center my-4">
                        <div className="px-5 py-3 rounded-xl flex items-center gap-3"
                          style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                          <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
                          <div>
                            <div className="text-xs font-bold text-purple-400">Generating your career roadmap…</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Dario is building your personalized 5-year plan</div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input bar */}
                  {sessionState === "active" && (
                    <div className="flex-shrink-0 px-4 py-3"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(10,20,40,0.7)" }}>
                      <div className="flex items-end gap-2">
                        {voiceSupported && (
                          <button onClick={toggleVoice}
                            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                            style={isListening
                              ? { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444" }
                              : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
                            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                          </button>
                        )}
                        <div className="flex-1 relative">
                          <textarea
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                            placeholder={isListening ? "Listening…" : "Type your message or press the mic…"}
                            rows={1}
                            className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none resize-none"
                            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(168,85,247,0.25)", maxHeight: 120, minHeight: 42 }} />
                        </div>
                        <button onClick={() => void sendMessage()} disabled={!inputText.trim() || isLoading || !!typingId}
                          className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-[1.05] disabled:opacity-40"
                          style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
                          <Send className="h-4 w-4 text-white" />
                        </button>
                      </div>
                      {isListening && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-red-400 animate-pulse">
                          <div className="h-2 w-2 rounded-full bg-red-400" /> Listening — speak now…
                        </div>
                      )}
                    </div>
                  )}
                  {sessionState === "ended" && (
                    <div className="flex-shrink-0 px-4 py-3"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(10,20,40,0.7)" }}>
                      <button onClick={startNewSession}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.01]"
                        style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.25)" }}>
                        <Plus className="h-4 w-4" /> Start New Session
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── COMPARE VIEW ── */}
          {view === "compare" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-blue-400" /> Career Comparison
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">Enter two careers for a detailed side-by-side comparison.</p>
                </div>
                <div className="rounded-2xl p-5 mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Career One</label>
                      <input value={career1} onChange={e => setCareer1(e.target.value)} placeholder="e.g. Software Engineer"
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                        onKeyDown={e => e.key === "Enter" && void runComparison()} />
                    </div>
                    <div className="flex-shrink-0 text-center mt-5"><span className="text-xs font-bold text-slate-600">vs</span></div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Career Two</label>
                      <input value={career2} onChange={e => setCareer2(e.target.value)} placeholder="e.g. Nurse Practitioner"
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                        onKeyDown={e => e.key === "Enter" && void runComparison()} />
                    </div>
                    <div className="flex-shrink-0 mt-5">
                      <button onClick={() => void runComparison()} disabled={!career1.trim() || !career2.trim() || isComparing}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white" }}>
                        {isComparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4" />}
                        Compare
                      </button>
                    </div>
                  </div>
                </div>
                {compareError && <div className="rounded-xl p-4 mb-4 text-sm text-red-400" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>{compareError}</div>}
                {isComparing && (
                  <div className="rounded-2xl p-10 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <Loader2 className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-3" />
                    <div className="text-sm font-bold text-white">Researching both careers…</div>
                  </div>
                )}
                {!compareResult && !isComparing && !compareError && (
                  <div className="rounded-2xl p-12 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                    <BarChart2 className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                    <div className="text-base font-bold text-slate-600">Enter two careers to compare</div>
                  </div>
                )}
                {compareResult && (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <CompareCard career={compareResult.career1} color="#3b82f6" />
                      <CompareCard career={compareResult.career2} color="#a855f7" />
                    </div>
                    <button onClick={() => { setCompareResult(null); setCareer1(""); setCareer2(""); }}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors">
                      <RotateCcw className="h-3.5 w-3.5" /> Compare different careers
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ROADMAP VIEW ── */}
          {view === "roadmap" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      <Map className="h-5 w-5 text-purple-400" /> Your Career Roadmap
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Your path from today to where you want to be.</p>
                  </div>
                  {roadmap.length > 0 && (
                    <div className="text-right">
                      <div className="text-2xl font-black" style={{ color: "#a855f7" }}>{completedCount}/{roadmap.length}</div>
                      <div className="text-[10px] text-slate-500">milestones done</div>
                    </div>
                  )}
                </div>
                {roadmap.length > 0 && (
                  <div className="rounded-2xl p-4 mb-6" style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.2)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <TrendingUp className="h-4 w-4 text-purple-400" /> Career Direction Confidence
                      </div>
                      <span className="text-sm font-black" style={{ color: "#a855f7" }}>
                        {Math.round((completedCount / Math.max(1, roadmap.length)) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((completedCount / Math.max(1, roadmap.length)) * 100)}%`, background: "linear-gradient(90deg,#7c3aed,#a855f7,#f5a524)" }} />
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2">Click any milestone to mark it complete.</div>
                  </div>
                )}
                <RoadmapTimeline milestones={roadmap} onToggle={toggleMilestone} />
                {roadmap.length > 0 && (
                  <div className="mt-6">
                    <button onClick={startNewSession}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.01]"
                      style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.2)" }}>
                      <Plus className="h-4 w-4" /> New Session to Add More Goals
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PERSONALITY INSIGHTS ── */}
          {view === "personality" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      <Brain className="h-5 w-5 text-pink-400" /> Personality Insights
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">What Dario has learned about you across your sessions.</p>
                  </div>
                  <button onClick={() => void runPersonalityAnalysis()} disabled={isAnalyzing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#ec4899,#a855f7)", color: "white" }}>
                    {isAnalyzing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…</> : <><RefreshCw className="h-3.5 w-3.5" /> {personality ? "Re-analyze" : "Analyze Now"}</>}
                  </button>
                </div>

                {analyzeError && (
                  <div className="rounded-xl p-4 mb-4 flex items-start gap-3"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-400">{analyzeError}</div>
                  </div>
                )}

                {isAnalyzing && (
                  <div className="rounded-2xl p-10 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <Brain className="h-10 w-10 text-pink-400 mx-auto mb-3 animate-pulse" />
                    <div className="text-sm font-bold text-white mb-1">Analyzing your personality…</div>
                    <div className="text-xs text-slate-500">Reading through your conversations with Dario</div>
                  </div>
                )}

                {!personality && !isAnalyzing && !analyzeError && (
                  <div className="rounded-2xl p-10 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                    <Brain className="h-12 w-12 text-slate-700 mx-auto mb-3" />
                    <div className="text-base font-bold text-slate-500 mb-1">No insights yet</div>
                    <div className="text-sm text-slate-600 mb-4">Talk with Dario and end a session to start building your personality profile.</div>
                    <button onClick={() => { setView("chat"); if (sessions.length === 0) void startNewSession(); }}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }}>
                      {sessions.length === 0 ? "Start a Session" : "Analyze My Personality"}
                    </button>
                  </div>
                )}

                {personality && !isAnalyzing && (
                  <div className="space-y-5">
                    {/* Summary card */}
                    <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg,rgba(236,72,153,0.08),rgba(168,85,247,0.08))", border: "1px solid rgba(236,72,153,0.2)" }}>
                      <div className="text-[10px] font-bold text-pink-400 uppercase tracking-wide mb-2">Your Personality Summary</div>
                      <p className="text-sm text-slate-200 leading-relaxed">{personality.summary}</p>
                      <div className="text-[10px] text-slate-600 mt-3">
                        Last analyzed: {shortDate(personality.generatedAt)}
                      </div>
                    </div>

                    {/* Traits */}
                    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="text-sm font-black text-white mb-4 flex items-center gap-2">
                        <Star className="h-4 w-4 text-pink-400" /> Personality Traits
                      </div>
                      <div className="space-y-4">
                        {personality.traits.map(trait => (
                          <div key={trait.name}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-white">{trait.name}</span>
                              <span className="text-xs font-black" style={{ color: "#ec4899" }}>{trait.score}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 mb-1.5 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${trait.score}%`, background: "linear-gradient(90deg,#ec4899,#a855f7)" }} />
                            </div>
                            <div className="text-[11px] text-slate-500">{trait.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Work Style */}
                    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="text-sm font-black text-white mb-2 flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-purple-400" /> Your Work Style
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{personality.workStyle}</p>
                    </div>

                    {/* Learning Style */}
                    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="text-sm font-black text-white mb-2 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-blue-400" /> How You Learn
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{personality.learningStyle}</p>
                    </div>

                    {/* Strengths + Motivators */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="text-xs font-black text-white mb-3 flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-yellow-400" /> Your Strengths
                        </div>
                        <div className="space-y-1.5">
                          {personality.strengths.map(s => (
                            <div key={s} className="flex items-center gap-2">
                              <CheckCircle2 className="h-3 w-3 text-green-400 flex-shrink-0" />
                              <span className="text-xs text-slate-300">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="text-xs font-black text-white mb-3 flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-orange-400" /> What Motivates You
                        </div>
                        <div className="space-y-1.5">
                          {personality.motivators.map(m => (
                            <div key={m} className="flex items-center gap-2">
                              <Star className="h-3 w-3 text-orange-400 flex-shrink-0" />
                              <span className="text-xs text-slate-300">{m}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Career Correlations */}
                    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="text-xs font-black text-white mb-3 flex items-center gap-1.5">
                        <ChevronRight className="h-3.5 w-3.5 text-purple-400" /> Careers That Match Your Personality
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {personality.careerCorrelations.map(c => (
                          <span key={c} className="text-xs px-3 py-1.5 rounded-full font-semibold"
                            style={{ background: "rgba(168,85,247,0.12)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.25)" }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CAREER REPORT ── */}
          {view === "report" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      <FileText className="h-5 w-5 text-cyan-400" /> Career Report
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">A comprehensive summary of your career exploration journey.</p>
                  </div>
                  <button onClick={() => void runCareerReport()} disabled={isGeneratingReport}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#0891b2,#22d3ee)", color: "white" }}>
                    {isGeneratingReport ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</> : <><RefreshCw className="h-3.5 w-3.5" /> {careerReport ? "Refresh Report" : "Generate Report"}</>}
                  </button>
                </div>

                {reportError && (
                  <div className="rounded-xl p-4 mb-4 flex items-start gap-3"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-400">{reportError}</div>
                  </div>
                )}

                {isGeneratingReport && (
                  <div className="rounded-2xl p-10 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <FileText className="h-10 w-10 text-cyan-400 mx-auto mb-3 animate-pulse" />
                    <div className="text-sm font-bold text-white mb-1">Building your career report…</div>
                    <div className="text-xs text-slate-500">Synthesizing your sessions and interests</div>
                  </div>
                )}

                {!careerReport && !isGeneratingReport && !reportError && (
                  <div className="rounded-2xl p-10 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                    <FileText className="h-12 w-12 text-slate-700 mx-auto mb-3" />
                    <div className="text-base font-bold text-slate-500 mb-1">No report yet</div>
                    <div className="text-sm text-slate-600 mb-4">Complete at least one session with Dario to generate your personalized career report.</div>
                    <button onClick={() => { setView("chat"); if (sessions.length === 0) void startNewSession(); }}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }}>
                      {sessions.length === 0 ? "Start a Session" : "Generate My Report"}
                    </button>
                  </div>
                )}

                {careerReport && !isGeneratingReport && (
                  <div className="space-y-5">
                    {/* Headline */}
                    <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg,rgba(8,145,178,0.1),rgba(34,211,238,0.05))", border: "1px solid rgba(34,211,238,0.2)" }}>
                      <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide mb-1">Your Career Profile</div>
                      <div className="text-lg font-black text-white leading-tight mb-2">{careerReport.headline}</div>
                      <p className="text-sm text-slate-300 leading-relaxed">{careerReport.overallSummary}</p>
                      <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-600">
                        <span><span className="font-bold text-white">{careerReport.sessionCount}</span> sessions</span>
                        <span><span className="font-bold text-white">{careerReport.careersExplored?.length ?? 0}</span> careers explored</span>
                        <span>Updated {shortDate(careerReport.generatedAt)}</span>
                      </div>
                    </div>

                    {/* Career Matches */}
                    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="text-sm font-black text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-cyan-400" /> Your Top Career Matches
                      </div>
                      <div className="space-y-4">
                        {careerReport.careerMatches.map((match, i) => (
                          <div key={match.career} className="flex items-start gap-4">
                            <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm"
                              style={{ background: i === 0 ? "linear-gradient(135deg,#f5a524,#ea580c)" : "rgba(255,255,255,0.06)", color: i === 0 ? "#0a1428" : "#94a3b8" }}>
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-sm font-bold text-white">{match.career}</div>
                                <div className="text-sm font-black" style={{ color: match.fit >= 80 ? "#4ade80" : match.fit >= 60 ? "#f5a524" : "#94a3b8" }}>
                                  {match.fit}% fit
                                </div>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/10 mb-1.5 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${match.fit}%`, background: match.fit >= 80 ? "linear-gradient(90deg,#22c55e,#4ade80)" : "linear-gradient(90deg,#f5a524,#fbbf24)" }} />
                              </div>
                              <div className="text-xs text-slate-500">{match.reason}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Strengths + Areas to Explore */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="text-xs font-black text-white mb-3 flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-yellow-400" /> Key Strengths
                        </div>
                        <div className="space-y-1.5">
                          {careerReport.keyStrengths.map(s => (
                            <div key={s} className="flex items-center gap-2">
                              <CheckCircle2 className="h-3 w-3 text-green-400 flex-shrink-0" />
                              <span className="text-xs text-slate-300">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="text-xs font-black text-white mb-3 flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-blue-400" /> Areas to Explore
                        </div>
                        <div className="space-y-1.5">
                          {careerReport.areasToExplore.map(a => (
                            <div key={a} className="flex items-start gap-2">
                              <Circle className="h-3 w-3 text-blue-400 flex-shrink-0 mt-0.5" />
                              <span className="text-xs text-slate-300">{a}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Education Recommendations */}
                    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="text-xs font-black text-white mb-3 flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-purple-400" /> Education Recommendations
                      </div>
                      <div className="space-y-1.5">
                        {careerReport.educationRecommendations.map(r => (
                          <div key={r} className="flex items-start gap-2">
                            <ChevronRight className="h-3.5 w-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                            <span className="text-xs text-slate-300">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Next Steps */}
                    <div className="rounded-2xl p-4" style={{ background: "rgba(245,165,36,0.06)", border: "1px solid rgba(245,165,36,0.2)" }}>
                      <div className="text-xs font-black text-white mb-3 flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-amber-400" /> Recommended Next Steps
                      </div>
                      <div className="space-y-2">
                        {careerReport.nextSteps.map((step, i) => (
                          <div key={step} className="flex items-start gap-3">
                            <div className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                              style={{ background: "rgba(245,165,36,0.15)", color: "#f5a524", border: "1px solid rgba(245,165,36,0.3)" }}>
                              {i + 1}
                            </div>
                            <span className="text-xs text-slate-300 leading-relaxed">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── OPPORTUNITIES ── */}
          {view === "opportunities" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto">
                <div className="mb-5">
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-emerald-400" /> Opportunity Finder
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">Discover local organizations and get AI-drafted outreach emails to kickstart your career exploration.</p>
                </div>

                {/* Warning */}
                <div className="rounded-xl p-4 mb-5 flex items-start gap-3"
                  style={{ background: "rgba(245,165,36,0.06)", border: "1px solid rgba(245,165,36,0.2)" }}>
                  <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200 leading-relaxed">
                    <div className="font-bold mb-1">Before sending any emails, make sure you:</div>
                    <ul className="text-amber-300/80 space-y-0.5">
                      <li>• Review and personalize every email draft</li>
                      <li>• Verify the organization and contact details are real</li>
                      <li>• Get a parent or guardian to review if you're under 18</li>
                      <li>• Only send from organizations you've verified</li>
                    </ul>
                  </div>
                </div>

                {/* Search form */}
                <div className="rounded-2xl p-5 mb-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="text-sm font-black text-white mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-400" /> Find New Opportunities
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Your Location</label>
                      <input value={oppLocation} onChange={e => setOppLocation(e.target.value)}
                        placeholder="e.g. Columbus, Ohio"
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Career Interest</label>
                      <input value={oppCareer} onChange={e => setOppCareer(e.target.value)}
                        placeholder="e.g. Chemical Engineering"
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Opportunity Type</label>
                    <div className="relative">
                      <select value={oppType} onChange={e => setOppType(e.target.value as Opportunity["type"])}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none appearance-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                        <option value="job-shadowing">Job Shadowing</option>
                        <option value="internship">Internship</option>
                        <option value="volunteer">Volunteer</option>
                        <option value="entry-level">Entry-Level Job</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                  <button onClick={() => void searchOpportunities()} disabled={!oppLocation.trim() || !oppCareer.trim() || isSearchingOpps}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.01] disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg,#059669,#22d3ee)", color: "white" }}>
                    {isSearchingOpps ? <><Loader2 className="h-4 w-4 animate-spin" /> Finding Opportunities…</> : <><MapPin className="h-4 w-4" /> AI Find Opportunities</>}
                  </button>
                  {userEmail && <div className="text-[10px] text-slate-600 mt-2 text-center">Emails will reference your account: {userEmail}</div>}
                </div>

                {oppError && (
                  <div className="rounded-xl p-4 mb-4 flex items-start gap-3"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-400">{oppError}</div>
                  </div>
                )}

                {/* Results */}
                {opportunities.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">
                      {opportunities.length} opportunit{opportunities.length !== 1 ? "ies" : "y"} found
                    </div>
                    {opportunities.map(opp => (
                      <div key={opp.id} className="rounded-2xl overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <button
                          className="w-full flex items-start gap-4 p-4 text-left hover:bg-white/5 transition-colors"
                          onClick={() => setExpandedOpp(expandedOpp === opp.id ? null : opp.id)}>
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                            <Briefcase className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-black text-white">{opp.orgName}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
                                {OPPORTUNITY_LABELS[opp.type]}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                              <MapPin className="h-3 w-3" /> {opp.location}
                              <span>·</span>
                              <Briefcase className="h-3 w-3" /> {opp.careerField}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 leading-relaxed">{opp.description}</div>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-slate-500 flex-shrink-0 transition-transform ${expandedOpp === opp.id ? "rotate-180" : ""}`} />
                        </button>

                        {expandedOpp === opp.id && (
                          <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            {/* Contact info */}
                            <div className="mt-3 p-3 rounded-xl flex items-start gap-3"
                              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                              <Users className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="text-xs font-bold text-white">{opp.contactName}</div>
                                <div className="text-[11px] text-slate-500">{opp.contactTitle}</div>
                                <div className="text-[11px] text-blue-400 mt-0.5">{opp.contactEmail}</div>
                              </div>
                            </div>

                            {/* Email draft */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                  <Mail className="h-3.5 w-3.5 text-blue-400" /> AI-Drafted Email
                                </div>
                                <a
                                  href={`mailto:${opp.contactEmail}?subject=${encodeURIComponent(opp.emailSubject)}&body=${encodeURIComponent(opp.emailDraft.replace("[Student Name]", userName).replace("[Student Email]", userEmail))}`}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-[1.02]"
                                  style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white" }}>
                                  <ExternalLink className="h-3 w-3" /> Open in Email
                                </a>
                              </div>
                              <div className="rounded-xl p-3 text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap"
                                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                <div className="font-bold text-slate-400 mb-1 not-italic font-sans">Subject: {opp.emailSubject}</div>
                                {opp.emailDraft.replace("[Student Name]", userName).replace("[Student Email]", userEmail)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {opportunities.length === 0 && !isSearchingOpps && (
                  <div className="rounded-2xl p-10 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                    <MapPin className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                    <div className="text-base font-bold text-slate-600">No opportunities yet</div>
                    <div className="text-sm text-slate-700 mt-1">Enter your location and career interest above to find organizations.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ACTION ITEMS ── */}
          {view === "action-items" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      <ListChecks className="h-5 w-5 text-amber-400" /> Action Items
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Concrete next steps to kickstart your career journey.</p>
                  </div>
                  <button onClick={() => void generateActionItems()} disabled={isGeneratingActions}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#d97706,#f5a524)", color: "#0a1428" }}>
                    {isGeneratingActions ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</> : <><RefreshCw className="h-3.5 w-3.5" /> {actionItems.length > 0 ? "Refresh" : "Generate"} Action Items</>}
                  </button>
                </div>

                {actionError && (
                  <div className="rounded-xl p-4 mb-4 flex items-start gap-3"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-400">{actionError}</div>
                  </div>
                )}

                {/* Progress bar */}
                {actionItems.length > 0 && (
                  <div className="rounded-2xl p-4 mb-5" style={{ background: "rgba(245,165,36,0.07)", border: "1px solid rgba(245,165,36,0.2)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <Target className="h-4 w-4 text-amber-400" /> Progress
                      </div>
                      <span className="text-sm font-black text-amber-400">{completedActions}/{actionItems.length} done</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((completedActions / Math.max(1, actionItems.length)) * 100)}%`, background: "linear-gradient(90deg,#d97706,#f5a524)" }} />
                    </div>
                  </div>
                )}

                {isGeneratingActions && (
                  <div className="rounded-2xl p-10 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <ListChecks className="h-10 w-10 text-amber-400 mx-auto mb-3 animate-pulse" />
                    <div className="text-sm font-bold text-white mb-1">Creating your action plan…</div>
                    <div className="text-xs text-slate-500">Building tasks based on your career sessions</div>
                  </div>
                )}

                {!isGeneratingActions && actionItems.length === 0 && (
                  <div className="rounded-2xl p-10 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                    <ListChecks className="h-12 w-12 text-slate-700 mx-auto mb-3" />
                    <div className="text-base font-bold text-slate-500 mb-1">No action items yet</div>
                    <div className="text-sm text-slate-600 mb-4">Complete at least one session with Dario, then generate your personalized action plan.</div>
                    <button onClick={() => { setView("chat"); if (sessions.length === 0) void startNewSession(); }}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }}>
                      {sessions.length === 0 ? "Start a Session" : "Generate Action Items"}
                    </button>
                  </div>
                )}

                {/* Category groups */}
                {!isGeneratingActions && actionItems.length > 0 && (
                  <div className="space-y-3">
                    {(["research", "experience", "skills", "network", "apply"] as ActionItem["category"][]).map(cat => {
                      const catItems = actionItems.filter(a => a.category === cat);
                      if (catItems.length === 0) return null;
                      const color = ACTION_CAT_COLORS[cat];
                      const icon = ACTION_CAT_ICONS[cat];
                      const catDone = catItems.filter(a => a.completed).length;
                      return (
                        <div key={cat} className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <span className="text-base">{icon}</span>
                            <span className="text-xs font-black text-white capitalize">{cat}</span>
                            <span className="text-[10px] font-bold ml-auto" style={{ color }}>
                              {catDone}/{catItems.length}
                            </span>
                          </div>
                          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                            {catItems.map(item => (
                              <div key={item.id}
                                className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors group"
                                onClick={() => toggleActionItem(item.id)}>
                                <div className="mt-0.5 flex-shrink-0">
                                  {item.completed
                                    ? <CheckCircle2 className="h-4 w-4" style={{ color }} />
                                    : <Circle className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-bold leading-tight"
                                    style={{ color: item.completed ? color : "white", textDecoration: item.completed ? "line-through" : "none", opacity: item.completed ? 0.7 : 1 }}>
                                    {item.title}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.description}</div>
                                  {item.dueDate && !item.completed && (
                                    <div className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
                                      <Clock className="h-2.5 w-2.5" /> Due {shortDate(item.dueDate)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── Contact Exchange Warning Modal ── */}
      {contactWarning && (
        <ContactWarningModal
          types={contactWarning.types}
          onSendAnyway={() => {
            const text = contactWarning.text;
            setContactWarning(null);
            setInputText("");
            void doSend(text);
            void fetch("/api/safety/contact-exchange-ack", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ studentId: getProfile()?.learnerId, message: text, sentAnyway: true }),
            }).catch(() => { /* noop */ });
          }}
          onEdit={() => setContactWarning(null)}
          onCancel={() => { setContactWarning(null); setInputText(""); }}
        />
      )}
    </div>
  );
}
