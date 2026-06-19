import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";
import type { RNPCMentor } from "@/data/replitopolisData";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL ?? "/";

type Msg = { role: "user" | "npc"; text: string };

const STARTERS = [
  "What's a typical day like for you?",
  "How did you get into this career?",
  "What skills should I build right now?",
  "What's the salary like?",
  "Is this career path hard to break into?",
];

export default function MentorPanel({
  mentor,
  onClose,
}: {
  mentor: RNPCMentor;
  onClose: () => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "npc", text: `Hey! I'm ${mentor.name}, ${mentor.title}. "${mentor.quote}" — Ask me anything about this career!` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const send = async (q: string) => {
    if (!q.trim() || loading) return;
    setMsgs(p => [...p, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    try {
      const url = `${BASE}api/npc/chat`.replace(/\/\//g, "/");
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npcName: mentor.name,
          npcRole: mentor.title,
          npcCategory: mentor.category,
          npcTagline: mentor.title,
          question: q,
        }),
      });
      const j = await res.json() as { reply: string };
      setMsgs(p => [...p, { role: "npc", text: j.reply }]);
    } catch {
      setMsgs(p => [...p, { role: "npc", text: "Sorry, I got distracted! Try asking again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl flex flex-col max-h-[80vh] overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a1428 0%, #0d1f3c 100%)",
          border: `1px solid ${mentor.color}`,
          boxShadow: `0 0 40px ${mentor.color}55`,
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 border-2"
            style={{ background: `${mentor.color}22`, borderColor: mentor.color }}
          >
            {mentor.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white">{mentor.name}</div>
            <div className="text-xs" style={{ color: mentor.color }}>{mentor.title}</div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-gold/20 text-white border border-gold/30"
                    : "bg-white/5 text-slate-100 border border-white/10"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            </div>
          )}
        </div>

        {/* Quick starters */}
        {msgs.length === 1 && (
          <div className="px-4 pb-2 flex gap-2 flex-wrap">
            {STARTERS.map(q => (
              <button
                key={q}
                onClick={() => void send(q)}
                className="text-[11px] rounded-full border border-white/20 px-2.5 py-1 text-slate-300 hover:border-gold hover:text-gold transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-white/10 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && void send(input)}
            placeholder="Ask anything about this career…"
            className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold"
            disabled={loading}
          />
          <Button
            onClick={() => void send(input)}
            disabled={loading || !input.trim()}
            size="sm"
            className="gradient-gold text-[hsl(217_60%_6%)] font-semibold"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
