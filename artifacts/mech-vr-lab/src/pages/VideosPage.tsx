import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Play, ChevronLeft, Search, Home, User, Clock,
  LogOut, Film, Eye, ArrowRight, Video,
} from "lucide-react";
import {
  getAdminVideos, getVideoThumbnail, getVideoEmbedUrl,
  type AdminVideo, type VideoType,
} from "@/lib/adminVideos";
import { FEED_CATEGORIES, type FeedCategory } from "@/lib/feedArticles";
import { PLAYLIST_CATEGORY_COLORS } from "@/lib/videoData";
import { getAuthUser, signOut } from "@/lib/auth";
import { getProfile, AVATAR_PRESETS } from "@/lib/profile";

const BASE = import.meta.env.BASE_URL ?? "/";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function typeLabel(t: VideoType) {
  if (t === "youtube") return "YouTube";
  if (t === "vimeo") return "Vimeo";
  return "Video";
}

/* ─── Video Card ─── */
function VideoCard({ video, onSelect }: { video: AdminVideo; onSelect: () => void }) {
  const [imgError, setImgError] = useState(false);
  const color = PLAYLIST_CATEGORY_COLORS[video.category] ?? "#f5a524";
  const cat = FEED_CATEGORIES.find(c => c.id === video.category);
  const thumb = getVideoThumbnail(video);

  return (
    <button
      onClick={onSelect}
      className="group text-left rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl w-full"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="relative aspect-video bg-slate-900 overflow-hidden">
        {thumb && !imgError ? (
          <img
            src={thumb}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}20, ${color}08)` }}
          >
            <Video className="h-10 w-10" style={{ color: `${color}80` }} />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ background: "rgba(245,165,36,0.9)" }}>
            <Play className="h-6 w-6 text-black fill-black ml-0.5" />
          </div>
        </div>
        {video.duration && video.duration !== "—" && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[11px] font-bold"
            style={{ background: "rgba(0,0,0,0.75)", color: "white" }}>
            {video.duration}
          </div>
        )}
        <div className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-bold"
          style={{ background: `${color}cc`, color: "#0a1428" }}>
          {cat?.emoji} {cat?.label}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-sm font-black text-white leading-snug mb-1 line-clamp-2">{video.title}</h3>
        {video.description && (
          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{video.description}</p>
        )}
        <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-600">
          <span className="flex items-center gap-1"><Film className="h-3 w-3" />{typeLabel(video.videoType)}</span>
          <span>Added {formatDate(video.addedAt)}</span>
        </div>
      </div>
    </button>
  );
}

/* ─── Player View ─── */
function PlayerView({ video, onBack }: { video: AdminVideo; onBack: () => void }) {
  const color = PLAYLIST_CATEGORY_COLORS[video.category] ?? "#f5a524";
  const cat = FEED_CATEGORIES.find(c => c.id === video.category);
  const embedUrl = getVideoEmbedUrl(video);

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-semibold mb-4 transition-colors hover:opacity-80"
        style={{ color: "#f5a524" }}
      >
        <ChevronLeft className="h-4 w-4" /> Back to Videos
      </button>

      <div
        className="relative aspect-video rounded-2xl overflow-hidden bg-black mb-5"
        style={{ boxShadow: `0 0 40px ${color}25` }}
      >
        {embedUrl ? (
          <iframe
            key={video.id}
            src={embedUrl}
            title={video.title}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <video
            key={video.id}
            src={video.url}
            controls
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: "contain" }}
          />
        )}
      </div>

      <div className="flex items-start gap-3 mb-3">
        <span className="text-xs px-2.5 py-1 rounded-full font-bold flex-shrink-0"
          style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
          {cat?.emoji} {cat?.label}
        </span>
        <span className="text-xs px-2.5 py-1 rounded-full font-bold flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>
          {typeLabel(video.videoType)}
        </span>
      </div>
      <h2 className="text-xl font-black text-white mb-2 leading-tight">{video.title}</h2>
      {video.description && (
        <p className="text-sm text-slate-400 mb-3 leading-relaxed">{video.description}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-slate-600">
        {video.duration && video.duration !== "—" && (
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{video.duration}</span>
        )}
        <span>Added {formatDate(video.addedAt)}</span>
      </div>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-20 w-20 rounded-3xl flex items-center justify-center mb-5"
        style={{ background: "rgba(245,165,36,0.08)", border: "1px solid rgba(245,165,36,0.15)" }}>
        <Film className="h-9 w-9" style={{ color: "rgba(245,165,36,0.4)" }} />
      </div>
      <div className="text-xl font-black text-white mb-2">No Videos Yet</div>
      <div className="text-sm text-slate-400 max-w-sm leading-relaxed mb-6">
        Career videos will appear here once they've been added. Check back soon — new content is added regularly.
      </div>
      <Link href="/replitopolis">
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, #f5a524, #ea580c)", color: "#0a1428" }}>
          <Home className="h-4 w-4" /> Return to Dashboard
        </button>
      </Link>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
export default function VideosPage() {
  const [, navigate] = useLocation();
  const [activeCategory, setActiveCategory] = useState<FeedCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [videos, setVideos] = useState<AdminVideo[]>([]);

  useEffect(() => {
    setVideos(getAdminVideos());
  }, []);

  const authUser = getAuthUser();
  const profile = getProfile();
  const currentAvatar = AVATAR_PRESETS.find(a => a.id === profile?.avatarId) ?? AVATAR_PRESETS[0];
  const displayName = profile?.name ?? authUser?.name ?? "Explorer";

  const filtered = useMemo(() => {
    let list = videos;
    if (activeCategory !== "all") list = list.filter(v => v.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [videos, activeCategory, search]);

  const activeVideo = useMemo(
    () => videos.find(v => v.id === activeVideoId) ?? null,
    [videos, activeVideoId]
  );

  const handleSignOut = () => { signOut(); navigate("/login"); };

  const usedCategories = useMemo(() => {
    const cats = new Set(videos.map(v => v.category));
    return FEED_CATEGORIES.filter(c => cats.has(c.id));
  }, [videos]);

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at top, #0d1f3c 0%, #0a1428 60%)" }}>

      <header className="sticky top-0 z-40"
        style={{ background: "rgba(10,20,40,0.97)", borderBottom: "1px solid rgba(245,165,36,0.15)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/">
            <img src={`${BASE}logo.png`} alt="1WayMirror" className="h-9 w-auto object-contain cursor-pointer"
              style={{ filter: "drop-shadow(0 0 8px rgba(245,165,36,0.3))" }} />
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <Film className="h-4 w-4" style={{ color: "#f5a524" }} />
            <span className="font-black text-white text-sm">Career Videos</span>
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
              <button className="p-2 rounded-xl text-slate-400 transition-all hover:bg-white/10"
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

        {/* ── PLAYER VIEW ── */}
        {activeVideo && (
          <PlayerView video={activeVideo} onBack={() => setActiveVideoId(null)} />
        )}

        {/* ── BROWSE VIEW ── */}
        {!activeVideo && (
          <>
            {/* hero */}
            {videos.length > 0 && (
              <div className="rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                style={{ background: "linear-gradient(135deg, rgba(245,165,36,0.08), rgba(234,88,12,0.05))", border: "1px solid rgba(245,165,36,0.2)" }}>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, rgba(245,165,36,0.2), rgba(234,88,12,0.15))", border: "1px solid rgba(245,165,36,0.3)" }}>
                    <Film className="h-5 w-5" style={{ color: "#f5a524" }} />
                  </div>
                  <div>
                    <div className="font-black text-white text-base">Career Video Library</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Expert-curated videos for every career category. New content added regularly.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:ml-auto">
                  <div className="text-center">
                    <div className="text-xl font-black text-white">{videos.length}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">Videos</div>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="text-center">
                    <div className="text-xl font-black text-white">{usedCategories.length}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">Categories</div>
                  </div>
                </div>
              </div>
            )}

            {/* empty state */}
            {videos.length === 0 && <EmptyState />}

            {/* search + filters */}
            {videos.length > 0 && (
              <>
                <div className="relative mb-4">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search videos…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    onFocus={e => e.target.style.borderColor = "rgba(245,165,36,0.5)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                  />
                </div>

                {usedCategories.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-none">
                    {[{ id: "all", label: "All Topics", emoji: "🎬" }, ...usedCategories.map(c => ({ id: c.id, label: c.label, emoji: c.emoji }))].map(f => {
                      const color = f.id === "all" ? "#1d4ed8" : PLAYLIST_CATEGORY_COLORS[f.id as FeedCategory] ?? "#f5a524";
                      const active = activeCategory === f.id;
                      return (
                        <button key={f.id} onClick={() => setActiveCategory(f.id as typeof activeCategory)}
                          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
                          style={active
                            ? { background: color, color: f.id === "all" ? "white" : "#0a1428", boxShadow: `0 0 12px ${color}50` }
                            : { background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>
                          {f.emoji} {f.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-500 flex items-center gap-2">
                    <Eye className="h-4 w-4" /> {filtered.length} video{filtered.length !== 1 ? "s" : ""}
                    {activeCategory !== "all" && ` in ${FEED_CATEGORIES.find(c => c.id === activeCategory)?.label}`}
                  </span>
                </div>

                {filtered.length === 0 ? (
                  <div className="rounded-2xl p-16 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-4xl mb-3">🎬</div>
                    <div className="text-lg font-bold text-white">No videos found</div>
                    <button onClick={() => { setActiveCategory("all"); setSearch(""); }}
                      className="mt-4 px-5 py-2 rounded-xl text-sm font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #f5a524, #ea580c)" }}>
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(v => (
                      <VideoCard key={v.id} video={v} onSelect={() => setActiveVideoId(v.id)} />
                    ))}
                  </div>
                )}

                <div className="mt-10 mb-6">
                  <Link href="/replitopolis">
                    <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black transition-all hover:scale-[1.01]"
                      style={{ background: "linear-gradient(135deg, rgba(245,165,36,0.1), rgba(234,88,12,0.06))", border: "1px solid rgba(245,165,36,0.25)", color: "#f5a524" }}>
                      <Home className="h-4 w-4" /> Return to Dashboard <ArrowRight className="h-4 w-4" />
                    </button>
                  </Link>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
