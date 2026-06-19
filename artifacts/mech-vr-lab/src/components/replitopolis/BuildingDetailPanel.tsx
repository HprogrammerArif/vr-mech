import { X, Clock, BarChart2, Tag, PlayCircle, Users, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";
import type { RBuilding, RDistrict } from "@/data/replitopolisData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DIFF_LABEL: Record<number, string> = { 1: "Beginner", 2: "Intermediate", 3: "Advanced" };
const DIFF_COLOR: Record<number, string> = { 1: "#10b981", 2: "#f5a524", 3: "#ef4444" };

export default function BuildingDetailPanel({
  building,
  district,
  onClose,
  onTalkMentor,
}: {
  building: RBuilding;
  district: RDistrict;
  onClose: () => void;
  onTalkMentor?: () => void;
}) {
  const [, navigate] = useLocation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a1428 0%, #0d1f3c 100%)",
          border: `1px solid ${district.border}`,
          boxShadow: `0 0 40px ${district.glow}, 0 0 80px ${district.glow}40`,
        }}
      >
        {/* Header bar */}
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(90deg, ${district.border}, ${district.border}88)` }}
        />

        <div className="p-6 space-y-5">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="h-14 w-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ background: district.glow, border: `1px solid ${district.border}` }}
              >
                {building.icon}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: district.border }}>
                  {district.name}
                </div>
                <h2 className="text-xl font-black text-white leading-tight">{building.name}</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-200 leading-relaxed">{building.description}</p>

          {/* Meta row */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300">
              <BarChart2 className="h-3.5 w-3.5" style={{ color: DIFF_COLOR[building.difficulty] }} />
              {DIFF_LABEL[building.difficulty]}
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300">
              <Clock className="h-3.5 w-3.5 text-gold" />
              {building.estimatedTime}
            </div>
            {building.tags.map(tag => (
              <div key={tag} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400">
                <Tag className="h-3 w-3" /> {tag}
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="space-y-2 pt-1">
            {building.slug ? (
              <Button
                onClick={() => navigate(`/sim/${building.slug}`)}
                className="w-full font-bold py-3 text-sm"
                style={{
                  background: `linear-gradient(135deg, ${district.border}, ${district.border}cc)`,
                  color: "#0a1428",
                  boxShadow: `0 4px 20px ${district.glow}`,
                }}
              >
                <PlayCircle className="h-4 w-4 mr-2" /> Start Simulation
              </Button>
            ) : (
              <div className="w-full rounded-xl border border-white/10 p-3 text-center text-sm text-slate-400">
                🔜 Simulation coming soon
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/5 text-xs"
                onClick={onTalkMentor}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Talk to Mentor
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/5 text-xs"
              >
                <Users className="h-3.5 w-3.5 mr-1.5" /> Invite Friend
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
