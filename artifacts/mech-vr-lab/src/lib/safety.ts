/* ─────────────────────────────────────────────────────────
   Safety / Trust Score helpers (client-side localStorage layer)
   Server is the source of truth; this provides local caching.
   ───────────────────────────────────────────────────────── */

export type VerificationTier = "A" | "B" | "C";
export type TrustBadge = "verified" | "active" | "new" | "review";

export interface SafetyProfile {
  studentId: string;
  verificationTier: VerificationTier;
  trustScore: number;
  trustBadge: TrustBadge;
  parentEmail?: string;
  parentName?: string;
  parentVerified: boolean;
  schoolEmailVerified: boolean;
  supervisedMode: boolean;
  dmEnabled: boolean;
  messagingPaused: boolean;
  noParentContact: boolean;
  grade?: number;
  birthdate?: string;
  schoolName?: string;
}

const SAFETY_KEY = "1waymirror_safety_v1";

export function getSafetyProfile(): SafetyProfile | null {
  try {
    const raw = localStorage.getItem(SAFETY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SafetyProfile;
  } catch { return null; }
}

export function saveSafetyProfile(profile: SafetyProfile): void {
  try { localStorage.setItem(SAFETY_KEY, JSON.stringify(profile)); } catch { /* noop */ }
}

export function clearSafetyProfile(): void {
  try { localStorage.removeItem(SAFETY_KEY); } catch { /* noop */ }
}

export function getTrustBadge(score: number): TrustBadge {
  if (score >= 70) return "verified";
  if (score >= 40) return "active";
  if (score < 0)   return "review";
  return "new";
}

export function getTrustBadgeLabel(badge: TrustBadge): string {
  switch (badge) {
    case "verified": return "Verified Student";
    case "active":   return "Active Student";
    case "new":      return "New Student";
    case "review":   return "Under Review";
  }
}

export function canUseDMs(profile: SafetyProfile | null): boolean {
  if (!profile) return false;
  if (profile.messagingPaused) return false;
  if (!profile.dmEnabled) return false;
  return profile.trustScore >= 40;
}

export function isInSupervisedMode(profile: SafetyProfile | null): boolean {
  if (!profile) return true;
  return profile.supervisedMode;
}

/* Calculate trust score from components (mirrors server logic) */
export function calculateTrustScore(components: {
  schoolEmailVerified: boolean;
  parentVerified: boolean;
  phoneVerified: boolean;
  accountAgeDays: number;
  noFlagsBonus: boolean;
  tier2Flags: number;
  tier3Flags: number;
  ageConsistencyFailed: boolean;
  noParentContact: boolean;
}): number {
  let score = 25;
  if (components.schoolEmailVerified) score += 30;
  if (components.parentVerified) score += 20;
  if (components.phoneVerified) score += 10;
  if (components.accountAgeDays >= 30 && components.noFlagsBonus) score += 15;
  if (components.accountAgeDays >= 7) score += 5;
  if (!components.ageConsistencyFailed) score += 5;
  score -= components.tier2Flags * 15;
  score -= components.tier3Flags * 50;
  if (components.ageConsistencyFailed) score -= 25;
  if (components.noParentContact) score = Math.min(score, 75);
  return Math.max(0, Math.min(100, score));
}

/* Disposable email domain blocklist */
const DISPOSABLE_DOMAINS = [
  "mailinator.com","guerrillamail.com","10minutemail.com","throwam.com",
  "yopmail.com","trashmail.com","fakeinbox.com","sharklasers.com",
  "guerrillamailblock.com","grr.la","guerrillamail.info","spam4.me",
  "tempmail.com","temp-mail.org","dispostable.com","maildrop.cc",
];

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return DISPOSABLE_DOMAINS.includes(domain);
}

export function isSchoolEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return domain.endsWith(".edu") || domain.includes(".k12.") ||
    domain.endsWith(".k12") || domain.includes("school") ||
    domain.includes("district") || domain.includes("isd") ||
    domain.includes("cusd") || domain.includes("usd");
}

export function validateAgeGradeConsistency(
  birthdate: string,
  grade: number
): { valid: boolean; reason?: string } {
  const birth = new Date(birthdate);
  const now = new Date();
  const age = now.getFullYear() - birth.getFullYear() -
    (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);

  const expectedAge: Record<number, [number, number]> = {
    7:  [11, 14], 8:  [12, 15], 9:  [13, 16],
    10: [14, 17], 11: [15, 18], 12: [16, 19],
  };
  const range = expectedAge[grade];
  if (!range) return { valid: false, reason: "Invalid grade (must be 7-12)" };
  if (age < range[0] - 1 || age > range[1] + 1) {
    return {
      valid: false,
      reason: `Age ${age} is inconsistent with grade ${grade} (expected ${range[0]}-${range[1]})`,
    };
  }
  return { valid: true };
}
