import { useState, useMemo, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Home, Map as MapIcon, PlayCircle, Trophy, Settings, BookOpen,
  Zap, Flame, Users, Bell, ArrowRight, CheckCircle2, XCircle,
  Star, Lock, Wrench, Briefcase, Stethoscope, HardHat, Cpu, Scale,
  BarChart2, Clock, Target, FlaskConical, Lightbulb, User, Rss, Film, Mic,
  Radio, Shield, MessageSquare, Palette, type LucideIcon,
} from "lucide-react";
import { loadSessions, loadRoadmap } from "@/lib/darioData";
import { FEED_ARTICLES, FEED_CATEGORIES } from "@/lib/feedArticles";
import { VIDEO_PLAYLISTS } from "@/lib/videoData";
import { UPCOMING_LIVESTREAMS, EXPERT_TALKS } from "@/lib/talksData";
import { useGetProgress, useGetRecentMissions, useListSimulations } from "@workspace/api-client-react";
import { getLearnerId } from "@/lib/learner";
import { getProfile, getSubscriptionPlan, saveSubscriptionPlan, PLAN_LABELS, PLAN_PRICES, PLAN_COLORS, PLAN_DARIO_CREDITS, AVATAR_PRESETS, type SubscriptionPlan } from "@/lib/profile";
import DashboardChat from "@/components/DashboardChat";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CityMiniMap } from "@/components/replitopolis/CityMiniMap";
import { ALL_BADGES, LEVEL_BADGES, ACHIEVEMENT_BADGES, computeEarnedBadgeIds } from "@/lib/badges";

const BASE = import.meta.env.BASE_URL ?? "/";

type Tab = "home" | "city" | "simulations" | "badges" | "journal" | "settings" | "feed" | "videos" | "talks" | "dario";

const NAV: { tab: Tab; icon: LucideIcon; label: string }[] = [
  { tab: "home",        icon: Home,           label: "Home" },
  { tab: "city",        icon: MapIcon,        label: "City" },
  { tab: "simulations", icon: PlayCircle,     label: "Simulations" },
  { tab: "badges",      icon: Trophy,         label: "Badges" },
  { tab: "feed",        icon: Rss,            label: "Feed" },
  { tab: "videos",      icon: Film,           label: "Videos" },
  { tab: "talks",       icon: Mic,            label: "Talks" },
  { tab: "dario",       icon: MessageSquare,  label: "Dario" },
  { tab: "journal",     icon: BookOpen,       label: "Journal" },
  { tab: "settings",    icon: Settings,       label: "Settings" },
];

type Category = "engineering" | "business" | "healthcare" | "trades" | "technology" | "law" | "science" | "life-advice" | "creative-design";
const CAT_META: Record<Category, { label: string; icon: LucideIcon; color: string }> = {
  engineering:      { label: "Engineering",          icon: Wrench,        color: "#f5a524" },
  business:         { label: "Business",             icon: Briefcase,     color: "#f97316" },
  healthcare:       { label: "Healthcare",           icon: Stethoscope,   color: "#ec4899" },
  trades:           { label: "Trades",               icon: HardHat,       color: "#eab308" },
  technology:       { label: "Technology",           icon: Cpu,           color: "#3b82f6" },
  law:              { label: "Law",                  icon: Scale,         color: "#a855f7" },
  science:          { label: "Science & Research",   icon: FlaskConical,  color: "#22d3ee" },
  "life-advice":    { label: "Life & Career Advice", icon: Lightbulb,     color: "#4ade80" },
  "creative-design":{ label: "Creative & Design",    icon: Palette,       color: "#e879f9" },
};

const ALL_CATS: Category[] = ["engineering", "business", "healthcare", "trades", "technology", "law", "science", "life-advice", "creative-design"];


export default function DashboardPage() {
  const learnerId = getLearnerId();
  const [, navigate] = useLocation();
  const { data: progress } = useGetProgress({ learnerId });
  const { data: recent } = useGetRecentMissions({ learnerId });
  const { data: simulations, isLoading: simsLoading } = useListSimulations();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [visitedDistricts] = useState<Set<string>>(new Set());
  const [plan, setPlan] = useState<SubscriptionPlan>(() => getSubscriptionPlan());
  const [onlineCount, setOnlineCount] = useState(1);
  const handleOnlineCount = useCallback((n: number) => setOnlineCount(n), []);

  const profile = getProfile();
  const myName = profile?.name ?? "Explorer";
  const myAvatar = AVATAR_PRESETS.find(a => a.id === profile?.avatarId) ?? AVATAR_PRESETS[0];
  const myEmoji = myAvatar.emoji;

  const xpPct = progress
    ? Math.min(100, Math.round(((progress.totalXp - (progress.level - 1) * 250) / 250) * 100))
    : 0;

  const categoriesTried = useMemo(() => {
    const set = new Set<string>();
    if (recent) recent.forEach(m => { if (m.category) set.add(m.category); });
    if (progress?.categoryProgress) progress.categoryProgress.forEach(c => { if (c.attempted > 0) set.add(c.category); });
    return set;
  }, [recent, progress]);

  const earnedBadgeIds = useMemo(() => {
    let darioXp = 0, darioSessions = 0, darioRoadmapGenerated = false, darioCompareUsed = false;
    try {
      darioXp = parseInt(localStorage.getItem("1waymirror_dario_xp_v1") ?? "0", 10);
      darioSessions = (JSON.parse(localStorage.getItem("1waymirror_dario_sessions_v1") ?? "[]") as unknown[]).length;
      darioRoadmapGenerated = (JSON.parse(localStorage.getItem("1waymirror_career_roadmap_v1") ?? "[]") as unknown[]).length > 0;
      darioCompareUsed = !!localStorage.getItem("1waymirror_dario_compare_used_v1");
    } catch { /* noop */ }
    return computeEarnedBadgeIds({
      totalXp: progress?.totalXp ?? 0,
      level: progress?.level ?? 1,
      streak: progress?.streak ?? 0,
      missionsCompleted: progress?.missionsCompleted ?? 0,
      categoriesTried,
      darioXp, darioSessions, darioRoadmapGenerated, darioCompareUsed,
    });
  }, [progress, categoriesTried]);

  const grouped = useMemo(() => {
    const map = new Map<Category, typeof simulations>();
    if (!simulations) return map;
    for (const sim of simulations) {
      const cat = sim.category as Category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(sim);
    }
    return map;
  }, [simulations]);

  const handleTabClick = (tab: Tab) => {
    if (tab === "city")   { navigate("/city");   return; }
    if (tab === "feed")   { navigate("/feed");   return; }
    if (tab === "videos") { navigate("/videos"); return; }
    if (tab === "talks")  { navigate("/talks");  return; }
    if (tab === "dario")  { navigate("/dario");  return; }
    setActiveTab(tab);
  };

  /* ── Dario data ── */
  const darioSessions = loadSessions();
  const darioRoadmap  = loadRoadmap();
  const darioSessionCount  = darioSessions.length;
  const darioCompletedGoals = darioRoadmap.filter(m => m.completed).length;
  const lastSession = darioSessions[0];

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "radial-gradient(ellipse at top, #0d1f3c 0%, #0a1428 60%)" }}>

      {/* ── Top Bar ── */}
      <header className="flex-shrink-0 h-14 flex items-center px-4 sm:px-6 gap-3 z-30"
        style={{ background: "rgba(10,20,40,0.97)", borderBottom: "1px solid rgba(245,165,36,0.2)", backdropFilter: "blur(12px)" }}>
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <img src={`${BASE}logo.png`} alt="1WayMirror" className="h-9 w-auto object-contain" />
          <div>
            <div className="text-sm font-black text-white leading-none">Dashboard</div>
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">1WayMirror</div>
          </div>
        </Link>

        <div className="flex items-center gap-2 ml-2">
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 flex-shrink-0"
            style={{ background: "#1e3a8a", borderColor: "#f5a524" }}>
            {learnerId.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <div className="text-xs text-white font-semibold">Level {progress?.level ?? 1} · Explorer</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${xpPct}%`, background: "linear-gradient(90deg, #f5a524, #ea580c)" }} />
              </div>
              <span className="text-[10px] text-slate-400">{progress?.totalXp ?? 0} XP</span>
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
            style={{ background: "rgba(245,165,36,0.15)", border: "1px solid rgba(245,165,36,0.3)" }}>
            <span className="text-gold font-bold">{progress?.totalXp ?? 0} XP</span>
          </div>
          <button className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── Scrollable Content ── */}
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 pb-24">

          {/* HOME TAB */}
          {activeTab === "home" && (
            <div className="space-y-6">

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: <Zap className="h-5 w-5 text-gold" />,          label: "Level",    value: progress?.level ?? 1 },
                  { icon: <Trophy className="h-5 w-5 text-gold" />,        label: "Total XP", value: progress?.totalXp ?? 0 },
                  { icon: <Flame className="h-5 w-5 text-orange-400" />,   label: "Streak",   value: `${progress?.streak ?? 0} days` },
                  { icon: <Target className="h-5 w-5 text-emerald-400" />, label: "Accuracy", value: `${Math.round((progress?.accuracy ?? 0) * 100)}%` },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl p-4 flex items-center gap-3"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {s.icon}
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</div>
                      <div className="text-lg font-black text-white tabular-nums">{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* XP progress */}
              <div className="rounded-2xl p-5" style={{ background: "rgba(245,165,36,0.07)", border: "1px solid rgba(245,165,36,0.2)" }}>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-bold text-white">Progress to Level {(progress?.level ?? 1) + 1}</div>
                  <div className="text-xs text-gold font-semibold">{progress?.totalXp ?? 0} / {progress?.nextLevelXp ?? 250} XP</div>
                </div>
                <Progress value={xpPct} className="h-3 bg-white/10" />
                <div className="text-[11px] text-slate-400 mt-2">{Math.max(0, (progress?.nextLevelXp ?? 250) - (progress?.totalXp ?? 0))} XP until next level</div>
              </div>

              {/* Two column: map + quick actions */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* City map */}
                <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0d1f3c, #0a1428)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapIcon className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-bold text-white">District Map</span>
                    </div>
                    <Link href="/city">
                      <span className="text-[11px] text-gold hover:text-orange-400 transition-colors cursor-pointer">Enter World →</span>
                    </Link>
                  </div>
                  <div className="p-4 flex flex-col items-center gap-2">
                    <CityMiniMap visitedDistricts={visitedDistricts} onZoneClick={() => {}} />
                    <div className="text-[10px] text-slate-500 text-center">9 districts · click to enter 1WayMirror</div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="space-y-3">
                  <Link href="/city">
                    <div className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:scale-[1.02] transition-transform"
                      style={{ background: "linear-gradient(135deg, #1e3a8a, #0a1428)", border: "1px solid #3b82f6", boxShadow: "0 0 20px rgba(59,130,246,0.15)" }}>
                      <span className="text-3xl">🌐</span>
                      <div>
                        <div className="text-sm font-bold text-white">Enter 1WayMirror</div>
                        <div className="text-[11px] text-blue-400">Walk around the 3D career city</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-blue-400 ml-auto" />
                    </div>
                  </Link>
                  <div className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:scale-[1.02] transition-transform"
                    style={{ background: "linear-gradient(135deg, #111827, #0a1428)", border: "1px solid rgba(245,165,36,0.3)" }}
                    onClick={() => setActiveTab("simulations")}>
                    <span className="text-3xl">🎮</span>
                    <div>
                      <div className="text-sm font-bold text-white">Start a Simulation</div>
                      <div className="text-[11px] text-slate-400">75+ career missions available</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gold ml-auto" />
                  </div>
                  <div className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:scale-[1.02] transition-transform"
                    style={{ background: "linear-gradient(135deg, #111827, #0a1428)", border: "1px solid rgba(139,92,246,0.3)" }}
                    onClick={() => setActiveTab("badges")}>
                    <span className="text-3xl">🏅</span>
                    <div>
                      <div className="text-sm font-bold text-white">Career Badges</div>
                      <div className="text-[11px] text-slate-400">{earnedBadgeIds.size} / {ALL_BADGES.length} earned</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-purple-400 ml-auto" />
                  </div>
                </div>
              </div>

              {/* ── Content Hub: Feed + Videos + Talks ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                {/* Career Feed preview */}
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,165,36,0.18)" }}>
                  <div className="px-4 py-3 flex items-center justify-between"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-2">
                      <Rss className="h-4 w-4 text-gold" />
                      <span className="text-sm font-bold text-white">Career Feed</span>
                    </div>
                    <Link href="/feed">
                      <span className="text-[10px] text-gold hover:text-orange-400 transition-colors cursor-pointer font-semibold">Open →</span>
                    </Link>
                  </div>
                  <div className="divide-y divide-white/5">
                    {FEED_ARTICLES.slice(0, 3).map(a => {
                      const cat = FEED_CATEGORIES.find(c => c.id === a.category);
                      const colorMap: Record<string, string> = {
                        engineering:"#f5a524", business:"#f97316", healthcare:"#ec4899",
                        technology:"#3b82f6", trades:"#eab308", law:"#a855f7",
                        science:"#22d3ee", "life-advice":"#4ade80", "creative-design":"#e879f9",
                      };
                      const color = colorMap[a.category] ?? "#f5a524";
                      return (
                        <Link key={a.id} href="/feed">
                          <div className="px-3 py-2.5 flex items-start gap-2.5 hover:bg-white/5 transition-colors cursor-pointer">
                            <div className="h-6 w-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0 mt-0.5"
                              style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                              {cat?.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-semibold text-white truncate leading-tight">{a.title}</div>
                              <div className="text-[10px] text-slate-600 mt-0.5">{a.readTime}</div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <Link href="/feed">
                    <div className="px-4 py-2.5 flex items-center justify-center gap-1.5 text-[11px] font-bold cursor-pointer hover:bg-white/5 transition-colors"
                      style={{ color: "#f5a524", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <Rss className="h-3.5 w-3.5" /> All articles
                    </div>
                  </Link>
                </div>

                {/* Videos preview */}
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(59,130,246,0.2)" }}>
                  <div className="px-4 py-3 flex items-center justify-between"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-2">
                      <Film className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-bold text-white">Career Videos</span>
                    </div>
                    <Link href="/videos">
                      <span className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors cursor-pointer font-semibold">Browse →</span>
                    </Link>
                  </div>
                  <div className="divide-y divide-white/5">
                    {VIDEO_PLAYLISTS.slice(0, 3).map(pl => {
                      const cat = FEED_CATEGORIES.find(c => c.id === pl.category);
                      const colorMap: Record<string, string> = {
                        engineering:"#f5a524", business:"#f97316", healthcare:"#ec4899",
                        technology:"#3b82f6", trades:"#eab308", law:"#a855f7",
                        science:"#22d3ee", "life-advice":"#4ade80", "creative-design":"#e879f9",
                      };
                      const color = colorMap[pl.category] ?? "#3b82f6";
                      return (
                        <Link key={pl.id} href="/videos">
                          <div className="px-3 py-2.5 flex items-center gap-2.5 hover:bg-white/5 transition-colors cursor-pointer">
                            <div className="h-6 w-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                              style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                              {cat?.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-semibold text-white truncate leading-tight">{pl.title}</div>
                              <div className="text-[10px] text-slate-600 mt-0.5">{pl.videos.length} videos</div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="px-4 py-1.5 flex justify-between items-center"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-[10px] text-slate-600">{VIDEO_PLAYLISTS.length} playlists · {VIDEO_PLAYLISTS.reduce((a,p)=>a+p.videos.length,0)} videos</span>
                    <Link href="/videos">
                      <span className="text-[11px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer">View all</span>
                    </Link>
                  </div>
                </div>

                {/* Talks & Livestreams preview */}
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <div className="px-4 py-3 flex items-center justify-between"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-red-400" />
                      <span className="text-sm font-bold text-white">Expert Talks</span>
                    </div>
                    <Link href="/talks">
                      <span className="text-[10px] text-red-400 hover:text-red-300 transition-colors cursor-pointer font-semibold">Browse →</span>
                    </Link>
                  </div>
                  <div className="divide-y divide-white/5">
                    {EXPERT_TALKS.slice(0, 2).map(t => {
                      const cat = FEED_CATEGORIES.find(c => c.id === t.category);
                      return (
                        <Link key={t.id} href="/talks">
                          <div className="px-3 py-2.5 flex items-start gap-2.5 hover:bg-white/5 transition-colors cursor-pointer">
                            <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5"
                              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                              {t.speaker[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-semibold text-white truncate leading-tight">{t.title}</div>
                              <div className="text-[10px] text-slate-600 mt-0.5">{t.speaker} · {t.duration}</div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                    {/* Upcoming livestream teaser */}
                    {UPCOMING_LIVESTREAMS.length > 0 && (
                      <Link href="/talks">
                        <div className="px-3 py-2.5 flex items-center gap-2.5 hover:bg-white/5 transition-colors cursor-pointer">
                          <div className="flex-shrink-0 flex items-center justify-center h-6 w-6">
                            <Radio className="h-4 w-4 text-red-400 animate-pulse" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold text-red-400 truncate leading-tight">
                              {UPCOMING_LIVESTREAMS[0].title}
                            </div>
                            <div className="text-[10px] text-slate-600 mt-0.5">
                              Upcoming · {new Date(UPCOMING_LIVESTREAMS[0].scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </div>
                          </div>
                        </div>
                      </Link>
                    )}
                  </div>
                  <div className="px-4 py-1.5 flex justify-between items-center"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-[10px] text-slate-600">{EXPERT_TALKS.length} talks · {UPCOMING_LIVESTREAMS.length} upcoming</span>
                    <Link href="/talks">
                      <span className="text-[11px] font-bold text-red-400 hover:text-red-300 cursor-pointer">View all</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* ── Talk to Dario widget ── */}
              <Link href="/dario">
                <div className="rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover:scale-[1.01] transition-transform"
                  style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(168,85,247,0.08))", border: "1px solid rgba(168,85,247,0.3)", boxShadow: "0 0 30px rgba(168,85,247,0.08)" }}>
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
                    🧑‍💼
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-white">Talk to Dario — AI Career Counselor</div>
                    <div className="text-xs text-purple-300 mt-0.5">
                      {darioSessionCount > 0
                        ? `${darioSessionCount} session${darioSessionCount > 1 ? "s" : ""} · ${darioRoadmap.length} roadmap goals · ${darioCompletedGoals} completed`
                        : "Discover careers that match your interests — start your first session"}
                    </div>
                    {lastSession && (
                      <div className="text-[10px] text-slate-500 mt-1">
                        Last session: {new Date(lastSession.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {lastSession.careersDiscussed.length > 0 && ` · ${lastSession.careersDiscussed.slice(0,2).join(", ")}`}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="h-5 w-5 text-purple-400 flex-shrink-0" />
                </div>
              </Link>

              {/* Career category progress */}
              {progress?.categoryProgress && progress.categoryProgress.some(c => c.attempted > 0) && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-gold" /> Career Category Progress
                  </div>
                  <div className="space-y-3">
                    {progress.categoryProgress.map(cp => {
                      const meta = CAT_META[cp.category as Category];
                      if (!meta || cp.attempted === 0) return null;
                      const pct = Math.round((cp.correct / cp.attempted) * 100);
                      const Icon = meta.icon;
                      return (
                        <div key={cp.category} className="flex items-center gap-3">
                          <Icon className="h-4 w-4 flex-shrink-0" style={{ color: meta.color }} />
                          <div className="text-xs text-slate-300 w-24 flex-shrink-0">{meta.label}</div>
                          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: meta.color }} />
                          </div>
                          <div className="text-xs text-slate-400 w-16 text-right flex-shrink-0">{cp.correct}/{cp.attempted} solved</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent missions */}
              {recent && recent.length > 0 && (
                <div>
                  <div className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gold" /> Recent Missions
                  </div>
                  <div className="rounded-2xl overflow-hidden divide-y" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.08)" }}>
                    {recent.slice(0, 5).map(m => (
                      <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                        {m.correct
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                          : <XCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{m.title}</div>
                          <div className="text-[11px] text-slate-400">{m.topic}</div>
                        </div>
                        <Badge className="bg-[hsl(38_95%_55%)]/15 text-gold border-[hsl(38_95%_55%)]/30 flex-shrink-0">+{m.xpAwarded} XP</Badge>
                      </div>
                    ))}
                  </div>
                  <button className="mt-2 text-xs text-gold hover:text-orange-400 transition-colors w-full text-center py-1"
                    onClick={() => setActiveTab("journal")}>
                    View full journal →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SIMULATIONS TAB */}
          {activeTab === "simulations" && (
            <div className="space-y-8">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-xl font-black text-white mb-1">Career Simulations</h2>
                  <p className="text-sm text-slate-400">AI-generated missions across 9 career worlds. Each playthrough is unique.</p>
                </div>
                {/* Plan badge */}
                {plan !== "none" ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0"
                    style={{ background: `${PLAN_COLORS[plan]}18`, border: `1px solid ${PLAN_COLORS[plan]}40`, color: PLAN_COLORS[plan] }}>
                    ✓ {PLAN_LABELS[plan]} Plan · {PLAN_DARIO_CREDITS[plan]} Dario credits
                  </div>
                ) : (
                  <Link href="/login">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 cursor-pointer"
                      style={{ background: "rgba(245,165,36,0.12)", border: "1px solid rgba(245,165,36,0.35)", color: "#f5a524" }}>
                      🔒 No active plan — Upgrade
                    </div>
                  </Link>
                )}
              </div>

              {/* No-plan upgrade banner */}
              {plan === "none" && (
                <div className="rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4"
                  style={{ background: "linear-gradient(135deg,rgba(245,165,36,0.1),rgba(234,88,12,0.08))", border: "1px solid rgba(245,165,36,0.3)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white mb-1">Unlock 85+ Career Simulations</div>
                    <div className="text-xs text-slate-400">Select a plan to get full access to all career worlds, AI missions, and Dario credits. Plans start at $19.99/mo.</div>
                  </div>
                  <button
                    className="px-5 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0 transition-all hover:scale-105"
                    style={{ background: "linear-gradient(135deg,#f5a524,#ea580c)" }}
                    onClick={() => setActiveTab("settings")}>
                    Choose a Plan
                  </button>
                </div>
              )}

              {simsLoading ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                  ))}
                </div>
              ) : (
                (Object.keys(CAT_META) as Category[]).map(cat => {
                  const items = grouped.get(cat) ?? [];
                  if (items.length === 0) return null;
                  const meta = CAT_META[cat];
                  const Icon = meta.icon;
                  const unlocked = plan !== "none";
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}30` }}>
                          <Icon className="h-5 w-5" style={{ color: meta.color }} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">{meta.label}</h3>
                          <div className="text-[11px] text-slate-400">{items.length} simulations</div>
                        </div>
                        {!unlocked && (
                          <div className="ml-auto flex items-center gap-1 text-[10px] font-bold text-amber-400">
                            <Lock className="h-3 w-3" /> Requires Plan
                          </div>
                        )}
                        {unlocked && progress?.categoryProgress?.find(c => c.category === cat && c.attempted > 0) && (
                          <Badge className="ml-auto text-[10px]" style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}>
                            {progress.categoryProgress.find(c => c.category === cat)!.correct}/{progress.categoryProgress.find(c => c.category === cat)!.attempted} solved
                          </Badge>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {items.map(sim => (
                          unlocked ? (
                            <Link key={sim.slug} href={`/sim/${sim.slug}`}>
                              <Card className="group cursor-pointer hover:-translate-y-0.5 transition-all h-full"
                                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                                data-testid={`card-sim-${sim.slug}`}>
                                <CardContent className="p-4 flex flex-col gap-2 h-full">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="text-sm font-bold text-white group-hover:text-gold transition-colors leading-snug">{sim.title}</div>
                                    <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-gold flex-shrink-0 mt-0.5 transition-colors" />
                                  </div>
                                  <p className="text-xs text-slate-400 leading-relaxed flex-1">{sim.tagline}</p>
                                  <div className="flex flex-wrap gap-1">
                                    {sim.topics.slice(0, 2).map(t => (
                                      <span key={t} className="text-[9px] uppercase tracking-wide text-slate-500 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">{t}</span>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          ) : (
                            <button key={sim.slug} className="text-left" onClick={() => setActiveTab("settings")}>
                              <Card className="group cursor-pointer transition-all h-full opacity-50 hover:opacity-70"
                                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <CardContent className="p-4 flex flex-col gap-2 h-full">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="text-sm font-bold text-slate-400 leading-snug">{sim.title}</div>
                                    <Lock className="h-3.5 w-3.5 text-slate-600 flex-shrink-0 mt-0.5" />
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed flex-1 line-clamp-2">{sim.tagline}</p>
                                </CardContent>
                              </Card>
                            </button>
                          )
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* BADGES TAB */}
          {activeTab === "badges" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-white mb-1">Career Badges</h2>
                <p className="text-sm text-slate-400">{earnedBadgeIds.size} of {ALL_BADGES.length} badges earned</p>
                <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((earnedBadgeIds.size / ALL_BADGES.length) * 100)}%`, background: "linear-gradient(90deg, #f5a524, #a855f7)" }} />
                </div>
              </div>

              {/* Plan limitations notice */}
              {plan === "none" ? (
                <div className="rounded-2xl px-4 py-3.5 flex items-start gap-3"
                  style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <Lock className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-red-400 mb-1">No Active Plan — Badges Locked</div>
                    <div className="text-xs text-slate-500 leading-relaxed">
                      Simulation badges, Dario badges, and XP level badges require an active plan.
                      Upgrade to start earning badges and tracking your career progress.
                    </div>
                    <button
                      className="mt-2 text-xs font-bold px-3 py-1 rounded-lg transition-all hover:opacity-90"
                      style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}
                      onClick={() => { const el = document.querySelector('[data-tab="settings"]') as HTMLButtonElement; el?.click(); }}>
                      View Plans →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
                  style={{ background: `${PLAN_COLORS[plan]}08`, border: `1px solid ${PLAN_COLORS[plan]}22` }}>
                  <Shield className="h-4 w-4 flex-shrink-0" style={{ color: PLAN_COLORS[plan] }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold" style={{ color: PLAN_COLORS[plan] }}>{PLAN_LABELS[plan]} Plan Active</span>
                    <span className="text-xs text-slate-500 ml-2">
                      · All simulations unlocked
                      {PLAN_DARIO_CREDITS[plan] > 0 ? ` · ${PLAN_DARIO_CREDITS[plan].toLocaleString()} Dario credits/mo` : " · No Dario AI"}
                      {` · ${ALL_BADGES.length} badges available`}
                    </span>
                  </div>
                </div>
              )}

              {/* Achievement Badges */}
              <div>
                <div className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-gold" />
                  Achievements
                  <span className="text-xs text-slate-500 font-normal">({ACHIEVEMENT_BADGES.filter(b => earnedBadgeIds.has(b.id)).length}/{ACHIEVEMENT_BADGES.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ACHIEVEMENT_BADGES.map(b => {
                    const earned = earnedBadgeIds.has(b.id);
                    return (
                      <div key={b.id} className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-all"
                        style={{
                          background: earned ? "rgba(245,165,36,0.08)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${earned ? "rgba(245,165,36,0.3)" : "rgba(255,255,255,0.08)"}`,
                          boxShadow: earned ? "0 0 20px rgba(245,165,36,0.1)" : "none",
                        }}>
                        <div className="relative text-4xl">
                          {earned ? b.emoji : <span className="opacity-20">{b.emoji}</span>}
                          {!earned && <Lock className="h-4 w-4 text-slate-600 absolute -bottom-1 -right-1" />}
                        </div>
                        <div className="text-xs font-bold" style={{ color: earned ? "#f5a524" : "#64748b" }}>{b.label}</div>
                        <div className="text-[10px] text-slate-500 leading-snug">{b.desc}</div>
                        {earned && <div className="text-[9px] text-emerald-400 font-semibold uppercase tracking-wider">✓ Earned</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Level Badges */}
              <div>
                <div className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-blue-400" />
                  Level Badges
                  <span className="text-xs text-slate-500 font-normal">(Level {progress?.level ?? 1} / 50)</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-3">
                  <div className="h-full rounded-full" style={{ width: `${Math.round(((progress?.level ?? 1) / 50) * 100)}%`, background: "linear-gradient(90deg, #3b82f6, #a855f7, #f5a524)" }} />
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {LEVEL_BADGES.map(b => {
                    const earned = earnedBadgeIds.has(b.id);
                    const lvl = b.levelReq!;
                    const isCurrent = lvl === (progress?.level ?? 1);
                    return (
                      <div key={b.id} className="rounded-xl p-2.5 flex flex-col items-center gap-1 text-center transition-all"
                        style={{
                          background: earned ? (isCurrent ? "rgba(245,165,36,0.15)" : "rgba(255,255,255,0.05)") : "rgba(255,255,255,0.02)",
                          border: isCurrent ? "2px solid #f5a524" : earned ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.05)",
                          boxShadow: isCurrent ? "0 0 14px rgba(245,165,36,0.2)" : "none",
                        }}>
                        <div className="text-xl" style={{ opacity: earned ? 1 : 0.18 }}>{b.emoji}</div>
                        <div className="text-[9px] font-black tabular-nums" style={{ color: earned ? (isCurrent ? "#f5a524" : "white") : "#334155" }}>Lv {lvl}</div>
                        <div className="text-[8px] leading-tight hidden sm:block" style={{ color: earned ? "#64748b" : "#1e2d40" }}>{b.label}</div>
                        {isCurrent && <div className="text-[8px] text-gold font-bold">NOW</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* JOURNAL TAB */}
          {activeTab === "journal" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-white mb-1">Career Journal</h2>
                <p className="text-sm text-slate-400">Your mission history and activity log.</p>
              </div>

              {!recent || recent.length === 0 ? (
                <div className="rounded-2xl p-12 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="text-4xl mb-3">📖</div>
                  <div className="text-white font-bold">No missions yet</div>
                  <div className="text-sm text-slate-400 mt-1">Complete simulations and they'll appear here.</div>
                  <Button className="mt-4 font-bold" style={{ background: "linear-gradient(135deg, #f5a524, #ea580c)", color: "#0a1428" }}
                    onClick={() => setActiveTab("simulations")}>
                    Start a Mission <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden divide-y" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.08)" }}>
                  {recent.map((m, i) => (
                    <div key={m.id} className="px-5 py-4 flex items-start gap-4">
                      <div className="flex-shrink-0 mt-0.5">
                        {m.correct
                          ? <div className="h-8 w-8 rounded-full flex items-center justify-center bg-emerald-400/15 border border-emerald-400/30"><CheckCircle2 className="h-4 w-4 text-emerald-400" /></div>
                          : <div className="h-8 w-8 rounded-full flex items-center justify-center bg-rose-400/15 border border-rose-400/30"><XCircle className="h-4 w-4 text-rose-400" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-semibold text-white">{m.title}</div>
                          <Badge className="bg-[hsl(38_95%_55%)]/15 text-gold border-[hsl(38_95%_55%)]/30 flex-shrink-0 text-[10px]">+{m.xpAwarded} XP</Badge>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{m.topic} · Difficulty {m.difficulty}</div>
                        <div className="text-[11px] mt-1 font-medium" style={{ color: m.correct ? "#4ade80" : "#f87171" }}>
                          {m.correct ? "✓ Correct answer" : "✗ Missed this one"}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-600 flex-shrink-0">#{i + 1}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Stats summary */}
              {progress && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Missions done",   value: progress.missionsCompleted ?? recent?.length ?? 0, color: "#f5a524" },
                    { label: "XP earned",        value: progress.totalXp,                                   color: "#22c55e" },
                    { label: "Best streak",      value: `${progress.streak}d`,                              color: "#f97316" },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-white mb-1">Settings</h2>
                <p className="text-sm text-slate-400">Manage your profile and preferences.</p>
              </div>

              {/* Subscription Plan Selector */}
              {(() => {
                const PLAN_RANK: Record<SubscriptionPlan, number> = { none: 0, starter: 1, explorer: 2, builder: 3, accelerator: 4 };
                const currentRank = PLAN_RANK[plan];
                return (
                  <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,165,36,0.2)" }}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <Zap className="h-4 w-4 text-gold" /> Subscription Plan
                      </div>
                      {plan !== "none" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${PLAN_COLORS[plan]}18`, color: PLAN_COLORS[plan], border: `1px solid ${PLAN_COLORS[plan]}30` }}>
                          Active: {PLAN_LABELS[plan]}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(["starter", "explorer", "builder", "accelerator"] as SubscriptionPlan[]).map(p => {
                        const isActive = plan === p;
                        const pRank = PLAN_RANK[p];
                        const isUpgrade = pRank > currentRank;
                        const isDowngrade = pRank < currentRank;
                        const color = PLAN_COLORS[p];
                        return (
                          <button
                            key={p}
                            onClick={() => {
                              if (isActive) return;
                              if (isUpgrade) {
                                void navigate(`/upgrade?plan=${p}&from=${plan}`);
                              }
                              // downgrade: do nothing — show note below
                            }}
                            disabled={isDowngrade}
                            className="rounded-xl p-3 flex flex-col items-start gap-1 transition-all text-left relative"
                            style={{
                              background: isActive ? `${color}18` : "rgba(255,255,255,0.03)",
                              border: isActive ? `2px solid ${color}` : `1px solid rgba(255,255,255,${isDowngrade ? "0.04" : "0.08"})`,
                              boxShadow: isActive ? `0 0 16px ${color}20` : "none",
                              opacity: isDowngrade ? 0.4 : 1,
                              cursor: isActive ? "default" : isDowngrade ? "not-allowed" : "pointer",
                              transform: isUpgrade ? undefined : "none",
                            }}>
                            {isUpgrade && (
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-black whitespace-nowrap"
                                style={{ background: color, color: "#0a1428" }}>
                                Upgrade →
                              </div>
                            )}
                            <div className="text-xs font-black" style={{ color: isActive ? color : isDowngrade ? "#475569" : "white" }}>{PLAN_LABELS[p]}</div>
                            <div className="text-[10px] font-semibold text-slate-400">{PLAN_PRICES[p]}</div>
                            <div className="text-[9px] text-slate-500">
                              {PLAN_DARIO_CREDITS[p] === 0 ? "No Dario AI" : `${PLAN_DARIO_CREDITS[p]} Dario credits`}
                            </div>
                            {isActive && <div className="text-[9px] font-bold mt-0.5" style={{ color }}>✓ Active</div>}
                          </button>
                        );
                      })}
                    </div>
                    {plan === "none" && (
                      <p className="text-[11px] text-slate-500">Click a plan above to get started. You'll be taken to a secure checkout page.</p>
                    )}
                    {plan !== "none" && currentRank < 4 && (
                      <p className="text-[11px] text-slate-500">
                        Click a higher plan above to upgrade. To downgrade, contact support.
                        {PLAN_DARIO_CREDITS[plan] === 0 && " · Upgrade to Explorer to unlock Dario AI."}
                      </p>
                    )}
                    {plan === "accelerator" && (
                      <p className="text-[11px] text-slate-500">You're on our top plan — {PLAN_DARIO_CREDITS[plan]} Dario AI credits/mo included.</p>
                    )}
                  </div>
                );
              })()}

              {/* Profile */}
              <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Star className="h-4 w-4 text-gold" /> Your Profile
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-black border-2"
                    style={{ background: "rgba(245,165,36,0.15)", borderColor: "#f5a524" }}>
                    {learnerId.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-bold">Level {progress?.level ?? 1} Explorer</div>
                    <div className="text-sm text-slate-400 mt-0.5">{progress?.totalXp ?? 0} total XP · {progress?.streak ?? 0} day streak</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{learnerId}</div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="rounded-2xl overflow-hidden divide-y" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.08)" }}>
                {[
                  { label: "Enter 1WayMirror", desc: "Walk around the 3D career city with your avatar", href: "/city",       color: "#3b82f6" },
                  { label: "Browse Simulations",     desc: "75+ AI-generated career missions",               action: () => setActiveTab("simulations"), color: "#f5a524" },
                  { label: "View Badges",             desc: `${earnedBadgeIds.size} of ${ALL_BADGES.length} earned`,   action: () => setActiveTab("badges"), color: "#a855f7" },
                  { label: "My Profile",             desc: "Edit school, GPA, SAT, career interest",         href: "/my-profile",  color: "#22d3ee" },
                  { label: "Share My Profile",       desc: "Get a shareable link to your career profile",     href: `/share/${learnerId}`, color: "#a855f7" },
                  { label: "Sign In / Register",     desc: "Save your progress across devices",              href: "/login",       color: "#4ade80" },
                  { label: "Go to Home Page",         desc: "Back to the main landing page",                  href: "/",            color: "#22c55e" },
                ].map(item => (
                  item.href ? (
                    <Link key={item.label} href={item.href}>
                      <div className="flex items-center justify-between px-5 py-4 hover:bg-white/5 cursor-pointer transition-colors">
                        <div>
                          <div className="text-sm font-semibold text-white">{item.label}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                        </div>
                        <ArrowRight className="h-4 w-4 flex-shrink-0" style={{ color: item.color }} />
                      </div>
                    </Link>
                  ) : (
                    <button key={item.label} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors text-left"
                      onClick={item.action}>
                      <div>
                        <div className="text-sm font-semibold text-white">{item.label}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 flex-shrink-0" style={{ color: item.color }} />
                    </button>
                  )
                ))}
              </div>

              {/* Reset progress (dev tool) */}
              <div className="rounded-2xl p-5" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <div className="text-sm font-bold text-white mb-1">Reset Avatar / Profile</div>
                <div className="text-[11px] text-slate-400 mb-3">Remove your saved avatar from the 3D city. Your XP and mission progress are kept.</div>
                <button
                  className="px-4 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-white hover:bg-red-500/20 transition-all border border-red-500/30"
                  onClick={() => { window.localStorage.removeItem("1waymirror_profile_v2"); }}>
                  Reset 3D City Profile
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Bottom Navigation ── */}
      <nav className="flex-shrink-0 z-30 flex items-center justify-around h-16 px-2"
        style={{ background: "rgba(10,20,40,0.97)", borderTop: "1px solid rgba(245,165,36,0.2)", backdropFilter: "blur(12px)" }}>
        {NAV.map(n => {
          const Icon = n.icon;
          const isActive = activeTab === n.tab && n.tab !== "city";
          const isCity = n.tab === "city";
          const isDarioLocked = n.tab === "dario" && (plan === "none" || plan === "starter");
          return (
            <button
              key={n.tab}
              onClick={() => handleTabClick(n.tab)}
              className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all relative"
              style={{
                color: isActive ? "#f5a524" : isCity ? "#3b82f6" : isDarioLocked ? "#475569" : "#94a3b8",
                background: isActive ? "rgba(245,165,36,0.1)" : "transparent",
              }}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {isDarioLocked && (
                  <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1 text-red-500" />
                )}
              </div>
              <span className="text-[9px] uppercase tracking-wider font-semibold">{n.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Floating real-time chat widget ── */}
      <DashboardChat
        myName={myName}
        myEmoji={myEmoji}
        myLearnerId={learnerId}
        onOnlineCount={handleOnlineCount}
      />
    </div>
  );
}
