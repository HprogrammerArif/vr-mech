import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { Trophy, GraduationCap, Briefcase, Star, ArrowLeft, Copy, ExternalLink } from "lucide-react";
import { getProfile, getSubscriptionPlan, parseShareData, getAvatarPreset, buildShareUrl, PLAN_LABELS } from "@/lib/profile";
import { ALL_BADGES, computeEarnedBadgeIds } from "@/lib/badges";
import { useGetProgress } from "@workspace/api-client-react";
import { getLearnerId } from "@/lib/learner";
import { useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

function AvatarDisplay({ avatarId, size = 80 }: { avatarId: string; size?: number }) {
  const preset = getAvatarPreset(avatarId);
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-black text-3xl shadow-lg"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${preset.outfitColor}, ${preset.accentColor})`,
        border: "3px solid #f5a524",
      }}
    >
      {preset.emoji}
    </div>
  );
}

export default function ShareProfilePage() {
  const [, params] = useRoute("/share/:learnerId");
  const [copied, setCopied] = useState(false);

  const sharedLearnerId = params?.learnerId ?? "";
  const searchParams = new URLSearchParams(window.location.search);
  const encodedData = searchParams.get("d");

  const ownProfile = getProfile();
  const ownPlan = getSubscriptionPlan();
  const isOwnProfile = ownProfile?.learnerId === sharedLearnerId;

  const sharedData = useMemo(() => {
    if (encodedData) return parseShareData(encodedData);
    if (isOwnProfile && ownProfile) {
      return {
        name: ownProfile.name,
        avatarId: ownProfile.avatarId,
        careerInterest: ownProfile.careerInterest,
        careerInterests: ownProfile.careerInterests ?? [],
        school: ownProfile.school ?? "",
        graduationYear: ownProfile.graduationYear ?? 0,
        plan: PLAN_LABELS[ownPlan],
      };
    }
    return null;
  }, [encodedData, isOwnProfile, ownProfile, ownPlan]);

  const learnerId = getLearnerId();
  const { data: progress } = useGetProgress({ learnerId: isOwnProfile ? learnerId : "" });

  const earnedBadgeIds = useMemo(() => {
    if (!isOwnProfile || !progress) return new Set<string>();
    return computeEarnedBadgeIds({
      totalXp: progress.totalXp ?? 0,
      level: progress.level ?? 1,
      streak: progress.streak ?? 0,
      missionsCompleted: progress.missionsCompleted ?? 0,
      categoriesTried: new Set((progress.categoryProgress ?? []).filter(c => c.attempted > 0).map(c => c.category)),
    });
  }, [isOwnProfile, progress]);

  const visibleBadges = useMemo(() => {
    return ALL_BADGES.filter(b => earnedBadgeIds.has(b.id)).slice(0, 12);
  }, [earnedBadgeIds]);

  const shareUrl = useMemo(() => {
    if (!ownProfile || !isOwnProfile) return "";
    return buildShareUrl(ownProfile, ownPlan);
  }, [ownProfile, ownPlan, isOwnProfile]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!sharedData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(217 60% 6%)" }}>
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <div className="text-white text-xl font-bold mb-2">Profile Not Found</div>
          <p className="text-slate-400 text-sm mb-6">This link may have expired or the profile data is missing.</p>
          <Link href="/">
            <button className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: "#1d4ed8" }}>
              Go to Homepage
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const preset = getAvatarPreset(sharedData.avatarId);

  return (
    <div className="min-h-screen" style={{ background: "hsl(217 60% 6%)" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{ background: "rgba(5,15,40,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>
        <Link href={isOwnProfile ? BASE + "replitopolis" : "/"}>
          <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {isOwnProfile ? "Back to Dashboard" : "1WayMirror World"}
          </button>
        </Link>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Career Profile</div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        {/* Profile Card */}
        <div className="rounded-3xl p-8 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0f1f4a 0%, #1e1b4b 100%)", border: "1px solid rgba(245,165,36,0.2)" }}>
          <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(245,165,36,0.08) 0%, transparent 70%)" }} />

          <div className="flex items-start gap-5">
            <AvatarDisplay avatarId={sharedData.avatarId} size={88} />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-white mb-0.5">{sharedData.name}</h1>
              <div className="text-sm font-semibold mb-3" style={{ color: "#f5a524" }}>{preset.label}</div>

              {sharedData.school && (
                <div className="flex items-center gap-1.5 text-sm text-slate-300 mb-1">
                  <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                  {sharedData.school}
                  {sharedData.graduationYear ? ` · Class of ${sharedData.graduationYear}` : ""}
                </div>
              )}

              {(sharedData.careerInterest || (sharedData.careerInterests?.length ?? 0) > 0) && (
                <div className="flex items-center gap-1.5 text-sm text-slate-300">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    {sharedData.careerInterests && sharedData.careerInterests.length > 0
                      ? sharedData.careerInterests.slice(0, 3).join(", ")
                      : sharedData.careerInterest}
                  </span>
                </div>
              )}

              {sharedData.plan && sharedData.plan !== "No Plan" && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: "rgba(245,165,36,0.15)", border: "1px solid rgba(245,165,36,0.3)", color: "#f5a524" }}>
                  <Star className="h-3 w-3" />
                  {sharedData.plan} Member
                </div>
              )}
            </div>
          </div>

          {/* 1WayMirror branding */}
          <div className="mt-6 pt-5 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-xs text-slate-500">Career Explorer on</div>
            <div className="text-sm font-black" style={{ color: "#f5a524" }}>1WayMirror World</div>
          </div>
        </div>

        {/* Progress stats — own profile only */}
        {isOwnProfile && progress && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "XP Earned", value: (progress.totalXp ?? 0).toLocaleString(), icon: "⚡", color: "#f5a524" },
              { label: "Missions Done", value: (progress.missionsCompleted ?? 0).toString(), icon: "🎯", color: "#3b82f6" },
              { label: "Badges", value: earnedBadgeIds.size.toString(), icon: "🏆", color: "#a855f7" },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="rounded-2xl p-4 text-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-xl mb-1">{icon}</div>
                <div className="text-xl font-black" style={{ color }}>{value}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide font-bold mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Badges — own profile only */}
        {isOwnProfile && visibleBadges.length > 0 && (
          <div className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-4 w-4" style={{ color: "#f5a524" }} />
              <span className="text-sm font-bold text-white">Badges Earned</span>
              <span className="text-xs text-slate-500 ml-auto">{earnedBadgeIds.size} total</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleBadges.map(b => (
                <div key={b.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0" }}>
                  <span>{b.emoji}</span>
                  <span>{b.label}</span>
                </div>
              ))}
              {earnedBadgeIds.size > 12 && (
                <div className="flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold text-slate-500"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  +{earnedBadgeIds.size - 12} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Share link — own profile only */}
        {isOwnProfile && shareUrl && (
          <div className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-sm font-bold text-white mb-3">Share Your Profile</div>
            <div className="flex items-center gap-2 p-3 rounded-xl text-xs text-slate-400 font-mono break-all"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="flex-1 truncate">{shareUrl}</span>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                style={{ background: copied ? "#16a34a" : "#1d4ed8", color: "white" }}>
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                  style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Preview
                </button>
              </a>
            </div>
          </div>
        )}

        {/* CTA for visitors */}
        {!isOwnProfile && (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: "linear-gradient(135deg, #1e3a8a, #1d4ed8)", border: "1px solid rgba(96,165,250,0.3)" }}>
            <div className="text-2xl mb-2">🌐</div>
            <div className="text-white font-black text-lg mb-1">Explore Your Future Career</div>
            <p className="text-blue-200 text-sm mb-4">
              Try 85+ career simulations, earn badges, and get AI career guidance on 1WayMirror World.
            </p>
            <Link href="/login">
              <button className="px-6 py-3 rounded-xl text-sm font-black transition-all hover:scale-105"
                style={{ background: "#f5a524", color: "#0f172a" }}>
                Get Started Free
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
