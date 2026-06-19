export function getLearnerId(): string {
  // Try to get from new profile system first
  try {
    const raw = localStorage.getItem("1waymirror_profile_v2");
    if (raw) {
      const p = JSON.parse(raw) as { learnerId?: string };
      if (p.learnerId) return p.learnerId;
    }
  } catch { /* ignore */ }
  // Fallback to old key
  let learnerId = localStorage.getItem("mech_vr_learner_id");
  if (!learnerId) {
    learnerId = crypto.randomUUID();
    localStorage.setItem("mech_vr_learner_id", learnerId);
  }
  return learnerId;
}
