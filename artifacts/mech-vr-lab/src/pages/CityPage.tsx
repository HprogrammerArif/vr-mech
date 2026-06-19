import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  X, MessageCircle, Building2, MapPin, Users, Send, Loader2, ArrowRight,
  Shield, Trophy, Map, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CareerCity from "@/components/city/CareerCity";
import ContactWarningModal from "@/components/ContactWarningModal";
import { DISTRICTS, type NPCDef, type BuildingDef } from "@/components/city/cityData";
import { cityEvents, type BotFact } from "@/components/city/cityEvents";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import { getProfile, getAvatarPreset, saveProfile, getOrCreateLearnerId, AVATAR_PRESETS } from "@/lib/profile";
import { detectContactExchange } from "@/lib/contactDetection";
import type { DetectionType } from "@/lib/contactDetection";
import { getSafetyProfile } from "@/lib/safety";

const BASE = import.meta.env.BASE_URL ?? "/";

async function fetchNPCChat(npc: NPCDef, question: string): Promise<string> {
  const url = `${BASE}api/npc/chat`.replace(/\/\//g, "/");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ npcName: npc.name, npcRole: npc.role, npcCategory: npc.category, npcTagline: npc.tagline, question }),
  });
  if (!res.ok) throw new Error("NPC chat failed");
  const j = await res.json() as { reply: string };
  return j.reply;
}

const ROLE_ICONS: Record<string, string> = {
  professional: "💼", mentor: "🎓", student: "📚",
  recruiter: "🤝", counselor: "💡", alumni: "⭐",
};

const STARTER_QUESTIONS = [
  "What's a typical day like in your career?",
  "What skills should I develop right now?",
  "How did you break into this field?",
  "What's the salary range like?",
  "What do you wish you knew earlier?",
];

type ChatMsg = { role: "user" | "npc"; text: string };
type CityMessage = { id: string; name: string; color: string; message: string; ts: number };
type Toast = { id: number; icon: string; title: string; body: string };
type Emote = { emoji: string; label: string };

const EMOTES: Emote[] = [
  { emoji: "👋", label: "Wave" },
  { emoji: "🎉", label: "Cheer" },
  { emoji: "👍", label: "Thumbs" },
  { emoji: "🤝", label: "Respect" },
];

/* ═══════════════════════════════════════════════
   NPC Chat Dialog
═══════════════════════════════════════════════ */
const NPC_CHAT_LIMIT = 3;
const NPC_SESSION_KEY = "1waymirror_npc_chat_count";

function getNpcCount(): number {
  return parseInt(sessionStorage.getItem(NPC_SESSION_KEY) ?? "0", 10);
}
function incNpcCount(): number {
  const next = getNpcCount() + 1;
  sessionStorage.setItem(NPC_SESSION_KEY, String(next));
  return next;
}

function NPCChatDialog({ npc, onClose }: { npc: NPCDef; onClose: () => void }) {
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "npc", text: `Hey! I'm ${npc.name} — ${npc.tagline}. What would you like to know about a career in ${npc.category}?` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userMsgCount, setUserMsgCount] = useState(getNpcCount);
  const scrollRef = useRef<HTMLDivElement>(null);
  const limitReached = userMsgCount >= NPC_CHAT_LIMIT;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (q: string) => {
    if (!q.trim() || loading || limitReached) return;
    const newCount = incNpcCount();
    setUserMsgCount(newCount);
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    try {
      const isLastFree = newCount >= NPC_CHAT_LIMIT;
      const reply = await fetchNPCChat(npc, q);
      if (isLastFree) {
        setMessages(prev => [
          ...prev,
          { role: "npc", text: reply },
          {
            role: "npc",
            text: `That's a great question! I've shared what I can here, but for a deeper dive — exploring multiple careers, building a roadmap, and getting personalised guidance — Dario AI is perfect for that. Head over to Dario to continue the conversation! 🎯`,
          },
        ]);
      } else {
        setMessages(prev => [...prev, { role: "npc", text: reply }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "npc", text: "Sorry, I got distracted for a moment. Ask me again!" }]);
    } finally {
      setLoading(false);
    }
  }, [npc, loading, limitReached]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-[hsl(217_50%_8%)] border border-[hsl(217_35%_22%)] shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center gap-3 p-4 border-b border-[hsl(217_35%_18%)]">
          <div className="h-10 w-10 rounded-full flex items-center justify-center text-xl font-bold border-2"
            style={{ background: `${npc.color}22`, borderColor: npc.color, color: npc.color }}>
            {ROLE_ICONS[npc.role]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white">{npc.name}</div>
            <div className="text-xs text-slate-400">{npc.tagline}</div>
          </div>
          <Badge className="text-[10px] uppercase tracking-widest border shrink-0"
            style={{ background: `${npc.color}22`, color: npc.color, borderColor: `${npc.color}44` }}>
            {npc.role}
          </Badge>
          <div className="flex items-center gap-1 shrink-0">
            {!limitReached && (
              <span className="text-[10px] text-slate-500 mr-1">
                {NPC_CHAT_LIMIT - userMsgCount} left
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-[hsl(38_95%_55%)]/20 text-white border border-[hsl(38_95%_55%)]/30"
                  : "bg-[hsl(217_60%_12%)] text-slate-100 border border-[hsl(217_35%_22%)]"
              }`}>{m.text}</div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[hsl(217_60%_12%)] border border-[hsl(217_35%_22%)] rounded-xl px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            </div>
          )}
        </div>

        {messages.length === 1 && !limitReached && (
          <div className="px-4 pb-2 flex gap-2 flex-wrap">
            {STARTER_QUESTIONS.map(q => (
              <button key={q} onClick={() => void send(q)}
                className="text-[11px] rounded-full border border-[hsl(217_35%_28%)] px-2.5 py-1 text-slate-300 hover:border-gold hover:text-gold transition-colors">
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input or Dario CTA */}
        {limitReached ? (
          <div className="p-4 border-t border-[hsl(217_35%_18%)]">
            <div className="rounded-2xl p-4 text-center"
              style={{ background: "linear-gradient(135deg, rgba(245,165,36,0.1), rgba(234,88,12,0.08))", border: "1px solid rgba(245,165,36,0.25)" }}>
              <div className="text-2xl mb-2">🎯</div>
              <div className="text-sm font-black text-white mb-1">Ready to go deeper?</div>
              <div className="text-xs text-slate-400 mb-3">
                You've used your 3 free city bot chats this session. Dario AI is your personal career counsellor — unlimited conversations, roadmaps, and comparisons.
              </div>
              <button
                onClick={() => { onClose(); void navigate("/dario"); }}
                className="w-full py-2.5 rounded-xl font-black text-sm transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #f5a524, #ea580c)", color: "#0a1428" }}>
                Talk to Dario AI →
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 border-t border-[hsl(217_35%_18%)] flex gap-2">
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && void send(input)}
              placeholder="Ask anything about this career…"
              className="flex-1 bg-[hsl(217_60%_6%)] border border-[hsl(217_35%_22%)] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[hsl(38_95%_55%)]"
              disabled={loading} />
            <Button onClick={() => void send(input)} disabled={loading || !input.trim()}
              className="gradient-gold text-[hsl(217_60%_6%)] font-semibold" size="sm">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Building Entry Dialog
═══════════════════════════════════════════════ */
function BuildingEntryDialog({ building, onEnter, onClose }: {
  building: BuildingDef; onEnter: (slug: string) => void; onClose: () => void;
}) {
  const district = DISTRICTS.find(d => d.buildings.some(b => b.id === building.id));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-[hsl(217_50%_8%)] border border-[hsl(217_35%_22%)] shadow-2xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: district?.signColor ?? "#f5a524" }}>
              {district?.label}
            </div>
            <h3 className="text-xl font-black text-white">{building.label}</h3>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-28 rounded-xl flex items-center justify-center"
          style={{ background: `${building.emissive}18`, border: `1px solid ${building.emissive}44` }}>
          <Building2 className="h-12 w-12" style={{ color: building.emissive }} />
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Enter {building.label} and start immersive career missions. Work through real-world scenarios, make high-stakes decisions, and earn XP.
        </p>
        {building.simulationSlug ? (
          <Button onClick={() => onEnter(building.simulationSlug!)} className="w-full gradient-gold text-[hsl(217_60%_6%)] font-bold">
            Enter Building <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <div className="rounded-lg border border-slate-700 p-3 text-center text-sm text-slate-400">
            Coming soon — check back later!
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Isometric minimap
═══════════════════════════════════════════════ */
const ISO_SCALE = 0.55;
function worldToIso(x: number, z: number) {
  return { x: (x - z) * ISO_SCALE, y: (x + z) * ISO_SCALE * 0.5 };
}
const TILE_W = 22;
const TILE_H = 10;
function districtPoints(cx: number, cy: number) {
  return `${cx},${cy - TILE_H} ${cx + TILE_W},${cy} ${cx},${cy + TILE_H} ${cx - TILE_W},${cy}`;
}

function MiniMap({ playerX, playerZ, visitedIds }: { playerX: number; playerZ: number; visitedIds: Set<string> }) {
  const player = worldToIso(playerX, playerZ);
  return (
    <div className="absolute bottom-4 right-4 w-44 h-44 rounded-xl overflow-hidden z-10"
      style={{ background: "rgba(5,12,28,0.92)", border: "1px solid rgba(245,165,36,0.3)", boxShadow: "0 0 24px rgba(0,0,0,0.6)" }}>
      <div className="absolute top-1.5 left-0 right-0 text-center text-[8px] text-[#f5a524] font-bold uppercase tracking-widest z-10 pointer-events-none">
        Career City
      </div>
      <svg width="100%" height="100%" viewBox="-100 -55 200 115" preserveAspectRatio="xMidYMid meet" style={{ display: "block", marginTop: 4 }}>
        {DISTRICTS.map(d => {
          const from = worldToIso(0, 0);
          const to = worldToIso(d.center[0], d.center[1]);
          return <line key={`road-${d.id}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(255,255,255,0.07)" strokeWidth={2} />;
        })}
        {DISTRICTS.map(d => {
          const { x: cx, y: cy } = worldToIso(d.center[0], d.center[1]);
          const visited = visitedIds.has(d.id);
          return (
            <g key={d.id}>
              <polygon points={districtPoints(cx + 1, cy + 1)} fill="rgba(0,0,0,0.4)" />
              <polygon points={districtPoints(cx, cy)} fill={d.color} fillOpacity={visited ? 1 : 0.5}
                stroke={visited ? d.signColor : "rgba(255,255,255,0.2)"} strokeWidth={visited ? 1.5 : 0.8} />
              {visited && <polygon points={districtPoints(cx, cy)} fill={d.signColor} fillOpacity={0.18} />}
              <text x={cx} y={cy + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize={4.5} fill={visited ? d.signColor : "#64748b"} fontWeight="bold">
                {d.category.slice(0, 3).toUpperCase()}
              </text>
            </g>
          );
        })}
        {(() => {
          const { x: cx, y: cy } = worldToIso(0, 0);
          return (
            <g>
              <circle cx={cx} cy={cy} r={5} fill="#f5a524" fillOpacity={0.35} stroke="#f5a524" strokeWidth={1} />
              <text x={cx} y={cy + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize={4} fill="#f5a524">★</text>
            </g>
          );
        })()}
        {(() => {
          const { x: px, y: py } = player;
          return (
            <g>
              <circle cx={px} cy={py} r={6.5} fill="none" stroke="#f5a524" strokeWidth={0.8} strokeOpacity={0.5} />
              <circle cx={px} cy={py} r={4} fill="#f5a524" stroke="white" strokeWidth={1.5} />
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Quest Tracker
═══════════════════════════════════════════════ */
function QuestTracker({ visited, total = 3 }: { visited: Set<string>; total?: number }) {
  const count = Math.min(visited.size, total);
  const done = count >= total;
  return (
    <div className="rounded-xl px-3 py-2.5 flex flex-col gap-1.5 pointer-events-auto"
      style={{ background: "rgba(5,12,28,0.92)", border: `1px solid ${done ? "rgba(245,165,36,0.5)" : "rgba(255,255,255,0.1)"}` }}>
      <div className="flex items-center gap-1.5">
        <Map className="h-3 w-3 shrink-0" style={{ color: done ? "#f5a524" : "#64748b" }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: done ? "#f5a524" : "#94a3b8" }}>
          {done ? "Quest Complete!" : "Visit 3 Districts"}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="h-1.5 flex-1 rounded-full transition-all"
            style={{ background: i < count ? "#f5a524" : "rgba(255,255,255,0.12)" }} />
        ))}
        <span className="text-[9px] font-bold ml-1" style={{ color: "#f5a524" }}>{count}/{total}</span>
      </div>
      {!done && (
        <div className="text-[9px] text-slate-500 leading-tight">
          Walk into any career district
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Achievement Toast Stack
═══════════════════════════════════════════════ */
function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="absolute bottom-52 right-4 z-20 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-start gap-3 rounded-xl px-4 py-3 pointer-events-auto animate-in slide-in-from-right-4 fade-in duration-300"
          style={{
            background: "linear-gradient(135deg, rgba(15,25,50,0.98), rgba(8,16,36,0.98))",
            border: "1px solid rgba(245,165,36,0.4)",
            boxShadow: "0 0 24px rgba(245,165,36,0.15), 0 8px 32px rgba(0,0,0,0.5)",
            maxWidth: 260,
          }}
        >
          <span className="text-2xl shrink-0 leading-none mt-0.5">{t.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-black text-[#f5a524] uppercase tracking-wider leading-tight">{t.title}</div>
            <div className="text-[11px] text-slate-300 leading-snug mt-0.5">{t.body}</div>
          </div>
          <button onClick={() => onDismiss(t.id)} className="text-slate-600 hover:text-slate-400 shrink-0 mt-0.5">
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Career Fact Popup (from bot clicks)
═══════════════════════════════════════════════ */
function CareerFactPanel({ fact, onClose }: { fact: BotFact; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(135deg, #0d1f3c, #081428)", border: `1px solid ${fact.color}44` }}>
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${fact.color}, transparent)` }} />
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center text-xl font-black shrink-0"
              style={{ background: `${fact.color}22`, border: `1px solid ${fact.color}44`, color: fact.color }}>
              {fact.name.charAt(0)}
            </div>
            <div>
              <div className="font-black text-white leading-tight">{fact.name}</div>
              <div className="text-[10px] uppercase tracking-widest font-semibold mt-0.5" style={{ color: fact.color }}>
                {fact.district} District
              </div>
            </div>
            <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-px" style={{ background: `${fact.color}25` }} />
          <div className="flex items-start gap-2">
            <Zap className="h-4 w-4 shrink-0 mt-0.5" style={{ color: fact.color }} />
            <p className="text-sm text-slate-200 leading-relaxed">{fact.fact}</p>
          </div>
          <div className="rounded-lg px-3 py-2 text-[11px] text-slate-500"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            Tip: Click any building to try a career simulation!
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Emote Wheel
═══════════════════════════════════════════════ */
function EmoteWheel({ onSelect, onClose }: { onSelect: (e: Emote) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-center gap-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Emotes</div>
        <div className="flex gap-3">
          {EMOTES.map(e => (
            <button key={e.label} onClick={() => { onSelect(e); onClose(); }}
              className="flex flex-col items-center gap-1 rounded-2xl px-5 py-4 hover:scale-110 active:scale-95 transition-all"
              style={{ background: "rgba(5,12,28,0.95)", border: "1px solid rgba(245,165,36,0.3)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
              <span className="text-3xl">{e.emoji}</span>
              <span className="text-[10px] font-bold text-slate-400">{e.label}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
          Press E or Esc to close
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   City-wide chat panel
═══════════════════════════════════════════════ */
function CityChat({ messages, input, onInput, onSend, sending, blocked }: {
  messages: CityMessage[]; input: string; onInput: (v: string) => void;
  onSend: () => void; sending: boolean; blocked: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="absolute bottom-4 left-4 w-72 z-10 flex flex-col gap-1.5">
      <div className="flex items-center gap-1 text-[9px] text-emerald-400/70 font-semibold uppercase tracking-wider px-1">
        <Shield className="h-2.5 w-2.5" /> Safety-monitored chat
      </div>
      <div ref={scrollRef} className="flex flex-col gap-1 max-h-44 overflow-y-auto pr-0.5"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
        {messages.length === 0 && <div className="text-[10px] text-slate-600 px-2">No messages yet — say hello!</div>}
        {messages.slice(-20).map((m, i) => (
          <div key={i} className="rounded-lg px-2.5 py-1.5 text-xs flex items-start gap-1.5"
            style={{ background: "rgba(5,12,28,0.88)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="font-bold shrink-0 leading-tight mt-px" style={{ color: m.color }}>{m.name}:</span>
            <span className="text-slate-300 leading-tight">{m.message}</span>
          </div>
        ))}
      </div>
      {blocked && (
        <div className="rounded-lg px-3 py-2 text-xs text-red-400 border border-red-500/30" style={{ background: "rgba(5,12,28,0.9)" }}>
          Message blocked — it may violate safety guidelines.
        </div>
      )}
      <div className="flex gap-1.5 items-center">
        <input value={input} onChange={e => onInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !sending && onSend()}
          placeholder="Chat with the city…" maxLength={200} disabled={sending}
          className="flex-1 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#f5a524] transition-colors"
          style={{ background: "rgba(5,12,28,0.92)", border: "1px solid rgba(255,255,255,0.12)" }} />
        <button onClick={onSend} disabled={sending || !input.trim()}
          className="h-8 w-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 hover:scale-105 active:scale-95 shrink-0"
          style={{ background: "linear-gradient(135deg,#f5a524,#ea580c)" }}>
          {sending ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" /> : <Send className="h-3.5 w-3.5 text-white" />}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Top HUD
═══════════════════════════════════════════════ */
function CityHUD({ onShowMap }: { onShowMap: () => void }) {
  return (
    <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none z-10">
      <div className="bg-[hsl(217_50%_8%)]/90 border border-[hsl(217_35%_22%)] rounded-xl px-4 py-2.5 pointer-events-auto">
        <div className="text-xs text-gold font-bold uppercase tracking-widest">1WayMirror</div>
        <div className="text-lg font-black text-white leading-tight">World</div>
        <div className="text-[11px] text-slate-400 mt-0.5">WASD to move · E = emotes · Click NPCs for facts</div>
      </div>
      <div className="flex flex-col gap-2 pointer-events-auto">
        <button onClick={onShowMap}
          className="bg-[hsl(217_50%_8%)]/90 border border-[hsl(217_35%_22%)] rounded-xl px-3 py-2 text-xs text-slate-300 hover:text-white hover:border-gold transition-colors flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-gold" /> District Guide
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   District Guide
═══════════════════════════════════════════════ */
function DistrictGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-[hsl(217_50%_8%)] border border-[hsl(217_35%_22%)] shadow-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gold" /> Career City Districts
          </h3>
          <button onClick={onClose} className="h-7 w-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {DISTRICTS.map(d => (
            <div key={d.id} className="flex items-center gap-3 rounded-lg border border-[hsl(217_35%_18%)] p-2.5">
              <div className="h-3 w-3 rounded-full" style={{ background: d.signColor }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">{d.label}</div>
                <div className="text-[11px] text-slate-400">{d.buildings.length} buildings · {d.buildings.filter(b => b.simulationSlug).length} simulations</div>
              </div>
              <Badge className="text-[10px]" style={{ background: `${d.signColor}22`, color: d.signColor, borderColor: `${d.signColor}44` }}>
                {d.category}
              </Badge>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-slate-500 pt-1 border-t border-[hsl(217_35%_18%)]">
          <span className="text-slate-300">Tip:</span> Walk into a district to discover it. Press E for emotes!
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Quick Profile Setup
═══════════════════════════════════════════════ */
function QuickProfileSetup({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState("nova");
  const enter = () => {
    if (!name.trim()) return;
    const learnerId = getOrCreateLearnerId();
    saveProfile({ learnerId, name: name.trim(), careerInterest: "Exploring all!", avatarId });
    onDone();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at 60% 0%, #0d1f3c 0%, #0a1428 100%)" }}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(13,31,60,0.97) 0%, rgba(10,20,40,0.99) 100%)",
          border: "1px solid rgba(245,165,36,0.35)",
          boxShadow: "0 0 80px rgba(245,165,36,0.15), 0 40px 80px rgba(0,0,0,0.6)",
        }}>
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #f5a524, #8b5cf6, #0ea5e9)" }} />
        <div className="p-8 space-y-6">
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-gold font-bold mb-1">1WayMirror</div>
            <h1 className="text-2xl font-black text-white">Enter Career City</h1>
            <p className="text-sm text-slate-400 mt-1">Set up your profile to start exploring</p>
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">Your name / gamertag</label>
            <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && enter()} placeholder="Enter your name…" maxLength={20}
              className="w-full rounded-xl px-4 py-3 text-white font-semibold placeholder-slate-600 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)" }} />
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">Choose your avatar</label>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_PRESETS.map(a => (
                <button key={a.id} onClick={() => setAvatarId(a.id)}
                  className="rounded-xl p-2.5 flex flex-col items-center gap-1 transition-all hover:scale-105"
                  style={{
                    background: avatarId === a.id ? `${a.outfitColor}22` : "rgba(255,255,255,0.03)",
                    border: `2px solid ${avatarId === a.id ? a.outfitColor : "rgba(255,255,255,0.08)"}`,
                    boxShadow: avatarId === a.id ? `0 0 20px ${a.outfitColor}55` : "none",
                  }}>
                  <span className="text-2xl">{a.emoji}</span>
                  <span className="text-[10px] font-bold text-white">{a.name}</span>
                  <span className="text-[9px]" style={{ color: a.outfitColor }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
          <Button onClick={enter} disabled={!name.trim()} className="w-full font-bold text-base py-3"
            style={{ background: "linear-gradient(135deg, #f5a524, #ea580c)", color: "#0a1428", boxShadow: "0 4px 24px rgba(245,165,36,0.4)" }}>
            Enter the City <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Day/Night indicator
═══════════════════════════════════════════════ */
import { DNState } from "@/components/city/dayNight";
function DayNightChip() {
  const [label, setLabel] = useState("Morning");
  const [icon, setIcon] = useState("🌅");

  useEffect(() => {
    const id = setInterval(() => {
      const t = DNState.time;
      if (t < 0.2 || t > 0.88) { setLabel("Night"); setIcon("🌙"); }
      else if (t < 0.28) { setLabel("Sunrise"); setIcon("🌅"); }
      else if (t < 0.5) { setLabel("Morning"); setIcon("☀️"); }
      else if (t < 0.72) { setLabel("Afternoon"); setIcon("🌤️"); }
      else if (t < 0.88) { setLabel("Sunset"); setIcon("🌇"); }
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-xl px-3 py-2 flex items-center gap-1.5 pointer-events-auto"
      style={{ background: "rgba(5,12,28,0.92)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <span className="text-sm">{icon}</span>
      <span className="text-[10px] font-bold text-slate-300">{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main CityPage
═══════════════════════════════════════════════════════ */
let _toastCounter = 0;

export default function CityPage() {
  const [, navigate] = useLocation();
  const savedProfile = getProfile();
  const [profile, setProfile] = useState(savedProfile);
  const [entered, setEntered] = useState(!!savedProfile);
  const [socketId, setSocketId] = useState("");
  const [chatNpc, setChatNpc] = useState<NPCDef | null>(null);
  const [entryBuilding, setEntryBuilding] = useState<BuildingDef | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 0 });
  const socketRef = useRef<Socket | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState(1);

  // Chat
  const [cityMessages, setCityMessages] = useState<CityMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatBlocked, setChatBlocked] = useState(false);
  const [contactWarning, setContactWarning] = useState<{ text: string; types: DetectionType[] } | null>(null);

  // Quest
  const visitedRef = useRef<Set<string>>(new Set());
  const [visitedDistricts, setVisitedDistricts] = useState<Set<string>>(new Set());
  const questDoneRef = useRef(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Career fact popup
  const [botFact, setBotFact] = useState<BotFact | null>(null);

  // Emote wheel
  const [showEmotes, setShowEmotes] = useState(false);
  const [activeEmote, setActiveEmote] = useState<Emote | null>(null);
  const emoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avatarPreset = getAvatarPreset(profile?.avatarId ?? "nova");
  const playerName = profile?.name ?? "Explorer";
  const playerColor = avatarPreset.outfitColor;
  const playerColors = {
    skinTone: avatarPreset.skinTone,
    hairColor: avatarPreset.hairColor,
    outfitColor: avatarPreset.outfitColor,
    accentColor: avatarPreset.accentColor,
  };

  const addToast = useCallback((icon: string, title: string, body: string) => {
    const id = ++_toastCounter;
    setToasts(prev => [...prev.slice(-3), { id, icon, title, body }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Subscribe to bot fact events
  useEffect(() => {
    return cityEvents.onBotFact(fact => setBotFact(fact));
  }, []);

  // E key → emote wheel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "e" || e.key === "E") {
        if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
        setShowEmotes(v => !v);
      }
      if (e.key === "Escape") setShowEmotes(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleEmoteSelect = useCallback((emote: Emote) => {
    setActiveEmote(emote);
    if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current);
    emoteTimerRef.current = setTimeout(() => setActiveEmote(null), 3500);
  }, []);

  const connectSocket = useCallback((name: string) => {
    const socket = getSocket();
    socketRef.current = socket;
    setSocketId(socket.id ?? "");
    socket.emit("city:join", { name, x: 0, z: 0 });
    socket.on("city:all", (list: unknown[]) => setOnlinePlayers(list.length + 1));
    socket.on("city:joined", () => setOnlinePlayers(c => c + 1));
    socket.on("city:left", () => setOnlinePlayers(c => Math.max(1, c - 1)));
    socket.on("city:chatMsg", (msg: { id: string; name: string; color: string; message: string }) => {
      setCityMessages(prev => [...prev.slice(-49), { ...msg, ts: Date.now() }]);
    });
    if (!socket.id) socket.on("connect", () => setSocketId(socket.id ?? ""));
  }, []);

  useEffect(() => {
    if (entered && profile) connectSocket(profile.name);
  }, [entered, profile, connectSocket]);

  const doSendMessage = useCallback(async (text: string) => {
    if (!socketRef.current || !text.trim()) return;
    setChatSending(true);
    setChatBlocked(false);
    const safetyProfile = getSafetyProfile();
    try {
      const res = await fetch(`${BASE}api/safety/moderate`.replace(/\/\//g, "/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, studentId: safetyProfile?.studentId, context: [] }),
      });
      if (res.ok) {
        const result = await res.json() as { tier: number };
        if (result.tier >= 3) { setChatBlocked(true); setChatInput(""); setChatSending(false); return; }
      }
    } catch { /* continue */ }
    socketRef.current.emit("city:chat", { message: text });
    setChatInput("");
    setChatSending(false);
  }, []);

  const handleSendChat = useCallback(() => {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    const detection = detectContactExchange(text);
    if (detection.detected) { setContactWarning({ text, types: detection.types }); return; }
    void doSendMessage(text);
  }, [chatInput, chatSending, doSendMessage]);

  const handlePositionChange = useCallback((x: number, z: number) => {
    setPlayerPos({ x, z });
    // Quest: check district proximity
    for (const d of DISTRICTS) {
      if (visitedRef.current.has(d.id)) continue;
      const dx = x - d.center[0];
      const dz = z - d.center[1];
      if (Math.sqrt(dx * dx + dz * dz) < d.radius + 8) {
        const next = new Set(visitedRef.current);
        next.add(d.id);
        visitedRef.current = next;
        setVisitedDistricts(new Set(next));
        addToast("📍", `${d.label} Discovered!`, `${next.size}/3 districts explored`);
        if (next.size >= 3 && !questDoneRef.current) {
          questDoneRef.current = true;
          setTimeout(() => addToast("🏆", "World Explorer!", "You've discovered 3 career districts. Badge unlocked!"), 800);
        }
      }
    }
  }, [addToast]);

  const handleProfileDone = useCallback(() => { setProfile(getProfile()); setEntered(true); }, []);
  const handleEnterBuilding = useCallback((building: BuildingDef) => setEntryBuilding(building), []);
  const handleStartSim = useCallback((slug: string) => navigate(`/sim/${slug}`), [navigate]);

  if (!entered || !profile) return <QuickProfileSetup onDone={handleProfileDone} />;

  return (
    <div className="fixed inset-0 bg-[hsl(217_60%_4%)]">
      {/* 3D Canvas */}
      <CareerCity
        playerName={playerName}
        playerColor={playerColor}
        playerColors={playerColors}
        socketId={socketId}
        onEnterBuilding={handleEnterBuilding}
        onNPCChat={setChatNpc}
        onPositionChange={handlePositionChange}
      />

      {/* Top HUD */}
      <CityHUD onShowMap={() => setShowGuide(true)} />

      {/* Profile chip */}
      <div className="absolute top-20 left-4 z-10 flex items-center gap-2.5 px-3 py-2 rounded-xl"
        style={{ background: "rgba(10,20,40,0.92)", border: `1px solid ${playerColor}44`, boxShadow: `0 0 16px ${playerColor}22` }}>
        <div className="h-8 w-8 rounded-full flex items-center justify-center text-lg border-2 flex-shrink-0"
          style={{ background: `${playerColor}22`, borderColor: playerColor }}>
          {avatarPreset.emoji}
        </div>
        <div>
          <div className="text-xs font-bold text-white leading-tight">{playerName}</div>
          <div className="text-[10px] leading-tight" style={{ color: playerColor }}>{profile.careerInterest}</div>
        </div>
        <button
          onClick={() => { window.localStorage.removeItem("1waymirror_profile_v2"); setProfile(null); setEntered(false); }}
          className="ml-1 text-[10px] text-slate-500 hover:text-red-400 transition-colors" title="Switch avatar">⚙</button>
      </div>

      {/* Back to Dashboard */}
      <button
        onClick={() => navigate("/replitopolis")}
        className="absolute top-3 left-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
        style={{ background: "rgba(5,12,28,0.92)", border: "1px solid rgba(255,255,255,0.12)", color: "#f5a524" }}
      >
        ← Dashboard
      </button>

      {/* Online count + day/night + quest — right column */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 items-end">
        <div className="bg-[hsl(217_50%_8%)]/90 border border-[hsl(217_35%_22%)] rounded-xl px-3 py-2 flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs text-white font-semibold">{onlinePlayers} online</span>
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <DayNightChip />
        <QuestTracker visited={visitedDistricts} />
      </div>

      {/* Minimap */}
      <MiniMap playerX={playerPos.x} playerZ={playerPos.z} visitedIds={visitedDistricts} />

      {/* City chat */}
      <CityChat
        messages={cityMessages}
        input={chatInput}
        onInput={v => { setChatInput(v); if (chatBlocked) setChatBlocked(false); }}
        onSend={handleSendChat}
        sending={chatSending}
        blocked={chatBlocked}
      />

      {/* Achievement toasts */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Active emote overlay */}
      {activeEmote && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-2 animate-in zoom-in-75 fade-in duration-200">
          <span className="text-6xl drop-shadow-2xl">{activeEmote.emoji}</span>
          <span className="text-xs font-bold text-white/60 uppercase tracking-widest">{activeEmote.label}</span>
        </div>
      )}

      {/* Emote button + wheel */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
        <button
          onClick={() => setShowEmotes(v => !v)}
          className="rounded-full px-4 py-2 text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          style={{
            background: showEmotes ? "rgba(245,165,36,0.2)" : "rgba(5,12,28,0.85)",
            border: `1px solid ${showEmotes ? "rgba(245,165,36,0.5)" : "rgba(255,255,255,0.12)"}`,
          }}
        >
          <Trophy className="h-3.5 w-3.5 text-[#f5a524]" />
          <span className="text-slate-300">Emotes (E)</span>
        </button>
      </div>

      {showEmotes && <EmoteWheel onSelect={handleEmoteSelect} onClose={() => setShowEmotes(false)} />}

      {/* NPC Chat */}
      {chatNpc && <NPCChatDialog npc={chatNpc} onClose={() => setChatNpc(null)} />}

      {/* Building entry */}
      {entryBuilding && (
        <BuildingEntryDialog building={entryBuilding} onEnter={handleStartSim} onClose={() => setEntryBuilding(null)} />
      )}

      {/* District guide */}
      {showGuide && <DistrictGuide onClose={() => setShowGuide(false)} />}

      {/* Career fact popup */}
      {botFact && <CareerFactPanel fact={botFact} onClose={() => setBotFact(null)} />}

      {/* Contact exchange warning */}
      {contactWarning && (
        <ContactWarningModal
          types={contactWarning.types}
          onSendAnyway={() => { const t = contactWarning.text; setContactWarning(null); void doSendMessage(t); }}
          onEdit={() => setContactWarning(null)}
          onCancel={() => { setContactWarning(null); setChatInput(""); }}
        />
      )}
    </div>
  );
}
