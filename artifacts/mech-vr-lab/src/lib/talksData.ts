import type { FeedCategory } from "./feedArticles";

export interface ExpertTalk {
  id: string;
  category: FeedCategory;
  title: string;
  speaker: string;
  speakerTitle: string;
  organization: string;
  description: string;
  duration: string;
  youtubeId: string;
  date: string; // ISO date
  views?: number;
  tags: string[];
}

export interface UpcomingLivestream {
  id: string;
  category: FeedCategory;
  title: string;
  host: string;
  hostTitle: string;
  organization: string;
  description: string;
  scheduledAt: string; // ISO datetime
  durationEstimate: string;
  joinUrl?: string;
  zoomLink?: string;
  zoomPassword?: string;
  status: "upcoming" | "live" | "ended";
  tags: string[];
  maxAttendees?: number;
  visibleTo?: ("none" | "starter" | "explorer" | "builder" | "accelerator")[];
}

export const EXPERT_TALKS: ExpertTalk[] = [
  /* Recorded talks will appear here after each live stream is archived. */
];

const _LEGACY_TALKS_PLACEHOLDER: ExpertTalk[] = [
  {
    id: "talk-eng-01",
    category: "engineering",
    title: "From High School to NASA: An Aerospace Engineer's Journey",
    speaker: "Dr. Aisha Malik",
    speakerTitle: "Senior Aerospace Engineer",
    organization: "NASA Jet Propulsion Laboratory",
    description: "Dr. Malik walks through her path from a small town high school to working on Mars rover systems at JPL, covering what skills mattered most and what advice she'd give her younger self.",
    duration: "42:18",
    youtubeId: "NX9ZCiAKmO4",
    date: "2026-03-12",
    views: 3241,
    tags: ["aerospace", "NASA", "career path", "women in STEM"],
  },
  {
    id: "talk-eng-02",
    category: "engineering",
    title: "The Engineer's Role in the Clean Energy Transition",
    speaker: "Marcus Chen",
    speakerTitle: "VP of Engineering",
    organization: "Bloom Energy",
    description: "How mechanical and electrical engineers are reshaping global energy infrastructure — and what entry-level engineers can expect working on hydrogen and fuel cell systems.",
    duration: "38:55",
    youtubeId: "VGHkFCTBFRI",
    date: "2026-04-02",
    views: 2187,
    tags: ["clean energy", "hydrogen", "mechanical engineering", "career"],
  },
  {
    id: "talk-biz-01",
    category: "business",
    title: "Breaking Into Private Equity Before 25",
    speaker: "Jordan Okafor",
    speakerTitle: "Associate",
    organization: "KKR",
    description: "Jordan shares the exact path — from undergrad to Goldman Sachs IB analyst to KKR PE associate — and what he would do differently if he were starting today.",
    duration: "44:30",
    youtubeId: "a7YHk9GsIMw",
    date: "2026-03-20",
    views: 4882,
    tags: ["private equity", "investment banking", "finance", "career advice"],
  },
  {
    id: "talk-biz-02",
    category: "business",
    title: "The Truth About Being a Product Manager at Apple",
    speaker: "Priya Nair",
    speakerTitle: "Senior Product Manager",
    organization: "Apple",
    description: "What PMs at Apple actually do, how the role differs from other tech companies, and what the interview process is really like.",
    duration: "36:14",
    youtubeId: "omPhmjpVaSY",
    date: "2026-04-15",
    views: 5610,
    tags: ["product management", "Apple", "tech careers", "PM life"],
  },
  {
    id: "talk-hc-01",
    category: "healthcare",
    title: "Life as an Emergency Medicine Physician",
    speaker: "Dr. Carlos Rivera",
    speakerTitle: "Attending Emergency Physician",
    organization: "Massachusetts General Hospital",
    description: "Real cases, real stress, real reward — Dr. Rivera gives a raw account of what EM physicians face every shift and why he still loves the field after 14 years.",
    duration: "51:08",
    youtubeId: "9bZkp7q19f0",
    date: "2026-02-28",
    views: 7234,
    tags: ["emergency medicine", "physician life", "medical school", "healthcare careers"],
  },
  {
    id: "talk-hc-02",
    category: "healthcare",
    title: "Becoming a Nurse Practitioner: What Schools Don't Tell You",
    speaker: "Jasmine Washington, DNP, APRN",
    speakerTitle: "Family Nurse Practitioner",
    organization: "Community Health Network",
    description: "Scope of practice, prescriptive authority, collaborative agreements, and the financial realities of NP practice — a candid conversation.",
    duration: "39:42",
    youtubeId: "RgKAFK5djSk",
    date: "2026-03-30",
    views: 3901,
    tags: ["nurse practitioner", "NP career", "nursing", "DNP"],
  },
  {
    id: "talk-tech-01",
    category: "technology",
    title: "How I Got Hired as an AI Engineer at Google DeepMind",
    speaker: "Yuki Tanaka",
    speakerTitle: "Research Engineer",
    organization: "Google DeepMind",
    description: "The skills, projects, and interview preparation that led to a research engineer role at one of the world's top AI labs — starting from a computer science background.",
    duration: "46:22",
    youtubeId: "ysEN5RaKOlA",
    date: "2026-04-08",
    views: 9120,
    tags: ["AI engineering", "Google", "machine learning", "career advice"],
  },
  {
    id: "talk-tech-02",
    category: "technology",
    title: "Cybersecurity Red Team: What Ethical Hackers Actually Do",
    speaker: "Devon Park",
    speakerTitle: "Principal Red Team Operator",
    organization: "Microsoft Security",
    description: "How ethical hackers get paid to break into systems, what certifications matter (and which are overhyped), and how to break into offensive security careers.",
    duration: "43:15",
    youtubeId: "eIho2S0ZahI",
    date: "2026-03-18",
    views: 6785,
    tags: ["cybersecurity", "ethical hacking", "red team", "security careers"],
  },
  {
    id: "talk-trades-01",
    category: "trades",
    title: "From Apprentice Electrician to Owning My Own Company",
    speaker: "Ray Dominguez",
    speakerTitle: "Owner",
    organization: "Dominguez Electrical Contractors",
    description: "Ray traces his 22-year journey from IBEW apprentice to master electrician to running a 40-person electrical contracting business — and how he'd recommend starting today.",
    duration: "38:50",
    youtubeId: "c0aGa4pWTKE",
    date: "2026-04-22",
    views: 4430,
    tags: ["electrician", "trade career", "small business", "apprenticeship"],
  },
  {
    id: "talk-law-01",
    category: "law",
    title: "A Public Defender's Perspective on the Criminal Justice System",
    speaker: "Attorney Monique Hargrove",
    speakerTitle: "Chief Public Defender",
    organization: "Cook County Public Defender's Office",
    description: "Why public defense is one of the most intellectually demanding legal careers, what the pay vs. prestige tradeoff looks like, and how to sustain a career in public interest law.",
    duration: "47:03",
    youtubeId: "3d7O7FcVRD8",
    date: "2026-03-10",
    views: 3287,
    tags: ["public defender", "criminal law", "public interest", "law careers"],
  },
  {
    id: "talk-sci-01",
    category: "science",
    title: "Genomics is Changing Medicine — Here's What You Need to Know",
    speaker: "Dr. Lin Wei",
    speakerTitle: "Director of Genomic Medicine",
    organization: "Broad Institute of MIT and Harvard",
    description: "How whole-genome sequencing is reshaping diagnostics, treatment, and careers in life science — and what skills biology students need to stay relevant.",
    duration: "44:11",
    youtubeId: "JtUAAXe_0VI",
    date: "2026-04-18",
    views: 5218,
    tags: ["genomics", "biotechnology", "precision medicine", "science careers"],
  },
  {
    id: "talk-la-01",
    category: "life-advice",
    title: "Financial Freedom Before 30: The High Schooler's Roadmap",
    speaker: "Ramona Esteves",
    speakerTitle: "Certified Financial Planner",
    organization: "Wealth Forward Advisory",
    description: "The specific habits, decisions, and financial moves that position young people to achieve financial independence far earlier than their peers.",
    duration: "41:28",
    youtubeId: "l1Iv7IVFj5A",
    date: "2026-05-01",
    views: 8341,
    tags: ["personal finance", "financial planning", "young adults", "wealth building"],
  },
];

/* ── UPCOMING LIVESTREAMS ── */
function futureDate(daysFromNow: number, hour = 18): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const UPCOMING_LIVESTREAMS: UpcomingLivestream[] = [
  {
    id: "live-001",
    category: "technology",
    title: "Breaking Into Big Tech in 2026: Live Q&A with FAANG Engineers",
    host: "Panel: Maya Singh, James Obi, and Lena Kovacs",
    hostTitle: "Software Engineers",
    organization: "Google · Meta · Amazon",
    description: "Three engineers from FAANG companies answer your questions live — resume reviews, interview tips, compensation negotiation, and honest advice about tech career realities.",
    scheduledAt: futureDate(5, 18),
    durationEstimate: "90 min",
    status: "upcoming",
    tags: ["software engineering", "big tech", "interview prep", "Q&A"],
    maxAttendees: 500,
  },
  {
    id: "live-002",
    category: "healthcare",
    title: "Medical School Admissions: What Adcoms Actually Look For",
    host: "Dr. Patricia Monroe",
    hostTitle: "Former Admissions Director",
    organization: "Yale School of Medicine",
    description: "A former admissions director walks through exactly how medical schools evaluate applicants — from GPA cutoffs to personal statement analysis to secondary essay strategy.",
    scheduledAt: futureDate(8, 17),
    durationEstimate: "75 min",
    status: "upcoming",
    tags: ["medical school", "admissions", "pre-med", "MCAT"],
    maxAttendees: 400,
  },
  {
    id: "live-003",
    category: "engineering",
    title: "Day in the Life: Women in Engineering Panel",
    host: "Sarah Okafor, Dr. Fatima Al-Rashid, Christine Yeoh",
    hostTitle: "Professional Engineers",
    organization: "Tesla · Boeing · Samsung",
    description: "Three engineers across three industries discuss navigating male-dominated fields, career advancement, and how they mentor the next generation of female engineers.",
    scheduledAt: futureDate(12, 16),
    durationEstimate: "60 min",
    status: "upcoming",
    tags: ["women in STEM", "engineering", "diversity", "panel"],
    maxAttendees: 600,
  },
  {
    id: "live-004",
    category: "business",
    title: "Building a $1M Business Before College: Student Founder Stories",
    host: "1WayMirror Team",
    hostTitle: "Moderated Panel",
    organization: "1WayMirror",
    description: "Three student entrepreneurs who built six-figure or seven-figure businesses while in high school share their stories, tools, and what they'd do differently.",
    scheduledAt: futureDate(16, 19),
    durationEstimate: "90 min",
    status: "upcoming",
    tags: ["entrepreneurship", "student founders", "business", "startup"],
    maxAttendees: 800,
  },
  {
    id: "live-005",
    category: "trades",
    title: "Skilled Trades AMA: Electricians, Plumbers & HVAC Techs Answer Everything",
    host: "Ray Dominguez, Carla Reyes, Tim Holt",
    hostTitle: "Master Tradespeople",
    organization: "IBEW · UA · SMACNA",
    description: "Three master tradespeople take unfiltered questions about earnings, career paths, the apprenticeship process, and why they chose skilled trades over college.",
    scheduledAt: futureDate(20, 17),
    durationEstimate: "75 min",
    status: "upcoming",
    tags: ["skilled trades", "electrician", "plumbing", "HVAC", "AMA"],
    maxAttendees: 350,
  },
  {
    id: "live-006",
    category: "law",
    title: "Mock Law School Interview: Get Real-Time Feedback",
    host: "Prof. Michael Stern",
    hostTitle: "Law Admissions Coach",
    organization: "Pre-Law Academy",
    description: "Volunteer for a live mock law school interview with real-time coaching from a former admissions officer. Audience can submit questions and see the coaching process.",
    scheduledAt: futureDate(25, 18),
    durationEstimate: "60 min",
    status: "upcoming",
    tags: ["law school", "admissions interview", "pre-law", "mock interview"],
    maxAttendees: 300,
  },
];

/* ── HELPERS ── */
export function getTalksByCategory(category: FeedCategory): ExpertTalk[] {
  return EXPERT_TALKS.filter(t => t.category === category);
}

export function getUpcomingLivestreams(): UpcomingLivestream[] {
  return UPCOMING_LIVESTREAMS
    .filter(l => l.status !== "ended")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

const REMINDER_KEY = "1waymirror_livestream_reminders_v1";
export function getReminders(): string[] {
  try { return JSON.parse(localStorage.getItem(REMINDER_KEY) ?? "[]") as string[]; } catch { return []; }
}
export function toggleReminder(id: string): string[] {
  const reminders = getReminders();
  const idx = reminders.indexOf(id);
  if (idx !== -1) reminders.splice(idx, 1); else reminders.push(id);
  try { localStorage.setItem(REMINDER_KEY, JSON.stringify(reminders)); } catch { /* noop */ }
  return reminders;
}
