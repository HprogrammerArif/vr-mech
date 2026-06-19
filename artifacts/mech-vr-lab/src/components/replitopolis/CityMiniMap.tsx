import { useState } from "react";
import { DISTRICTS } from "@/data/replitopolisData";

const DISTRICT_POSITIONS: Record<string, [number, number]> = {
  engineering:      [-55, -45],
  technology:       [0,   -70],
  business:         [55,  -45],
  trades:           [-70,   0],
  healthcare:       [70,    0],
  law:              [-55,  45],
  exploratory:      [0,    70],
  entrepreneurship: [55,   45],
  science:          [-30, -75],
  "life-advice":    [30,   75],
  liveworld:        [0,   105],
};

const DISTRICT_LABELS: Record<string, string> = {
  engineering:      "Engineering District",
  technology:       "Technology District",
  business:         "Business District",
  trades:           "Skilled Trades District",
  healthcare:       "Healthcare District",
  law:              "Law & Justice District",
  exploratory:      "Exploratory District",
  entrepreneurship: "Entrepreneurship District",
  science:          "Science & Research Park",
  "life-advice":    "Life & Career Center",
  liveworld:        "Live World Hub",
};

export function CityMiniMap({
  visitedDistricts,
  onZoneClick,
}: {
  visitedDistricts: Set<string>;
  onZoneClick: (id: string) => void;
}) {
  const SIZE = 200;
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  return (
    <div className="relative" style={{ width: SIZE }}>
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ width: SIZE, height: SIZE, background: "#060e1e", border: "1px solid rgba(245,165,36,0.3)" }}
      >
        <svg width={SIZE} height={SIZE} viewBox="-130 -130 260 260">
          {/* Roads from hub */}
          {DISTRICTS.map(d => {
            const [cx, cz] = DISTRICT_POSITIONS[d.id] ?? [0, 0];
            return (
              <line key={d.id} x1={0} y1={0} x2={cx} y2={cz}
                stroke={d.border} strokeWidth={2} opacity={0.4} />
            );
          })}

          {/* District circles */}
          {DISTRICTS.map(d => {
            const [cx, cz] = DISTRICT_POSITIONS[d.id] ?? [0, 0];
            const visited = visitedDistricts.has(d.id);
            const hovered = hoveredDistrict === d.id;
            return (
              <g
                key={d.id}
                style={{ cursor: "pointer" }}
                onClick={() => onZoneClick(d.id)}
                onMouseEnter={() => setHoveredDistrict(d.id)}
                onMouseLeave={() => setHoveredDistrict(null)}
              >
                {/* hover glow ring */}
                {hovered && (
                  <circle cx={cx} cy={cz} r={26} fill="none"
                    stroke={d.border} strokeWidth={2} opacity={0.6} />
                )}
                <circle cx={cx} cy={cz} r={20} fill={d.color} stroke={d.border}
                  strokeWidth={hovered ? 3 : visited ? 2.5 : 1}
                  opacity={hovered ? 1 : visited ? 0.95 : 0.6} />
                <text x={cx} y={cz + 5} textAnchor="middle" fontSize={12} fill="#fff">
                  {d.icon}
                </text>
                {visited && (
                  <circle cx={cx + 14} cy={cz - 14} r={5} fill="#22c55e" stroke="#fff" strokeWidth={1} />
                )}
              </g>
            );
          })}

          {/* Monorail ring */}
          <circle cx={0} cy={0} r={130} fill="none" stroke="#1e4080"
            strokeWidth={2} strokeDasharray="6 4" opacity={0.5} />

          {/* Career Hub */}
          <circle cx={0} cy={0} r={14} fill="#f5a524" opacity={0.9} />
          <text x={0} y={5} textAnchor="middle" fontSize={10} fill="#0a1428" fontWeight="bold">HUB</text>

          {/* Player pulse dot */}
          <circle cx={0} cy={0} r={5} fill="#22c55e">
            <animate attributeName="r" values="4;7;4" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </svg>
        <div className="absolute bottom-1 right-2 text-[9px] text-slate-500 font-mono">1WayMirror</div>
      </div>

      {/* Tooltip — appears below the map, not clipped by overflow:hidden */}
      <div
        className="absolute left-1/2 -translate-x-1/2 transition-all duration-150 pointer-events-none z-20"
        style={{
          top: SIZE + 6,
          opacity: hoveredDistrict ? 1 : 0,
          transform: `translateX(-50%) translateY(${hoveredDistrict ? "0px" : "-4px"})`,
        }}
      >
        {hoveredDistrict && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
            style={{
              background: "rgba(10,20,40,0.97)",
              border: `1px solid ${DISTRICTS.find(d => d.id === hoveredDistrict)?.border ?? "rgba(245,165,36,0.4)"}`,
              color: "white",
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            }}>
            <span>{DISTRICTS.find(d => d.id === hoveredDistrict)?.icon}</span>
            {DISTRICT_LABELS[hoveredDistrict] ?? hoveredDistrict}
          </div>
        )}
      </div>
    </div>
  );
}
