import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Mic, Radio, ChevronLeft, Home, User, LogOut, Search,
  Play, Bell, BellOff, Calendar, Clock, Users, ArrowRight,
  ChevronLeft as CalLeft, ChevronRight as CalRight, ExternalLink,
  Video, Star, Filter,
} from "lucide-react";
import {
  EXPERT_TALKS, UPCOMING_LIVESTREAMS, getReminders, toggleReminder,
  type ExpertTalk, type UpcomingLivestream,
} from "@/lib/talksData";
import { FEED_CATEGORIES, type FeedCategory } from "@/lib/feedArticles";
import { PLAYLIST_CATEGORY_COLORS } from "@/lib/videoData";
import { getAuthUser, signOut } from "@/lib/auth";
import { getProfile, AVATAR_PRESETS } from "@/lib/profile";

const BASE = import.meta.env.BASE_URL ?? "/";

function ytThumb(id: string) { return `https://img.youtube.com/vi/${id}/hqdefault.jpg`; }

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    shortDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" }),
    dayOfMonth: d.getDate(),
    month: d.getMonth(),
    year: d.getFullYear(),
  };
}

function countdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Starting now";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${mins}m`;
  return `in ${mins}m`;
}

/* ─── Talk Card (recorded) ─── */
function TalkCard({ talk, onPlay }: { talk: ExpertTalk; onPlay: () => void }) {
  const [imgError, setImgError] = useState(false);
  const color = PLAYLIST_CATEGORY_COLORS[talk.category];
  const cat = FEED_CATEGORIES.find(c => c.id === talk.category);
  return (
    <button onClick={onPlay} className="group text-left rounded-2xl overflow-hidden transition-all hover:scale-[1.02]"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="relative aspect-video bg-slate-900 overflow-hidden">
        {!imgError ? (
          <img src={ytThumb(talk.youtubeId)} alt={talk.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl"
            style={{ background: `linear-gradient(135deg, ${color}20, ${color}08)` }}>
            {cat?.emoji}
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="h-14 w-14 rounded-full flex items-center justify-center"
            style={{ background: "rgba(245,165,36,0.92)" }}>
            <Play className="h-6 w-6 text-black fill-black ml-0.5" />
          </div>
        </div>
        <div className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-bold"
          style={{ background: `${color}cc`, color: "#0a1428" }}>
          {cat?.emoji} {cat?.label}
        </div>
        <div className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded font-bold"
          style={{ background: "rgba(0,0,0,0.8)", color: "white" }}>
          {talk.duration}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-sm font-black text-white leading-snug mb-2">{talk.title}</h3>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: `${color}20`, color }}>
            {talk.speaker[0]}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-300 truncate">{talk.speaker}</div>
            <div className="text-[10px] text-slate-500 truncate">{talk.speakerTitle} · {talk.organization}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-600">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{talk.duration}</span>
          {talk.views && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{talk.views.toLocaleString()} views</span>}
        </div>
      </div>
    </button>
  );
}

/* ─── Livestream Card ─── */
function LivestreamCard({ ls, hasReminder, onToggleReminder }: {
  ls: UpcomingLivestream; hasReminder: boolean; onToggleReminder: () => void;
}) {
  const color = PLAYLIST_CATEGORY_COLORS[ls.category];
  const cat = FEED_CATEGORIES.find(c => c.id === ls.category);
  const dt = formatDateTime(ls.scheduledAt);
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}25` }}>
      {/* color accent */}
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold"
              style={{ background: `${color}20`, color }}>
              {cat?.emoji} {cat?.label}
            </span>
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold"
              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
              <Radio className="h-2.5 w-2.5 inline mr-1 animate-pulse" />
              LIVE {countdown(ls.scheduledAt)}
            </span>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-2xl font-black" style={{ color }}>{dt.dayOfMonth}</div>
            <div className="text-[10px] text-slate-500 -mt-0.5">{new Date(ls.scheduledAt).toLocaleString("en-US", { month: "short" })}</div>
          </div>
        </div>

        <h3 className="text-base font-black text-white leading-snug mb-2">{ls.title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-3">{ls.description}</p>

        <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
            style={{ background: `${color}20`, color }}>
            {ls.host[0]}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">{ls.host}</div>
            <div className="text-[10px] text-slate-500">{ls.hostTitle} · {ls.organization}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-4">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{dt.date}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{dt.time}</span>
          <span>·</span>
          <span>{ls.durationEstimate}</span>
          {ls.maxAttendees && <><span>·</span><span><Users className="h-3 w-3 inline mr-1" />Up to {ls.maxAttendees.toLocaleString()}</span></>}
        </div>

        {/* Zoom meeting info */}
        {(ls.zoomLink || ls.zoomPassword) && (
          <div className="mb-4 p-3 rounded-xl" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Video className="h-3 w-3" /> Zoom Meeting Info
            </div>
            <div className="space-y-1.5">
              {ls.zoomLink && (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-slate-500 font-bold w-14 mt-0.5 flex-shrink-0">Link:</span>
                  <a href={ls.zoomLink} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-blue-400 hover:underline break-all leading-tight">
                    {ls.zoomLink}
                  </a>
                </div>
              )}
              {ls.zoomPassword && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-bold w-14 flex-shrink-0">Password:</span>
                  <span className="text-[11px] font-mono font-black" style={{ color: "#f5a524" }}>{ls.zoomPassword}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onToggleReminder}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
            style={hasReminder
              ? { background: `${color}20`, color, border: `1px solid ${color}40` }
              : { background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>
            {hasReminder ? <><BellOff className="h-3.5 w-3.5" /> Remove Reminder</> : <><Bell className="h-3.5 w-3.5" /> Set Reminder</>}
          </button>
          {ls.joinUrl && (
            <a href={ls.joinUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, color: "#0a1428" }}>
              <ExternalLink className="h-3.5 w-3.5" /> Join
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Mini Calendar ─── */
function MiniCalendar({ livestreams }: { livestreams: UpcomingLivestream[] }) {
  const [viewDate, setViewDate] = useState(new Date());
  const streamDays = useMemo(() => new Set(
    livestreams.map(l => {
      const d = new Date(l.scheduledAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  ), [livestreams]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const monthName = viewDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-2xl p-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400">
          <CalLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold text-white">{monthName}</span>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400">
          <CalRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d} className="text-[10px] font-bold text-slate-600 text-center py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const key = `${year}-${month}-${day}`;
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const hasStream = streamDays.has(key);
          return (
            <div key={i}
              className="aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-bold relative"
              style={isToday
                ? { background: "#f5a524", color: "#0a1428" }
                : hasStream
                  ? { background: "rgba(239,68,68,0.15)", color: "#ef4444" }
                  : { color: "#64748b" }}>
              {day}
              {hasStream && !isToday && (
                <div className="absolute bottom-0.5 h-1 w-1 rounded-full bg-red-500" />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ background: "#f5a524" }} /> Today
        </span>
        <span className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-red-500" /> Live event
        </span>
      </div>
    </div>
  );
}

/* ─── Talk Player Modal ─── */
function TalkPlayer({ talk, onClose }: { talk: ExpertTalk; onClose: () => void }) {
  const color = PLAYLIST_CATEGORY_COLORS[talk.category];
  const cat = FEED_CATEGORIES.find(c => c.id === talk.category);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-3xl rounded-2xl overflow-hidden"
        style={{ background: "#0d1f3c", border: `1px solid ${color}30` }}>
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${talk.youtubeId}?autoplay=1&rel=0`}
            title={talk.title} className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen />
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${color}20`, color }}>
                {cat?.emoji} {cat?.label}
              </span>
              <h3 className="text-base font-black text-white mt-2 leading-snug">{talk.title}</h3>
              <div className="text-sm text-slate-400 mt-1">{talk.speaker} · {talk.organization}</div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{talk.description}</p>
            </div>
            <button onClick={onClose}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              ✕ Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
export default function TalksPage() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"talks" | "live">("talks");
  const [activeCategory, setActiveCategory] = useState<FeedCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [activeTalk, setActiveTalk] = useState<ExpertTalk | null>(null);
  const [reminders, setReminders] = useState(() => getReminders());

  const authUser = getAuthUser();
  const profile = getProfile();
  const currentAvatar = AVATAR_PRESETS.find(a => a.id === profile?.avatarId) ?? AVATAR_PRESETS[0];
  const displayName = profile?.name ?? authUser?.name ?? "Explorer";

  const filteredTalks = useMemo(() => {
    let list = EXPERT_TALKS;
    if (activeCategory !== "all") list = list.filter(t => t.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.speaker.toLowerCase().includes(q) ||
        t.organization.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCategory, search]);

  const handleReminderToggle = (id: string) => {
    const updated = toggleReminder(id);
    setReminders(updated);
    const isNowSet = updated.includes(id);
    if (isNowSet) {
      const stream = UPCOMING_LIVESTREAMS.filter(l => l.status !== "ended").find(l => l.id === id);
      const userEmail = authUser?.email ?? profile?.email ?? "";
      if (stream && userEmail) {
        const d = new Date(stream.scheduledAt);
        const dateStr = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
        const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
        const subject = encodeURIComponent(`Reminder: ${stream.title}`);
        const body = encodeURIComponent(
          `Hi,\n\nThis is your reminder for the upcoming 1WayMirror live session:\n\n` +
          `📅 ${stream.title}\n` +
          `🗓️ ${dateStr} at ${timeStr}\n` +
          `⏱️ Duration: ${stream.durationEstimate}\n` +
          `👤 Host: ${stream.host} — ${stream.organization}\n\n` +
          `${stream.zoomLink ? `🔗 Zoom Link: ${stream.zoomLink}\n${stream.zoomPassword ? `🔑 Password: ${stream.zoomPassword}\n` : ""}` : ""}` +
          `\nLog in to 1WayMirror to join: https://1waymirror.world\n\nSee you there!`
        );
        window.open(`mailto:${userEmail}?subject=${subject}&body=${body}`, "_blank");
      }
    }
  };

  const handleSignOut = () => { signOut(); navigate("/login"); };
  const upcomingLive = UPCOMING_LIVESTREAMS.filter(l => l.status !== "ended");
  const myReminders = upcomingLive.filter(l => reminders.includes(l.id));

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at top, #0d1f3c 0%, #0a1428 60%)" }}>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40"
        style={{ background: "rgba(10,20,40,0.97)", borderBottom: "1px solid rgba(245,165,36,0.15)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/">
            <img src={`${BASE}logo.png`} alt="1WayMirror" className="h-9 w-auto object-contain cursor-pointer"
              style={{ filter: "drop-shadow(0 0 8px rgba(245,165,36,0.3))" }} />
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <Mic className="h-4 w-4" style={{ color: "#f5a524" }} />
            <span className="font-black text-white text-sm">Expert Talks</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-base">{currentAvatar.emoji}</div>
              <span className="text-xs font-semibold text-slate-300">{displayName}</span>
            </div>
            <Link href="/replitopolis">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:bg-white/10"
                style={{ border: "1px solid rgba(245,165,36,0.3)", color: "#f5a524" }}>
                <Home className="h-3.5 w-3.5" /><span className="hidden sm:inline">Dashboard</span>
              </button>
            </Link>
            <Link href="/my-profile">
              <button className="p-2 rounded-xl text-slate-400 hover:bg-white/10 transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                <User className="h-3.5 w-3.5" />
              </button>
            </Link>
            <button onClick={handleSignOut}
              className="p-2 rounded-xl text-slate-500 hover:text-red-400 transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* ── HERO ── */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-5">
            <div>
              <h1 className="text-3xl font-black text-white">Expert Talks</h1>
              <p className="text-slate-400 text-sm mt-1">
                Learn from industry professionals and academic experts through recorded talks and live sessions.
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-3 sm:ml-auto">
              <div className="text-center">
                <div className="text-xl font-black text-white">{EXPERT_TALKS.length}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide">Talks</div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-center">
                <div className="text-xl font-black" style={{ color: "#ef4444" }}>{upcomingLive.length}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide">Upcoming</div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-center">
                <div className="text-xl font-black" style={{ color: "#f5a524" }}>{reminders.length}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide">Reminders</div>
              </div>
            </div>
          </div>

          {/* mode toggle */}
          <div className="flex gap-2 p-1 rounded-2xl w-fit"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <button onClick={() => setMode("talks")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={mode === "talks"
                ? { background: "linear-gradient(135deg, #f5a524, #ea580c)", color: "#0a1428" }
                : { color: "#94a3b8" }}>
              <Mic className="h-4 w-4" /> Recorded Talks
            </button>
            <button onClick={() => setMode("live")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={mode === "live"
                ? { background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "white" }
                : { color: "#94a3b8" }}>
              <Radio className="h-4 w-4" />
              Upcoming Livestreams
              {upcomingLive.length > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                  style={mode === "live" ? { background: "rgba(255,255,255,0.25)" } : { background: "rgba(239,68,68,0.3)", color: "#ef4444" }}>
                  {upcomingLive.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── RECORDED TALKS ── */}
        {mode === "talks" && (
          <>
            {/* search + category */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <input type="text" placeholder="Search speakers, topics, organizations…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  onFocus={e => e.target.style.borderColor = "rgba(245,165,36,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
              {[{ id: "all", label: "All Topics", emoji: "🎤" }, ...FEED_CATEGORIES.map(c => ({ id: c.id, label: c.label, emoji: c.emoji }))].map(f => {
                const color = f.id === "all" ? "#1d4ed8" : PLAYLIST_CATEGORY_COLORS[f.id as FeedCategory] ?? "#f5a524";
                const active = activeCategory === f.id;
                return (
                  <button key={f.id} onClick={() => setActiveCategory(f.id as typeof activeCategory)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
                    style={active
                      ? { background: color, color: "#0a1428", boxShadow: `0 0 12px ${color}50` }
                      : { background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {f.emoji} {f.label}
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-slate-500 mb-4 flex items-center gap-2">
              <Video className="h-3.5 w-3.5" />
              {filteredTalks.length} talk{filteredTalks.length !== 1 ? "s" : ""}
            </div>

            {filteredTalks.length === 0 ? (
              <div className="rounded-2xl p-16 text-center"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-4xl mb-3">🎤</div>
                <div className="text-lg font-bold text-white">No talks found</div>
                <button onClick={() => { setActiveCategory("all"); setSearch(""); }}
                  className="mt-4 px-5 py-2 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #f5a524, #ea580c)" }}>
                  View all talks
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTalks.map(t => (
                  <TalkCard key={t.id} talk={t} onPlay={() => setActiveTalk(t)} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── LIVESTREAMS ── */}
        {mode === "live" && (
          <div className="flex flex-col lg:flex-row gap-5">
            {/* left: streams list */}
            <div className="flex-1 min-w-0">
              {/* my reminders strip */}
              {myReminders.length > 0 && (
                <div className="mb-5 p-4 rounded-2xl"
                  style={{ background: "rgba(245,165,36,0.07)", border: "1px solid rgba(245,165,36,0.2)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="h-4 w-4" style={{ color: "#f5a524" }} />
                    <span className="text-sm font-black text-white">My Reminders ({myReminders.length})</span>
                  </div>
                  <div className="space-y-2">
                    {myReminders.map(ls => {
                      const dt = formatDateTime(ls.scheduledAt);
                      const color = PLAYLIST_CATEGORY_COLORS[ls.category];
                      const cat = FEED_CATEGORIES.find(c => c.id === ls.category);
                      return (
                        <div key={ls.id} className="flex items-center gap-3 p-2.5 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <span style={{ color }}>{cat?.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white truncate">{ls.title}</div>
                            <div className="text-[10px] text-slate-500">{dt.date} · {dt.time}</div>
                          </div>
                          <span className="text-[10px] font-bold flex-shrink-0" style={{ color: "#ef4444" }}>
                            {countdown(ls.scheduledAt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {upcomingLive.length === 0 ? (
                  <div className="rounded-2xl p-16 text-center"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-4xl mb-3">📡</div>
                    <div className="text-lg font-bold text-white">No upcoming livestreams</div>
                    <div className="text-sm text-slate-500 mt-1">Check back soon — the admin team schedules new sessions weekly.</div>
                  </div>
                ) : (
                  upcomingLive.map(ls => (
                    <LivestreamCard key={ls.id} ls={ls}
                      hasReminder={reminders.includes(ls.id)}
                      onToggleReminder={() => handleReminderToggle(ls.id)} />
                  ))
                )}
              </div>
            </div>

            {/* right: calendar + reminder summary */}
            <div className="lg:w-72 flex-shrink-0 space-y-4">
              <MiniCalendar livestreams={upcomingLive} />

              <div className="rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="h-4 w-4" style={{ color: "#f5a524" }} />
                  <span className="text-sm font-bold text-white">Reminders</span>
                </div>
                {reminders.length === 0 ? (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Set reminders on sessions you don't want to miss. They'll appear here.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {upcomingLive.filter(l => reminders.includes(l.id)).map(l => (
                      <div key={l.id} className="flex items-center gap-2 text-xs">
                        <div className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                        <span className="text-slate-400 truncate flex-1">{l.title}</span>
                        <span className="text-[10px] font-bold flex-shrink-0" style={{ color: "#f5a524" }}>
                          {countdown(l.scheduledAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-sm font-bold text-white mb-2">About Livestreams</div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  All livestreams are curated by the 1WayMirror admin team. Sessions feature real professionals from each career category answering your questions live.
                  Set reminders to receive an in-app notification before each session starts.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* back to dashboard */}
        <div className="mt-10 mb-6">
          <Link href="/replitopolis">
            <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black transition-all hover:scale-[1.01]"
              style={{ background: "linear-gradient(135deg, rgba(245,165,36,0.1), rgba(234,88,12,0.06))", border: "1px solid rgba(245,165,36,0.25)", color: "#f5a524" }}>
              <Home className="h-4 w-4" /> Return to Dashboard <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </div>

      {/* ── TALK PLAYER MODAL ── */}
      {activeTalk && <TalkPlayer talk={activeTalk} onClose={() => setActiveTalk(null)} />}
    </div>
  );
}
