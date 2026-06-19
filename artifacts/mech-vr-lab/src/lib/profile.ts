export type AvatarPreset = {
  id: string;
  name: string;
  label: string;
  skinTone: string;
  hairColor: string;
  outfitColor: string;
  accentColor: string;
  emoji: string;
  description: string;
};

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "nova", name: "Nova", label: "The Innovator", skinTone: "#fcd9b0", hairColor: "#1a0a00", outfitColor: "#6d28d9", accentColor: "#a78bfa", emoji: "👩🏻‍💻", description: "Built her first app at 14" },
  { id: "kai", name: "Kai", label: "The Engineer", skinTone: "#d08b5b", hairColor: "#3b1f0a", outfitColor: "#1d4ed8", accentColor: "#60a5fa", emoji: "👨🏽‍🔧", description: "Loves designing complex systems" },
  { id: "zara", name: "Zara", label: "The Strategist", skinTone: "#8d5524", hairColor: "#1a0a00", outfitColor: "#0891b2", accentColor: "#22d3ee", emoji: "👩🏾‍💼", description: "Thinks 10 steps ahead" },
  { id: "max", name: "Max", label: "The Builder", skinTone: "#fcd9b0", hairColor: "#d4a017", outfitColor: "#16a34a", accentColor: "#4ade80", emoji: "👨🏼‍🔨", description: "Makes things with his hands" },
  { id: "aria", name: "Aria", label: "The Healer", skinTone: "#f0b98c", hairColor: "#5c3317", outfitColor: "#dc2626", accentColor: "#f87171", emoji: "👩🏽‍⚕️", description: "Driven by helping others" },
  { id: "dev", name: "Dev", label: "The Founder", skinTone: "#c47c5a", hairColor: "#1a0a00", outfitColor: "#ea580c", accentColor: "#fb923c", emoji: "👨🏾‍💼", description: "First startup at 16" },
  { id: "luna", name: "Luna", label: "The Artist", skinTone: "#fcd9b0", hairColor: "#d0d0d0", outfitColor: "#be185d", accentColor: "#f472b6", emoji: "👩🏻‍🎨", description: "Where creativity meets code" },
  { id: "rex", name: "Rex", label: "The Analyst", skinTone: "#3d2316", hairColor: "#1a0a00", outfitColor: "#0f766e", accentColor: "#2dd4bf", emoji: "👨🏿‍💻", description: "Finds patterns others miss" },
];

export type SubscriptionPlan = "none" | "starter" | "explorer" | "builder" | "accelerator";

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  none: "No Plan",
  starter: "Starter",
  explorer: "Explorer",
  builder: "Builder",
  accelerator: "Accelerator",
};

export const PLAN_PRICES: Record<SubscriptionPlan, string> = {
  none: "Free",
  starter: "$19.99/mo",
  explorer: "$49.99/mo",
  builder: "$99.99/mo",
  accelerator: "$199.99/mo",
};

export const PLAN_COLORS: Record<SubscriptionPlan, string> = {
  none: "#64748b",
  starter: "#3b82f6",
  explorer: "#f5a524",
  builder: "#a855f7",
  accelerator: "#f97316",
};

export const PLAN_DARIO_CREDITS: Record<SubscriptionPlan, number> = {
  none: 0,
  starter: 0,
  explorer: 200,
  builder: 700,
  accelerator: 1200,
};

export const PLAN_LIVESTREAM_LIMIT: Record<SubscriptionPlan, number | "all"> = {
  none: 0,
  starter: 2,
  explorer: 7,
  builder: "all",
  accelerator: "all",
};

export type PlanFeature =
  | "simulations"
  | "videos"
  | "feed"
  | "progress"
  | "profile-sharing"
  | "dario-chat"
  | "dario-compare"
  | "dario-roadmap"
  | "dario-exploratory"
  | "recorded-talks"
  | "personality"
  | "career-report"
  | "opportunities"
  | "action-items"
  | "athletic-recruiting"
  | "college-advising"
  | "advisor-1on1";

export const PLAN_FEATURES: Record<SubscriptionPlan, Set<PlanFeature>> = {
  none: new Set([]),
  starter: new Set<PlanFeature>([
    "simulations", "videos", "feed", "progress", "profile-sharing",
  ]),
  explorer: new Set<PlanFeature>([
    "simulations", "videos", "feed", "progress", "profile-sharing",
    "dario-chat", "dario-compare", "dario-roadmap", "dario-exploratory",
  ]),
  builder: new Set<PlanFeature>([
    "simulations", "videos", "feed", "progress", "profile-sharing",
    "dario-chat", "dario-compare", "dario-roadmap", "dario-exploratory",
    "recorded-talks", "personality", "career-report", "opportunities",
    "action-items", "athletic-recruiting", "college-advising",
  ]),
  accelerator: new Set<PlanFeature>([
    "simulations", "videos", "feed", "progress", "profile-sharing",
    "dario-chat", "dario-compare", "dario-roadmap", "dario-exploratory",
    "recorded-talks", "personality", "career-report", "opportunities",
    "action-items", "athletic-recruiting", "college-advising",
    "advisor-1on1",
  ]),
};

export function hasPlanFeature(plan: SubscriptionPlan, feature: PlanFeature): boolean {
  return PLAN_FEATURES[plan].has(feature);
}

const PLAN_KEY = "1waymirror_plan_v1";

export function getSubscriptionPlan(): SubscriptionPlan {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return "none";
    return (raw as SubscriptionPlan) ?? "none";
  } catch {
    return "none";
  }
}

export function saveSubscriptionPlan(plan: SubscriptionPlan): void {
  localStorage.setItem(PLAN_KEY, plan);
}

export type PlayerProfile = {
  learnerId: string;
  name: string;
  email?: string;
  careerInterest: string;
  careerInterests?: string[];
  avatarId: string;
  school?: string;
  graduationYear?: number;
  gpa?: string;
  sat?: string;
};

const PROFILE_KEY = "1waymirror_profile_v2";

export function getProfile(): PlayerProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlayerProfile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: PlayerProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getOrCreateLearnerId(): string {
  const existing = getProfile();
  if (existing?.learnerId) return existing.learnerId;
  return localStorage.getItem("mech_vr_learner_id") ?? crypto.randomUUID();
}

export function getAvatarPreset(id: string): AvatarPreset {
  return AVATAR_PRESETS.find(a => a.id === id) ?? AVATAR_PRESETS[0];
}

export function buildShareUrl(profile: PlayerProfile, plan: SubscriptionPlan): string {
  const publicData = {
    n: profile.name,
    a: profile.avatarId,
    c: profile.careerInterest,
    cs: profile.careerInterests ?? [],
    s: profile.school ?? "",
    g: profile.graduationYear ?? 0,
    p: PLAN_LABELS[plan],
  };
  const encoded = btoa(JSON.stringify(publicData));
  const base = window.location.origin + (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return `${base}/share/${profile.learnerId}?d=${encoded}`;
}

export function parseShareData(encoded: string): {
  name: string; avatarId: string; careerInterest: string;
  careerInterests: string[]; school: string; graduationYear: number; plan: string;
} | null {
  try {
    const raw = JSON.parse(atob(encoded));
    return {
      name: raw.n ?? "Student",
      avatarId: raw.a ?? "nova",
      careerInterest: raw.c ?? "",
      careerInterests: raw.cs ?? [],
      school: raw.s ?? "",
      graduationYear: raw.g ?? 0,
      plan: raw.p ?? "",
    };
  } catch {
    return null;
  }
}
