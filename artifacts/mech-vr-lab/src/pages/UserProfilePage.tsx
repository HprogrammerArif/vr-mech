import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  User, GraduationCap, BookOpen, Target, Trophy, ArrowRight,
  Save, LogOut, Star, CheckCircle2, Lock, ChevronDown,
  CreditCard, Zap, Shield, Crown,
} from "lucide-react";
import { getProfile, saveProfile, getOrCreateLearnerId, AVATAR_PRESETS, getSubscriptionPlan } from "@/lib/profile";
import { getAuthUser, signOut } from "@/lib/auth";
import { getLearnerId } from "@/lib/learner";
import { useGetProgress, useGetRecentMissions } from "@workspace/api-client-react";
import { ALL_BADGES, LEVEL_BADGES, ACHIEVEMENT_BADGES, computeEarnedBadgeIds } from "@/lib/badges";

const BASE = import.meta.env.BASE_URL ?? "/";

const CAREER_INTERESTS = [
  "Engineering", "Technology / Software", "Healthcare / Medicine",
  "Business / Finance", "Skilled Trades", "Law / Public Service",
  "Science / Research", "Arts / Design", "Entrepreneurship",
  "Education", "Not sure yet — exploring all!",
];

const GRAD_YEARS = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + i);
const GPA_OPTIONS = ["4.0", "3.9", "3.8", "3.7", "3.6", "3.5", "3.4", "3.3", "3.2", "3.1", "3.0",
  "2.9", "2.8", "2.7", "2.6", "2.5", "2.0", "Below 2.0", "N/A"];

const PLANS = [
  {
    key: "starter",
    name: "Starter Plan",
    price: "$19.99",
    icon: <Zap className="h-5 w-5" />,
    color: "#3b82f6",
    features: [
      "All 85+ career simulations",
      "All on-demand career videos",
      "Career news & articles feed",
      "Progress tracking & analytics",
      "2 career live streams/month",
      "Shareable profile link",
    ],
    dario: "None",
  },
  {
    key: "explorer",
    name: "Explorer Plan",
    price: "$49.99",
    icon: <Star className="h-5 w-5" />,
    color: "#f5a524",
    features: [
      "Everything in Starter",
      "7 live streams/month",
      "1 exploratory career session",
      "Dario AI chat, compare & roadmap",
    ],
    dario: "200 credits/mo",
  },
  {
    key: "builder",
    name: "Builder Plan",
    price: "$99.99",
    icon: <Shield className="h-5 w-5" />,
    color: "#a855f7",
    features: [
      "Everything in Explorer",
      "All career live streams",
      "Full recorded talks library",
      "Athletic recruiting & college advising",
      "Personality finder, career report",
      "Opportunities board & action items",
    ],
    dario: "700 credits/mo",
  },
  {
    key: "accelerator",
    name: "Accelerator Plan",
    price: "$199.99",
    icon: <Crown className="h-5 w-5" />,
    color: "#f97316",
    features: [
      "Everything in Builder",
      "1,200 Dario credits/month",
      "1-on-1 career advisor (1×/month)",
    ],
    dario: "1,200 credits/mo",
  },
];


function FieldInput({ label, value, onChange, placeholder, type = "text", icon }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        {icon}{label}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
        onFocus={e => e.target.style.borderColor = "#f5a524"}
        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"} />
    </div>
  );
}

function SelectInput({ label, value, onChange, options, placeholder, icon }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string; icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        {icon}{label}
      </label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all appearance-none pr-10"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: value ? "white" : "#64748b" }}
          onFocus={e => (e.target as HTMLSelectElement).style.borderColor = "#f5a524"}
          onBlur={e => (e.target as HTMLSelectElement).style.borderColor = "rgba(255,255,255,0.12)"}>
          {placeholder && <option value="" style={{ background: "#0d1f3c" }}>{placeholder}</option>}
          {options.map(o => <option key={o} value={o} style={{ background: "#0d1f3c" }}>{o}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
      </div>
    </div>
  );
}

/* ─── Subscription Tab ─── */
function SubscriptionTab() {
  const [, navigate] = useLocation();
  const [currentPlan] = useState(() => getSubscriptionPlan());

  const activePlan = PLANS.find(p => p.key === currentPlan) ?? PLANS[0];

  return (
    <div className="space-y-5">
      {/* current plan card */}
      <div className="rounded-2xl p-5"
        style={{ background: `linear-gradient(135deg, ${activePlan.color}18, ${activePlan.color}06)`, border: `1px solid ${activePlan.color}40` }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ background: `${activePlan.color}25`, color: activePlan.color }}>
            {activePlan.icon}
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Current Plan</div>
            <div className="text-xl font-black text-white">{activePlan.name}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-black text-white">{activePlan.price}</div>
            <div className="text-xs text-slate-400">/month</div>
          </div>
        </div>
        <ul className="space-y-1.5">
          {activePlan.features.map(f => (
            <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: activePlan.color }} />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-4 p-3 rounded-xl text-sm text-center text-slate-400"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          💳 Upgrade using your payment information on file. Changes take effect immediately.
        </div>
      </div>

      {/* other plans */}
      <div className="text-sm font-bold text-white mb-1 flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-slate-400" /> Change Plan
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {PLANS.map(plan => {
          const isCurrent = plan.key === currentPlan;
          return (
            <div key={plan.key} className="rounded-2xl p-4"
              style={isCurrent
                ? { background: `${plan.color}14`, border: `2px solid ${plan.color}50` }
                : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: plan.color }}>{plan.icon}</span>
                <span className="font-bold text-white text-sm">{plan.name}</span>
                <span className="ml-auto font-black text-white">{plan.price}<span className="text-xs text-slate-400">/mo</span>{plan.dario !== "None" && <span className="block text-[9px] text-slate-500">🤖 {plan.dario}</span>}</span>
              </div>
              <ul className="space-y-1 mb-3">
                {plan.features.slice(0, 3).map(f => (
                  <li key={f} className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span style={{ color: plan.color }}>✓</span> {f}
                  </li>
                ))}
                {plan.features.length > 3 && (
                  <li className="text-xs text-slate-500">+{plan.features.length - 3} more features</li>
                )}
              </ul>
              <button
                onClick={() => !isCurrent && navigate(`/upgrade?plan=${plan.key}`)}
                disabled={isCurrent}
                className="w-full py-2 rounded-xl text-xs font-black transition-all hover:opacity-90"
                style={isCurrent
                  ? { background: `${plan.color}20`, color: plan.color, cursor: "default" }
                  : { background: plan.color, color: "white", cursor: "pointer" }}>
                {isCurrent ? "✓ Current Plan" : "Upgrade →"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  const [, navigate] = useLocation();
  const learnerId = getLearnerId();
  const { data: progress } = useGetProgress({ learnerId });
  const { data: recent } = useGetRecentMissions({ learnerId });

  const existing = getProfile();
  const authUser = getAuthUser();

  const [name, setName] = useState(existing?.name ?? authUser?.name ?? "");
  const [email, setEmail] = useState(existing?.email ?? authUser?.email ?? "");
  const [school, setSchool] = useState(existing?.school ?? "");
  const [graduationYear, setGraduationYear] = useState(String(existing?.graduationYear ?? ""));
  const [careerInterest, setCareerInterest] = useState(existing?.careerInterest ?? "");
  const [gpa, setGpa] = useState(existing?.gpa ?? "");
  const [sat, setSat] = useState(existing?.sat ?? "");
  const [avatarId, setAvatarId] = useState(existing?.avatarId ?? "nova");
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<"profile" | "badges-level" | "badges-achievement" | "subscription">("profile");

  const categoriesTried = useMemo(() => {
    const set = new Set<string>();
    if (recent) recent.forEach(m => { if (m.category) set.add(m.category); });
    if (progress?.categoryProgress) progress.categoryProgress.forEach(c => { if (c.attempted > 0) set.add(c.category); });
    return set;
  }, [recent, progress]);

  const earnedIds = useMemo(() => {
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

  const handleSave = () => {
    const lid = getOrCreateLearnerId();
    saveProfile({
      learnerId: lid,
      name: name.trim() || (authUser?.name ?? "Explorer"),
      email: email.trim() || undefined,
      careerInterest,
      avatarId,
      school: school.trim() || undefined,
      graduationYear: graduationYear ? Number(graduationYear) : undefined,
      gpa: gpa || undefined,
      sat: sat.trim() || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSignOut = () => { signOut(); navigate("/login"); };

  const currentAvatar = AVATAR_PRESETS.find(a => a.id === avatarId) ?? AVATAR_PRESETS[0];
  const levelBadgesEarned = LEVEL_BADGES.filter(b => earnedIds.has(b.id));
  const achievementBadgesEarned = ACHIEVEMENT_BADGES.filter(b => earnedIds.has(b.id));
  const currentPlanName = PLANS.find(p => p.key === getSubscriptionPlan())?.name ?? "Starter Plan";

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at top, #0d1f3c 0%, #0a1428 60%)" }}>

      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 h-14"
        style={{ background: "rgba(10,20,40,0.97)", borderBottom: "1px solid rgba(245,165,36,0.2)", backdropFilter: "blur(12px)" }}>
        <Link href="/"><img src={`${BASE}logo.png`} alt="1WayMirror" className="h-9 w-auto object-contain cursor-pointer" /></Link>
        <div className="text-sm font-black text-white">My Profile</div>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/feed">
            <button className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hidden sm:inline-flex items-center gap-1"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              Career Feed
            </button>
          </Link>
          <Link href="/replitopolis">
            <button className="text-xs hover:text-orange-400 transition-colors px-3 py-1.5 rounded-lg"
              style={{ border: "1px solid rgba(245,165,36,0.3)", color: "#f5a524" }}>
              Dashboard
            </button>
          </Link>
          <button onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Hero card */}
        <div className="rounded-2xl p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center"
          style={{ background: "linear-gradient(135deg, rgba(245,165,36,0.1), rgba(59,130,246,0.07))", border: "1px solid rgba(245,165,36,0.2)" }}>
          <div className="flex-shrink-0 text-6xl h-20 w-20 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", border: `2px solid ${currentAvatar.accentColor}` }}>
            {currentAvatar.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-2xl font-black text-white truncate">{name || "Your Name"}</div>
            <div className="text-sm text-slate-400 mt-0.5">{email || "No email set"}</div>
            {school && <div className="text-sm mt-1" style={{ color: "#f5a524" }}>🏫 {school} {graduationYear ? `· Class of ${graduationYear}` : ""}</div>}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "rgba(245,165,36,0.15)", color: "#f5a524", border: "1px solid rgba(245,165,36,0.3)" }}>
                Level {progress?.level ?? 1}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>
                {progress?.totalXp ?? 0} XP
              </span>
              {careerInterest && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)" }}>
                  {careerInterest}
                </span>
              )}
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)" }}>
                {earnedIds.size} badges earned
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "rgba(236,72,153,0.12)", color: "#f472b6", border: "1px solid rgba(236,72,153,0.25)" }}>
                📋 {currentPlanName}
              </span>
            </div>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "profile",            label: "Edit Profile",         icon: <User className="h-3.5 w-3.5" /> },
            { key: "subscription",       label: "Subscription",         icon: <CreditCard className="h-3.5 w-3.5" /> },
            { key: "badges-achievement", label: `Achievements (${achievementBadgesEarned.length}/${ACHIEVEMENT_BADGES.length})`, icon: <Trophy className="h-3.5 w-3.5" /> },
            { key: "badges-level",       label: `Level Badges (${levelBadgesEarned.length}/50)`, icon: <Star className="h-3.5 w-3.5" /> },
          ].map(s => (
            <button key={s.key} onClick={() => setActiveSection(s.key as typeof activeSection)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={activeSection === s.key
                ? { background: "linear-gradient(135deg, #f5a524, #ea580c)", color: "#0a1428" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
              {s.icon}{s.label}
            </button>
          ))}
        </div>

        {/* PROFILE SECTION */}
        {activeSection === "profile" && (
          <div className="space-y-5">
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-sm font-bold text-white mb-3">Choose Avatar</div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {AVATAR_PRESETS.map(av => (
                  <button key={av.id} onClick={() => setAvatarId(av.id)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                    style={avatarId === av.id
                      ? { background: `${av.accentColor}20`, border: `2px solid ${av.accentColor}` }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-2xl">{av.emoji}</span>
                    <span className="text-[9px] text-slate-400 font-semibold">{av.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-sm font-bold text-white flex items-center gap-2"><User className="h-4 w-4 text-yellow-400" /> Personal Info</div>
              <div className="grid sm:grid-cols-2 gap-4">
                <FieldInput label="Display Name" value={name} onChange={setName} placeholder="Your name" icon={<User className="h-3 w-3" />} />
                <FieldInput label="Email Address" value={email} onChange={setEmail} placeholder="you@school.edu" type="email" />
              </div>
            </div>

            <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-sm font-bold text-white flex items-center gap-2"><GraduationCap className="h-4 w-4 text-blue-400" /> Academic Info</div>
              <div className="grid sm:grid-cols-2 gap-4">
                <FieldInput label="School / University" value={school} onChange={setSchool} placeholder="Lincoln High School" icon={<BookOpen className="h-3 w-3" />} />
                <SelectInput label="Graduation Year" value={graduationYear} onChange={setGraduationYear} options={GRAD_YEARS.map(String)} placeholder="Select year…" icon={<GraduationCap className="h-3 w-3" />} />
                <SelectInput label="GPA" value={gpa} onChange={setGpa} options={GPA_OPTIONS} placeholder="Select GPA…" />
                <FieldInput label="SAT Score" value={sat} onChange={setSat} placeholder="e.g. 1350" icon={<BookOpen className="h-3 w-3" />} />
              </div>
            </div>

            <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-sm font-bold text-white flex items-center gap-2"><Target className="h-4 w-4 text-emerald-400" /> Career Interest</div>
              <SelectInput label="Primary Field of Interest" value={careerInterest} onChange={setCareerInterest} options={CAREER_INTERESTS} placeholder="Choose a career field…" icon={<Target className="h-3 w-3" />} />
              {careerInterest && (
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Your simulations will be tailored to {careerInterest}
                </div>
              )}
            </div>

            <button onClick={handleSave}
              className="w-full py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
              style={{ background: saved ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg, #f5a524, #ea580c)", color: saved ? "#4ade80" : "#0a1428", border: saved ? "1px solid rgba(34,197,94,0.4)" : "none" }}>
              {saved ? <><CheckCircle2 className="h-4 w-4" /> Profile Saved!</> : <><Save className="h-4 w-4" /> Save Profile</>}
            </button>

            <div className="grid grid-cols-2 gap-3">
              <Link href="/replitopolis">
                <div className="rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-sm font-semibold text-white">Dashboard</span>
                  <ArrowRight className="h-4 w-4 text-yellow-400" />
                </div>
              </Link>
              <Link href="/feed">
                <div className="rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-sm font-semibold text-white">Career Feed</span>
                  <ArrowRight className="h-4 w-4 text-blue-400" />
                </div>
              </Link>
            </div>
            {existing?.learnerId && (
              <Link href={`/share/${existing.learnerId}`}>
                <div className="rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ border: "1px solid rgba(168,85,247,0.25)", background: "rgba(168,85,247,0.05)" }}>
                  <div>
                    <span className="text-sm font-semibold text-white">Share My Profile</span>
                    <div className="text-[10px] text-slate-500 mt-0.5">Get a public shareable link</div>
                  </div>
                  <ArrowRight className="h-4 w-4" style={{ color: "#a855f7" }} />
                </div>
              </Link>
            )}
          </div>
        )}

        {/* SUBSCRIPTION SECTION */}
        {activeSection === "subscription" && <SubscriptionTab />}

        {/* ACHIEVEMENT BADGES */}
        {activeSection === "badges-achievement" && (
          <div className="space-y-4">
            <div>
              <div className="text-base font-black text-white mb-1">Achievement Badges</div>
              <div className="text-sm text-slate-400">{achievementBadgesEarned.length} of {ACHIEVEMENT_BADGES.length} earned — complete missions to unlock more</div>
              <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.round((achievementBadgesEarned.length / ACHIEVEMENT_BADGES.length) * 100)}%`, background: "linear-gradient(90deg, #f5a524, #a855f7)" }} />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ACHIEVEMENT_BADGES.map(b => {
                const earned = earnedIds.has(b.id);
                return (
                  <div key={b.id} className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center"
                    style={{ background: earned ? "rgba(245,165,36,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${earned ? "rgba(245,165,36,0.3)" : "rgba(255,255,255,0.08)"}`, boxShadow: earned ? "0 0 20px rgba(245,165,36,0.08)" : "none" }}>
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
        )}

        {/* LEVEL BADGES */}
        {activeSection === "badges-level" && (
          <div className="space-y-4">
            <div>
              <div className="text-base font-black text-white mb-1">Level Badges</div>
              <div className="text-sm text-slate-400">Level {progress?.level ?? 1} · {levelBadgesEarned.length} of 50 level badges earned</div>
              <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.round(((progress?.level ?? 1) / 50) * 100)}%`, background: "linear-gradient(90deg, #3b82f6, #a855f7, #f5a524)" }} />
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {LEVEL_BADGES.map(b => {
                const earned = earnedIds.has(b.id);
                const lvl = b.levelReq!;
                const isCurrent = lvl === (progress?.level ?? 1);
                return (
                  <div key={b.id} className="rounded-xl p-3 flex flex-col items-center gap-1 text-center transition-all"
                    style={{
                      background: earned ? (isCurrent ? "rgba(245,165,36,0.15)" : "rgba(255,255,255,0.05)") : "rgba(255,255,255,0.02)",
                      border: isCurrent ? "2px solid #f5a524" : earned ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.05)",
                      boxShadow: isCurrent ? "0 0 16px rgba(245,165,36,0.2)" : "none",
                    }}>
                    <div className="text-2xl" style={{ opacity: earned ? 1 : 0.2 }}>{b.emoji}</div>
                    <div className="text-[9px] font-black tabular-nums" style={{ color: earned ? (isCurrent ? "#f5a524" : "white") : "#334155" }}>Lv {lvl}</div>
                    <div className="text-[8px] leading-tight" style={{ color: earned ? "#64748b" : "#1e2d40" }}>{b.label}</div>
                    {isCurrent && <div className="text-[8px] font-bold" style={{ color: "#f5a524" }}>NOW</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
