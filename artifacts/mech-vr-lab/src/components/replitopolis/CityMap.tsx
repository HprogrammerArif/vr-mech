import { useState } from "react";
import { DISTRICTS, NPC_MENTORS, type RBuilding, type RDistrict, type RNPCMentor } from "@/data/replitopolisData";
import BuildingDetailPanel from "./BuildingDetailPanel";
import MentorPanel from "./MentorPanel";

type Props = {
  visitedDistricts: Set<string>;
  onVisitDistrict: (id: string) => void;
};

function DistrictCard({
  district,
  onBuildingClick,
  onEnter,
}: {
  district: RDistrict;
  onBuildingClick: (b: RBuilding, d: RDistrict) => void;
  onEnter: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? district.buildings : district.buildings.slice(0, 4);

  return (
    <div
      className="rounded-2xl transition-all duration-300 flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${district.color}cc 0%, ${district.color}66 100%)`,
        border: `1.5px solid ${hovered ? district.border : district.border + "66"}`,
        boxShadow: hovered ? `0 0 30px ${district.glow}, 0 0 60px ${district.glow}66` : `0 0 15px ${district.glow}55`,
        transition: "box-shadow 0.3s, border-color 0.3s",
      }}
      onMouseEnter={() => { setHovered(true); onEnter(district.id); }}
      onMouseLeave={() => setHovered(false)}
    >
      {/* District header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b" style={{ borderColor: district.border + "44" }}>
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{
            background: `${district.glow}33`,
            border: `1.5px solid ${district.border}`,
            boxShadow: `0 0 14px ${district.glow}88`,
          }}
        >
          {district.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-white text-sm leading-tight">{district.name}</div>
          <div className="text-[10px] mt-0.5" style={{ color: district.border + "cc" }}>
            {district.description}
          </div>
        </div>
        <div
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ background: district.border + "22", color: district.border }}
        >
          {district.buildings.filter(b => b.slug).length} SIM
        </div>
      </div>

      {/* Building list */}
      <div className="p-3 flex-1 space-y-1">
        {shown.map(b => (
          <button
            key={b.id}
            onClick={() => onBuildingClick(b, district)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all hover:scale-[1.01]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = `${district.glow}`;
              (e.currentTarget as HTMLElement).style.borderColor = district.border;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
            }}
          >
            <span className="text-base leading-none flex-shrink-0">{b.icon}</span>
            <span className="text-xs text-slate-200 leading-tight flex-1 min-w-0">{b.name}</span>
            {b.slug && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-semibold"
                style={{ background: district.border + "33", color: district.border }}
              >
                SIM
              </span>
            )}
          </button>
        ))}
        {district.buildings.length > 4 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full text-[11px] text-slate-400 hover:text-slate-200 py-1 text-center transition-colors"
          >
            {expanded ? "▲ Show less" : `▼ +${district.buildings.length - 4} more`}
          </button>
        )}
      </div>
    </div>
  );
}

function NPCDot({
  mentor,
  onClick,
}: {
  mentor: RNPCMentor;
  onClick: (m: RNPCMentor) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => onClick(mentor)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex flex-col items-center gap-1 group transition-transform hover:scale-110"
      >
        <div
          className="h-12 w-12 rounded-full flex items-center justify-center text-xl border-2 shadow-lg"
          style={{
            background: `${mentor.color}22`,
            borderColor: mentor.color,
            boxShadow: `0 0 16px ${mentor.color}88`,
          }}
        >
          {mentor.avatar}
        </div>
        <div
          className="text-[10px] font-semibold text-center leading-tight max-w-[64px]"
          style={{ color: mentor.color }}
        >
          {mentor.name.split(" ")[0]}
        </div>
      </button>
      {hovered && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 rounded-xl p-2.5 z-10 text-xs text-white"
          style={{
            background: "#0a1428ee",
            border: `1px solid ${mentor.color}`,
            boxShadow: `0 0 20px ${mentor.color}66`,
          }}
        >
          <div className="font-bold">{mentor.name}</div>
          <div style={{ color: mentor.color }} className="text-[10px]">{mentor.title}</div>
          <div className="text-slate-300 mt-1 text-[10px] italic">"{mentor.quote.slice(0, 60)}…"</div>
          <div className="text-[10px] text-center mt-1.5 font-semibold" style={{ color: mentor.color }}>Click to chat ↗</div>
        </div>
      )}
    </div>
  );
}

export default function CityMap({ onVisitDistrict }: Props) {
  const [activeBuilding, setActiveBuilding] = useState<{ b: RBuilding; d: RDistrict } | null>(null);
  const [activeMentor, setActiveMentor] = useState<RNPCMentor | null>(null);
  const [pendingMentor, setPendingMentor] = useState<RNPCMentor | null>(null);

  const handleBuildingClick = (b: RBuilding, d: RDistrict) => {
    setActiveBuilding({ b, d });
    onVisitDistrict(d.id);
  };

  const handleTalkMentor = () => {
    const mentor = NPC_MENTORS.find(m => m.district === activeBuilding?.d.id)
      ?? NPC_MENTORS[0];
    setActiveBuilding(null);
    setActiveMentor(mentor);
  };

  return (
    <div className="relative w-full space-y-4">
      {/* Central Career Hub */}
      <div
        className="relative mx-auto rounded-full flex flex-col items-center justify-center py-6 px-8 text-center w-full max-w-xs"
        style={{
          background: "radial-gradient(circle, #1a3a6b 0%, #0a1428 70%)",
          border: "2px solid #f5a524",
          boxShadow: "0 0 60px rgba(245,165,36,0.5), 0 0 120px rgba(245,165,36,0.2)",
        }}
      >
        <div className="text-4xl mb-1">🏙️</div>
        <div className="text-lg font-black text-gold tracking-wide">CAREER HUB</div>
        <div className="text-xs text-slate-300 mt-0.5">Your Journey Starts Here</div>

        {/* NPC mentors around the hub */}
        <div className="flex gap-3 mt-4 flex-wrap justify-center">
          {NPC_MENTORS.slice(0, 4).map(m => (
            <NPCDot key={m.id} mentor={m} onClick={setActiveMentor} />
          ))}
        </div>
      </div>

      {/* District grid — 3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {DISTRICTS.map(d => (
          <DistrictCard
            key={d.id}
            district={d}
            onBuildingClick={handleBuildingClick}
            onEnter={onVisitDistrict}
          />
        ))}
      </div>

      {/* Floating NPCs row */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: "linear-gradient(135deg, #0d1f3c 0%, #0a1428 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-3 flex items-center gap-1.5">
          <span>👤</span> Career Mentors — Click to chat
        </div>
        <div className="flex gap-4 flex-wrap">
          {NPC_MENTORS.map(m => (
            <NPCDot key={m.id} mentor={m} onClick={m2 => { setActiveMentor(m2); setPendingMentor(null); }} />
          ))}
        </div>
      </div>

      {/* Panels */}
      {activeBuilding && (
        <BuildingDetailPanel
          building={activeBuilding.b}
          district={activeBuilding.d}
          onClose={() => setActiveBuilding(null)}
          onTalkMentor={handleTalkMentor}
        />
      )}
      {(activeMentor ?? pendingMentor) && (
        <MentorPanel
          mentor={(activeMentor ?? pendingMentor)!}
          onClose={() => { setActiveMentor(null); setPendingMentor(null); }}
        />
      )}
    </div>
  );
}
