import { useRef, useEffect, useState } from "react";
import { Link } from "wouter";
import { getAuthUser } from "@/lib/auth";
import { getProfile, AVATAR_PRESETS } from "@/lib/profile";
import {
  ArrowRight, CheckCircle2, ChevronDown, Menu, X, Play,
  Brain, Globe, TrendingUp, Users, ShieldCheck, Zap,
  GraduationCap, Star, Target, Sparkles, Mail, Phone,
  MessageSquare, BookOpen, Layers, Award, Rss,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL ?? "/";

/* ─── CSS keyframes injected once ─── */
function GlobalStyles() {
  useEffect(() => {
    const id = "hp-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes float { 0%,100%{transform:translateY(0px) rotate(-1deg)} 50%{transform:translateY(-12px) rotate(1deg)} }
      @keyframes float2 { 0%,100%{transform:translateY(0px) rotate(2deg)} 50%{transform:translateY(-8px) rotate(-2deg)} }
      @keyframes blobPulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.65;transform:scale(1.08)} }
      @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
      @keyframes shimmer { 0%{left:-100%} 100%{left:200%} }
      @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
      @keyframes countUp { from{opacity:0;transform:scale(0.7)} to{opacity:1;transform:scale(1)} }
      .hp-float { animation: float 6s ease-in-out infinite; }
      .hp-float2 { animation: float2 8s ease-in-out infinite; }
      .hp-float3 { animation: float 7s ease-in-out infinite 1s; }
      .hp-float4 { animation: float2 9s ease-in-out infinite 2s; }
      .hp-float5 { animation: float 5.5s ease-in-out infinite 0.5s; }
      .hp-blob { animation: blobPulse 6s ease-in-out infinite; }
      .hp-blob2 { animation: blobPulse 8s ease-in-out infinite 2s; }
      .hp-grad-btn { background-size:200% 200%; animation:gradientShift 3s ease infinite; }
      .hp-fade-up { animation: fadeUp 0.7s ease forwards; }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);
  return null;
}

/* ─── NAV ─── */
function NavBar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const authUser = getAuthUser();
  const profile = authUser ? getProfile() : null;
  const myAvatar = profile ? (AVATAR_PRESETS.find(a => a.id === profile.avatarId) ?? AVATAR_PRESETS[0]) : null;
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "About Us", href: "#about" },
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Our Experts", href: "#experts" },
    { label: "Pricing", href: "#pricing" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? "rgba(8,16,34,0.96)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(245,165,36,0.12)" : "none",
        boxShadow: scrolled ? "0 4px 40px rgba(0,0,0,0.4)" : "none",
      }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href={authUser ? "/replitopolis" : "/"} className="flex items-center gap-2.5 flex-shrink-0">
          <img src={`${BASE}logo.png`} alt="1WayMirror" className="h-10 w-auto object-contain"
            style={{ filter: "drop-shadow(0 0 8px rgba(245,165,36,0.3))" }} />
          <div className="hidden sm:block leading-tight">
            <div className="font-black text-white text-sm">1WayMirror</div>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <a key={l.label} href={l.href}
              className="text-sm text-slate-300 hover:text-white font-medium transition-colors relative group">
              {l.label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 rounded-full group-hover:w-full transition-all duration-300"
                style={{ background: "linear-gradient(90deg, #f5a524, #ea580c)" }} />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {authUser ? (
            <Link href="/replitopolis">
              <button className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all hover:scale-105 active:scale-100"
                style={{ background: "rgba(245,165,36,0.12)", border: "1px solid rgba(245,165,36,0.3)" }}>
                {myAvatar && (
                  <span className="text-lg leading-none">{myAvatar.emoji}</span>
                )}
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-black text-gold leading-tight truncate max-w-[100px]">
                    {profile?.name ?? authUser.email?.split("@")[0] ?? "Explorer"}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">Dashboard →</div>
                </div>
                <span className="sm:hidden text-xs font-black text-gold">Dashboard →</span>
              </button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <button className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:bg-white/10"
                  style={{ border: "1px solid rgba(255,255,255,0.18)" }}>
                  Sign In
                </button>
              </Link>
              <Link href="/login">
                <button className="relative overflow-hidden px-4 py-2 rounded-lg text-sm font-black transition-all hover:scale-105 active:scale-100 hp-grad-btn"
                  style={{ background: "linear-gradient(135deg, #f5a524 0%, #ea580c 50%, #f5a524 100%)", color: "#0a1428", boxShadow: "0 0 20px rgba(245,165,36,0.35)" }}>
                  Try 7 Days Free
                </button>
              </Link>
            </>
          )}
          <button className="md:hidden text-white p-1.5" onClick={() => setOpen(v => !v)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden px-4 pb-4 space-y-1" style={{ background: "rgba(8,16,34,0.98)", borderBottom: "1px solid rgba(245,165,36,0.2)" }}>
          {links.map(l => (
            <a key={l.label} href={l.href} onClick={() => setOpen(false)}
              className="flex items-center py-3 px-3 text-sm text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors">{l.label}</a>
          ))}
          {authUser ? (
            <Link href="/replitopolis" onClick={() => setOpen(false)}>
              <div className="mt-2 py-3 px-4 rounded-xl flex items-center gap-3"
                style={{ background: "rgba(245,165,36,0.1)", border: "1px solid rgba(245,165,36,0.25)" }}>
                {myAvatar && <span className="text-2xl">{myAvatar.emoji}</span>}
                <div>
                  <div className="text-sm font-black text-gold">{profile?.name ?? "Explorer"}</div>
                  <div className="text-xs text-slate-400">Go to Dashboard →</div>
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)}>
              <div className="mt-2 py-3 text-center rounded-xl text-sm font-black hp-grad-btn"
                style={{ background: "linear-gradient(135deg, #f5a524, #ea580c, #f5a524)", backgroundSize: "200% 200%", color: "#0a1428" }}>Try 7 Days Free</div>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}

/* ─── floating career card component ─── */
const FLOAT_CARDS = [
  { emoji: "⚙️", label: "Mechanical Engineer", sub: "Engineering", color: "#f5a524", cls: "hp-float",  pos: "top-[22%] left-[5%]" },
  { emoji: "🧬", label: "Biomedical Engineer",  sub: "Healthcare",  color: "#ec4899", cls: "hp-float2", pos: "top-[38%] left-[2%]" },
  { emoji: "💻", label: "Software Engineer",    sub: "Technology",  color: "#3b82f6", cls: "hp-float3", pos: "top-[20%] right-[4%]" },
  { emoji: "⚖️", label: "Corporate Lawyer",     sub: "Law",         color: "#a855f7", cls: "hp-float4", pos: "top-[40%] right-[3%]" },
  { emoji: "🏗️", label: "Civil Engineer",       sub: "Engineering", color: "#22d3ee", cls: "hp-float5", pos: "top-[60%] left-[4%]" },
  { emoji: "💊", label: "Pharmacist",            sub: "Healthcare",  color: "#4ade80", cls: "hp-float2", pos: "top-[62%] right-[5%]" },
];

/* ─── HERO ─── */
function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * 2000, y: Math.random() * 1200,
      r: Math.random() * 1.8 + 0.2, dx: (Math.random() - 0.5) * 0.2, dy: (Math.random() - 0.5) * 0.2,
      alpha: Math.random() * 0.4 + 0.06, gold: Math.random() > 0.4,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        ctx.beginPath(); ctx.arc(p.x * canvas.width / 2000, p.y * canvas.height / 1200, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.gold ? `rgba(245,165,36,${p.alpha})` : `rgba(59,130,246,${p.alpha * 0.5})`;
        ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0) p.x = 2000; if (p.x > 2000) p.x = 0;
        if (p.y < 0) p.y = 1200; if (p.y > 1200) p.y = 0;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-10 overflow-hidden"
      style={{ background: "radial-gradient(ellipse 120% 80% at 50% -10%, #0e2d5a 0%, #0a1428 55%)" }}>
      {/* particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* gradient blobs */}
      <div className="hp-blob absolute top-[-10%] left-[10%] w-[600px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(245,165,36,0.12) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div className="hp-blob2 absolute bottom-[5%] right-[5%] w-[500px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div className="hp-blob absolute top-[30%] right-[15%] w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)", filter: "blur(50px)" }} />

      {/* subtle grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      {/* floating career cards — desktop only */}
      {FLOAT_CARDS.map(fc => (
        <div key={fc.label}
          className={`hidden lg:flex absolute items-center gap-2 px-3 py-2 rounded-xl pointer-events-none ${fc.cls}`}
          style={{
            ...(fc.pos.includes("left") ? { left: fc.pos.match(/left-\[([^\]]+)\]/)?.[1] } : { right: fc.pos.match(/right-\[([^\]]+)\]/)?.[1] }),
            ...(fc.pos.includes("top") ? { top: fc.pos.match(/top-\[([^\]]+)\]/)?.[1] } : {}),
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${fc.color}35`,
            backdropFilter: "blur(12px)",
            boxShadow: `0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px ${fc.color}15`,
          }}>
          <span className="text-lg">{fc.emoji}</span>
          <div>
            <div className="text-xs font-bold text-white leading-tight">{fc.label}</div>
            <div className="text-[10px] font-semibold" style={{ color: fc.color }}>{fc.sub}</div>
          </div>
        </div>
      ))}

      {/* content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <div className="flex justify-center mb-8">
          <img src={`${BASE}logo.png`} alt="1WayMirror" className="h-28 sm:h-36 w-auto object-contain"
            style={{ filter: "drop-shadow(0 0 60px rgba(245,165,36,0.55)) drop-shadow(0 0 20px rgba(245,165,36,0.3))" }} />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6"
          style={{ background: "rgba(245,165,36,0.08)", border: "1px solid rgba(245,165,36,0.25)", color: "#f5a524", backdropFilter: "blur(8px)" }}>
          <Sparkles className="h-3.5 w-3.5" />
          AI-Powered Career Exploration for High School Students
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] text-white mb-6">
          Explore Careers Before<br />
          <span className="relative inline-block">
            <span style={{ background: "linear-gradient(135deg, #f5a524 0%, #ea580c 50%, #f5c524 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Choosing One Forever
            </span>
          </span>
        </h1>

        <p className="text-xl sm:text-2xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
          1WayMirror gives high school students and their parents an immersive,
          AI-powered platform to explore 75+ real careers — through simulations,
          expert guidance, and a 3D career city — before committing to a college major.
        </p>

        <div className="flex flex-wrap gap-4 justify-center mb-14">
          <Link href="/login">
            <button className="h-14 px-8 rounded-2xl text-base font-black flex items-center gap-2 transition-all hover:scale-105 active:scale-100 hp-grad-btn"
              style={{ background: "linear-gradient(135deg, #f5a524 0%, #ea580c 50%, #f5a524 100%)", backgroundSize: "200% 200%", color: "#0a1428", boxShadow: "0 0 48px rgba(245,165,36,0.45), 0 8px 32px rgba(234,88,12,0.3)" }}>
              Try 7 Days Free <ArrowRight className="h-5 w-5" />
            </button>
          </Link>
          <a href="#features">
            <button className="h-14 px-8 rounded-2xl text-base font-semibold flex items-center gap-2 text-white transition-all hover:bg-white/10 hover:scale-105"
              style={{ border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
              <Play className="h-4 w-4 text-yellow-400" /> See How It Works
            </button>
          </a>
        </div>

        {/* stats bar */}
        <div className="inline-flex flex-wrap justify-center gap-0 rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}>
          {[
            { value: "75+", label: "Career Simulations", color: "#f5a524" },
            { value: "8",   label: "Industry Categories",  color: "#3b82f6" },
            { value: "50",  label: "Achievement Levels",   color: "#a855f7" },
            { value: "AI",  label: "Powered Missions",     color: "#10b981" },
          ].map((s, i) => (
            <div key={s.label} className="px-8 py-4 text-center" style={{ borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
              <div className="text-3xl font-black text-white" style={{ textShadow: `0 0 20px ${s.color}60` }}>{s.value}</div>
              <div className="text-[11px] uppercase tracking-widest mt-1" style={{ color: s.color }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-500 text-xs animate-bounce">
        <span>Discover More</span>
        <ChevronDown className="h-4 w-4" />
      </div>

      {/* wave bottom */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ lineHeight: 0 }}>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ width: "100%", height: "80px", display: "block" }}>
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}

/* ─── ABOUT ─── */
function About() {
  const CAT_ICONS = [
    { emoji: "⚙️", label: "Engineering",  color: "#f5a524" },
    { emoji: "💊", label: "Healthcare",   color: "#ec4899" },
    { emoji: "💼", label: "Business",     color: "#f97316" },
    { emoji: "💻", label: "Technology",   color: "#3b82f6" },
    { emoji: "🔧", label: "Trades",       color: "#eab308" },
    { emoji: "⚖️", label: "Law",          color: "#a855f7" },
    { emoji: "🔬", label: "Science",      color: "#22d3ee" },
    { emoji: "🌱", label: "Life Advice",  color: "#4ade80" },
  ];

  return (
    <section id="about" className="py-24 bg-white relative overflow-hidden">
      {/* subtle bg pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #0a1428 1px, transparent 0)", backgroundSize: "40px 40px" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-0.5 w-8 rounded-full" style={{ background: "linear-gradient(90deg, #f5a524, #ea580c)" }} />
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">About Us</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 leading-tight mb-8">
              Track Your Growth.<br />Compete. Improve.
            </h2>
            <div className="space-y-0">
              {[
                { icon: <GraduationCap className="h-5 w-5 text-blue-600" />, text: "Built specifically for high school students preparing for college and careers" },
                { icon: <Users className="h-5 w-5 text-blue-600" />, text: "Trusted by students, parents, and school counselors nationwide" },
                { icon: <ShieldCheck className="h-5 w-5 text-blue-600" />, text: "Safe, age-appropriate content reviewed by education professionals" },
                { icon: <Award className="h-5 w-5 text-blue-600" />, text: "Guided by real industry experts and higher education consultants" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-3.5 border-b border-slate-100 group">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                    style={{ background: "#eff6ff" }}>
                    {item.icon}
                  </div>
                  <span className="text-slate-700 text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-slate-600 text-lg leading-relaxed mb-6">
              We believe every student deserves the right guidance, resources, and opportunities to shape their future with confidence. Our platform bridges the gap between education and career readiness.
            </p>
            <p className="text-slate-600 leading-relaxed mb-8">
              From interactive career simulations and AI-generated workplace scenarios to live talks with industry professionals and real-time counselor updates, we bring everything a student needs into one engaging experience.
            </p>

            {/* career category wheel */}
            <div className="grid grid-cols-4 gap-3">
              {CAT_ICONS.map(c => (
                <div key={c.label} className="rounded-2xl p-3 flex flex-col items-center gap-1.5 group cursor-default hover:scale-105 transition-transform"
                  style={{ background: `${c.color}10`, border: `1px solid ${c.color}25` }}>
                  <span className="text-2xl">{c.emoji}</span>
                  <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* wave bottom */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ lineHeight: 0 }}>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ width: "100%", height: "60px", display: "block" }}>
          <path d="M0,30 C480,60 960,0 1440,30 L1440,60 L0,60 Z" fill="#1d4ed8" />
        </svg>
      </div>
    </section>
  );
}

/* ─── FEATURES ─── */
const FEATURES = [
  { icon: "🎯", title: "Explore 75+ Careers", desc: "Modern platform to explore career options across engineering, healthcare, business, law, technology, trades, science, and life advice — all tailored for high school students.", color: "#f5a524" },
  { icon: "🤖", title: "AI-Powered Simulations", desc: "Every mission is uniquely generated by AI to reflect real workplace scenarios. No two experiences are the same — your skills and knowledge are tested in realistic situations.", color: "#3b82f6" },
  { icon: "🎙️", title: "Expert Career Talks", desc: "Learn from industry professionals through live sessions and on-demand recordings. Get real insights from people thriving in the careers you're curious about.", color: "#10b981" },
  { icon: "🌆", title: "3D Career City", desc: "Walk through a fully immersive 3D career city with 9 districts — enter buildings, talk to NPC mentors, and launch simulations from inside a virtual world.", color: "#a855f7" },
  { icon: "📈", title: "Progress & Level Tracking", desc: "Earn XP, build daily streaks, unlock 65+ career badges, and level up from Rookie to LEGEND as you explore more careers and master challenging scenarios.", color: "#ef4444" },
  { icon: "📰", title: "Curated Career Feed", desc: "Stay informed with expert-curated articles and career insights across every category — engineering, healthcare, law, trades, and more. Admin-only, always accurate.", color: "#f97316" },
];

function Features() {
  return (
    <section id="features" className="py-24 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #1d4ed8 0%, #1e3a8a 60%, #0f2262 100%)" }}>
      {/* decorative circles */}
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full pointer-events-none opacity-10"
        style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }} />
      <div className="absolute bottom-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full pointer-events-none opacity-10"
        style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        <div className="grid lg:grid-cols-2 gap-10 items-start mb-14">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-0.5 w-8 rounded-full bg-blue-300 opacity-50" />
              <span className="text-sm font-semibold text-blue-200 uppercase tracking-wider">Platform Features</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
              Everything You Need<br />to Succeed
            </h2>
          </div>
          <p className="text-blue-100 text-lg leading-relaxed mt-2">
            Gain valuable insights from industry leaders through on-demand sessions and interactive experiences. Learn real-world skills, explore different career paths, and get practical advice tailored to students preparing for their future.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div key={f.title}
              className="rounded-2xl p-6 group transition-all hover:-translate-y-1.5 hover:shadow-2xl"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              }}>
              {/* icon with glow */}
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl mb-4 transition-transform group-hover:scale-110"
                style={{
                  background: `${f.color}20`,
                  border: `1px solid ${f.color}40`,
                  boxShadow: `0 0 20px ${f.color}25`,
                }}>
                {f.icon}
              </div>
              {/* accent line */}
              <div className="h-0.5 w-8 rounded-full mb-3" style={{ background: f.color }} />
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-blue-100 text-sm leading-relaxed opacity-85">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* wave bottom */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ lineHeight: 0 }}>
        <svg viewBox="0 0 1440 70" preserveAspectRatio="none" style={{ width: "100%", height: "70px", display: "block" }}>
          <path d="M0,35 C360,70 1080,0 1440,35 L1440,70 L0,70 Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS ─── */
function HowItWorks() {
  const steps = [
    { n: "01", title: "Start Your 7-Day Free Trial", desc: "Sign up and enter your payment details. You won't be charged if you cancel within 7 days — guaranteed money-back. Tell us your school, grade, and career interests.", emoji: "👤", color: "#f5a524" },
    { n: "02", title: "Explore Career Simulations", desc: "Jump into AI-powered workplace missions across 8 career categories. Make real decisions in each role and see how you perform.", emoji: "⚡", color: "#3b82f6" },
    { n: "03", title: "Walk the 3D Career City", desc: "Enter our immersive 3D world, explore career districts, meet NPC mentors, and discover career paths through a first-person experience.", emoji: "🌆", color: "#a855f7" },
    { n: "04", title: "Level Up & Earn Badges", desc: "Track your growth across 50 levels and 65+ achievement badges. The more you explore, the clearer your path to the right college major.", emoji: "🏆", color: "#10b981" },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #0a1428 1px, transparent 0)", backgroundSize: "32px 32px" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-widest font-black mb-3" style={{ color: "#f5a524" }}>Simple Process</div>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900">How 1WayMirror Works</h2>
          <p className="text-slate-500 mt-4 max-w-2xl mx-auto text-lg">
            From first signup to career clarity — here's how students and parents use the platform to make smarter decisions about their future.
          </p>
        </div>

        {/* connector line (desktop) */}
        <div className="hidden lg:flex items-center justify-between mb-0 relative px-[12.5%] -mb-8">
          <div className="absolute top-6 left-[17%] right-[17%] h-0.5 pointer-events-none"
            style={{ background: "linear-gradient(90deg, #f5a524, #3b82f6, #a855f7, #10b981)" }} />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <div key={s.n} className="relative rounded-2xl p-6 flex flex-col gap-4 border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1 bg-white"
              style={{ boxShadow: `0 4px 24px rgba(0,0,0,0.05)` }}>
              {/* step number glow */}
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: `${s.color}12`, border: `2px solid ${s.color}30`, boxShadow: `0 0 20px ${s.color}20` }}>
                {s.emoji}
              </div>
              <div className="absolute top-4 right-4 text-7xl font-black opacity-[0.04] select-none tabular-nums">{s.n}</div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-1 w-4 rounded-full" style={{ background: s.color }} />
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: s.color }}>Step {s.n}</div>
                </div>
                <h3 className="text-base font-black text-slate-900 mb-2">{s.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* wave */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ lineHeight: 0 }}>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ width: "100%", height: "60px", display: "block" }}>
          <path d="M0,20 C720,60 720,0 1440,30 L1440,60 L0,60 Z" fill="#0a1428" />
        </svg>
      </div>
    </section>
  );
}

/* ─── TECHNOLOGY ─── */
function Technology() {
  return (
    <section className="py-24 relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #0e2d5a 0%, #0a1428 60%)" }}>
      <div className="hp-blob absolute top-[-5%] left-[30%] w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(245,165,36,0.08) 0%, transparent 70%)", filter: "blur(80px)" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-widest font-black mb-3" style={{ color: "#f5a524" }}>Built for the Future</div>
          <h2 className="text-4xl sm:text-5xl font-black text-white">The Technology Behind<br />1WayMirror</h2>
          <p className="text-slate-400 mt-4 max-w-2xl mx-auto">
            We combine cutting-edge AI, immersive 3D technology, and real-world career data to create the most comprehensive career readiness platform for high school students.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {[
            {
              emoji: "🧠",
              title: "Large Language AI Engine",
              color: "#f5a524",
              points: [
                "Dynamically generates unique career scenarios for every session",
                "Adapts difficulty based on your skill level and past performance",
                "Provides realistic workplace dialogue and decision trees",
                "Trained on real industry workflows and professional responsibilities",
              ],
            },
            {
              emoji: "🌐",
              title: "Immersive 3D & WebXR World",
              color: "#3b82f6",
              points: [
                "Built on React Three Fiber and Drei for browser-native 3D",
                "Full avatar customization with 8 unique character types",
                "Real-time multiplayer — see other learners in the same world",
                "Compatible with VR headsets for a fully immersive experience",
              ],
            },
            {
              emoji: "⚡",
              title: "Intelligent Progress Tracking",
              color: "#10b981",
              points: [
                "XP system and 50-level progression from Rookie to Legend",
                "65+ achievement badges spanning career categories and milestones",
                "Category-by-category performance analytics and accuracy scoring",
                "Daily streak tracking to build consistent career exploration habits",
              ],
            },
          ].map(card => (
            <div key={card.title} className="rounded-2xl p-7 group hover:scale-[1.02] transition-transform"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
              }}>
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-110 transition-transform"
                style={{ background: `${card.color}18`, border: `1px solid ${card.color}35`, boxShadow: `0 0 30px ${card.color}25` }}>
                {card.emoji}
              </div>
              <div className="h-0.5 w-8 rounded-full mb-4" style={{ background: card.color }} />
              <h3 className="text-xl font-bold text-white mb-4">{card.title}</h3>
              <ul className="space-y-2.5">
                {card.points.map(p => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: card.color }} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* wave */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ lineHeight: 0 }}>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ width: "100%", height: "60px", display: "block" }}>
          <path d="M0,30 C480,60 960,0 1440,30 L1440,60 L0,60 Z" fill="#f8fafc" />
        </svg>
      </div>
    </section>
  );
}

/* ─── EXPERTS ─── */
interface ExpertDef {
  photo?: string;
  photoPosition?: string;
  initials: string;
  name: string;
  credentials?: string;
  role: string;
  title: string;
  bio: string[];
  linkedin?: string;
  color: string;
  accentBg: string;
}

const LI_ICON = (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

function ExpertCard({ e }: { e: ExpertDef }) {
  const [expanded, setExpanded] = useState(false);
  const previewBio = e.bio[0];
  const restBio = e.bio.slice(1);

  return (
    <div
      className="bg-white rounded-3xl overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col"
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>

      {/* Top accent bar */}
      <div className="h-1.5 w-full flex-shrink-0" style={{ background: e.accentBg }} />

      <div className="p-7 flex flex-col flex-1">
        {/* Role badge */}
        <div className="mb-4">
          <span className="text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full"
            style={{ background: `${e.color}15`, color: e.color, border: `1px solid ${e.color}30` }}>
            {e.role}
          </span>
        </div>

        {/* Header row */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative flex-shrink-0">
            {e.photo ? (
              <img src={e.photo} alt={e.name}
                className="h-20 w-20 rounded-2xl object-cover"
                style={{
                  objectPosition: e.photoPosition ?? "center top",
                  boxShadow: `0 4px 20px ${e.color}30`,
                }} />
            ) : (
              <div className="h-20 w-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
                style={{ background: e.accentBg, boxShadow: `0 4px 20px ${e.color}30` }}>
                {e.initials}
              </div>
            )}
            <div className="absolute inset-[-3px] rounded-2xl pointer-events-none"
              style={{ border: `2px solid ${e.color}30` }} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black text-slate-900 leading-tight">
              {e.name}{e.credentials && <span className="text-sm font-semibold text-slate-400 ml-1">, {e.credentials}</span>}
            </h3>
            <div className="text-sm font-semibold mt-0.5 text-slate-500">{e.title}</div>
            {e.linkedin && (
              <a href={e.linkedin} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-slate-400 hover:text-blue-600 transition-colors">
                {LI_ICON} LinkedIn
              </a>
            )}
          </div>
        </div>

        <div className="h-px mb-4" style={{ background: `${e.color}20` }} />

        {/* Bio — first paragraph always visible, rest behind Read More */}
        <div className="flex-1">
          <p className="text-slate-600 text-sm leading-relaxed">{previewBio}</p>

          {restBio.length > 0 && (
            <>
              {expanded && (
                <div className="mt-3 space-y-3">
                  {restBio.map((p, i) => (
                    <p key={i} className="text-slate-600 text-sm leading-relaxed">{p}</p>
                  ))}
                </div>
              )}
              <button
                onClick={() => setExpanded(v => !v)}
                className="mt-3 text-xs font-bold transition-colors flex items-center gap-1"
                style={{ color: e.color }}>
                {expanded ? "Show less ↑" : "Read more ↓"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Experts() {
  const experts: ExpertDef[] = [
    {
      photo: "/derrick-franco.jpg",
      photoPosition: "center center",
      initials: "DF",
      name: "Derrick Franco",
      role: "Technology Expert",
      title: "Engineer & Technical Leader",
      bio: [
        "Derrick is an Engineer and Technical leader with over 15 years of experience building startups and venture-backed scale-ups.",
        "As the founding engineer of Counterpart, he tackled the deep technical challenges required to grow the company from an idea to a multi-million dollar insurance company in just under 7 years.",
        "One of his biggest joys is the time he has spent advising startups, building remote teams, and helping to connect other entrepreneurs around the world.",
      ],
      linkedin: "https://www.linkedin.com/in/derrickfranco/",
      color: "#3b82f6",
      accentBg: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    },
    {
      photo: "/prince-ernest.jpg",
      photoPosition: "center top",
      initials: "PE",
      name: "Dr. Prince Ernest",
      credentials: "M.D.",
      role: "Medical Expert",
      title: "Cardiologist & Global Healthcare Educator",
      bio: [
        "Dr. Prince Ernest is a cardiologist passionate about mentorship, teaching, and helping students navigate meaningful career paths in medicine. Having trained in India, China, and the United States, he brings a unique global perspective shaped by working with people from diverse cultures and backgrounds. These experiences have strengthened his ability to connect with others, communicate effectively, and build meaningful long-term relationships.",
        "Throughout his journey in medicine, Dr. Ernest has remained deeply committed to education and mentorship. From teaching students and trainees to speaking at academic and community events, he has always found fulfillment in helping others grow with confidence and purpose. Having benefited from strong mentors throughout his own career, he is passionate about giving back and guiding the next generation.",
        "Dr. Ernest believes medicine is one of the most rewarding professions a person can pursue. While the path is long, demanding, and requires sacrifice, he believes few careers offer the same opportunity to make a lasting impact on people's lives during their most vulnerable moments. Outside of medicine, he enjoys public speaking, fitness, sports, and connecting with people from all walks of life.",
      ],
      linkedin: "https://www.linkedin.com/in/prince-ernest-m-d-3429771b0/",
      color: "#10b981",
      accentBg: "linear-gradient(135deg, #10b981, #059669)",
    },
    {
      photo: "/christopher-penny.jpg",
      photoPosition: "center 30%",
      initials: "CP",
      name: "Christopher Penny",
      role: "Engineering Expert",
      title: "Mechanical & Reliability Engineer",
      bio: [
        "Christopher Penny is an experienced engineer with over 20 years of practice in chemical plant equipment design, inspection, repair, and reliability improvement.",
        "With a B.S. in Mechanical Engineering from the University of Illinois at Urbana-Champaign and decades of experience, he has led key projects for multiple companies — enjoying a progressively responsible engineering career in the chemical and refinery industry while supervising experienced maintenance technicians and mentoring interns and recent college graduates.",
        "Christopher was attracted to engineering because he has always enjoyed solving problems and understanding how the world works.",
      ],
      linkedin: "https://www.linkedin.com/in/christopher-penny-15392012/",
      color: "#10b981",
      accentBg: "linear-gradient(135deg, #10b981, #059669)",
    },
    {
      photo: "/deb-krivelow.jpg",
      photoPosition: "center top",
      initials: "DK",
      name: "Deb Krivelow",
      role: "Business Expert",
      title: "SVP GM LifeStride & Ryka Caleres",
      bio: [
        "Deb Krivelow is founder and owner of Ascend Life Coaching & Mentoring, a Certified Life Coach and Master NLP Practitioner with over 30 years of corporate leadership experience in the retail and footwear industries.",
        "She spent 12 years at The May Company, progressing from Executive Trainee through Assistant Buyer, Area Sales Manager, and Buyer in Training before earning her role as a Buyer — giving her a deep foundation in retail operations, merchandising, and business strategy. She then joined Caleres, Inc., where over 19 years she climbed from Sales Rep to Director of Sales, National Sales Manager, Vice President & General Manager, and ultimately Senior Vice President & General Manager.",
        "She rose through the ranks doing the work at every level, which is what makes her business expertise both credible and relatable to students who are just beginning to imagine what their own career path might look like. She brings not just credentials but lived experience — honest, practical insight students can actually use. Deb works with 1WayMirror because she is passionate about helping young people discover that a business career is not a single path but a world of possibilities.",
      ],
      linkedin: "https://www.linkedin.com/in/debra-krivelow/",
      color: "#ec4899",
      accentBg: "linear-gradient(135deg, #ec4899, #db2777)",
    },
    {
      photo: "/lenroy-jones.jpg",
      photoPosition: "center top",
      initials: "LJ",
      name: "Lenroy Jones",
      role: "College Expert",
      title: "Career Services Executive & Author",
      bio: [
        "Lenroy Jones is a career services executive, author, and consultant with over 25 years of leadership across institutions, including Michigan State University, the University of Kentucky, a Hispanic-Serving Institution, a private liberal arts college, and a large urban community college. A multi-time Director and military veteran, he brings a rare, cross-sector perspective on building talent pipelines and preparing diverse populations for career success.",
        "As a first-generation college student, Lenroy is deeply committed to translating theory into practice — leveraging both professional expertise and lived experience to help individuals access higher education and successfully navigate complex career pathways. He is the author of Staying the Course in the Job Hunt and a recognized voice on career development, purpose, and mentorship, with contributions to multiple book chapters and nearly 50 published career-related columns.",
        "As a certified InsideTrack coach, he delivers results-driven coaching, strategy, and practical guidance that help students and professionals move from uncertainty to clarity — and from potential to purposeful, sustainable careers through his work with 1WayMirror.",
      ],
      linkedin: "https://www.linkedin.com/in/lenroyjones/",
      color: "#f5a524",
      accentBg: "linear-gradient(135deg, #f5a524, #ea580c)",
    },
    {
      photo: "/matt-rogers.jpg",
      photoPosition: "center top",
      initials: "MR",
      name: "Matt Rogers",
      role: "Athletic Recruiting / NIL Expert",
      title: "Athletic Recruiting & NIL Advisor",
      bio: [
        "Matt Rogers is a leading voice in athletic recruiting and Name, Image & Likeness (NIL), helping student-athletes navigate the complex landscape of college sports and the rapidly evolving opportunities that come with it.",
        "With deep experience advising athletes, families, and programs, Matt brings clarity to one of the most high-stakes decisions a young person can face — choosing the right school, the right sport pathway, and making the most of NIL opportunities before, during, and after college.",
        "Through 1WayMirror, Matt helps student-athletes see the full picture: athletics as a career launchpad, not just a game.",
      ],
      linkedin: "https://www.linkedin.com/in/rogersmatt16/",
      color: "#0ea5e9",
      accentBg: "linear-gradient(135deg, #0ea5e9, #0284c7)",
    },
    {
      photo: "/ramsey-penegar.jpg",
      photoPosition: "center top",
      initials: "RP",
      name: "Ramsey Penegar",
      credentials: "CPRW",
      role: "1:1 Student Career Strategist",
      title: "Executive Career Strategist & Resume Writer",
      bio: [
        "With 15+ years guiding professionals through career transitions, I've learned the most powerful work happens when someone stops chasing a title and starts owning their story.",
        "My approach blends strategy with deep listening, helping people translate experience into clarity, confidence, and a path forward that actually fits who they are.",
        "Joining 1WayMirror is a chance to step into that journey earlier — before second-guessing sets in and before a resume becomes another source of stress. I love helping students recognize what's already valuable about themselves and equip them with practical tools to walk into interviews, internships, and first roles with real confidence. Watching someone start their career with intention is the part of this work I find most rewarding.",
      ],
      linkedin: "https://www.linkedin.com/in/ramsey-penegar/",
      color: "#a855f7",
      accentBg: "linear-gradient(135deg, #a855f7, #7c3aed)",
    },
  ];

  return (
    <section id="experts" className="py-24 bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #0a1428 1px, transparent 0)", backgroundSize: "40px 40px" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        <div className="text-center mb-14">
          <div className="text-xs uppercase tracking-widest font-black mb-3" style={{ color: "#1d4ed8" }}>Learn From the Best</div>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900">Meet Our Career Experts</h2>
          <p className="text-slate-500 mt-4 max-w-xl mx-auto">Real industry leaders who have walked the paths your student is considering.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {experts.map(e => <ExpertCard key={e.name} e={e} />)}
        </div>
      </div>

      {/* wave */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ lineHeight: 0 }}>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ width: "100%", height: "60px", display: "block" }}>
          <path d="M0,20 C360,60 1080,0 1440,40 L1440,60 L0,60 Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}

/* ─── PRICING ─── */
type PricingPlan = {
  name: string; monthly: string; annualMonthly: string; annualTotal: string;
  trial: boolean; credits: number; highlight: boolean; tagline: string; features: string[];
};
const PLANS: PricingPlan[] = [
  {
    name: "Starter", monthly: "$19.99", annualMonthly: "$16.59", annualTotal: "$199", trial: true, credits: 0,
    highlight: false, tagline: "Perfect for getting started",
    features: [
      "All 85+ career simulations",
      "All on-demand career videos",
      "Career news & articles feed",
      "Progress tracking & analytics",
      "2 career live streams/month",
      "Shareable profile link",
    ],
  },
  {
    name: "Explorer", monthly: "$49.99", annualMonthly: "$41.49", annualTotal: "$499", trial: false, credits: 200,
    highlight: false, tagline: "Best for active explorers",
    features: [
      "Everything in Starter, plus:",
      "7 live streams/month",
      "1 exploratory career session",
      "Dario AI chat (200 credits/mo)",
      "Career comparison tool",
      "Career roadmap generator",
    ],
  },
  {
    name: "Builder", monthly: "$99.99", annualMonthly: "$82.99", annualTotal: "$995", trial: false, credits: 700,
    highlight: true, tagline: "Most popular for students",
    features: [
      "Everything in Explorer, plus:",
      "All career live streams",
      "Full recorded talks library",
      "Athletic recruiting guidance",
      "College advising content",
      "Personality finder & career report",
      "Opportunities board & action items",
    ],
  },
  {
    name: "Accelerator", monthly: "$199.99", annualMonthly: "$165.99", annualTotal: "$1,991", trial: false, credits: 1200,
    highlight: false, tagline: "The ultimate career toolkit",
    features: [
      "Everything in Builder, plus:",
      "1,200 Dario credits/month",
      "1-on-1 career advisor (1×/month)",
      "  → Personalized career roadmap",
      "  → College application strategy",
      "  → Suggested majors & careers",
    ],
  },
];

function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none opacity-[0.04]"
        style={{ background: "radial-gradient(ellipse, #1d4ed8 0%, transparent 70%)" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-widest font-black mb-3" style={{ color: "#f5a524" }}>Transparent Pricing</div>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900">Choose Your Plan</h2>
          <p className="text-slate-500 mt-4 max-w-xl mx-auto">
            The <strong>Starter plan ($19.99/mo) includes a 7-day free trial</strong>. Cancel anytime.
          </p>
        </div>

        {/* Annual / Monthly toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className="text-sm font-semibold" style={{ color: !annual ? "#0f172a" : "#94a3b8" }}>Monthly</span>
          <button onClick={() => setAnnual(v => !v)}
            className="relative w-14 h-7 rounded-full transition-all"
            style={{ background: annual ? "#f5a524" : "#e2e8f0" }}>
            <div className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all"
              style={{ left: annual ? "calc(100% - 1.5rem)" : "0.25rem" }} />
          </button>
          <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: annual ? "#0f172a" : "#94a3b8" }}>
            Annual
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "#fef3c7", color: "#92400e" }}>Save 17%</span>
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {PLANS.map(plan => (
            <div key={plan.name}
              className="rounded-2xl p-6 flex flex-col gap-4 transition-all hover:-translate-y-1"
              style={plan.highlight
                ? { background: "linear-gradient(160deg, #1e40af 0%, #1d4ed8 100%)", border: "2px solid #60a5fa", boxShadow: "0 20px 60px rgba(29,78,216,0.35)", transform: "scale(1.02)" }
                : { background: "#f8fafc", border: "2px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
              {plan.highlight && (
                <div className="text-center -mx-6 -mt-6 py-1.5 rounded-t-xl text-xs font-black uppercase tracking-wider"
                  style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
                  ⭐ Most Popular
                </div>
              )}
              <div>
                <div className="text-sm font-bold mb-1" style={{ color: plan.highlight ? "rgba(255,255,255,0.65)" : "#94a3b8" }}>{plan.tagline}</div>
                <div className="text-xl font-black mb-2" style={{ color: plan.highlight ? "white" : "#0f172a" }}>{plan.name}</div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black" style={{ color: plan.highlight ? "white" : "#0f172a" }}>
                    {annual ? plan.annualMonthly : plan.monthly}
                  </span>
                  <span className="text-sm pb-1.5" style={{ color: plan.highlight ? "rgba(255,255,255,0.55)" : "#94a3b8" }}>/mo</span>
                </div>
                {annual && (
                  <div className="text-xs mt-0.5" style={{ color: plan.highlight ? "rgba(255,255,255,0.5)" : "#94a3b8" }}>
                    Billed {plan.annualTotal}/yr
                  </div>
                )}
                {plan.trial && (
                  <div className="text-xs mt-1 font-semibold" style={{ color: plan.highlight ? "#93c5fd" : "#1d4ed8" }}>
                    7-day free trial
                  </div>
                )}
              </div>

              <div className="h-0.5 rounded-full" style={{ background: plan.highlight ? "rgba(255,255,255,0.15)" : "#e2e8f0" }} />

              {/* Dario credits */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: plan.highlight ? "rgba(255,255,255,0.12)" : "#eff6ff", border: `1px solid ${plan.highlight ? "rgba(255,255,255,0.2)" : "#bfdbfe"}` }}>
                <span className="text-base">🤖</span>
                <span className="text-xs font-bold" style={{ color: plan.highlight ? "white" : "#1d4ed8" }}>
                  {plan.credits === 0 ? "No Dario AI" : `${plan.credits.toLocaleString()} Dario credits/mo`}
                </span>
              </div>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm"
                    style={{ color: plan.highlight ? "rgba(255,255,255,0.82)" : "#475569" }}>
                    {f.startsWith("  →") ? (
                      <span className="ml-5 text-xs block" style={{ color: plan.highlight ? "rgba(255,255,255,0.5)" : "#94a3b8" }}>{f.trim()}</span>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: plan.highlight ? "#93c5fd" : "#1d4ed8" }} />
                        {f}
                      </>
                    )}
                  </li>
                ))}
              </ul>

              <Link href="/login">
                <button className="w-full py-3 rounded-xl text-sm font-black transition-all hover:scale-105 active:scale-100"
                  style={plan.highlight
                    ? { background: "white", color: "#1d4ed8", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }
                    : { background: "#1d4ed8", color: "white", boxShadow: "0 4px 16px rgba(29,78,216,0.2)" }}>
                  {plan.trial ? "Start Free Trial" : "Get Started"}
                </button>
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-slate-400 text-sm mt-8">
          The Starter plan includes a <strong className="text-slate-600">7-day free trial</strong>. Explorer, Builder & Accelerator plans are billed immediately. Cancel anytime.
          <br className="hidden sm:block" />
          Stripe billing coming soon —{" "}
          <a href="#contact" className="text-blue-600 hover:underline font-medium">contact us</a> to be notified at launch.
        </p>
      </div>
    </section>
  );
}

/* ─── CTA BANNER ─── */
function CtaBanner() {
  return (
    <section className="py-24 relative overflow-hidden px-4"
      style={{ background: "linear-gradient(135deg, #081222 0%, #0e2d5a 35%, #1d4ed8 65%, #081222 100%)", backgroundSize: "200% 200%", animation: "gradientShift 10s ease infinite" }}>
      {/* decorative orbs */}
      <div className="absolute top-[-50px] left-[20%] w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(245,165,36,0.15) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div className="absolute bottom-[-50px] right-[20%] w-[250px] h-[250px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)", filter: "blur(50px)" }} />

      <div className="relative max-w-4xl mx-auto text-center">
        <div className="text-6xl mb-6"
          style={{ filter: "drop-shadow(0 0 20px rgba(245,165,36,0.5))" }}>🎓</div>
        <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
          Your Student's Career Journey<br />Starts Here
        </h2>
        <p className="text-blue-200 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
          Don't let your high schooler pick a major blindly. Give them 75+ career experiences, expert mentorship, and a 3D world built to help them find their path — before they ever step on a college campus.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/login">
            <button className="h-14 px-10 rounded-2xl text-base font-black flex items-center gap-2 transition-all hover:scale-105 hp-grad-btn"
              style={{ background: "linear-gradient(135deg, #f5a524 0%, #ea580c 50%, #f5a524 100%)", backgroundSize: "200% 200%", color: "#0a1428", boxShadow: "0 0 50px rgba(245,165,36,0.5), 0 8px 32px rgba(234,88,12,0.3)" }}>
              Try 7 Days Free <ArrowRight className="h-5 w-5" />
            </button>
          </Link>
          <a href="#pricing">
            <button className="h-14 px-8 rounded-2xl text-base font-semibold flex items-center gap-2 text-white transition-all hover:bg-white/10"
              style={{ border: "1px solid rgba(255,255,255,0.25)" }}>
              View Plans
            </button>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── CONTACT ─── */
const CONTACT_KEY    = "1waymirror_contact_v1";
const NEWSLETTER_KEY = "1waymirror_newsletter_v1";

function saveContactSubmission(data: { name: string; email: string; phone: string; message: string }) {
  try {
    const existing = JSON.parse(localStorage.getItem(CONTACT_KEY) ?? "[]") as typeof data[];
    existing.push({ ...data, submittedAt: new Date().toISOString() } as never);
    localStorage.setItem(CONTACT_KEY, JSON.stringify(existing));
  } catch { /* noop */ }
}

function saveNewsletterEmail(email: string) {
  try {
    const existing = JSON.parse(localStorage.getItem(NEWSLETTER_KEY) ?? "[]") as { email: string; subscribedAt: string }[];
    if (!existing.some(e => e.email === email)) {
      existing.push({ email, subscribedAt: new Date().toISOString() });
      localStorage.setItem(NEWSLETTER_KEY, JSON.stringify(existing));
    }
  } catch { /* noop */ }
}

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);

  return (
    <section id="contact" className="py-24 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #eef3ff 0%, #f0f4ff 100%)" }}>
      <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ lineHeight: 0 }}>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ width: "100%", height: "60px", display: "block", transform: "rotate(180deg)" }}>
          <path d="M0,20 C360,60 1080,0 1440,40 L1440,60 L0,60 Z" fill="white" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs uppercase tracking-widest font-black mb-3" style={{ color: "#1d4ed8" }}>Get in Touch</div>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 leading-tight mb-4">
              Discover the Future<br />of Career Guidance
            </h2>
            <p className="text-slate-600 text-lg mb-8">Have questions? Want to learn more about how 1WayMirror can help your student? We'd love to hear from you.</p>

            <div className="space-y-4">
              {[
                { icon: <Mail className="h-5 w-5" />, label: "Email Us", value: "one.waymirror@outlook.com", color: "#1d4ed8" },
                { icon: <Phone className="h-5 w-5" />, label: "School Partnerships", value: "Available for school districts & counselors", color: "#10b981" },
                { icon: <MessageSquare className="h-5 w-5" />, label: "Live Chat", value: "Available during business hours", color: "#f5a524" },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: c.color, boxShadow: `0 4px 16px ${c.color}40` }}>
                    {c.icon}
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{c.label}</div>
                    <div className="text-slate-700 font-medium text-sm">{c.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100">
            {sent ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Message Sent!</h3>
                <p className="text-slate-500">Thank you for reaching out. We'll get back to you within 24 hours.</p>
                <button onClick={() => setSent(false)} className="mt-6 text-sm text-blue-600 hover:underline font-semibold">Send another message</button>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-black text-slate-900 mb-6">Get in Touch with Us</h3>
                <form onSubmit={e => { e.preventDefault(); saveContactSubmission(form); setSent(true); setForm({ name: "", email: "", phone: "", message: "" }); }} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <input type="text" placeholder="Full Name" required value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }} />
                    <input type="email" placeholder="Email Address" required value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }} />
                  </div>
                  <input type="tel" placeholder="Phone Number (optional)" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }} />
                  <textarea placeholder="Tell us about your student or your school…" required value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    rows={4} className="w-full px-4 py-3 rounded-xl text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }} />
                  <button type="submit"
                    className="w-full py-3.5 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.02] hp-grad-btn"
                    style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #1d4ed8 100%)", backgroundSize: "200% 200%", boxShadow: "0 4px 24px rgba(29,78,216,0.35)" }}>
                    Send Message →
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── FOOTER ─── */
function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSent, setNewsletterSent] = useState(false);
  const handleNewsletter = () => {
    if (!newsletterEmail.includes("@")) return;
    saveNewsletterEmail(newsletterEmail);
    setNewsletterSent(true);
    setNewsletterEmail("");
  };
  return (
    <footer style={{ background: "#080f1e", borderTop: "1px solid rgba(245,165,36,0.12)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src={`${BASE}logo.png`} alt="1WayMirror" className="h-10 w-auto object-contain"
                style={{ filter: "drop-shadow(0 0 8px rgba(245,165,36,0.25))" }} />
              <div className="leading-tight">
                <div className="font-black text-white text-sm">1WayMirror</div>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              The leading AI-powered career exploration platform for high school students. Explore careers, earn achievements, and find your path.
            </p>
          </div>
          <div>
            <div className="text-white font-bold text-sm uppercase tracking-wider mb-4">Platform</div>
            <ul className="space-y-2.5">
              {[["Features", "#features"], ["How It Works", "#how-it-works"], ["Pricing", "#pricing"], ["Career Feed", "/feed"], ["Sign In", "/login"]].map(([l, h]) => (
                <li key={l}>
                  {h.startsWith("/") ? (
                    <Link href={h} className="text-slate-400 text-sm hover:text-white transition-colors">{l}</Link>
                  ) : (
                    <a href={h} className="text-slate-400 text-sm hover:text-white transition-colors">{l}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-white font-bold text-sm uppercase tracking-wider mb-4">Career Fields</div>
            <ul className="space-y-2">
              {["⚙️ Engineering", "🩺 Healthcare", "💼 Business", "💻 Technology", "🔧 Skilled Trades", "⚖️ Law & Justice", "🔬 Science", "🌱 Life Advice"].map(c => (
                <li key={c}><span className="text-slate-400 text-sm">{c}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-white font-bold text-sm uppercase tracking-wider mb-4">Company</div>
            <ul className="space-y-2.5 mb-6">
              {[["About Us", "#about"], ["Our Experts", "#experts"], ["Contact", "#contact"]].map(([l, h]) => (
                <li key={l}><a href={h} className="text-slate-400 text-sm hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
            <div>
              <div className="text-white font-bold text-sm uppercase tracking-wider mb-3">Stay Updated</div>
              {newsletterSent ? (
                <div className="text-xs text-green-400 font-semibold py-2">✅ You're subscribed!</div>
              ) : (
                <div className="flex gap-2">
                  <input type="email" placeholder="your@email.com" value={newsletterEmail}
                    onChange={e => setNewsletterEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleNewsletter()}
                    className="flex-1 px-3 py-2 rounded-lg text-xs text-white outline-none focus:ring-1 focus:ring-yellow-500 transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
                  <button onClick={handleNewsletter} className="px-3 py-2 rounded-lg text-xs font-black text-[#0a1428] hp-grad-btn"
                    style={{ background: "linear-gradient(135deg, #f5a524, #ea580c, #f5a524)", backgroundSize: "200% 200%" }}>
                    Go
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} 1WayMirror. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Privacy Policy</span>
            <span>·</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── PAGE ─── */
export default function HomePage() {
  return (
    <>
      <GlobalStyles />
      <title>1WayMirror — AI Career Exploration for High School Students | College & Career Readiness</title>
      <NavBar />
      <main>
        <Hero />
        <About />
        <Features />
        <HowItWorks />
        <Technology />
        <Experts />
        <Pricing />
        <CtaBanner />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
