import { CheckCircle2, Circle, Star } from "lucide-react";
import { CAREER_QUESTS } from "@/data/replitopolisData";

export default function CareerBulletin({
  completed,
}: {
  completed: Set<string>;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0d1f3c 0%, #0a1428 100%)",
        border: "1px solid rgba(245,165,36,0.3)",
        boxShadow: "0 0 20px rgba(245,165,36,0.1)",
      }}
    >
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <Star className="h-4 w-4 text-gold" />
        <span className="text-sm font-bold text-white">Today's Quests</span>
      </div>
      <div className="p-3 space-y-2">
        {CAREER_QUESTS.map(q => {
          const done = completed.has(q.id);
          return (
            <div
              key={q.id}
              className="flex items-center gap-2.5 p-2 rounded-lg transition-colors"
              style={{ background: done ? "rgba(245,165,36,0.08)" : "rgba(255,255,255,0.02)" }}
            >
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-slate-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className={`text-xs leading-tight ${done ? "line-through text-slate-400" : "text-slate-200"}`}>
                  {q.label}
                </div>
              </div>
              <div className="text-[10px] font-semibold text-gold flex-shrink-0">
                {q.xp} XP
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{completed.size}/{CAREER_QUESTS.length} completed</span>
        <div className="h-1.5 flex-1 mx-3 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold to-orange-400 transition-all"
            style={{ width: `${(completed.size / CAREER_QUESTS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
