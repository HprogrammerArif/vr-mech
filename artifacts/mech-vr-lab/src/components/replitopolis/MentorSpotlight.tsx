import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { NPC_MENTORS, type RNPCMentor } from "@/data/replitopolisData";
import MentorPanel from "./MentorPanel";
import { Button } from "@/components/ui/button";

export default function MentorSpotlight() {
  const [idx, setIdx] = useState(0);
  const [chatMentor, setChatMentor] = useState<RNPCMentor | null>(null);
  const mentor = NPC_MENTORS[idx % NPC_MENTORS.length];

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0d1f3c 0%, #0a1428 100%)",
          border: `1px solid ${mentor.color}55`,
          boxShadow: `0 0 20px ${mentor.color}22`,
        }}
      >
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">✨</span>
            <span className="text-sm font-bold text-white">Mentor Spotlight</span>
          </div>
          <button
            onClick={() => setIdx(i => i + 1)}
            className="text-[11px] text-slate-400 hover:text-white transition-colors"
          >
            Next →
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center text-3xl border-2 flex-shrink-0"
              style={{ background: `${mentor.color}22`, borderColor: mentor.color, boxShadow: `0 0 16px ${mentor.color}66` }}
            >
              {mentor.avatar}
            </div>
            <div>
              <div className="font-bold text-white">{mentor.name}</div>
              <div className="text-xs" style={{ color: mentor.color }}>{mentor.title}</div>
            </div>
          </div>
          <p className="text-xs text-slate-300 italic leading-relaxed">
            "{mentor.quote}"
          </p>
          <Button
            onClick={() => setChatMentor(mentor)}
            size="sm"
            className="w-full text-xs font-semibold"
            style={{ background: mentor.color, color: "#0a1428" }}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Talk to {mentor.name.split(" ")[0]}
          </Button>
        </div>
      </div>
      {chatMentor && <MentorPanel mentor={chatMentor} onClose={() => setChatMentor(null)} />}
    </>
  );
}
