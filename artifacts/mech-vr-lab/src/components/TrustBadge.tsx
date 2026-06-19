import type { TrustBadge as TrustBadgeType } from "@/lib/safety";
import { getTrustBadgeLabel } from "@/lib/safety";
import { ShieldCheck, Shield, ShieldOff, AlertCircle } from "lucide-react";

interface TrustBadgeProps {
  badge: TrustBadgeType;
  score?: number;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
  showLabel?: boolean;
}

const BADGE_CONFIG: Record<TrustBadgeType, {
  color: string; bg: string; border: string; Icon: typeof ShieldCheck;
}> = {
  verified: {
    color: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.3)",
    Icon: ShieldCheck,
  },
  active: {
    color: "#60a5fa", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.3)",
    Icon: Shield,
  },
  new: {
    color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)",
    Icon: Shield,
  },
  review: {
    color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)",
    Icon: AlertCircle,
  },
};

const SIZE_CONFIG = {
  sm: { icon: "h-3 w-3", text: "text-xs", pad: "px-2 py-0.5" },
  md: { icon: "h-4 w-4", text: "text-sm", pad: "px-3 py-1" },
  lg: { icon: "h-5 w-5", text: "text-base", pad: "px-4 py-1.5" },
};

export default function TrustBadge({
  badge, score, size = "md", showScore = false, showLabel = true,
}: TrustBadgeProps) {
  const cfg = BADGE_CONFIG[badge];
  const sz = SIZE_CONFIG[size];
  const { Icon } = cfg;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sz.pad} ${sz.text}`}
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
      title={`Trust badge: ${getTrustBadgeLabel(badge)}${score !== undefined ? ` (score: ${score}/100)` : ""}`}>
      <Icon className={sz.icon} />
      {showLabel && getTrustBadgeLabel(badge)}
      {showScore && score !== undefined && (
        <span className="opacity-70 font-mono text-xs">{score}</span>
      )}
    </span>
  );
}
