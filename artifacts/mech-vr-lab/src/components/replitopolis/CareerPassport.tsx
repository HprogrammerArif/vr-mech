import { Trophy, Zap, Flame, Map } from "lucide-react";
type ProgressData = { level: number; totalXp: number; streak: number; missionsCompleted?: number } | undefined;

type Props = {
  progress: ProgressData;
  visitedDistricts: number;
  simsCompleted: number;
  mentorsTalked: number;
};

export default function CareerPassport({ progress, visitedDistricts, simsCompleted, mentorsTalked }: Props) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0d1f3c 0%, #0a1428 100%)",
        border: "1px solid rgba(139,92,246,0.3)",
        boxShadow: "0 0 20px rgba(139,92,246,0.1)",
      }}
    >
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <span className="text-base">🛂</span>
        <span className="text-sm font-bold text-white">Career Passport</span>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {[
          { icon: <Map className="h-4 w-4 text-blue-400" />, label: "Districts", value: visitedDistricts },
          { icon: <Zap className="h-4 w-4 text-gold" />, label: "Simulations", value: simsCompleted },
          { icon: <Trophy className="h-4 w-4 text-gold" />, label: "Total XP", value: (progress as {totalXp?:number})?.totalXp ?? 0 },
          { icon: <Flame className="h-4 w-4 text-orange-400" />, label: "Mentors", value: mentorsTalked },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-xl p-2.5 text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center justify-center mb-1">{stat.icon}</div>
            <div className="text-xl font-black text-white tabular-nums">{stat.value}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
