import { useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, ArrowRight, Gamepad2, Sparkles } from "lucide-react";
import { AVATAR_PRESETS, saveProfile, getOrCreateLearnerId } from "@/lib/profile";
import { Button } from "@/components/ui/button";

const CAREER_INTERESTS = [
  "Engineering", "Technology / Software", "Healthcare / Medicine",
  "Business / Finance", "Skilled Trades", "Law / Public Service",
  "Arts / Design", "Entrepreneurship", "Science / Research",
  "Education", "Not sure yet — exploring all!",
];

type Step = "name" | "career" | "avatar";

export default function ProfileSetupPage({ redirectTo = "/city" }: { redirectTo?: string }) {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [careerInterest, setCareerInterest] = useState("");
  const [avatarId, setAvatarId] = useState("nova");
  const [nameError, setNameError] = useState("");

  const advance = () => {
    if (step === "name") {
      if (!name.trim() || name.trim().length < 2) {
        setNameError("Please enter at least 2 characters.");
        return;
      }
      setNameError("");
      setStep("career");
    } else if (step === "career") {
      if (!careerInterest) return;
      setStep("avatar");
    } else {
      const learnerId = getOrCreateLearnerId();
      saveProfile({ learnerId, name: name.trim(), careerInterest, avatarId });
      navigate(redirectTo);
    }
  };

  const STEPS: Step[] = ["name", "career", "avatar"];
  const stepIdx = STEPS.indexOf(step);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 60% 0%, #0d1f3c 0%, #0a1428 70%)" }}
    >
      {/* Animated background grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(245,165,36,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(245,165,36,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Neon blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10" style={{ background: "#f5a524" }} />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-10" style={{ background: "#8b5cf6" }} />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-2xl mx-4 rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(13,31,60,0.95) 0%, rgba(10,20,40,0.98) 100%)",
          border: "1px solid rgba(245,165,36,0.35)",
          boxShadow: "0 0 80px rgba(245,165,36,0.15), 0 40px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Top accent */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #f5a524, #8b5cf6, #0ea5e9)" }} />

        <div className="p-8 sm:p-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm"
              style={{ background: "linear-gradient(135deg, #f5a524, #ea580c)", color: "#0a1428" }}
            >
              1W
            </div>
            <div>
              <div className="text-base font-black text-white">1WayMirror</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">Career City</div>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {["Name", "Career", "Avatar"].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: i <= stepIdx ? "rgba(245,165,36,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${i <= stepIdx ? "#f5a524" : "rgba(255,255,255,0.1)"}`,
                    color: i <= stepIdx ? "#f5a524" : "#64748b",
                  }}
                >
                  {i < stepIdx ? <CheckCircle2 className="h-3 w-3" /> : <span>{i + 1}</span>}
                  {label}
                </div>
                {i < 2 && <div className="h-px w-4 bg-white/10" />}
              </div>
            ))}
          </div>

          {/* ── STEP: NAME ── */}
          {step === "name" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-black text-white mb-2">Welcome to Career City 🏙️</h1>
                <p className="text-slate-400 text-sm">You're about to explore a futuristic world of careers. First, what should we call you?</p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold block mb-2">Display Name</label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setNameError(""); }}
                  onKeyDown={e => e.key === "Enter" && advance()}
                  placeholder="Enter your name or gamertag…"
                  maxLength={24}
                  className="w-full rounded-xl px-4 py-3.5 text-white text-lg font-semibold placeholder-slate-600 focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${nameError ? "#ef4444" : "rgba(255,255,255,0.15)"}`,
                    boxShadow: nameError ? "0 0 12px rgba(239,68,68,0.3)" : "none",
                  }}
                />
                {nameError && <p className="text-red-400 text-xs mt-2">{nameError}</p>}
              </div>
              <div className="flex gap-2 flex-wrap">
                {["Alex", "Jordan", "Sam", "Riley", "Morgan"].map(n => (
                  <button
                    key={n}
                    onClick={() => setName(n)}
                    className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-slate-400 hover:text-gold hover:border-gold transition-colors"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: CAREER ── */}
          {step === "career" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-3xl font-black text-white mb-2">What's your career vibe, {name}? 🎯</h1>
                <p className="text-slate-400 text-sm">Other players will see this when they meet you in Career City.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CAREER_INTERESTS.map(ci => (
                  <button
                    key={ci}
                    onClick={() => setCareerInterest(ci)}
                    className="text-left px-4 py-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: careerInterest === ci ? "rgba(245,165,36,0.15)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${careerInterest === ci ? "#f5a524" : "rgba(255,255,255,0.08)"}`,
                      color: careerInterest === ci ? "#f5a524" : "#94a3b8",
                      boxShadow: careerInterest === ci ? "0 0 16px rgba(245,165,36,0.2)" : "none",
                    }}
                  >
                    {careerInterest === ci && <CheckCircle2 className="h-3.5 w-3.5 inline mr-1.5" />}
                    {ci}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: AVATAR ── */}
          {step === "avatar" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-3xl font-black text-white mb-2">Pick your avatar, {name} ✨</h1>
                <p className="text-slate-400 text-sm">This is how you'll appear to other players in Career City.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {AVATAR_PRESETS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setAvatarId(a.id)}
                    className="rounded-2xl p-4 flex flex-col items-center gap-2 transition-all hover:scale-105"
                    style={{
                      background: avatarId === a.id ? `${a.outfitColor}22` : "rgba(255,255,255,0.03)",
                      border: `2px solid ${avatarId === a.id ? a.outfitColor : "rgba(255,255,255,0.08)"}`,
                      boxShadow: avatarId === a.id ? `0 0 24px ${a.outfitColor}66` : "none",
                    }}
                  >
                    {/* Avatar preview */}
                    <div className="relative">
                      <div
                        className="h-16 w-16 rounded-full flex items-center justify-center text-4xl border-2"
                        style={{
                          background: `linear-gradient(135deg, ${a.outfitColor}44, ${a.accentColor}22)`,
                          borderColor: avatarId === a.id ? a.outfitColor : "transparent",
                          boxShadow: avatarId === a.id ? `0 0 16px ${a.outfitColor}88` : "none",
                        }}
                      >
                        {a.emoji}
                      </div>
                      {avatarId === a.id && (
                        <div
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center"
                          style={{ background: a.outfitColor }}
                        >
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-sm text-white">{a.name}</div>
                      <div
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: a.outfitColor }}
                      >
                        {a.label}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{a.description}</div>
                    </div>
                    {/* Color dots */}
                    <div className="flex gap-1">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: a.skinTone }} />
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: a.outfitColor }} />
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: a.accentColor }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2">
              {step !== "name" && (
                <button
                  onClick={() => setStep(step === "avatar" ? "career" : "name")}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  ← Back
                </button>
              )}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Sparkles className="h-3 w-3 text-gold" />
                Your data stays private on your device
              </div>
            </div>
            <Button
              onClick={advance}
              disabled={
                (step === "name" && name.trim().length < 2) ||
                (step === "career" && !careerInterest)
              }
              className="font-bold px-6"
              style={{
                background: "linear-gradient(135deg, #f5a524, #ea580c)",
                color: "#0a1428",
                boxShadow: "0 4px 24px rgba(245,165,36,0.4)",
              }}
            >
              {step === "avatar" ? (
                <><Gamepad2 className="h-4 w-4 mr-2" /> Enter Career City</>
              ) : (
                <>Continue <ArrowRight className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
