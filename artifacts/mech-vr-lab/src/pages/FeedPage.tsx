import { useState, useMemo, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Heart, Bookmark, BookmarkCheck, Search, ChevronDown, ChevronUp,
  Home, User, ExternalLink, Rss, Globe, Filter, Bell,
  LogOut, ArrowRight, Clock, BookOpen, Flame,
} from "lucide-react";
import { FEED_ARTICLES, FEED_CATEGORIES, type FeedCategory } from "@/lib/feedArticles";
import { getAllFeedItems, type DailyArticle } from "@/lib/feedDailyArticles";
import { getLikes, toggleLike, getSaves, toggleSave, MAX_SAVES } from "@/lib/feedInteractions";
import { getAuthUser, signOut } from "@/lib/auth";
import { getProfile, AVATAR_PRESETS } from "@/lib/profile";

const BASE = import.meta.env.BASE_URL ?? "/";

/* ─── merge all articles into one unified stream ─── */
function useAllArticles() {
  return useMemo(() => {
    const legacy = FEED_ARTICLES.map(a => ({
      id: a.id,
      category: a.category as FeedCategory,
      title: a.title,
      excerpt: a.excerpt,
      body: a.body,
      readTime: a.readTime,
      publishedAt: new Date(a.date).getTime() || Date.now() - 7 * 86400000,
      isExternal: false as const,
      publisher: undefined as string | undefined,
      externalUrl: undefined as string | undefined,
    }));
    const daily = getAllFeedItems();
    // merge, deduplicate by id, sort newest first
    const map = new Map<string, typeof legacy[0] | DailyArticle>();
    for (const a of [...legacy, ...daily]) map.set(a.id, a);
    return [...map.values()].sort((a, b) => b.publishedAt - a.publishedAt);
  }, []);
}

/* ─── relative time helper ─── */
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  const dt = new Date(ts);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CATEGORY_COLOR: Record<FeedCategory, string> = {
  engineering:  "#f5a524",
  business:     "#f97316",
  healthcare:   "#ec4899",
  technology:   "#3b82f6",
  trades:       "#eab308",
  law:          "#a855f7",
  science:           "#22d3ee",
  "life-advice":     "#4ade80",
  "creative-design": "#e879f9",
};

/* ─── Article card ─── */
type AnyArticle = ReturnType<typeof useAllArticles>[0];

function ArticleCard({
  article, liked, saved, saveCount,
  onLike, onSave, saveAtLimit,
}: {
  article: AnyArticle;
  liked: boolean; saved: boolean; saveCount: number;
  onLike: () => void; onSave: () => void; saveAtLimit: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showSaveWarning, setShowSaveWarning] = useState(false);
  const cat = FEED_CATEGORIES.find(c => c.id === article.category)!;
  const color = CATEGORY_COLOR[article.category];

  const handleSave = () => {
    if (!saved && saveAtLimit) { setShowSaveWarning(true); setTimeout(() => setShowSaveWarning(false), 2500); return; }
    onSave();
  };

  return (
    <article className="rounded-2xl overflow-hidden transition-all hover:translate-y-[-2px]"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.25)" }}>
      {/* top accent bar */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />

      <div className="p-5">
        {/* header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black"
              style={article.isExternal
                ? { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8" }
                : { background: "linear-gradient(135deg, #f5a52420, #ea580c20)", border: "1px solid rgba(245,165,36,0.3)", color: "#f5a524" }}>
              {article.isExternal ? <Globe className="h-4 w-4" /> : "1S"}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white text-sm leading-none">
                {article.isExternal ? article.publisher : "1WayMirror System"}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />{timeAgo(article.publishedAt)}
                <span className="opacity-40">·</span>
                {article.readTime}
                {article.isExternal && <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-semibold" style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)" }}>3rd party</span>}
              </div>
            </div>
          </div>
          <span className="flex-shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide"
            style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>
            {cat.emoji} {cat.label}
          </span>
        </div>

        {/* title */}
        <h3 className="text-base font-black text-white mb-2 leading-snug">{article.title}</h3>

        {/* body */}
        {!expanded ? (
          <p className="text-slate-400 text-sm leading-relaxed">{article.excerpt}</p>
        ) : (
          <div className="space-y-3">
            {article.body.map((para, i) => {
              const parts = para.split(/\*\*(.*?)\*\*/g);
              return (
                <p key={i} className="text-slate-400 text-sm leading-relaxed">
                  {parts.map((p, j) =>
                    j % 2 === 1 ? <strong key={j} className="text-slate-200 font-semibold">{p}</strong> : p
                  )}
                </p>
              );
            })}
            {article.isExternal && article.externalUrl && (
              <a href={article.externalUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold mt-1 transition-colors hover:opacity-80"
                style={{ color }}>
                <ExternalLink className="h-3.5 w-3.5" /> Read full article at {article.publisher}
              </a>
            )}
          </div>
        )}

        <button onClick={() => setExpanded(v => !v)}
          className="mt-3 flex items-center gap-1 text-xs font-bold transition-colors"
          style={{ color }}>
          {expanded ? <><ChevronUp className="h-3.5 w-3.5" />Show less</> : <><ChevronDown className="h-3.5 w-3.5" />Read more</>}
        </button>

        {/* actions */}
        <div className="flex items-center gap-3 mt-4 pt-3.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onLike}
            className="flex items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
            style={{ color: liked ? "#ef4444" : "#64748b" }}>
            <Heart className="h-4 w-4" fill={liked ? "#ef4444" : "none"} />
            {liked ? "Liked" : "Like"}
          </button>

          <button onClick={handleSave}
            className="flex items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
            style={{ color: saved ? "#f5a524" : "#64748b" }}>
            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {saved ? "Saved" : "Save"}
          </button>

          {showSaveWarning && (
            <span className="text-[11px] font-semibold text-amber-400 ml-1 animate-pulse">
              Save limit reached ({MAX_SAVES}/50)
            </span>
          )}

          <span className="ml-auto text-[11px] text-slate-600 flex items-center gap-1">
            <BookOpen className="h-3 w-3" />{article.readTime}
          </span>
        </div>
      </div>
    </article>
  );
}

/* ─── MAIN PAGE ─── */
export default function FeedPage() {
  const [, navigate] = useLocation();
  const [activeCategory, setActiveCategory] = useState<FeedCategory | "all" | "saved">("all");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [likes, setLikes] = useState(() => getLikes());
  const [saves, setSaves] = useState(() => getSaves());

  const authUser = getAuthUser();
  const profile = getProfile();
  const currentAvatar = AVATAR_PRESETS.find(a => a.id === profile?.avatarId) ?? AVATAR_PRESETS[0];
  const displayName = profile?.name ?? authUser?.name ?? "Explorer";

  const allArticles = useAllArticles();

  const filtered = useMemo(() => {
    let list = allArticles;
    if (activeCategory === "saved") list = list.filter(a => saves.includes(a.id));
    else if (activeCategory !== "all") list = list.filter(a => a.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allArticles, activeCategory, saves, search]);

  const handleLike = useCallback((id: string) => {
    setLikes(toggleLike(id));
  }, []);

  const handleSave = useCallback((id: string) => {
    const result = toggleSave(id);
    setSaves([...result.saves]);
  }, []);

  const handleSignOut = () => { signOut(); navigate("/login"); };

  const todayCount = allArticles.filter(a => {
    const diff = Date.now() - a.publishedAt;
    return diff < 86400000;
  }).length;

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at top, #0d1f3c 0%, #0a1428 60%)" }}>

      {/* ── STICKY HEADER ── */}
      <header className="sticky top-0 z-40"
        style={{ background: "rgba(10,20,40,0.97)", borderBottom: "1px solid rgba(245,165,36,0.15)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/">
            <img src={`${BASE}logo.png`} alt="1WayMirror" className="h-9 w-auto object-contain cursor-pointer"
              style={{ filter: "drop-shadow(0 0 8px rgba(245,165,36,0.3))" }} />
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <Rss className="h-4 w-4" style={{ color: "#f5a524" }} />
            <span className="font-black text-white text-sm">Career Feed</span>
            {todayCount > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: "rgba(245,165,36,0.15)", color: "#f5a524", border: "1px solid rgba(245,165,36,0.3)" }}>
                {todayCount} new today
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-base">{currentAvatar.emoji}</div>
              <span className="text-xs font-semibold text-slate-300">{displayName}</span>
            </div>
            <Link href="/replitopolis">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:bg-white/10"
                style={{ border: "1px solid rgba(245,165,36,0.3)", color: "#f5a524" }}>
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            </Link>
            <Link href="/my-profile">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 transition-all hover:bg-white/10"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Profile</span>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

        {/* ── FEED HERO STRIP ── */}
        <div className="rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          style={{ background: "linear-gradient(135deg, rgba(245,165,36,0.08), rgba(234,88,12,0.05))", border: "1px solid rgba(245,165,36,0.2)" }}>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(245,165,36,0.2), rgba(234,88,12,0.15))", border: "1px solid rgba(245,165,36,0.3)", boxShadow: "0 0 24px rgba(245,165,36,0.15)" }}>
              <Rss className="h-5 w-5" style={{ color: "#f5a524" }} />
            </div>
            <div>
              <div className="font-black text-white text-base">Admin-Curated Career Feed</div>
              <div className="text-xs text-slate-400 mt-0.5">
                All 1WayMirror articles are reviewed by career experts before publishing.
                External articles are sourced from leading industry publications.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:ml-auto flex-shrink-0 flex-wrap">
            <div className="text-center">
              <div className="text-xl font-black text-white">{allArticles.length}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Articles</div>
            </div>
            <div className="h-8 w-px" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: "#ef4444" }}>{likes.size}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Liked</div>
            </div>
            <div className="h-8 w-px" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: "#f5a524" }}>{saves.length}<span className="text-sm text-slate-500">/{MAX_SAVES}</span></div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Saved</div>
            </div>
          </div>
        </div>

        {/* ── SEARCH + FILTER TOGGLE ── */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            <input type="text" placeholder="Search articles, topics, publishers…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all focus:ring-1"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              onFocus={e => e.target.style.borderColor = "rgba(245,165,36,0.5)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={showFilters
              ? { background: "rgba(245,165,36,0.15)", color: "#f5a524", border: "1px solid rgba(245,165,36,0.4)" }
              : { background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Filter className="h-4 w-4" /> Filter
          </button>
        </div>

        {/* ── CATEGORY FILTERS ── */}
        {showFilters && (
          <div className="mb-5">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all",   label: "📋 All Topics",      color: "#1d4ed8" },
                { id: "saved", label: `🔖 Saved (${saves.length})`, color: "#f5a524" },
                ...FEED_CATEGORIES.map(c => ({ id: c.id, label: `${c.emoji} ${c.label}`, color: c.color })),
              ].map(f => (
                <button key={f.id} onClick={() => setActiveCategory(f.id as typeof activeCategory)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={activeCategory === f.id
                    ? { background: f.color, color: "white", boxShadow: `0 0 12px ${f.color}50` }
                    : { background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── QUICK CATEGORY PILLS (always visible, compact) ── */}
        {!showFilters && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
            {[
              { id: "all", label: "All", emoji: "📋", color: "#1d4ed8" },
              { id: "saved", label: `Saved`, emoji: "🔖", color: "#f5a524" },
              ...FEED_CATEGORIES.map(c => ({ id: c.id, label: c.label, emoji: c.emoji, color: c.color })),
            ].map(f => (
              <button key={f.id} onClick={() => setActiveCategory(f.id as typeof activeCategory)}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={activeCategory === f.id
                  ? { background: f.color, color: "white" }
                  : { background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>
                {f.emoji} {f.label}
              </button>
            ))}
          </div>
        )}

        {/* ── RESULTS META ── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <BookOpen className="h-4 w-4" />
            {filtered.length} article{filtered.length !== 1 ? "s" : ""}
            {activeCategory !== "all" && activeCategory !== "saved" && ` · ${FEED_CATEGORIES.find(c => c.id === activeCategory)?.label}`}
            {activeCategory === "saved" && " saved"}
            {search && ` matching "${search}"`}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            Most recent first
          </div>
        </div>

        {/* ── ARTICLES ── */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl p-16 text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-5xl mb-3">{activeCategory === "saved" ? "🔖" : "🔍"}</div>
            <div className="text-lg font-bold text-white">
              {activeCategory === "saved" ? "No saved articles yet" : "No articles found"}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {activeCategory === "saved"
                ? "Bookmark articles you want to read later — up to 50."
                : "Try a different category or search term."}
            </div>
            {activeCategory !== "all" && (
              <button onClick={() => { setActiveCategory("all"); setSearch(""); }}
                className="mt-5 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #f5a524, #ea580c)" }}>
                View all articles
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                liked={likes.has(article.id)}
                saved={saves.includes(article.id)}
                saveCount={saves.length}
                onLike={() => handleLike(article.id)}
                onSave={() => handleSave(article.id)}
                saveAtLimit={saves.length >= MAX_SAVES}
              />
            ))}
          </div>
        )}

        {/* ── BOTTOM NOTICE ── */}
        <div className="mt-10 mb-4 rounded-2xl p-4 flex items-start gap-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: "rgba(245,165,36,0.15)" }}>
            <span className="text-[10px] font-black" style={{ color: "#f5a524" }}>i</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-400">1WayMirror System articles</span> are written and reviewed by our career experts.{" "}
            <span className="font-bold text-slate-400">3rd party articles</span> link to content from external publishers (MIT Technology Review, HBR, Forbes, and others) and open in a new tab.
            Feed content is never deleted — new articles are added daily across all 8 career categories.
          </p>
        </div>

        {/* ── BACK TO DASHBOARD ── */}
        <div className="mt-4 mb-8">
          <Link href="/replitopolis">
            <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black transition-all hover:scale-[1.01]"
              style={{ background: "linear-gradient(135deg, rgba(245,165,36,0.1), rgba(234,88,12,0.06))", border: "1px solid rgba(245,165,36,0.25)", color: "#f5a524" }}>
              <Home className="h-4 w-4" /> Return to Dashboard <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
