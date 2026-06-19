export type BadgeDef = {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  xpReq?: number;
  levelReq?: number;
  streakReq?: number;
  catReq?: string;
  allCats?: boolean;
};

const LEVEL_DATA: [string, string][] = [
  ["🌱", "Rookie"],
  ["⚡", "Energized"],
  ["🎯", "Focused"],
  ["🔑", "Unlocked"],
  ["🌟", "Rising Star"],
  ["💪", "Dedicated"],
  ["🎲", "Risk Taker"],
  ["🔥", "Ignited"],
  ["🎸", "Rocking"],
  ["🏅", "First Milestone"],
  ["🧠", "Sharp Mind"],
  ["🌈", "Versatile"],
  ["🦋", "Evolving"],
  ["💡", "Bright Idea"],
  ["🎖️", "Decorated"],
  ["🚀", "Launching"],
  ["🌙", "Night Shift"],
  ["🎓", "Scholar"],
  ["🦁", "Courageous"],
  ["💎", "Diamond"],
  ["🌊", "Wave Rider"],
  ["⚗️", "Alchemist"],
  ["🎯", "Sharpshooter"],
  ["🌺", "Blossoming"],
  ["🏆", "Silver Cup"],
  ["🦅", "Eagle Eye"],
  ["⚡", "High Voltage"],
  ["🎭", "Showstopper"],
  ["🔮", "Visionary"],
  ["👑", "Royalty"],
  ["🧬", "Deep Thinker"],
  ["🌌", "Cosmic"],
  ["🎯", "Precision"],
  ["🦊", "Clever Fox"],
  ["🏰", "Fortified"],
  ["🌍", "Global Thinker"],
  ["🧲", "Magnetic"],
  ["🎪", "All-Rounder"],
  ["🔬", "Researcher"],
  ["🌠", "Galaxy Brain"],
  ["🦾", "Enhanced"],
  ["✨", "Life's Answer"],
  ["🌋", "Force of Nature"],
  ["⚔️", "Battle-Tested"],
  ["🏺", "Ancient Wisdom"],
  ["🛸", "In Orbit"],
  ["💫", "Supernova"],
  ["🔥", "Inferno"],
  ["⚡", "Thunderstruck"],
  ["🏆", "LEGEND"],
];

export const LEVEL_BADGES: BadgeDef[] = LEVEL_DATA.map(([emoji, label], i) => ({
  id: `level-${i + 1}`,
  emoji,
  label,
  desc: i === 49 ? "50 levels — the ultimate achievement." : `Reached Level ${i + 1}.`,
  levelReq: i + 1,
}));

export const ACHIEVEMENT_BADGES: BadgeDef[] = [
  { id: "first-sim",  emoji: "🚀", label: "First Launch",      desc: "Completed your first simulation." },
  { id: "ten-xp",     emoji: "⚡", label: "Spark",             desc: "Earned your first 10 XP." },
  { id: "100xp",      emoji: "💯", label: "Century",           desc: "Earned 100 XP." },
  { id: "500xp",      emoji: "🌟", label: "500 Club",          desc: "Earned 500 XP." },
  { id: "streak3",    emoji: "🔥", label: "On Fire",           desc: "3-day streak." },
  { id: "streak7",    emoji: "🗓️", label: "Week Warrior",      desc: "7-day streak." },
  { id: "engineer",   emoji: "⚙️", label: "Engineer",          desc: "Tried an Engineering simulation.",          catReq: "engineering" },
  { id: "business",   emoji: "💼", label: "Executive",         desc: "Tried a Business simulation.",              catReq: "business" },
  { id: "healthcare", emoji: "🏥", label: "Caregiver",         desc: "Tried a Healthcare simulation.",            catReq: "healthcare" },
  { id: "trades",     emoji: "🔧", label: "Tradesperson",      desc: "Tried a Trades simulation.",                catReq: "trades" },
  { id: "tech",       emoji: "💻", label: "Developer",         desc: "Tried a Technology simulation.",            catReq: "technology" },
  { id: "law",        emoji: "⚖️", label: "Advocate",          desc: "Tried a Law simulation.",                   catReq: "law" },
  { id: "scientist",  emoji: "🔬", label: "Scientist",         desc: "Tried a Science & Research simulation.",    catReq: "science" },
  { id: "life",       emoji: "🌱", label: "Life Navigator",    desc: "Tried a Life & Career Advice simulation.",  catReq: "life-advice" },
  { id: "explorer",        emoji: "🌍", label: "World Explorer",    desc: "Tried a simulation in all 8 categories.",   allCats: true },
  { id: "first-dario",     emoji: "🤝", label: "First Counseling",  desc: "Had your first conversation with Dario." },
  { id: "dario-3",         emoji: "💬", label: "Open Book",         desc: "Completed 3 sessions with Dario." },
  { id: "dario-10",        emoji: "🧭", label: "Career Compass",    desc: "Completed 10 sessions with Dario." },
  { id: "dario-roadmap",   emoji: "🗺️", label: "Roadmap Ready",     desc: "Generated your career roadmap with Dario." },
  { id: "dario-compare",   emoji: "⚖️", label: "Weighing Options",  desc: "Compared two careers with Dario." },
  { id: "dario-xp-50",     emoji: "⚡", label: "Dario Power",       desc: "Earned 50 XP through Dario conversations." },
];

export const ALL_BADGES: BadgeDef[] = [...ACHIEVEMENT_BADGES, ...LEVEL_BADGES];

export function computeEarnedBadgeIds(params: {
  totalXp: number;
  level: number;
  streak: number;
  missionsCompleted: number;
  categoriesTried: Set<string>;
  darioSessions?: number;
  darioXp?: number;
  darioRoadmapGenerated?: boolean;
  darioCompareUsed?: boolean;
}): Set<string> {
  const { totalXp, level, streak, missionsCompleted, categoriesTried,
    darioSessions = 0, darioXp = 0, darioRoadmapGenerated = false, darioCompareUsed = false } = params;
  const earned = new Set<string>();

  if (missionsCompleted > 0) earned.add("first-sim");
  if (totalXp >= 10) earned.add("ten-xp");
  if (totalXp >= 100) earned.add("100xp");
  if (totalXp >= 500) earned.add("500xp");
  if (streak >= 3) earned.add("streak3");
  if (streak >= 7) earned.add("streak7");
  if (categoriesTried.has("engineering")) earned.add("engineer");
  if (categoriesTried.has("business")) earned.add("business");
  if (categoriesTried.has("healthcare")) earned.add("healthcare");
  if (categoriesTried.has("trades")) earned.add("trades");
  if (categoriesTried.has("technology")) earned.add("tech");
  if (categoriesTried.has("law")) earned.add("law");
  if (categoriesTried.has("science")) earned.add("scientist");
  if (categoriesTried.has("life-advice")) earned.add("life");
  const ALL_CATS = ["engineering","business","healthcare","trades","technology","law","science","life-advice"];
  if (ALL_CATS.every(c => categoriesTried.has(c))) earned.add("explorer");

  if (darioSessions >= 1)  earned.add("first-dario");
  if (darioSessions >= 3)  earned.add("dario-3");
  if (darioSessions >= 10) earned.add("dario-10");
  if (darioRoadmapGenerated) earned.add("dario-roadmap");
  if (darioCompareUsed)      earned.add("dario-compare");
  if (darioXp >= 50)         earned.add("dario-xp-50");

  for (let lvl = 1; lvl <= Math.min(level, 50); lvl++) {
    earned.add(`level-${lvl}`);
  }

  return earned;
}
