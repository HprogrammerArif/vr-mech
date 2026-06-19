export interface DarioMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface DarioSession {
  id: string;
  title: string;
  startedAt: string;
  endedAt?: string;
  messages: DarioMessage[];
  careersDiscussed: string[];
  roadmapGenerated: boolean;
}

export interface RoadmapMilestone {
  id: string;
  phase: "0-3mo" | "3-6mo" | "6-12mo" | "1-3yr" | "3-5yr";
  phaseLabel: string;
  title: string;
  description: string;
  completed: boolean;
  sessionId?: string;
}

export interface CareerCompareResult {
  career1: CareerProfile;
  career2: CareerProfile;
}

export interface CareerProfile {
  name: string;
  avgSalary: string;
  salaryRange: string;
  jobGrowth: string;
  educationRequired: string;
  keySkills: string[];
  prosForStudents: string;
  typicalDay: string;
  entryLevel: string;
}

export interface PersonalityTrait {
  name: string;
  score: number;
  description: string;
}

export interface PersonalityInsight {
  generatedAt: string;
  summary: string;
  traits: PersonalityTrait[];
  workStyle: string;
  strengths: string[];
  careerCorrelations: string[];
  learningStyle: string;
  motivators: string[];
}

export interface Opportunity {
  id: string;
  orgName: string;
  type: "internship" | "job-shadowing" | "volunteer" | "entry-level";
  location: string;
  careerField: string;
  description: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  emailSubject: string;
  emailDraft: string;
  savedAt: string;
}

export interface CareerMatch {
  career: string;
  fit: number;
  reason: string;
}

export interface CareerReport {
  generatedAt: string;
  headline: string;
  overallSummary: string;
  careerMatches: CareerMatch[];
  personalitySummary: string;
  keyStrengths: string[];
  areasToExplore: string[];
  educationRecommendations: string[];
  nextSteps: string[];
  sessionCount: number;
  careersExplored: string[];
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  category: "research" | "experience" | "skills" | "network" | "apply";
  completed: boolean;
  dueDate?: string;
  sessionId?: string;
  createdAt: string;
}

const SESSIONS_KEY        = "1waymirror_dario_sessions_v1";
const ROADMAP_KEY         = "1waymirror_career_roadmap_v1";
const PERSONALITY_KEY     = "1waymirror_personality_v1";
const REPORT_KEY          = "1waymirror_career_report_v1";
const OPPORTUNITIES_KEY   = "1waymirror_opportunities_v1";
const ACTION_ITEMS_KEY    = "1waymirror_action_items_v1";
const CREDITS_USED_KEY    = "1waymirror_dario_credits_used_v1";

function readKey<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") as T ?? fallback; }
  catch { return fallback; }
}
function writeKey(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

/* ── Sessions ── */
export function loadSessions(): DarioSession[] {
  return readKey<DarioSession[]>(SESSIONS_KEY, []);
}
export function saveSession(session: DarioSession): void {
  const sessions = loadSessions();
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx !== -1) sessions[idx] = session; else sessions.unshift(session);
  writeKey(SESSIONS_KEY, sessions);
}

/* ── Roadmap ── */
export function loadRoadmap(): RoadmapMilestone[] {
  return readKey<RoadmapMilestone[]>(ROADMAP_KEY, []);
}
export function saveRoadmap(milestones: RoadmapMilestone[]): void {
  writeKey(ROADMAP_KEY, milestones);
}
export function appendRoadmapMilestones(newOnes: RoadmapMilestone[]): RoadmapMilestone[] {
  const existing = loadRoadmap();
  const merged = [...existing];
  for (const m of newOnes) {
    if (!merged.find(e => e.title === m.title)) merged.push(m);
  }
  saveRoadmap(merged);
  return merged;
}

/* ── Personality ── */
export function loadPersonality(): PersonalityInsight | null {
  return readKey<PersonalityInsight | null>(PERSONALITY_KEY, null);
}
export function savePersonality(p: PersonalityInsight): void {
  writeKey(PERSONALITY_KEY, p);
}

/* ── Career Report ── */
export function loadCareerReport(): CareerReport | null {
  return readKey<CareerReport | null>(REPORT_KEY, null);
}
export function saveCareerReport(r: CareerReport): void {
  writeKey(REPORT_KEY, r);
}

/* ── Opportunities ── */
export function loadOpportunities(): Opportunity[] {
  return readKey<Opportunity[]>(OPPORTUNITIES_KEY, []);
}
export function saveOpportunities(ops: Opportunity[]): void {
  writeKey(OPPORTUNITIES_KEY, ops);
}
export function addOpportunity(op: Opportunity): void {
  const existing = loadOpportunities();
  writeKey(OPPORTUNITIES_KEY, [op, ...existing]);
}

/* ── Action Items ── */
export function loadActionItems(): ActionItem[] {
  return readKey<ActionItem[]>(ACTION_ITEMS_KEY, []);
}
export function saveActionItems(items: ActionItem[]): void {
  writeKey(ACTION_ITEMS_KEY, items);
}
export function appendActionItems(newOnes: ActionItem[]): ActionItem[] {
  const existing = loadActionItems();
  const merged = [...existing];
  for (const item of newOnes) {
    if (!merged.find(e => e.title === item.title)) merged.push(item);
  }
  saveActionItems(merged);
  return merged;
}

/* ── Dario Credit Tracking ── */
export function getDarioCreditsUsed(): number {
  return readKey<number>(CREDITS_USED_KEY, 0);
}

export function incrementDarioCreditsUsed(count = 1): number {
  const current = getDarioCreditsUsed();
  const updated = current + count;
  writeKey(CREDITS_USED_KEY, updated);
  return updated;
}

export function resetDarioCredits(): void {
  writeKey(CREDITS_USED_KEY, 0);
}

/* ── Phase constants ── */
export const PHASE_ORDER: RoadmapMilestone["phase"][] = ["0-3mo", "3-6mo", "6-12mo", "1-3yr", "3-5yr"];
export const PHASE_LABELS: Record<RoadmapMilestone["phase"], string> = {
  "0-3mo":  "Now — 3 months",
  "3-6mo":  "3 — 6 months",
  "6-12mo": "6 — 12 months",
  "1-3yr":  "1 — 3 years",
  "3-5yr":  "3 — 5 years",
};

export const OPPORTUNITY_LABELS: Record<Opportunity["type"], string> = {
  "internship":    "Internship",
  "job-shadowing": "Job Shadowing",
  "volunteer":     "Volunteer",
  "entry-level":   "Entry-Level Job",
};
