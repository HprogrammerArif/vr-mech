import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Link } from "wouter";
import {
  Shield, Home, BarChart2, FileText, Film, Mic, Users, Settings,
  Plus, Trash2, Edit3, Eye, EyeOff, Save, X, Check, Radio,
  LogOut, ChevronRight, Bell, TrendingUp, Newspaper, Video, Lock,
  AlertCircle, Upload, Image, Heart, Bookmark, Clock, CreditCard,
  User as UserIcon, Activity, Star, Brain, MessageSquare, MapPin,
  ListChecks, RefreshCw, Briefcase, Mail, type LucideIcon,
} from "lucide-react";
import { VIDEO_PLAYLISTS } from "@/lib/videoData";
import { EXPERT_TALKS, UPCOMING_LIVESTREAMS } from "@/lib/talksData";
import { FEED_CATEGORIES, type FeedCategory } from "@/lib/feedArticles";
import { POOL_INTERNAL, EXTERNAL_ARTICLES, getAllFeedItems } from "@/lib/feedDailyArticles";
import { getAllAccounts, deleteAccount, updateAccount, type Account, verifyAccount, authFetch, signIn, fetchCurrentSession, signOut } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL ?? "/";
const SETTINGS_KEY = "1waymirror_admin_settings_v1";
const ADMIN_PIN        = "1WAY2026";

/* ── Types ───────────────────────────────────────────────────── */
type AdminTab = "overview" | "feed" | "videos" | "talks" | "users" | "dario" | "leads" | "safety" | "settings";

type AdminSettings = {
  dailyRotation: number;
  articlePoolSize: number;
  maxSavedArticles: number;
  videoPlaylistCount: number;
  expertTalksCount: number;
};

type SampleUser = {
  id: string; name: string; email: string; password: string;
  plan: "free" | "pro" | "premium";
  cardLast4: string; cardBrand: string; billingEmail: string; billingDate: string;
  level: number; xp: number; simulations: number; badges: number;
  careerInterest: string; school: string; graduationYear: number;
  lastActive: string; sessions: number; missionsCompleted: number;
  joinedAt: string; avatarId: string;
};

type CustomPost = {
  id: string; title: string; excerpt: string; category: FeedCategory;
  tags: string; imageDataUrl: string; createdAt: string;
};

type RecordedLivestream = {
  id: string; title: string; speaker: string; organization: string;
  category: FeedCategory; duration: string; recordedDate: string;
  description: string; fileName?: string;
};

type UploadedFile = {
  name: string; size: number; objectUrl: string; ready: boolean;
};

type AdminVideoEntry = {
  id: string; title: string; url: string;
  videoType: "youtube" | "vimeo" | "direct";
  youtubeId?: string; vimeoId?: string;
  cat: FeedCategory; desc: string; duration: string; date: string;
};

const ADMIN_VIDEOS_KEY = "1waymirror_admin_videos_v1";
function extractYTId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}
function loadAdminVideos(): AdminVideoEntry[] {
  try { return JSON.parse(localStorage.getItem(ADMIN_VIDEOS_KEY) ?? "[]"); } catch { return []; }
}

/* ── Constants ───────────────────────────────────────────────── */
const CAT_COLOR: Record<FeedCategory, string> = {
  engineering:"#f5a524", business:"#f97316", healthcare:"#ec4899",
  technology:"#3b82f6", trades:"#eab308", law:"#a855f7",
  science:"#22d3ee", "life-advice":"#4ade80", "creative-design":"#e879f9",
};

const SIDEBAR: { tab: AdminTab; icon: LucideIcon; label: string }[] = [
  { tab:"overview", icon:BarChart2, label:"Overview" },
  { tab:"feed",     icon:Newspaper,  label:"Career Feed" },
  { tab:"videos",   icon:Film,       label:"Videos" },
  { tab:"talks",    icon:Mic,        label:"Talks & Livestreams" },
  { tab:"users",    icon:Users,      label:"Users" },
  { tab:"dario",    icon:Brain,      label:"Dario AI Activity" },
  { tab:"leads",    icon:Mail,       label:"Leads" },
  { tab:"safety",   icon:Shield,     label:"Safety Queue" },
  { tab:"settings", icon:Settings,   label:"Settings" },
];

const PLAN_COLOR: Record<string,string> = { free:"#64748b", pro:"#f5a524", premium:"#a855f7" };
const PLAN_PRICE: Record<string,string> = { free:"$0/mo", pro:"$9.99/mo", premium:"$19.99/mo" };

/* ── Utilities ───────────────────────────────────────────────── */

function loadSettings(): AdminSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as AdminSettings;
  } catch { /* noop */ }
  return { dailyRotation: 5, articlePoolSize: 10, maxSavedArticles: 50, videoPlaylistCount: VIDEO_PLAYLISTS.length, expertTalksCount: EXPERT_TALKS.length };
}

function saveSettings(s: AdminSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

function mockAnalytics(title: string) {
  const seed = title.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const views = (seed % 9000) + 400;
  return {
    views, likes: Math.floor(views * 0.07), saves: Math.floor(views * 0.04),
    avgReadTime: `${2 + (seed % 6)}:${String(seed % 60).padStart(2,"0")}`,
    ctr: `${(3 + (seed % 9)).toFixed(1)}%`,
    shares: Math.floor(views * 0.02),
  };
}

function formatBytes(b: number): string {
  if (b >= 1_000_000_000) return `${(b / 1_000_000_000).toFixed(1)} GB`;
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)} MB`;
  return `${(b / 1_000).toFixed(0)} KB`;
}

/* ── Shared UI ───────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color }: { icon: LucideIcon; label: string; value: string | number; sub?: string; color: string; }) {
  return (
    <div className="rounded-2xl p-5" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background:`${color}15`, border:`1px solid ${color}25` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <TrendingUp className="h-4 w-4 text-slate-700" />
      </div>
      <div className="text-2xl font-black text-white mb-0.5">{value}</div>
      <div className="text-xs font-bold text-slate-400">{label}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-black text-white">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Table({ cols, rows, onRowClick }: { cols: string[]; rows: React.ReactNode[][]; onRowClick?: (i: number) => void; }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)" }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.03)" }}>
            {cols.map((c,i) => <th key={i} className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wide text-[10px]">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,i) => (
            <tr key={i}
              className={`transition-colors hover:bg-white/5 ${onRowClick ? "cursor-pointer" : ""}`}
              style={{ borderBottom: i < rows.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
              onClick={() => onRowClick?.(i)}>
              {row.map((cell,j) => <td key={j} className="px-4 py-3 text-slate-300 align-middle">{cell}</td>)}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={cols.length} className="px-4 py-10 text-center text-slate-600">No entries yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}>
      <div className={`relative w-full ${wide ? "max-w-3xl" : "max-w-xl"} max-h-[90vh] overflow-y-auto rounded-2xl`}
        style={{ background:"#0d1a2e", border:"1px solid rgba(245,165,36,0.25)" }}>
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 z-10"
          style={{ background:"#0d1a2e", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-sm font-black text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function AdminInput({ label, value, onChange, type="text", placeholder, textarea }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; textarea?: boolean;
}) {
  const cls = "w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none transition-all";
  const sty = { background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)" };
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">{label}</label>
      {textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
            className={cls + " resize-none"} style={sty} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className={cls} style={sty} />}
    </div>
  );
}

function CatBadge({ cat }: { cat: FeedCategory }) {
  const c = FEED_CATEGORIES.find(f => f.id === cat);
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
      style={{ background:`${CAT_COLOR[cat]}15`, color:CAT_COLOR[cat] }}>
      {c?.emoji} {cat}
    </span>
  );
}

/* ── User Detail Modal ───────────────────────────────────────── */
function UserDetailModal({ user, onClose }: { user: SampleUser; onClose: () => void; }) {
  const [tab, setTab] = useState<"profile"|"activity"|"subscription"|"credentials">("profile");
  const [showPw, setShowPw] = useState(false);
  const planColor = PLAN_COLOR[user.plan];
  const tabs: { key: typeof tab; label: string; icon: LucideIcon }[] = [
    { key:"profile",      label:"Profile",      icon:UserIcon   },
    { key:"activity",     label:"Activity",     icon:Activity   },
    { key:"subscription", label:"Subscription", icon:Star       },
    { key:"credentials",  label:"Credentials",  icon:Lock       },
  ];
  return (
    <Modal title={`User: ${user.id}`} onClose={onClose} wide>
      <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background:"linear-gradient(135deg,rgba(245,165,36,0.2),rgba(234,88,12,0.15))", border:"1px solid rgba(245,165,36,0.2)" }}>
          {user.avatarId === "nova"?"👩🏻‍💻": user.avatarId === "kai"?"👨🏽‍🔧": user.avatarId === "zara"?"👩🏾‍💼": user.avatarId === "max"?"👨🏼‍🔨": user.avatarId === "aria"?"👩🏽‍⚕️": user.avatarId === "dev"?"👨🏾‍💼": user.avatarId === "luna"?"👩🏻‍🎨":"👨🏿‍💻"}
        </div>
        <div>
          <div className="text-lg font-black text-white">{user.name}</div>
          <div className="text-xs text-slate-500 font-mono">{user.id}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold capitalize"
              style={{ background:`${planColor}15`, color:planColor, border:`1px solid ${planColor}30` }}>
              {user.plan.toUpperCase()}
            </span>
            <span className="text-[10px] text-slate-500">Joined {new Date(user.joinedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6">
        {tabs.map(({ key, label, icon:Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all"
            style={tab === key
              ? { background:"rgba(245,165,36,0.12)", color:"#f5a524", border:"1px solid rgba(245,165,36,0.25)" }
              : { color:"#64748b", border:"1px solid rgba(255,255,255,0.06)" }}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="space-y-3">
          {[
            ["Full Name",        user.name],
            ["Email",            user.email],
            ["Career Interest",  user.careerInterest],
            ["School",           user.school],
            ["Graduation Year",  String(user.graduationYear)],
            ["Avatar",           user.avatarId],
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between items-center py-2.5 px-3 rounded-xl"
              style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">{k}</span>
              <span className="text-sm text-white font-semibold">{v}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "activity" && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label:"Level",    value:user.level,              color:"#f5a524" },
              { label:"Total XP", value:user.xp.toLocaleString(), color:"#3b82f6" },
              { label:"Badges",   value:user.badges,             color:"#a855f7" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center"
                style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${s.color}25` }}>
                <div className="text-xl font-black mb-0.5" style={{ color:s.color }}>{s.value}</div>
                <div className="text-[10px] text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[
              ["Last Active",        user.lastActive],
              ["Sessions This Week", String(Math.floor(user.sessions / 4))],
              ["Total Sessions",     String(user.sessions)],
              ["Simulations Run",    String(user.simulations)],
              ["Missions Completed", String(user.missionsCompleted)],
            ].map(([k,v]) => (
              <div key={k} className="flex justify-between items-center py-2.5 px-3 rounded-xl"
                style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">{k}</span>
                <span className="text-sm text-white font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "subscription" && (
        <div className="space-y-3">
          <div className="rounded-2xl p-4 text-center mb-4" style={{ background:`${planColor}10`, border:`1px solid ${planColor}30` }}>
            <div className="text-3xl font-black mb-1" style={{ color:planColor }}>{PLAN_PRICE[user.plan]}</div>
            <div className="text-sm text-white font-bold capitalize">{user.plan} Plan</div>
            {user.plan !== "free" && (
              <div className="text-xs text-slate-500 mt-1">Next billing: {user.billingDate ? new Date(user.billingDate).toLocaleDateString() : "—"}</div>
            )}
          </div>
          {[
            ["Plan",          <span className="text-sm font-bold capitalize" style={{ color:planColor }}>{user.plan}</span>],
            ["Status",        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background:"rgba(34,197,94,0.12)", color:"#22c55e" }}>Active</span>],
            ["Price",         <span className="text-sm text-white font-semibold">{PLAN_PRICE[user.plan]}</span>],
            ["Payment Method", user.cardBrand ? (
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-sm text-white font-semibold">{user.cardBrand} ···· {user.cardLast4}</span>
              </div>
            ) : <span className="text-xs text-slate-500">No card on file</span>],
            ["Billing Email", <span className="text-sm text-white font-semibold">{user.billingEmail || user.email}</span>],
            ["Next Billing",  <span className="text-sm text-white font-semibold">{user.billingDate ? new Date(user.billingDate).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}) : "—"}</span>],
          ].map(([k,v],i) => (
            <div key={i} className="flex justify-between items-center py-2.5 px-3 rounded-xl"
              style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">{k as string}</span>
              <div>{v}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "credentials" && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl mb-2"
            style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)" }}>
            <p className="text-[11px] text-red-400">Credentials are displayed for admin support purposes only. Never share this information.</p>
          </div>
          <div className="py-2.5 px-3 rounded-xl" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-1">Email Address</div>
            <div className="text-sm text-white font-semibold font-mono">{user.email}</div>
          </div>
          <div className="py-2.5 px-3 rounded-xl" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Password</div>
              <button onClick={() => setShowPw(v => !v)} className="text-slate-500 hover:text-slate-300 transition-colors">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="text-sm font-semibold font-mono" style={{ color: showPw ? "#f5a524" : "#64748b" }}>
              {showPw ? user.password : "•".repeat(user.password.length)}
            </div>
          </div>
          <div className="py-2.5 px-3 rounded-xl" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-1">Member Since</div>
            <div className="text-sm text-white font-semibold">{new Date(user.joinedAt).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── Analytics Modal ─────────────────────────────────────────── */
function AnalyticsModal({ title, category, onClose, onEdit }: { title: string; category: FeedCategory; onClose: () => void; onEdit: () => void; }) {
  const a = mockAnalytics(title);
  return (
    <Modal title="Post Analytics" onClose={onClose}>
      <div className="mb-4 pb-4" style={{ borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div className="text-sm font-black text-white mb-1">{title}</div>
        <CatBadge cat={category} />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label:"Views",    value:a.views.toLocaleString(), icon:Eye,      color:"#3b82f6" },
          { label:"Likes",    value:a.likes.toLocaleString(), icon:Heart,    color:"#ec4899" },
          { label:"Saves",    value:a.saves.toLocaleString(), icon:Bookmark, color:"#f5a524" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center" style={{ background:`${s.color}10`, border:`1px solid ${s.color}25` }}>
            <div className="text-xl font-black mb-0.5" style={{ color:s.color }}>{s.value}</div>
            <div className="text-[10px] text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="space-y-2 mb-5">
        {[
          ["Avg. Read Time", a.avgReadTime, Clock],
          ["Click-Through Rate", a.ctr, TrendingUp],
          ["Shares", String(a.shares), FileText],
        ].map(([k,v,Icon]) => {
          const I = Icon as LucideIcon;
          return (
            <div key={k as string} className="flex items-center justify-between py-2 px-3 rounded-xl"
              style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 text-xs text-slate-400"><I className="h-3.5 w-3.5" />{k as string}</div>
              <span className="text-sm font-bold text-white">{v as string}</span>
            </div>
          );
        })}
      </div>
      <button onClick={onEdit}
        className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
        style={{ background:"linear-gradient(135deg,#f5a524,#ea580c)", color:"#0a1428" }}>
        <Edit3 className="h-4 w-4" /> Edit This Post
      </button>
    </Modal>
  );
}

/* ── Article Edit Modal ──────────────────────────────────────── */
function ArticleEditModal({ title, category, onClose, onSave }: {
  title: string; category: FeedCategory; onClose: () => void; onSave: () => void;
}) {
  const [t, setT] = useState(title);
  const [cat, setCat] = useState<FeedCategory>(category);
  const [excerpt, setExcerpt] = useState("This article explores key insights about " + title.split(" ").slice(0,4).join(" ").toLowerCase() + ".");
  const [saved, setSaved] = useState(false);
  return (
    <Modal title="Edit Post" onClose={onClose} wide>
      <div className="space-y-4">
        <AdminInput label="Title" value={t} onChange={setT} placeholder="Article title" />
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Category</label>
          <select value={cat} onChange={e => setCat(e.target.value as FeedCategory)}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)" }}>
            {FEED_CATEGORIES.map(c => <option key={c.id} value={c.id} style={{ background:"#0d1a2e" }}>{c.emoji} {c.label}</option>)}
          </select>
        </div>
        <AdminInput label="Excerpt / Summary" value={excerpt} onChange={setExcerpt} textarea placeholder="Brief description shown in feed cards" />
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/10 transition-colors">Cancel</button>
          <button onClick={() => { setSaved(true); setTimeout(() => { onSave(); onClose(); }, 1000); }}
            className="px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
            style={saved ? { background:"rgba(34,197,94,0.15)", color:"#22c55e" } : { background:"linear-gradient(135deg,#f5a524,#ea580c)", color:"#0a1428" }}>
            {saved ? <><Check className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> Save Changes</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Talk Edit Modal ─────────────────────────────────────────── */
function TalkEditModal({ initial, onClose, onSave }: {
  initial: { title: string; speaker: string; organization: string; category: string; duration: string };
  onClose: () => void; onSave: (d: typeof initial) => void;
}) {
  const [f, setF] = useState({ ...initial });
  const [saved, setSaved] = useState(false);
  return (
    <Modal title="Edit Recorded Talk" onClose={onClose} wide>
      <div className="space-y-4">
        <AdminInput label="Title" value={f.title} onChange={v => setF(p => ({ ...p, title:v }))} placeholder="Talk title" />
        <div className="grid grid-cols-2 gap-4">
          <AdminInput label="Speaker" value={f.speaker} onChange={v => setF(p => ({ ...p, speaker:v }))} placeholder="Full name" />
          <AdminInput label="Organization" value={f.organization} onChange={v => setF(p => ({ ...p, organization:v }))} placeholder="Company / university" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Category</label>
            <select value={f.category} onChange={e => setF(p => ({ ...p, category:e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)" }}>
              {FEED_CATEGORIES.map(c => <option key={c.id} value={c.id} style={{ background:"#0d1a2e" }}>{c.emoji} {c.label}</option>)}
            </select>
          </div>
          <AdminInput label="Duration (MM:SS)" value={f.duration} onChange={v => setF(p => ({ ...p, duration:v }))} placeholder="42:18" />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/10 transition-colors">Cancel</button>
          <button onClick={() => { setSaved(true); setTimeout(() => { onSave(f); onClose(); }, 800); }}
            className="px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
            style={saved ? { background:"rgba(34,197,94,0.15)", color:"#22c55e" } : { background:"linear-gradient(135deg,#f5a524,#ea580c)", color:"#0a1428" }}>
            {saved ? <><Check className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> Save Changes</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Livestream Edit Modal ───────────────────────────────────── */
function LivestreamEditModal({ initial, onClose, onSave }: {
  initial: { title: string; host: string; category: string; scheduledAt: string; maxAttendees: string; description: string; zoomLink?: string; zoomPassword?: string };
  onClose: () => void; onSave: (d: typeof initial) => void;
}) {
  const [f, setF] = useState({ zoomLink: "", zoomPassword: "", ...initial });
  const [saved, setSaved] = useState(false);
  const dtStr = new Date(f.scheduledAt).toISOString().slice(0,16);
  return (
    <Modal title="Edit Livestream Session" onClose={onClose} wide>
      <div className="space-y-4">
        <AdminInput label="Session Title" value={f.title} onChange={v => setF(p => ({ ...p, title:v }))} placeholder="Session title" />
        <div className="grid grid-cols-2 gap-4">
          <AdminInput label="Host Name(s)" value={f.host} onChange={v => setF(p => ({ ...p, host:v }))} placeholder="Full name" />
          <AdminInput label="Max Attendees" value={f.maxAttendees} onChange={v => setF(p => ({ ...p, maxAttendees:v }))} placeholder="500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Category</label>
            <select value={f.category} onChange={e => setF(p => ({ ...p, category:e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)" }}>
              {FEED_CATEGORIES.map(c => <option key={c.id} value={c.id} style={{ background:"#0d1a2e" }}>{c.emoji} {c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Date & Time</label>
            <input type="datetime-local" value={dtStr}
              onChange={e => setF(p => ({ ...p, scheduledAt: new Date(e.target.value).toISOString() }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)" }} />
          </div>
        </div>
        <AdminInput label="Description" value={f.description} onChange={v => setF(p => ({ ...p, description:v }))} textarea placeholder="Session description" />
        <div className="grid grid-cols-2 gap-4">
          <AdminInput label="Zoom Link (optional)" value={f.zoomLink ?? ""} onChange={v => setF(p => ({ ...p, zoomLink:v }))} placeholder="https://zoom.us/j/..." />
          <AdminInput label="Zoom Password (optional)" value={f.zoomPassword ?? ""} onChange={v => setF(p => ({ ...p, zoomPassword:v }))} placeholder="Password or passcode" />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/10 transition-colors">Cancel</button>
          <button onClick={() => { setSaved(true); setTimeout(() => { onSave(f); onClose(); }, 800); }}
            className="px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
            style={saved ? { background:"rgba(34,197,94,0.15)", color:"#22c55e" } : { background:"linear-gradient(135deg,#ef4444,#dc2626)", color:"white" }}>
            {saved ? <><Check className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> Save Changes</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── File Drop Zone ──────────────────────────────────────────── */
function FileDropZone({ accept, maxBytes, label, hint, onFile }: {
  accept: string; maxBytes: number; label: string; hint: string;
  onFile: (f: UploadedFile | null) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback((f: File) => {
    setError("");
    if (f.size > maxBytes) {
      setError(`File too large. Max is ${formatBytes(maxBytes)}. Your file is ${formatBytes(f.size)}.`);
      setFile(null); onFile(null); return;
    }
    const obj: UploadedFile = { name:f.name, size:f.size, objectUrl:URL.createObjectURL(f), ready:true };
    setFile(obj); onFile(obj);
  }, [maxBytes, onFile]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handle(f);
  };

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="rounded-2xl p-6 text-center cursor-pointer transition-all"
        style={{
          border: `2px dashed ${dragging ? "#f5a524" : "rgba(255,255,255,0.15)"}`,
          background: dragging ? "rgba(245,165,36,0.06)" : "rgba(255,255,255,0.02)",
        }}>
        <Upload className="h-8 w-8 mx-auto mb-3" style={{ color: dragging ? "#f5a524" : "#475569" }} />
        <p className="text-sm font-bold text-slate-300 mb-1">{label}</p>
        <p className="text-xs text-slate-500 mb-1">{hint}</p>
        <p className="text-[10px] text-slate-600">Drag & drop or click to browse · Max {formatBytes(maxBytes)}</p>
        <input ref={inputRef} type="file" accept={accept} className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); }} />
      </div>
      {error && <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />{error}</p>}
      {file && !error && (
        <div className="mt-3 flex items-center gap-3 p-3 rounded-xl"
          style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)" }}>
          <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{file.name}</p>
            <p className="text-[10px] text-slate-500">{formatBytes(file.size)} · Ready to publish</p>
          </div>
          <button onClick={e => { e.stopPropagation(); setFile(null); onFile(null); }}
            className="text-slate-500 hover:text-red-400 transition-colors"><X className="h-4 w-4" /></button>
        </div>
      )}
      {file && (
        <p className="text-[10px] text-slate-600 mt-2 text-center">Files will be uploaded to your secure media CDN on publish.</p>
      )}
    </div>
  );
}

/* ── Create Post Form ────────────────────────────────────────── */
function CreatePostForm({ onClose, onCreated }: { onClose: () => void; onCreated: (p: CustomPost) => void; }) {
  const [title, setTitle]       = useState("");
  const [excerpt, setExcerpt]   = useState("");
  const [category, setCategory] = useState<FeedCategory>("engineering");
  const [tags, setTags]         = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [saved, setSaved]       = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  const handleImage = (f: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      setImageDataUrl(result);
      setImagePreview(result);
    };
    reader.readAsDataURL(f);
  };

  const valid = title.trim() && excerpt.trim();

  const handleCreate = () => {
    if (!valid) return;
    setSaved(true);
    const post: CustomPost = { id:`post-${Date.now()}`, title:title.trim(), excerpt:excerpt.trim(), category, tags:tags.trim(), imageDataUrl, createdAt: new Date().toISOString() };
    setTimeout(() => { onCreated(post); onClose(); }, 800);
  };

  return (
    <div className="p-5 rounded-2xl mb-6" style={{ background:"rgba(245,165,36,0.04)", border:"1px solid rgba(245,165,36,0.2)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-black text-white flex items-center gap-2">
          <Plus className="h-4 w-4 text-amber-400" /> Create New Post
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-4">
        <AdminInput label="Title *" value={title} onChange={setTitle} placeholder="Post headline" />
        <AdminInput label="Excerpt / Preview Text *" value={excerpt} onChange={setExcerpt} textarea placeholder="What students will see in the feed card…" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Category *</label>
            <select value={category} onChange={e => setCategory(e.target.value as FeedCategory)}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)" }}>
              {FEED_CATEGORIES.map(c => <option key={c.id} value={c.id} style={{ background:"#0d1a2e" }}>{c.emoji} {c.label}</option>)}
            </select>
          </div>
          <AdminInput label="Tags (comma separated)" value={tags} onChange={setTags} placeholder="careers, engineering, stem" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Cover Image (optional)</label>
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden" style={{ height: 140 }}>
              <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
              <button onClick={() => { setImageDataUrl(""); setImagePreview(""); }}
                className="absolute top-2 right-2 h-7 w-7 rounded-lg flex items-center justify-center text-white transition-all"
                style={{ background:"rgba(0,0,0,0.7)" }}>
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div onClick={() => imgRef.current?.click()}
              className="rounded-xl p-5 text-center cursor-pointer transition-all hover:bg-white/5"
              style={{ border:"2px dashed rgba(255,255,255,0.12)" }}>
              <Image className="h-6 w-6 mx-auto mb-2 text-slate-600" />
              <p className="text-xs text-slate-500">Click to upload image · PNG, JPG, WebP</p>
            </div>
          )}
          <input ref={imgRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f); }} />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/10 transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={!valid || saved}
            className="px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-40"
            style={saved ? { background:"rgba(34,197,94,0.15)", color:"#22c55e" } : { background:"linear-gradient(135deg,#f5a524,#ea580c)", color:"#0a1428" }}>
            {saved ? <><Check className="h-4 w-4" /> Published!</> : <><Plus className="h-4 w-4" /> Publish Post</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Recorded Livestream Form ────────────────────────────────── */
function RecordedLivestreamForm({ onClose, onAdd }: { onClose: () => void; onAdd: (r: RecordedLivestream) => void; }) {
  const [title, setTitle]         = useState("");
  const [speaker, setSpeaker]     = useState("");
  const [org, setOrg]             = useState("");
  const [category, setCategory]   = useState<FeedCategory>("engineering");
  const [duration, setDuration]   = useState("");
  const [recorded, setRecorded]   = useState("");
  const [description, setDesc]    = useState("");
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const valid = title.trim() && speaker.trim();

  const ONE_HOUR_MAX = 4 * 1024 * 1024 * 1024;

  return (
    <div className="p-5 rounded-2xl mt-4" style={{ background:"rgba(168,85,247,0.05)", border:"1px solid rgba(168,85,247,0.2)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-black text-white flex items-center gap-2">
          <Video className="h-4 w-4 text-purple-400" /> Add Recorded Livestream
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-4">
        <AdminInput label="Session Title *" value={title} onChange={setTitle} placeholder="Livestream title" />
        <div className="grid grid-cols-2 gap-4">
          <AdminInput label="Speaker / Host *" value={speaker} onChange={setSpeaker} placeholder="Full name" />
          <AdminInput label="Organization" value={org} onChange={setOrg} placeholder="Company / university" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as FeedCategory)}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)" }}>
              {FEED_CATEGORIES.map(c => <option key={c.id} value={c.id} style={{ background:"#0d1a2e" }}>{c.emoji} {c.label}</option>)}
            </select>
          </div>
          <AdminInput label="Duration (MM:SS)" value={duration} onChange={setDuration} placeholder="58:42" />
          <AdminInput label="Recorded Date" value={recorded} onChange={setRecorded} type="date" placeholder="" />
        </div>
        <AdminInput label="Description" value={description} onChange={setDesc} textarea placeholder="What was covered in this session" />
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-2">Recording File (max 1 hour · up to 4 GB)</label>
          <FileDropZone
            accept="video/*" maxBytes={ONE_HOUR_MAX}
            label="Upload recording file"
            hint="MP4, MOV, WebM · Livestream recordings up to 1 hour"
            onFile={setUploadedFile} />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/10 transition-colors">Cancel</button>
          <button onClick={() => valid && onAdd({ id:`rl-${Date.now()}`, title, speaker, organization:org, category, duration, recordedDate:recorded, description, fileName:uploadedFile?.name })}
            disabled={!valid}
            className="px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-40"
            style={{ background:"linear-gradient(135deg,#a855f7,#7c3aed)", color:"white" }}>
            <Video className="h-4 w-4" /> Add Recording
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Leads Tab ───────────────────────────────────────────────── */
function LeadsTab() {
  const CONTACT_KEY    = "1waymirror_contact_v1";
  const NEWSLETTER_KEY = "1waymirror_newsletter_v1";

  type ContactEntry = { name: string; email: string; phone?: string; message: string; submittedAt: string };
  type NewsletterEntry = { email: string; subscribedAt: string };

  const contacts = useMemo<ContactEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(CONTACT_KEY) ?? "[]") as ContactEntry[]; }
    catch { return []; }
  }, []);

  const subscribers = useMemo<NewsletterEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(NEWSLETTER_KEY) ?? "[]") as NewsletterEntry[]; }
    catch { return []; }
  }, []);

  return (
    <>
      <Section title="Newsletter Subscribers" subtitle={`${subscribers.length} email${subscribers.length !== 1 ? "s" : ""} collected via the landing page footer`}>
        {subscribers.length === 0 ? (
          <div className="text-slate-500 text-sm py-6 text-center">No newsletter subscribers yet. Emails collected when users sign up from the landing page footer.</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-400">#</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-400">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-400">Subscribed At</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td className="px-4 py-3 text-slate-500 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-white font-mono text-xs">{s.email}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(s.subscribedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Contact Form Submissions" subtitle={`${contacts.length} message${contacts.length !== 1 ? "s" : ""} submitted via the landing page contact form`}>
        {contacts.length === 0 ? (
          <div className="text-slate-500 text-sm py-6 text-center">No contact form submissions yet. Messages collected when visitors submit the form on the landing page.</div>
        ) : (
          <div className="space-y-4">
            {[...contacts].reverse().map((c, i) => (
              <div key={i} className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex flex-wrap gap-4 items-start justify-between mb-3">
                  <div>
                    <div className="text-white font-bold text-sm">{c.name}</div>
                    <a href={`mailto:${c.email}`} className="text-blue-400 text-xs hover:underline">{c.email}</a>
                    {c.phone && <span className="text-slate-400 text-xs ml-3">{c.phone}</span>}
                  </div>
                  <div className="text-xs text-slate-500">{new Date(c.submittedAt).toLocaleString()}</div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{c.message}</p>
                <div className="mt-3">
                  <a href={`mailto:${c.email}?subject=Re: Your 1WayMirror Inquiry`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: "rgba(29,78,216,0.2)", color: "#60a5fa", border: "1px solid rgba(29,78,216,0.3)" }}>
                    <Mail className="h-3 w-3" /> Reply via Email
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

/* ── Account Edit Modal ──────────────────────────────────────── */
function AccountEditModal({ account, onClose, onSaved }: { account: Account; onClose: () => void; onSaved: () => void; }) {
  const [name, setName]   = useState(account.name);
  const [plan, setPlan]   = useState<"free"|"pro"|"premium">(account.plan ?? "free");
  const [saved, setSaved] = useState(false);
  const planColor = PLAN_COLOR[plan];
  return (
    <Modal title={`Edit: ${account.email}`} onClose={onClose} wide>
      <div className="space-y-4">
        <AdminInput label="Full Name" value={name} onChange={setName} placeholder="Display name" />
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-2">Subscription Plan</label>
          <div className="grid grid-cols-3 gap-2">
            {(["free","pro","premium"] as const).map(p => (
              <button key={p} onClick={() => setPlan(p)}
                className="py-2.5 rounded-xl text-xs font-bold transition-all capitalize"
                style={plan===p
                  ? { background:`${PLAN_COLOR[p]}20`, color:PLAN_COLOR[p], border:`1px solid ${PLAN_COLOR[p]}50` }
                  : { background:"rgba(255,255,255,0.04)", color:"#64748b", border:"1px solid rgba(255,255,255,0.1)" }}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="p-3 rounded-xl" style={{ background:`${planColor}08`, border:`1px solid ${planColor}25` }}>
          <div className="text-xs text-slate-400">
            Registered: {new Date(account.registeredAt).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}
          </div>
          <div className="text-xs text-slate-400 mt-1">Email: <span className="text-white font-mono">{account.email}</span></div>
          <div className="text-xs text-slate-400 mt-1">Password: {account.password.startsWith("$sha256$") ? "🔒 Hashed" : "⚠️ Plaintext (will hash on next login)"}</div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/10 transition-colors">Cancel</button>
          <button onClick={() => {
            updateAccount(account.email, { name: name.trim(), plan });
            setSaved(true);
            setTimeout(() => { onSaved(); onClose(); }, 800);
          }} className="px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
            style={saved ? { background:"rgba(34,197,94,0.15)", color:"#22c55e" } : { background:"linear-gradient(135deg,#f5a524,#ea580c)", color:"#0a1428" }}>
            {saved ? <><Check className="h-4 w-4" />Saved!</> : <><Save className="h-4 w-4" />Save Changes</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminPage() {
  /* auth */
  const [adminEmail, setAdminEmail]       = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [authed, setAuthed]               = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false); // true once restore attempt completes
  const [loginError, setLoginError]       = useState<string | null>(null);
  const [loginLoading, setLoginLoading]   = useState(false);
  const [showPw, setShowPw]               = useState(false);

  // On mount: silently try to restore session from httpOnly refresh cookie
  useEffect(() => {
    fetchCurrentSession().then(user => {
      if (user?.role === "admin") setAuthed(true);
    }).finally(() => setSessionChecked(true));
  }, []);

  /* layout */
  const [activeTab, setActiveTab]   = useState<AdminTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* dario activity */
  type DarioLog = {
    sessionId: string; userId: string; userName: string; userEmail: string;
    sessionTitle: string;
    school: string; graduationYear: number | null; gpa: string; sat: string; careerInterest: string;
    careersDiscussed: string[]; messageCount: number;
    conversationExcerpt: { role: string; content: string }[];
    opportunitiesSearched: string[]; actionItemCount: number;
    roadmapMilestoneCount: number; totalSessionsCount: number;
    allCareersEver: string[];
    personalityGenerated: boolean; reportGenerated: boolean;
    sessionStartedAt: string; sessionEndedAt: string; loggedAt: string;
  };
  const [darioLogs, setDarioLogs] = useState<DarioLog[]>([]);
  const [darioLoading, setDarioLoading] = useState(false);
  const [darioExpanded, setDarioExpanded] = useState<string | null>(null);
  const [darioConvoOpen, setDarioConvoOpen] = useState<string | null>(null);

  const loadDarioLogs = useCallback(async () => {
    setDarioLoading(true);
    try {
      const res = await authFetch("/api/dario/activity");
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json() as { logs: DarioLog[] };
      setDarioLogs(data.logs);
    } catch { setDarioLogs([]); }
    finally { setDarioLoading(false); }
  }, []);

  /* settings */
  const [settings, setSettings] = useState<AdminSettings>(loadSettings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  /* feed */
  const feedItems = useMemo(() => getAllFeedItems(), []);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [customPosts, setCustomPosts]       = useState<CustomPost[]>([]);
  const [analyticsItem, setAnalyticsItem]   = useState<{ title: string; category: FeedCategory } | null>(null);
  const [editItem, setEditItem]             = useState<{ title: string; category: FeedCategory } | null>(null);

  /* videos */
  const totalBuiltInVideos = VIDEO_PLAYLISTS.reduce((a,p) => a + p.videos.length, 0);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [vidInputMode, setVidInputMode]   = useState<"url"|"file">("url");
  const [vidUrl, setVidUrl]       = useState("");
  const [vidTitle, setVidTitle]   = useState("");
  const [vidCat, setVidCat]       = useState<FeedCategory>("engineering");
  const [vidDesc, setVidDesc]     = useState("");
  const [vidDuration, setVidDuration] = useState("");
  const [vidUploading, setVidUploading] = useState(false);
  const [vidUploadStatus, setVidUploadStatus] = useState("");
  const [customVideos, setCustomVideos] = useState<AdminVideoEntry[]>(loadAdminVideos);

  /* talks */
  const [talkSubTab, setTalkSubTab] = useState<"recorded"|"recordings"|"upcoming">("recorded");
  const [editTalk, setEditTalk]     = useState<typeof EXPERT_TALKS[0] | null>(null);
  const [editLive, setEditLive]     = useState<typeof UPCOMING_LIVESTREAMS[0] | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showRecLive, setShowRecLive]   = useState(false);
  const [recordedLivestreams, setRecordedLivestreams] = useState<RecordedLivestream[]>([]);
  const [customStreams, setCustomStreams] = useState<{ id:string; title:string; host:string; cat:FeedCategory; scheduledAt:string; desc:string; maxAttendees:number; visibleTo:string[] }[]>([]);
  const [schedTitle, setSchedTitle]         = useState("");
  const [schedHost, setSchedHost]           = useState("");
  const [schedCat, setSchedCat]             = useState<FeedCategory>("engineering");
  const [schedDate, setSchedDate]           = useState("");
  const [schedTime, setSchedTime]           = useState("18:00");
  const [schedDesc, setSchedDesc]           = useState("");
  const [schedMax, setSchedMax]             = useState("500");
  const [schedZoomLink, setSchedZoomLink]   = useState("");
  const [schedZoomPass, setSchedZoomPass]   = useState("");
  const [schedVisibleTo, setSchedVisibleTo] = useState<string[]>([]);

  /* users */
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [liveAccounts, setLiveAccounts]     = useState<Account[]>(() => getAllAccounts());
  const refreshAccounts = () => setLiveAccounts(getAllAccounts());

  /* ── LOGIN GATE ─────────────────────────────────────── */
  const handleLogin = async () => {
    if (!adminEmail.trim() || !adminPassword) return;
    setLoginLoading(true);
    setLoginError(null);
    try {
      const user = await verifyAccount(adminEmail.trim(), adminPassword);
      if (!user) {
        setLoginError("Invalid email or password.");
        setTimeout(() => setLoginError(null), 3000);
        return;
      }
      if (user.role !== "admin") {
        setLoginError("Access denied. Admin privileges required.");
        setTimeout(() => setLoginError(null), 3000);
        return;
      }
      signIn(user);
      setAuthed(true);
    } catch {
      setLoginError("Unable to connect. Please try again.");
      setTimeout(() => setLoginError(null), 3000);
    } finally {
      setLoginLoading(false);
    }
  };

  // Show nothing while checking refresh cookie (avoids login flash on reload)
  if (!sessionChecked) return null;

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background:"radial-gradient(ellipse at top, #0d1f3c 0%, #0a1428 60%)" }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link href="/"><img src={`${BASE}logo.png`} alt="1WayMirror" className="h-16 w-auto object-contain mx-auto mb-4"
              style={{ filter:"drop-shadow(0 0 16px rgba(245,165,36,0.4))" }} /></Link>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="h-5 w-5" style={{ color:"#f5a524" }} />
              <h1 className="text-xl font-black text-white">Admin Panel</h1>
            </div>
            <p className="text-sm text-slate-500">Sign in with your admin credentials to continue</p>
          </div>
          <div className="p-6 rounded-2xl space-y-3" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(245,165,36,0.2)" }}>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input type="email" value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  placeholder="admin@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-white outline-none text-sm"
                  style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${loginError ? "#ef4444" : "rgba(255,255,255,0.12)"}` }} />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input type={showPw ? "text" : "password"} value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-white outline-none text-sm"
                  style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${loginError ? "#ef4444" : "rgba(255,255,255,0.12)"}` }} />
                <button onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {loginError && <div className="flex items-center gap-2 text-xs text-red-400"><AlertCircle className="h-3.5 w-3.5" /> {loginError}</div>}
            <button onClick={handleLogin} disabled={loginLoading}
              className="w-full py-3 rounded-xl text-sm font-black transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background:"linear-gradient(135deg,#f5a524,#ea580c)", color:"#0a1428" }}>
              <Shield className="h-4 w-4 inline mr-2" />{loginLoading ? "Verifying…" : "Enter Admin Panel"}
            </button>
            <Link href="/"><button className="w-full mt-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors">← Back to Home</button></Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── ADMIN LAYOUT ─────────────────────────────────── */
  const handleSaveSettings = () => {
    saveSettings(settings); setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const handleAddVideo = () => {
    if (!vidTitle.trim() || !vidUrl.trim()) return;
    const youtubeId = extractYTId(vidUrl) ?? undefined;
    const vimeoId = extractVimeoId(vidUrl) ?? undefined;
    const videoType: "youtube"|"vimeo"|"direct" = youtubeId ? "youtube" : vimeoId ? "vimeo" : "direct";
    const entry: AdminVideoEntry = {
      id: `av-${Date.now()}`, title: vidTitle.trim(), url: vidUrl.trim(),
      videoType, youtubeId, vimeoId, cat: vidCat, desc: vidDesc.trim(),
      duration: vidDuration.trim() || "—", date: new Date().toISOString().split("T")[0],
    };
    const updated = [...customVideos, entry];
    setCustomVideos(updated);
    try { localStorage.setItem(ADMIN_VIDEOS_KEY, JSON.stringify(updated)); } catch { /* noop */ }
    setVidUrl(""); setVidTitle(""); setVidDesc(""); setVidDuration(""); setShowVideoForm(false);
  };
  const handleDeleteVideo = (id: string) => {
    const updated = customVideos.filter(v => v.id !== id);
    setCustomVideos(updated);
    try { localStorage.setItem(ADMIN_VIDEOS_KEY, JSON.stringify(updated)); } catch { /* noop */ }
  };

  const handleScheduleStream = () => {
    if (!schedTitle.trim() || !schedHost.trim() || !schedDate) return;
    const dt = new Date(`${schedDate}T${schedTime}`);
    setCustomStreams(s => [...s, { id:`cs-${Date.now()}`, title:schedTitle, host:schedHost, cat:schedCat, scheduledAt:dt.toISOString(), desc:schedDesc, maxAttendees:parseInt(schedMax)||500, zoomLink:schedZoomLink, zoomPassword:schedZoomPass, visibleTo:[...schedVisibleTo] }]);
    setSchedTitle(""); setSchedHost(""); setSchedDate(""); setSchedDesc(""); setSchedMax("500"); setSchedZoomLink(""); setSchedZoomPass(""); setSchedVisibleTo([]); setShowSchedule(false);
  };

  return (
    <div className="min-h-screen flex" style={{ background:"#060e1e" }}>
      {/* modals */}
      {editingAccount && <AccountEditModal account={editingAccount} onClose={() => setEditingAccount(null)} onSaved={() => { refreshAccounts(); setEditingAccount(null); }} />}
      {analyticsItem && (
        <AnalyticsModal {...analyticsItem} onClose={() => setAnalyticsItem(null)}
          onEdit={() => { setEditItem(analyticsItem); setAnalyticsItem(null); }} />
      )}
      {editItem && (
        <ArticleEditModal {...editItem} onClose={() => setEditItem(null)} onSave={() => setEditItem(null)} />
      )}
      {editTalk && (
        <TalkEditModal
          initial={{ title:editTalk.title, speaker:editTalk.speaker, organization:editTalk.organization, category:editTalk.category, duration:editTalk.duration }}
          onClose={() => setEditTalk(null)} onSave={() => setEditTalk(null)} />
      )}
      {editLive && (
        <LivestreamEditModal
          initial={{ title:editLive.title, host:editLive.host, category:editLive.category, scheduledAt:editLive.scheduledAt, maxAttendees:String(editLive.maxAttendees), description:editLive.description }}
          onClose={() => setEditLive(null)} onSave={() => setEditLive(null)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className="flex-shrink-0 flex flex-col"
        style={{ width:sidebarOpen?220:64, background:"rgba(10,20,40,0.98)", borderRight:"1px solid rgba(245,165,36,0.15)", transition:"width 0.2s" }}>
        <div className="h-14 flex items-center px-4 gap-3 flex-shrink-0"
          style={{ borderBottom:"1px solid rgba(245,165,36,0.15)" }}>
          <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background:"linear-gradient(135deg,#f5a524,#ea580c)" }}>
            <Shield className="h-4 w-4 text-black" />
          </div>
          {sidebarOpen && <span className="font-black text-white text-sm whitespace-nowrap">Admin Panel</span>}
          <button onClick={() => setSidebarOpen(v => !v)} className="ml-auto text-slate-600 hover:text-slate-300">
            <ChevronRight className={`h-4 w-4 transition-transform ${sidebarOpen?"rotate-180":""}`} />
          </button>
        </div>
        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {SIDEBAR.map(({ tab, icon:Icon, label }) => {
            const active = activeTab === tab;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={active
                  ? { background:"rgba(245,165,36,0.12)", color:"#f5a524", border:"1px solid rgba(245,165,36,0.2)" }
                  : { color:"#64748b", border:"1px solid transparent" }}>
                <Icon className="h-4 w-4 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{label}</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t flex flex-col gap-1.5" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
          <Link href="/"><button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
            <Home className="h-4 w-4 flex-shrink-0" />{sidebarOpen && "Home Page"}
          </button></Link>
          <button
              onClick={async () => {
                signOut(); // clears access token + calls POST /api/auth/logout (clears httpOnly cookie)
                setAuthed(false);
                setSessionChecked(false); // reset so next mount check starts fresh
                setSessionChecked(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-400 hover:bg-red-900/10 transition-colors">
            <LogOut className="h-4 w-4 flex-shrink-0" />{sidebarOpen && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="sticky top-0 z-30 h-14 flex items-center px-6 gap-3"
          style={{ background:"rgba(6,14,30,0.97)", borderBottom:"1px solid rgba(255,255,255,0.07)", backdropFilter:"blur(12px)" }}>
          <div>
            <div className="text-sm font-black text-white">{SIDEBAR.find(s => s.tab === activeTab)?.label}</div>
            <div className="text-[10px] text-slate-600">1WayMirror Admin</div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
              style={{ background:"rgba(34,197,94,0.12)", color:"#22c55e", border:"1px solid rgba(34,197,94,0.2)" }}>
              ● LIVE
            </div>
            <div className="text-xs text-slate-500">{new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</div>
          </div>
        </div>

        <div className="p-6">

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <>
              <Section title="Platform Overview" subtitle="Real-time stats across all content modules">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <StatCard icon={Newspaper} label="Total Articles" value={feedItems.length} sub="8 categories · daily rotation" color="#f5a524" />
                  <StatCard icon={Film} label="Total Videos" value={totalBuiltInVideos + customVideos.length} sub={`${VIDEO_PLAYLISTS.length} playlists`} color="#3b82f6" />
                  <StatCard icon={Mic} label="Expert Talks" value={EXPERT_TALKS.length} sub="Recorded sessions" color="#a855f7" />
                  <StatCard icon={Radio} label="Livestreams" value={UPCOMING_LIVESTREAMS.length + customStreams.length} sub="Upcoming sessions" color="#ef4444" />
                  <StatCard icon={FileText} label="Daily Articles" value={`${settings.dailyRotation * 8}/day`} sub={`${settings.dailyRotation} per category`} color="#22d3ee" />
                  <StatCard icon={Video} label="External Articles" value={EXTERNAL_ARTICLES.length} sub="3rd-party publishers" color="#4ade80" />
                  <StatCard icon={Users} label="Registered Users" value={liveAccounts.length} sub="All plans" color="#f97316" />
                  <StatCard icon={Bell} label="Recorded Livestreams" value={recordedLivestreams.length} sub="Archived sessions" color="#ec4899" />
                </div>
              </Section>
              <Section title="Content Health" subtitle="Status of each content module">
                <div className="rounded-2xl overflow-hidden" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)" }}>
                  {[
                    { label:"Career Feed",           count:`${feedItems.length} articles`,                              color:"#22c55e" },
                    { label:"Video Library",          count:`${totalBuiltInVideos + customVideos.length} videos`,        color:"#22c55e" },
                    { label:"Expert Talks",           count:`${EXPERT_TALKS.length} recorded talks`,                    color:"#22c55e" },
                    { label:"Recorded Livestreams",   count:`${recordedLivestreams.length} archived sessions`,          color: recordedLivestreams.length > 0 ? "#22c55e" : "#f5a524" },
                    { label:"Upcoming Livestreams",   count:`${UPCOMING_LIVESTREAMS.length + customStreams.length} scheduled`, color:"#22c55e" },
                    { label:"Custom Posts",           count:`${customPosts.length} admin posts`,                        color: customPosts.length > 0 ? "#22c55e" : "#64748b" },
                  ].map((item,i,arr) => (
                    <div key={item.label} className="flex items-center gap-3 px-4 py-3"
                      style={i < arr.length-1 ? { borderBottom:"1px solid rgba(255,255,255,0.05)" } : {}}>
                      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background:item.color }} />
                      <span className="text-sm font-semibold text-white flex-1">{item.label}</span>
                      <span className="text-xs text-slate-500">{item.count}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background:`${item.color}15`, color:item.color }}>
                        {item.color === "#64748b" ? "Empty" : item.color === "#f5a524" ? "Attention" : "Healthy"}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}

          {/* ── FEED ── */}
          {activeTab === "feed" && (
            <>
              <Section title="Career Feed" subtitle={`${feedItems.length + customPosts.length} total posts`}
                action={
                  <button onClick={() => setShowCreatePost(v => !v)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
                    style={{ background:"linear-gradient(135deg,#f5a524,#ea580c)", color:"#0a1428" }}>
                    <Plus className="h-3.5 w-3.5" /> Create Post
                  </button>
                }>
                {showCreatePost && (
                  <CreatePostForm onClose={() => setShowCreatePost(false)} onCreated={p => setCustomPosts(v => [p,...v])} />
                )}

                {customPosts.length > 0 && (
                  <div className="mb-5">
                    <div className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> Admin-Created Posts ({customPosts.length})
                    </div>
                    <Table
                      cols={["Title","Category","Created","Actions"]}
                      rows={customPosts.map(p => [
                        <div className="flex items-center gap-2">
                          {p.imageDataUrl && <div className="h-8 w-12 rounded overflow-hidden flex-shrink-0"><img src={p.imageDataUrl} className="h-full w-full object-cover" /></div>}
                          <span className="text-white font-semibold">{p.title.slice(0,50)}{p.title.length>50?"…":""}</span>
                        </div>,
                        <CatBadge cat={p.category} />,
                        <span className="text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</span>,
                        <div className="flex gap-2">
                          <button onClick={() => setAnalyticsItem({ title:p.title, category:p.category })} className="text-blue-400 hover:text-blue-300"><BarChart2 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setEditItem({ title:p.title, category:p.category })} className="text-amber-400 hover:text-amber-300"><Edit3 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setCustomPosts(v => v.filter(x => x.id !== p.id))} className="text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>,
                      ])}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {FEED_CATEGORIES.map(cat => {
                    const count = feedItems.filter(a => a.category === cat.id).length;
                    return (
                      <div key={cat.id} className="rounded-xl p-3 text-center"
                        style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${CAT_COLOR[cat.id]}20` }}>
                        <div className="text-xl mb-1">{cat.emoji}</div>
                        <div className="text-sm font-black text-white">{count}</div>
                        <div className="text-[10px] text-slate-500">{cat.label}</div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mb-3">Click any row to view analytics · Click <Edit3 className="h-3 w-3 inline text-amber-400" /> to edit</p>
                <Table
                  cols={["Title","Category","Source","Published","Analytics","Edit"]}
                  rows={feedItems.slice(0,25).map(a => [
                    <span className="text-white font-semibold">{a.title.slice(0,48)}{a.title.length>48?"…":""}</span>,
                    <CatBadge cat={a.category} />,
                    <span className={`text-[10px] font-bold ${a.isExternal?"text-blue-400":"text-slate-400"}`}>
                      {a.isExternal?(a.publisher??"External"):"1WayMirror"}
                    </span>,
                    <span className="text-slate-500">{new Date(a.publishedAt).toLocaleDateString()}</span>,
                    <button onClick={() => setAnalyticsItem({ title:a.title, category:a.category })}
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-[10px] font-bold">
                      <BarChart2 className="h-3.5 w-3.5" /> Stats
                    </button>,
                    <button onClick={() => setEditItem({ title:a.title, category:a.category })}
                      className="text-amber-400 hover:text-amber-300 transition-colors">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>,
                  ])}
                />
                {feedItems.length > 25 && (
                  <p className="text-xs text-slate-600 mt-2 text-center">Showing 25 of {feedItems.length} articles</p>
                )}
              </Section>

              <Section title="Article Sources">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl p-4" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)" }}>
                    <div className="text-2xl font-black text-white mb-1">{POOL_INTERNAL.length}</div>
                    <div className="text-xs font-bold text-slate-300">1WayMirror Original</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Written & reviewed by our career experts</div>
                  </div>
                  <div className="rounded-2xl p-4" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)" }}>
                    <div className="text-2xl font-black text-blue-400 mb-1">{EXTERNAL_ARTICLES.length}</div>
                    <div className="text-xs font-bold text-slate-300">3rd-Party Publications</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">MIT Tech Review, HBR, Forbes, IEEE, and more</div>
                  </div>
                </div>
              </Section>
            </>
          )}

          {/* ── VIDEOS ── */}
          {activeTab === "videos" && (
            <>
              <Section title="Add Video" subtitle="Paste a YouTube URL, Vimeo URL, or direct video file link — up to 20 minutes"
                action={
                  <button onClick={() => setShowVideoForm(v => !v)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
                    style={showVideoForm
                      ? { background:"rgba(245,165,36,0.15)", color:"#f5a524", border:"1px solid rgba(245,165,36,0.35)" }
                      : { background:"linear-gradient(135deg,#f5a524,#ea580c)", color:"#0a1428" }}>
                    <Plus className="h-3.5 w-3.5" /> {showVideoForm ? "Cancel" : "Add Video"}
                  </button>
                }>
                {showVideoForm && (
                  <div className="p-5 rounded-2xl mb-2" style={{ background:"rgba(245,165,36,0.04)", border:"1px solid rgba(245,165,36,0.2)" }}>
                    {/* Mode toggle */}
                    <div className="flex gap-2 mb-4">
                      {(["url","file"] as const).map(m => (
                        <button key={m} onClick={() => setVidInputMode(m)}
                          className="px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all"
                          style={vidInputMode===m
                            ? { background:"rgba(245,165,36,0.15)", color:"#f5a524", border:"1px solid rgba(245,165,36,0.4)" }
                            : { background:"rgba(255,255,255,0.04)", color:"#64748b", border:"1px solid rgba(255,255,255,0.1)" }}>
                          {m === "url" ? "🔗 Add by URL" : "📁 Upload File"}
                        </button>
                      ))}
                    </div>

                    {vidInputMode === "url" ? (
                      <div className="space-y-3 mb-3">
                        <div>
                          <AdminInput label="Video URL *" value={vidUrl} onChange={setVidUrl}
                            placeholder="https://youtube.com/watch?v=... · https://vimeo.com/... · https://example.com/video.mp4" />
                          {vidUrl.trim() && (
                            <p className="text-[10px] mt-1 font-semibold" style={{ color: extractYTId(vidUrl) ? "#4ade80" : extractVimeoId(vidUrl) ? "#60a5fa" : "#94a3b8" }}>
                              {extractYTId(vidUrl) ? "✓ YouTube video detected" : extractVimeoId(vidUrl) ? "✓ Vimeo video detected" : "○ Direct video URL — will use native player"}
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <AdminInput label="Title *" value={vidTitle} onChange={setVidTitle} placeholder="Video title" />
                          <AdminInput label="Duration (e.g. 18:30)" value={vidDuration} onChange={setVidDuration} placeholder="12:45" />
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Category</label>
                            <select value={vidCat} onChange={e => setVidCat(e.target.value as FeedCategory)}
                              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                              style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)" }}>
                              {FEED_CATEGORIES.map(c => <option key={c.id} value={c.id} style={{ background:"#0d1a2e" }}>{c.emoji} {c.label}</option>)}
                            </select>
                          </div>
                          <AdminInput label="Description" value={vidDesc} onChange={setVidDesc} placeholder="Brief description (optional)" />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => { setShowVideoForm(false); setVidUrl(""); setVidTitle(""); setVidDesc(""); setVidDuration(""); }}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/10 transition-colors">Cancel</button>
                          <button onClick={handleAddVideo} disabled={!vidTitle.trim() || !vidUrl.trim()}
                            className="px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                            style={{ background:"linear-gradient(135deg,#f5a524,#ea580c)", color:"#0a1428" }}>
                            <Plus className="h-3.5 w-3.5 inline mr-1" />Add Video
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <AdminInput label="Title *" value={vidTitle} onChange={setVidTitle} placeholder="Video title" />
                          <AdminInput label="Duration (e.g. 18:30)" value={vidDuration} onChange={setVidDuration} placeholder="12:45" />
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Category</label>
                            <select value={vidCat} onChange={e => setVidCat(e.target.value as FeedCategory)}
                              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                              style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)" }}>
                              {FEED_CATEGORIES.map(c => <option key={c.id} value={c.id} style={{ background:"#0d1a2e" }}>{c.emoji} {c.label}</option>)}
                            </select>
                          </div>
                          <AdminInput label="Description" value={vidDesc} onChange={setVidDesc} placeholder="Brief description (optional)" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Video File *</label>
                          <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl cursor-pointer transition-all"
                            style={{ background:"rgba(255,255,255,0.04)", border:"2px dashed rgba(245,165,36,0.3)" }}>
                            <Upload className="h-6 w-6 text-amber-400" />
                            <span className="text-sm text-slate-400">Click to choose a video file</span>
                            <span className="text-[10px] text-slate-600">MP4, WebM, MOV — max 500 MB</span>
                            <input type="file" accept="video/*" className="hidden"
                              onChange={async e => {
                                const file = e.target.files?.[0];
                                if (!file || !vidTitle.trim()) return;
                                setVidUploading(true); setVidUploadStatus("Uploading…");
                                try {
                                  const fd = new FormData(); fd.append("video", file);
                                  const res = await fetch("/api/admin/upload-video", { method:"POST", body:fd });
                                  if (!res.ok) throw new Error("Upload failed");
                                  const { url } = await res.json() as { url:string; filename:string; size:number };
                                  const entry: AdminVideoEntry = {
                                    id:`av-${Date.now()}`, title:vidTitle.trim(), url,
                                    videoType:"direct", cat:vidCat, desc:vidDesc.trim(),
                                    duration:vidDuration.trim() || "—", date:new Date().toISOString().split("T")[0],
                                  };
                                  const updated = [...customVideos, entry];
                                  setCustomVideos(updated);
                                  try { localStorage.setItem(ADMIN_VIDEOS_KEY, JSON.stringify(updated)); } catch { /* noop */ }
                                  setVidUploadStatus(""); setVidTitle(""); setVidDesc(""); setVidDuration(""); setShowVideoForm(false);
                                } catch { setVidUploadStatus("Upload failed. Please try again."); }
                                finally { setVidUploading(false); }
                              }} />
                          </label>
                          {vidUploading && <div className="text-xs text-amber-400 mt-2 flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5 animate-spin" />{vidUploadStatus}</div>}
                          {!vidUploading && vidUploadStatus && <div className="text-xs text-red-400 mt-2">{vidUploadStatus}</div>}
                          {!vidTitle.trim() && <p className="text-[10px] text-slate-500 mt-1">Please enter a title before uploading.</p>}
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => { setShowVideoForm(false); setVidUrl(""); setVidTitle(""); setVidDesc(""); setVidDuration(""); setVidUploadStatus(""); }}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/10 transition-colors">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Section>

              <Section
                title="Video Library"
                subtitle={customVideos.length > 0 ? `${customVideos.length} video${customVideos.length !== 1 ? "s" : ""} — live in Career Videos section` : "No videos added yet"}>
                {customVideos.length > 0 ? (
                  <Table
                    cols={["Title & URL","Type","Category","Duration","Added","Delete"]}
                    rows={customVideos.map(v => [
                      <div>
                        <div className="text-white font-semibold text-sm">{v.title}</div>
                        <a href={v.url} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-blue-400 hover:underline truncate block max-w-xs">
                          {v.url.length > 55 ? v.url.slice(0, 55) + "…" : v.url}
                        </a>
                      </div>,
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: v.videoType === "youtube" ? "#ef444420" : v.videoType === "vimeo" ? "#60a5fa20" : "#94a3b820", color: v.videoType === "youtube" ? "#f87171" : v.videoType === "vimeo" ? "#60a5fa" : "#94a3b8" }}>
                        {v.videoType === "youtube" ? "▶ YouTube" : v.videoType === "vimeo" ? "◈ Vimeo" : "⬛ Direct"}
                      </span>,
                      <CatBadge cat={v.cat} />,
                      <span className="text-slate-400 font-mono text-xs">{v.duration}</span>,
                      <span className="text-slate-500 text-xs">{v.date}</span>,
                      <button onClick={() => handleDeleteVideo(v.id)} className="text-red-400 hover:text-red-300 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>,
                    ])}
                  />
                ) : (
                  <div className="rounded-2xl p-10 text-center" style={{ background:"rgba(255,255,255,0.02)", border:"1px dashed rgba(255,255,255,0.1)" }}>
                    <Film className="h-10 w-10 mx-auto mb-3 text-slate-700" />
                    <p className="text-sm font-bold text-slate-500 mb-1">No videos yet</p>
                    <p className="text-xs text-slate-600">Click "Add Video" above to add YouTube links, Vimeo links, or direct MP4/video URLs (up to 20 minutes).</p>
                  </div>
                )}
              </Section>
            </>
          )}

          {/* ── TALKS & LIVESTREAMS ── */}
          {activeTab === "talks" && (
            <>
              <div className="flex gap-2 mb-6">
                {[
                  { key:"recorded",    label:`Recorded Talks (${EXPERT_TALKS.length})` },
                  { key:"recordings",  label:`Recorded Livestreams (${recordedLivestreams.length})` },
                  { key:"upcoming",    label:`Upcoming (${UPCOMING_LIVESTREAMS.length + customStreams.length})` },
                ].map(({ key, label }) => (
                  <button key={key} onClick={() => setTalkSubTab(key as typeof talkSubTab)}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                    style={talkSubTab === key
                      ? { background:"rgba(245,165,36,0.12)", color:"#f5a524", border:"1px solid rgba(245,165,36,0.25)" }
                      : { background:"rgba(255,255,255,0.04)", color:"#64748b", border:"1px solid rgba(255,255,255,0.08)" }}>
                    {label}
                  </button>
                ))}
              </div>

              {talkSubTab === "recorded" && (
                <Section title="Recorded Expert Talks" subtitle={`${EXPERT_TALKS.length} sessions · click Edit to modify`}>
                  <Table
                    cols={["Title","Speaker","Organization","Category","Duration","Edit"]}
                    rows={EXPERT_TALKS.map(t => [
                      <span className="text-white font-semibold">{t.title.slice(0,40)}{t.title.length>40?"…":""}</span>,
                      <span className="text-slate-300">{t.speaker}</span>,
                      <span className="text-slate-500">{t.organization}</span>,
                      <CatBadge cat={t.category} />,
                      <span className="text-slate-400">{t.duration}</span>,
                      <button onClick={() => setEditTalk(t)} className="text-amber-400 hover:text-amber-300 transition-colors"><Edit3 className="h-3.5 w-3.5" /></button>,
                    ])}
                  />
                </Section>
              )}

              {talkSubTab === "recordings" && (
                <Section title="Recorded Livestreams" subtitle="Archived livestream recordings available to students"
                  action={
                    <button onClick={() => setShowRecLive(v => !v)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
                      style={{ background:"linear-gradient(135deg,#a855f7,#7c3aed)", color:"white" }}>
                      <Plus className="h-3.5 w-3.5" /> Add Recorded Livestream
                    </button>
                  }>
                  {showRecLive && (
                    <RecordedLivestreamForm onClose={() => setShowRecLive(false)}
                      onAdd={r => { setRecordedLivestreams(v => [r,...v]); setShowRecLive(false); }} />
                  )}
                  <Table
                    cols={["Title","Speaker","Organization","Category","Duration","Recorded","Actions"]}
                    rows={recordedLivestreams.map(r => [
                      <span className="text-white font-semibold">{r.title.slice(0,38)}{r.title.length>38?"…":""}</span>,
                      <span className="text-slate-300">{r.speaker}</span>,
                      <span className="text-slate-500">{r.organization}</span>,
                      <CatBadge cat={r.category} />,
                      <span className="text-slate-400">{r.duration}</span>,
                      <span className="text-slate-500">{r.recordedDate ? new Date(r.recordedDate).toLocaleDateString() : "—"}</span>,
                      <button onClick={() => setRecordedLivestreams(v => v.filter(x => x.id !== r.id))} className="text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>,
                    ])}
                  />
                  {recordedLivestreams.length === 0 && (
                    <div className="rounded-2xl p-8 text-center" style={{ background:"rgba(255,255,255,0.02)", border:"1px dashed rgba(255,255,255,0.1)" }}>
                      <Video className="h-8 w-8 mx-auto mb-2 text-slate-700" />
                      <p className="text-sm text-slate-600">No recorded livestreams yet. Add one above.</p>
                    </div>
                  )}
                </Section>
              )}

              {talkSubTab === "upcoming" && (
                <Section title="Upcoming Livestreams" subtitle={`${UPCOMING_LIVESTREAMS.length + customStreams.length} sessions scheduled`}
                  action={
                    <button onClick={() => setShowSchedule(v => !v)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
                      style={{ background:"linear-gradient(135deg,#ef4444,#dc2626)", color:"white" }}>
                      <Radio className="h-3.5 w-3.5" /> Schedule New Session
                    </button>
                  }>
                  {showSchedule && (
                    <div className="p-5 rounded-2xl mb-5" style={{ background:"rgba(239,68,68,0.05)", border:"1px solid rgba(239,68,68,0.2)" }}>
                      <div className="text-sm font-black text-white mb-4 flex items-center gap-2">
                        <Radio className="h-4 w-4 text-red-400" /> Schedule New Livestream
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="col-span-2"><AdminInput label="Session Title *" value={schedTitle} onChange={setSchedTitle} placeholder="Session title" /></div>
                        <AdminInput label="Host Name(s) *" value={schedHost} onChange={setSchedHost} placeholder="Host full name" />
                        <AdminInput label="Max Attendees" value={schedMax} onChange={setSchedMax} placeholder="500" />
                        <AdminInput label="Date *" value={schedDate} onChange={setSchedDate} type="date" placeholder="" />
                        <AdminInput label="Time" value={schedTime} onChange={setSchedTime} type="time" placeholder="" />
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Category</label>
                          <select value={schedCat} onChange={e => setSchedCat(e.target.value as FeedCategory)}
                            className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)" }}>
                            {FEED_CATEGORIES.map(c => <option key={c.id} value={c.id} style={{ background:"#0d1a2e" }}>{c.emoji} {c.label}</option>)}
                          </select>
                        </div>
                        <AdminInput label="Description" value={schedDesc} onChange={setSchedDesc} placeholder="Session description" />
                        <AdminInput label="Zoom Link (optional)" value={schedZoomLink} onChange={setSchedZoomLink} placeholder="https://zoom.us/j/..." />
                        <AdminInput label="Zoom Password (optional)" value={schedZoomPass} onChange={setSchedZoomPass} placeholder="Password or passcode" />
                      </div>
                      <div className="mb-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-2">Visible To (leave empty = all plans)</label>
                        <div className="flex flex-wrap gap-2">
                          {(["starter","explorer","builder","accelerator"] as const).map(tier => {
                            const active = schedVisibleTo.includes(tier);
                            const colors: Record<string,string> = { starter:"#64748b", explorer:"#3b82f6", builder:"#a855f7", accelerator:"#f5a524" };
                            return (
                              <button key={tier} onClick={() => setSchedVisibleTo(v => active ? v.filter(t => t !== tier) : [...v, tier])}
                                className="px-3 py-1.5 rounded-xl text-[11px] font-bold capitalize transition-all"
                                style={active
                                  ? { background:`${colors[tier]}25`, color:colors[tier], border:`1px solid ${colors[tier]}50` }
                                  : { background:"rgba(255,255,255,0.04)", color:"#64748b", border:"1px solid rgba(255,255,255,0.1)" }}>
                                {tier}
                              </button>
                            );
                          })}
                        </div>
                        {schedVisibleTo.length > 0 && (
                          <p className="text-[10px] text-slate-500 mt-1.5">
                            Visible to: {schedVisibleTo.join(", ")} only
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowSchedule(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/10 transition-colors">Cancel</button>
                        <button onClick={handleScheduleStream} disabled={!schedTitle.trim()||!schedHost.trim()||!schedDate}
                          className="px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                          style={{ background:"linear-gradient(135deg,#ef4444,#dc2626)", color:"white" }}>
                          <Radio className="h-3.5 w-3.5 inline mr-1" />Schedule
                        </button>
                      </div>
                    </div>
                  )}

                  {customStreams.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-bold text-green-400 mb-2">Newly Scheduled</div>
                      <Table
                        cols={["Title","Host","Category","Date/Time","Actions"]}
                        rows={customStreams.map(s => [
                          <span className="text-white font-semibold">{s.title}</span>,
                          <span className="text-slate-300">{s.host}</span>,
                          <CatBadge cat={s.cat} />,
                          <span className="text-slate-500">{new Date(s.scheduledAt).toLocaleString()}</span>,
                          <div className="flex gap-2">
                            <button onClick={() => setCustomStreams(cs => cs.filter(c => c.id !== s.id))} className="text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>,
                        ])}
                      />
                    </div>
                  )}

                  <Table
                    cols={["Title","Host","Category","Scheduled","Status","Edit"]}
                    rows={UPCOMING_LIVESTREAMS.map(l => [
                      <span className="text-white font-semibold">{l.title.slice(0,40)}{l.title.length>40?"…":""}</span>,
                      <span className="text-slate-300">{l.host.split(",")[0]}</span>,
                      <CatBadge cat={l.category} />,
                      <span className="text-slate-500">{new Date(l.scheduledAt).toLocaleDateString()}</span>,
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background:"rgba(239,68,68,0.12)", color:"#ef4444" }}>Upcoming</span>,
                      <button onClick={() => setEditLive(l)} className="text-amber-400 hover:text-amber-300 transition-colors"><Edit3 className="h-3.5 w-3.5" /></button>,
                    ])}
                  />
                </Section>
              )}
            </>
          )}

          {/* ── USERS ── */}
          {activeTab === "users" && (
            <Section title="User Management" subtitle="All registered platform accounts"
              action={
                <button onClick={refreshAccounts}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/10 transition-all border border-white/10">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              }>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label:"Total Users",  value:String(liveAccounts.length),                                                                              color:"#f5a524" },
                  { label:"Active (30d)", value:String(Math.floor(liveAccounts.length * 0.77)),                                                            color:"#22c55e" },
                  { label:"Paid Plans",   value:String(liveAccounts.filter(u => u.plan && u.plan !== "free").length),                                      color:"#a855f7" },
                  { label:"Free Plan",    value:String(liveAccounts.filter(u => !u.plan || u.plan === "free").length),                                     color:"#64748b" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center"
                    style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${s.color}20` }}>
                    <div className="text-xl font-black mb-0.5" style={{ color:s.color }}>{s.value}</div>
                    <div className="text-[10px] text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>
              {liveAccounts.length === 0 ? (
                <div className="p-8 text-center rounded-2xl" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No registered users yet.</p>
                </div>
              ) : (
                <Table
                  cols={["Email","Name","Plan","Joined","Password","Actions"]}
                  rows={liveAccounts.map(a => [
                    <span className="font-mono text-blue-400 text-[11px]">{a.email}</span>,
                    <span className="text-white font-semibold">{a.name}</span>,
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold capitalize"
                      style={{ background:`${PLAN_COLOR[a.plan ?? "free"]}15`, color:PLAN_COLOR[a.plan ?? "free"] }}>
                      {a.plan ?? "free"}
                    </span>,
                    <span className="text-slate-500 text-[11px]">{new Date(a.registeredAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>,
                    <span className="text-[10px]" style={{ color: a.password.startsWith("$sha256$") ? "#4ade80" : "#f97316" }}>
                      {a.password.startsWith("$sha256$") ? "🔒 Hashed" : "⚠️ Plaintext"}
                    </span>,
                    <div className="flex gap-2">
                      <button onClick={() => setEditingAccount(a)}
                        className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors text-[10px] font-bold">
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button onClick={() => { deleteAccount(a.email); refreshAccounts(); }}
                        className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors text-[10px] font-bold">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>,
                  ])}
                />
              )}
            </Section>
          )}

          {/* ── DARIO AI ACTIVITY ── */}
          {activeTab === "dario" && (
            <>
              <Section title="Dario AI Activity" subtitle="Track student conversations, career interests, and engagement with the AI counselor"
                action={
                  <button onClick={() => void loadDarioLogs()} disabled={darioLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
                    style={{ background:"linear-gradient(135deg,#7c3aed,#a855f7)", color:"white" }}>
                    {darioLoading ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading…</> : <><RefreshCw className="h-3.5 w-3.5" /> Refresh Logs</>}
                  </button>
                }>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[
                    { label:"Sessions Logged",        value: darioLogs.length,                                              color:"#a855f7" },
                    { label:"Unique Students",         value: new Set(darioLogs.map(l => l.userId)).size,                   color:"#f5a524" },
                    { label:"Total Messages Sent",     value: darioLogs.reduce((a,l) => a + l.messageCount, 0),             color:"#22d3ee" },
                    { label:"Action Items Generated",  value: darioLogs.reduce((a,l) => a + l.actionItemCount, 0),          color:"#10b981" },
                    { label:"Personalities Generated", value: darioLogs.filter(l => l.personalityGenerated).length,         color:"#ec4899" },
                    { label:"Career Reports",          value: darioLogs.filter(l => l.reportGenerated).length,              color:"#f97316" },
                    { label:"Roadmap Milestones",      value: darioLogs.reduce((a,l) => a + (l.roadmapMilestoneCount||0), 0), color:"#3b82f6" },
                    { label:"Opportunities Searched",  value: darioLogs.reduce((a,l) => a + (l.opportunitiesSearched||[]).length, 0), color:"#84cc16" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 text-center"
                      style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${s.color}20` }}>
                      <div className="text-xl font-black mb-0.5" style={{ color:s.color }}>{s.value}</div>
                      <div className="text-[10px] text-slate-500">{s.label}</div>
                    </div>
                  ))}
                </div>

                {darioLogs.length === 0 && !darioLoading && (
                  <div className="rounded-2xl p-10 text-center"
                    style={{ background:"rgba(255,255,255,0.02)", border:"1px dashed rgba(255,255,255,0.1)" }}>
                    <Brain className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                    <div className="text-sm font-bold text-slate-500 mb-1">No activity logged yet</div>
                    <div className="text-xs text-slate-600 mb-4">Activity is saved to the database when students end a session with Dario. Click Refresh Logs to fetch data.</div>
                    <button onClick={() => void loadDarioLogs()}
                      className="px-4 py-2 rounded-xl text-xs font-bold"
                      style={{ background:"rgba(168,85,247,0.1)", color:"#a855f7", border:"1px solid rgba(168,85,247,0.25)" }}>
                      Load Activity Logs
                    </button>
                  </div>
                )}

                {darioLogs.length > 0 && (
                  <div className="space-y-3">
                    {darioLogs.map(log => (
                      <div key={log.sessionId} className="rounded-2xl overflow-hidden"
                        style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)" }}>

                        {/* ── Card header (always visible) ── */}
                        <button className="w-full flex items-start gap-4 p-4 text-left hover:bg-white/5 transition-colors"
                          onClick={() => setDarioExpanded(darioExpanded === log.sessionId ? null : log.sessionId)}>
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background:"rgba(168,85,247,0.1)", border:"1px solid rgba(168,85,247,0.2)" }}>
                            <Brain className="h-5 w-5 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-black text-white">{log.userName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{log.userEmail}</span>
                              {log.school && <span className="text-[10px] text-slate-600 hidden sm:inline">· {log.school}</span>}
                              {log.graduationYear && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background:"rgba(245,165,36,0.1)", color:"#f5a524" }}>Class of {log.graduationYear}</span>}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 truncate">Session: {log.sessionTitle}</div>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                <MessageSquare className="h-2.5 w-2.5" /> {log.messageCount} msgs
                              </span>
                              {log.totalSessionsCount > 1 && (
                                <span className="text-[10px] text-blue-400">{log.totalSessionsCount} total sessions</span>
                              )}
                              {(log.careersDiscussed||[]).length > 0 && (
                                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                  <Briefcase className="h-2.5 w-2.5" /> {(log.careersDiscussed||[]).slice(0,2).join(", ")}{(log.careersDiscussed||[]).length > 2 ? ` +${(log.careersDiscussed||[]).length - 2}` : ""}
                                </span>
                              )}
                              {log.personalityGenerated && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background:"rgba(236,72,153,0.1)", color:"#ec4899" }}>Personality ✓</span>}
                              {log.reportGenerated && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background:"rgba(34,211,238,0.1)", color:"#22d3ee" }}>Report ✓</span>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[10px] text-slate-500">
                              {log.loggedAt ? new Date(log.loggedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"}
                            </div>
                            <div className="text-[9px] text-slate-600 mt-0.5">
                              {log.loggedAt ? new Date(log.loggedAt).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}) : ""}
                            </div>
                            <div className="text-[9px] text-purple-500 mt-1">{darioExpanded === log.sessionId ? "▲ collapse" : "▼ expand"}</div>
                          </div>
                        </button>

                        {/* ── Expanded detail panel ── */}
                        {darioExpanded === log.sessionId && (
                          <div className="px-4 pb-5 space-y-4" style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>

                            {/* Student profile */}
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {[
                                ["Name",           log.userName        || "—"],
                                ["Email",          log.userEmail       || "—"],
                                ["School",         log.school          || "—"],
                                ["Grad Year",      log.graduationYear ? String(log.graduationYear) : "—"],
                                ["GPA",            log.gpa             || "—"],
                                ["SAT Score",      log.sat             || "—"],
                                ["Career Interest",log.careerInterest  || "—"],
                                ["Total Sessions", String(log.totalSessionsCount || 1)],
                                ["Messages (this)",String(log.messageCount)],
                              ].map(([k, v]) => (
                                <div key={k} className="rounded-xl px-3 py-2"
                                  style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)" }}>
                                  <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wide mb-0.5">{k}</div>
                                  <div className="text-xs text-white font-semibold truncate">{v}</div>
                                </div>
                              ))}
                            </div>

                            {/* AI features used */}
                            <div className="flex flex-wrap gap-2">
                              {[
                                { ok: log.personalityGenerated, label:"Personality Profile", c:"#ec4899" },
                                { ok: log.reportGenerated,       label:"Career Report",       c:"#22d3ee" },
                                { ok: log.actionItemCount > 0,   label:`${log.actionItemCount} Action Items`, c:"#f5a524" },
                                { ok: (log.roadmapMilestoneCount||0) > 0, label:`${log.roadmapMilestoneCount} Roadmap Steps`, c:"#3b82f6" },
                                { ok: (log.opportunitiesSearched||[]).length > 0, label:`${(log.opportunitiesSearched||[]).length} Opportunities`, c:"#10b981" },
                              ].map(({ ok, label, c }) => ok ? (
                                <div key={label} className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold"
                                  style={{ background:`${c}12`, color:c, border:`1px solid ${c}30` }}>
                                  <Check className="h-2.5 w-2.5" /> {label}
                                </div>
                              ) : null)}
                            </div>

                            {/* All careers ever discussed */}
                            {(log.allCareersEver||[]).length > 0 && (
                              <div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">All Careers Ever Discussed ({(log.allCareersEver||[]).length})</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {(log.allCareersEver||[]).map(c => (
                                    <span key={c} className="text-[11px] px-2 py-1 rounded-full"
                                      style={{ background:"rgba(168,85,247,0.1)", color:"#a855f7", border:"1px solid rgba(168,85,247,0.2)" }}>
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Opportunities searched */}
                            {(log.opportunitiesSearched||[]).length > 0 && (
                              <div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1"><MapPin className="h-3 w-3" /> Opportunities Searched</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {(log.opportunitiesSearched||[]).map(o => (
                                    <span key={o} className="text-[11px] px-2 py-1 rounded-full"
                                      style={{ background:"rgba(16,185,129,0.08)", color:"#10b981", border:"1px solid rgba(16,185,129,0.2)" }}>
                                      {o}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Conversation excerpt */}
                            {(log.conversationExcerpt||[]).length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" /> Conversation Excerpt (last {(log.conversationExcerpt||[]).length} messages)
                                  </div>
                                  <button onClick={() => setDarioConvoOpen(darioConvoOpen === log.sessionId ? null : log.sessionId)}
                                    className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors font-bold">
                                    {darioConvoOpen === log.sessionId ? "Hide" : "Show transcript"}
                                  </button>
                                </div>
                                {darioConvoOpen === log.sessionId && (
                                  <div className="rounded-xl overflow-hidden divide-y divide-white/5" style={{ border:"1px solid rgba(255,255,255,0.08)" }}>
                                    {(log.conversationExcerpt||[]).map((msg, i) => (
                                      <div key={i} className={`px-3 py-2.5 flex gap-2.5 ${msg.role === "user" ? "" : ""}`}
                                        style={{ background: msg.role === "assistant" ? "rgba(168,85,247,0.05)" : "rgba(255,255,255,0.02)" }}>
                                        <div className="flex-shrink-0 mt-0.5">
                                          <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black"
                                            style={msg.role === "assistant"
                                              ? { background:"rgba(168,85,247,0.2)", color:"#a855f7" }
                                              : { background:"rgba(245,165,36,0.15)", color:"#f5a524" }}>
                                            {msg.role === "assistant" ? "D" : "S"}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-[9px] font-bold mb-0.5" style={{ color: msg.role === "assistant" ? "#a855f7" : "#f5a524" }}>
                                            {msg.role === "assistant" ? "Dario" : "Student"}
                                          </div>
                                          <div className="text-xs text-slate-300 leading-relaxed">{msg.content}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </>
          )}

          {/* ── LEADS ── */}
          {activeTab === "leads" && <LeadsTab />}

          {/* ── SAFETY ── */}
          {activeTab === "safety" && <SafetyTab adminPin={ADMIN_PIN} />}

          {/* ── SETTINGS ── */}
          {activeTab === "settings" && (
            <>
              <Section title="Content Settings" subtitle="Adjust platform content limits and rotation settings"
                action={
                  <button onClick={handleSaveSettings}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
                    style={settingsSaved ? { background:"rgba(34,197,94,0.15)", color:"#22c55e", border:"1px solid rgba(34,197,94,0.3)" } : { background:"linear-gradient(135deg,#f5a524,#ea580c)", color:"#0a1428" }}>
                    {settingsSaved ? <><Check className="h-3.5 w-3.5" />Saved!</> : <><Save className="h-3.5 w-3.5" />Save Settings</>}
                  </button>
                }>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                  {[
                    { key:"dailyRotation",      label:"Daily Article Rotation",    desc:"Articles shown per category per day", min:1, max:20 },
                    { key:"articlePoolSize",     label:"Article Pool Size",         desc:"Total pool per category (for rotation)", min:5, max:100 },
                    { key:"maxSavedArticles",    label:"Max Saved Articles",        desc:"Maximum articles a student can save", min:10, max:500 },
                    { key:"videoPlaylistCount",  label:"Video Playlist Limit",      desc:"Max playlists shown in Video Library", min:1, max:50 },
                    { key:"expertTalksCount",    label:"Expert Talks Limit",        desc:"Max talks shown in the Talks section", min:1, max:100 },
                  ].map(({ key, label, desc, min, max }) => (
                    <div key={key} className="p-4 rounded-2xl" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)" }}>
                      <div className="text-xs font-bold text-white mb-0.5">{label}</div>
                      <div className="text-[10px] text-slate-600 mb-3">{desc}</div>
                      <div className="flex items-center gap-3">
                        <input type="range" min={min} max={max}
                          value={settings[key as keyof AdminSettings]}
                          onChange={e => setSettings(s => ({ ...s, [key]: Number(e.target.value) }))}
                          className="flex-1 accent-amber-400" />
                        <div className="min-w-[3rem] text-center">
                          <input type="number" min={min} max={max}
                            value={settings[key as keyof AdminSettings]}
                            onChange={e => setSettings(s => ({ ...s, [key]: Math.min(max, Math.max(min, Number(e.target.value))) }))}
                            className="w-full px-2 py-1 rounded-lg text-sm font-black text-white text-center outline-none"
                            style={{ background:"rgba(245,165,36,0.1)", border:"1px solid rgba(245,165,36,0.3)" }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SAFETY TAB — Moderation Queue + Stats
   ═══════════════════════════════════════════════════════════ */

type ModerationFlag = {
  id: string;
  studentId: string;
  message: string;
  tier: 1 | 2 | 3 | 4;
  category: string;
  context?: { role: string; content: string }[];
  status: "pending" | "resolved" | "escalated" | "dismissed";
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
};

type SafetyStats = {
  totalFlags: number;
  pendingFlags: number;
  tier1: number; tier2: number; tier3: number; tier4: number;
  resolvedToday: number;
  avgTrustScore: number;
  pausedAccounts: number;
  pendingParentEmails: number;
  openFlags: number;
  criticalFlags: number;
  totalStudents: number;
  tierAStudents: number;
  tierCStudents: number;
  contactExchanges: number;
};

const TIER_CONFIG = {
  1: { label: "Tier 1 — Auto-Cleared", color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)" },
  2: { label: "Tier 2 — Soft Warning", color: "#f5a524", bg: "rgba(245,165,36,0.1)", border: "rgba(245,165,36,0.25)" },
  3: { label: "Tier 3 — Elevated Risk", color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.25)" },
  4: { label: "Tier 4 — Critical", color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.4)" },
} as const;

const STATUS_CONFIG = {
  pending:   { label: "Pending",   color: "#f5a524" },
  resolved:  { label: "Resolved",  color: "#22c55e" },
  escalated: { label: "Escalated", color: "#ef4444" },
  dismissed: { label: "Dismissed", color: "#64748b" },
};

function SafetyTab({ adminPin }: { adminPin: string }) {
  const [flags, setFlags] = useState<ModerationFlag[]>([]);
  const [stats, setStats] = useState<SafetyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterTier, setFilterTier] = useState<number | "all">("all");
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [selected, setSelected] = useState<ModerationFlag | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDone, setActionDone] = useState("");
  const [flushLoading, setFlushLoading] = useState(false);
  const [flushResult, setFlushResult] = useState<{ sent: number; failed: number } | null>(null);

  const headers = { "Content-Type": "application/json", "x-admin-pin": adminPin };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [flagsRes, statsRes] = await Promise.all([
        fetch("/api/safety/flags", { headers }),
        fetch("/api/safety/stats", { headers }),
      ]);
      if (flagsRes.ok) {
        const data = await flagsRes.json() as { flags?: ModerationFlag[] };
        setFlags(data.flags ?? []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json() as SafetyStats;
        setStats(data);
      }
    } catch {
      setError("Could not reach safety API — make sure the API server is running.");
    } finally {
      setLoading(false);
    }
  }, [adminPin]);

  useEffect(() => { void load(); }, [load]);

  const doAction = async (flagId: string, action: "resolve" | "escalate" | "dismiss") => {
    setActionLoading(true);
    const statusMap = { resolve: "resolved", escalate: "escalated", dismiss: "dismissed" };
    try {
      await fetch(`/api/safety/flags/${flagId}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ status: statusMap[action], resolution: resolveNotes, reviewedBy: "admin" }),
      });
      setActionDone(action);
      setSelected(null);
      setResolveNotes("");
      await load();
      setTimeout(() => setActionDone(""), 2500);
    } catch { /* noop */ } finally {
      setActionLoading(false);
    }
  };

  const flushEmails = async () => {
    setFlushLoading(true);
    setFlushResult(null);
    try {
      const res = await fetch("/api/safety/notifications/flush", { method: "POST", headers });
      const data = await res.json() as { sent: number; failed: number };
      setFlushResult(data);
      setTimeout(() => setFlushResult(null), 5000);
    } catch { /* noop */ } finally {
      setFlushLoading(false);
    }
  };

  const filtered = flags.filter(f => {
    if (filterTier !== "all" && f.tier !== filterTier) return false;
    if (filterStatus !== "all" && f.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => {
    if (b.tier !== a.tier) return b.tier - a.tier;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin mx-auto mb-3" />
          <div className="text-xs text-slate-500">Loading safety data…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Shield className="h-5 w-5" style={{ color: "#f5a524" }} />
            Safety Moderation Queue
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Review flagged messages · Tier 1 = safe, Tier 4 = critical</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Flush pending emails button */}
          <button onClick={() => void flushEmails()} disabled={flushLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            style={{ background: "rgba(29,78,216,0.15)", color: "#60a5fa", border: "1px solid rgba(29,78,216,0.3)" }}>
            {flushLoading
              ? <div className="h-3.5 w-3.5 border border-blue-400/40 border-t-blue-400 rounded-full animate-spin" />
              : <Mail className="h-3.5 w-3.5" />}
            {flushLoading ? "Sending…" : `Send Pending Emails${stats?.pendingParentEmails ? ` (${stats.pendingParentEmails})` : ""}`}
          </button>
          <button onClick={() => void load()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Flush result banner */}
      {flushResult && (
        <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
          style={flushResult.sent > 0
            ? { background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }
            : { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
          <Mail className="h-4 w-4 flex-shrink-0" />
          {flushResult.sent > 0
            ? `${flushResult.sent} parent email${flushResult.sent !== 1 ? "s" : ""} sent successfully.${flushResult.failed > 0 ? ` (${flushResult.failed} failed)` : ""}`
            : `No emails sent. ${flushResult.failed > 0 ? `${flushResult.failed} failed — check domain verification on Resend.` : "No pending notifications."}`}
        </div>
      )}

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      {actionDone && (
        <div className="rounded-xl px-4 py-3 text-sm text-green-400 flex items-center gap-2"
          style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}>
          <Check className="h-4 w-4 flex-shrink-0" />
          Flag {actionDone} successfully.
        </div>
      )}

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Flags", value: stats.totalFlags, color: "#64748b" },
            { label: "Pending Review", value: stats.pendingFlags, color: "#f5a524" },
            { label: "Tier 3+4 Flags", value: (stats.tier3 ?? 0) + (stats.tier4 ?? 0), color: "#ef4444" },
            { label: "Paused Accounts", value: stats.pausedAccounts ?? 0, color: "#a855f7" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-2xl font-black mb-0.5" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tier breakdown */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {([1, 2, 3, 4] as const).map(t => {
            const cfg = TIER_CONFIG[t];
            const count = stats[`tier${t}` as keyof SafetyStats] as number ?? 0;
            return (
              <button key={t}
                onClick={() => setFilterTier(filterTier === t ? "all" : t)}
                className="rounded-xl p-3 text-center transition-all hover:scale-[1.02]"
                style={{
                  background: filterTier === t ? cfg.bg : "rgba(255,255,255,0.02)",
                  border: `1px solid ${filterTier === t ? cfg.border : "rgba(255,255,255,0.07)"}`,
                }}>
                <div className="text-lg font-black mb-0.5" style={{ color: cfg.color }}>{count}</div>
                <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: cfg.color }}>Tier {t}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-500 font-semibold">Status:</span>
        {(["all", "pending", "resolved", "escalated", "dismissed"] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
            style={filterStatus === s
              ? { background: "linear-gradient(135deg,#f5a524,#ea580c)", color: "#0a1428" }
              : { background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>
            {s}
          </button>
        ))}
        {filterTier !== "all" && (
          <button onClick={() => setFilterTier("all")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
            <X className="h-3 w-3" /> Clear tier filter
          </button>
        )}
      </div>

      {/* Flag list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-600 text-sm">
            {flags.length === 0
              ? "No flags yet — the moderation queue is empty."
              : "No flags match the current filters."}
          </div>
        )}
        {filtered.map(flag => {
          const cfg = TIER_CONFIG[flag.tier];
          const sc = STATUS_CONFIG[flag.status];
          return (
            <div key={flag.id}
              onClick={() => { setSelected(flag); setResolveNotes(flag.notes ?? ""); }}
              className="rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-all"
              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${flag.tier >= 3 ? cfg.border : "rgba(255,255,255,0.07)"}` }}>
              <div className="flex items-start gap-3">
                {/* Tier badge */}
                <div className="flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs"
                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                  T{flag.tier}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: `${sc.color}15`, color: sc.color }}>
                      {sc.label}
                    </span>
                    <span className="text-[10px] text-slate-600 ml-auto">
                      {new Date(flag.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-white font-medium leading-snug truncate">{flag.message}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-600 flex items-center gap-1">
                      <UserIcon className="h-2.5 w-2.5" /> {flag.studentId.slice(0, 12)}…
                    </span>
                    {flag.category && (
                      <span className="text-[10px] text-slate-600 capitalize">{flag.category}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-600 flex-shrink-0 mt-1" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{ background: "#0d1a2e", border: `1px solid ${TIER_CONFIG[selected.tier].border}` }}>
            {/* Modal header */}
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 z-10"
              style={{ background: "#0d1a2e", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs"
                  style={{ background: TIER_CONFIG[selected.tier].bg, color: TIER_CONFIG[selected.tier].color, border: `1px solid ${TIER_CONFIG[selected.tier].border}` }}>
                  T{selected.tier}
                </div>
                <div>
                  <div className="text-sm font-black text-white">{TIER_CONFIG[selected.tier].label}</div>
                  <div className="text-[10px] text-slate-500">ID: {selected.id.slice(0, 20)}…</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Flagged message */}
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Flagged Message</div>
                <div className="rounded-xl p-4"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <p className="text-sm text-white leading-relaxed">{selected.message}</p>
                </div>
              </div>

              {/* Student info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Student ID</div>
                  <div className="text-xs text-white font-mono">{selected.studentId}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Category</div>
                  <div className="text-xs text-white capitalize">{selected.category || "—"}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Flagged At</div>
                  <div className="text-xs text-white">{new Date(selected.createdAt).toLocaleString()}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Current Status</div>
                  <div className="text-xs font-bold capitalize" style={{ color: STATUS_CONFIG[selected.status].color }}>
                    {selected.status}
                  </div>
                </div>
              </div>

              {/* Context messages */}
              {selected.context && selected.context.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Conversation Context ({selected.context.length} messages)
                  </div>
                  <div className="rounded-xl overflow-hidden divide-y"
                    style={{ border: "1px solid rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.05)" }}>
                    {selected.context.slice(-6).map((m, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-start gap-2.5"
                        style={{ background: m.role === "user" ? "rgba(255,255,255,0.02)" : "rgba(168,85,247,0.04)" }}>
                        <span className="text-[10px] font-bold uppercase tracking-wide mt-0.5 flex-shrink-0 w-14"
                          style={{ color: m.role === "user" ? "#f5a524" : "#a855f7" }}>
                          {m.role === "user" ? "Student" : "Dario"}
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">{m.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-2">
                  Reviewer Notes
                </label>
                <textarea
                  value={resolveNotes}
                  onChange={e => setResolveNotes(e.target.value)}
                  placeholder="Add notes about this flag (optional)…"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>

              {/* Actions */}
              {selected.status === "pending" && (
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => void doAction(selected.id, "dismiss")}
                    disabled={actionLoading}
                    className="py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
                    style={{ background: "rgba(100,116,139,0.15)", color: "#94a3b8", border: "1px solid rgba(100,116,139,0.3)" }}>
                    Dismiss
                  </button>
                  <button
                    onClick={() => void doAction(selected.id, "resolve")}
                    disabled={actionLoading}
                    className="py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-1.5"
                    style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
                    {actionLoading ? <div className="h-3.5 w-3.5 border border-green-400/40 border-t-green-400 rounded-full animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Resolve
                  </button>
                  <button
                    onClick={() => void doAction(selected.id, "escalate")}
                    disabled={actionLoading}
                    className="py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-1.5"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <AlertCircle className="h-3.5 w-3.5" /> Escalate
                  </button>
                </div>
              )}

              {selected.status !== "pending" && (
                <div className="text-center py-2 text-xs text-slate-600">
                  This flag is already {selected.status}.
                  {selected.resolvedAt && ` (${new Date(selected.resolvedAt).toLocaleString()})`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
