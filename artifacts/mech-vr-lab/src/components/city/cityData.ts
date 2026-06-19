export type BuildingShape = "box" | "cylinder" | "octagon" | "pyramid" | "stepped" | "dome";

export type BuildingDef = {
  id: string;
  label: string;
  simulationSlug: string | null;
  pos: [number, number];
  size: [number, number, number];
  color: string;
  emissive: string;
  floors: number;
  shape?: BuildingShape;
};

export type DistrictDef = {
  id: string;
  label: string;
  category: string;
  color: string;
  signColor: string;
  center: [number, number];
  radius: number;
  buildings: BuildingDef[];
};

export type NPCDef = {
  id: string;
  name: string;
  role: "professional" | "mentor" | "student" | "recruiter" | "counselor" | "alumni";
  category: string;
  color: string;
  patrol: [number, number][];
  tagline: string;
};

export const DISTRICTS: DistrictDef[] = [
  {
    id: "engineering",
    label: "Engineering Corridor",
    category: "Engineering",
    color: "#1e3a8a",
    signColor: "#60a5fa",
    center: [-85, -60],
    radius: 38,
    buildings: [
      { id: "civil", label: "Civil Engineering", simulationSlug: "civil-engineering", pos: [-100, -80], size: [12, 20, 12], color: "#1e3a8a", emissive: "#1d4ed8", floors: 5 },
      { id: "mechanical", label: "Mechanical Eng.", simulationSlug: "mechanical-engineering", pos: [-80, -85], size: [11, 18, 11], color: "#1e40af", emissive: "#2563eb", floors: 4 },
      { id: "electrical", label: "Electrical Eng.", simulationSlug: "electrical-engineering", pos: [-65, -75], size: [10, 22, 10], color: "#1d4ed8", emissive: "#3b82f6", floors: 6, shape: "octagon" },
      { id: "software-eng", label: "Software Eng.", simulationSlug: "software-engineering", pos: [-100, -55], size: [12, 16, 10], color: "#1e3a8a", emissive: "#60a5fa", floors: 4 },
      { id: "chemical", label: "Chemical Eng.", simulationSlug: "chemical-engineering", pos: [-78, -55], size: [10, 14, 10], color: "#1e40af", emissive: "#93c5fd", floors: 3 },
      { id: "aerospace", label: "Aerospace Eng.", simulationSlug: "aerospace-engineering", pos: [-65, -58], size: [13, 26, 11], color: "#172554", emissive: "#1d4ed8", floors: 7, shape: "stepped" },
      { id: "environmental-eng", label: "Environmental Eng.", simulationSlug: "environmental-engineering", pos: [-98, -40], size: [10, 12, 10], color: "#1e3a8a", emissive: "#22d3ee", floors: 3 },
      { id: "biomedical", label: "Biomedical Eng.", simulationSlug: "biomedical-engineering", pos: [-78, -38], size: [11, 15, 11], color: "#1d4ed8", emissive: "#67e8f9", floors: 4 },
      { id: "construction", label: "Construction Zone", simulationSlug: "construction-equipment-operator", pos: [-63, -42], size: [14, 10, 12], color: "#78350f", emissive: "#f59e0b", floors: 2 },
    ],
  },
  {
    id: "technology",
    label: "Technology District",
    category: "Technology",
    color: "#4c1d95",
    signColor: "#a78bfa",
    center: [0, -90],
    radius: 30,
    buildings: [
      { id: "software-dev", label: "Software Development", simulationSlug: "software-engineering", pos: [-15, -100], size: [13, 28, 13], color: "#4c1d95", emissive: "#8b5cf6", floors: 7, shape: "stepped" },
      { id: "data-center", label: "Data Center", simulationSlug: "data-analyst", pos: [10, -95], size: [14, 18, 16], color: "#3b0764", emissive: "#6d28d9", floors: 4 },
      { id: "ai-lab", label: "AI Research Lab", simulationSlug: "artificial-intelligence", pos: [-5, -80], size: [12, 24, 12], color: "#5b21b6", emissive: "#c4b5fd", floors: 6, shape: "cylinder" },
      { id: "cybersecurity", label: "Cybersecurity", simulationSlug: "cybersecurity", pos: [15, -80], size: [10, 20, 10], color: "#4c1d95", emissive: "#7c3aed", floors: 5, shape: "octagon" },
    ],
  },
  {
    id: "healthcare",
    label: "Healthcare District",
    category: "Healthcare",
    color: "#064e3b",
    signColor: "#34d399",
    center: [85, -60],
    radius: 30,
    buildings: [
      { id: "hospital", label: "General Hospital", simulationSlug: "physician", pos: [90, -80], size: [18, 22, 18], color: "#064e3b", emissive: "#10b981", floors: 6, shape: "cylinder" },
      { id: "research-lab", label: "Medical Research", simulationSlug: "physician-assistant", pos: [70, -70], size: [12, 16, 12], color: "#065f46", emissive: "#34d399", floors: 4 },
      { id: "pharmacy", label: "Pharmacy School", simulationSlug: "pharmacist", pos: [100, -58], size: [10, 14, 10], color: "#047857", emissive: "#6ee7b7", floors: 3 },
      { id: "nursing", label: "Nursing Center", simulationSlug: "nursing", pos: [75, -52], size: [12, 18, 12], color: "#064e3b", emissive: "#a7f3d0", floors: 5, shape: "dome" },
    ],
  },
  {
    id: "business",
    label: "Business District",
    category: "Business",
    color: "#78350f",
    signColor: "#fbbf24",
    center: [85, 60],
    radius: 30,
    buildings: [
      { id: "corporate-tower", label: "Corporate Tower", simulationSlug: "management", pos: [95, 55], size: [14, 40, 14], color: "#451a03", emissive: "#f59e0b", floors: 10, shape: "stepped" },
      { id: "startup-hub", label: "Startup Hub", simulationSlug: "entrepreneurship", pos: [72, 60], size: [12, 18, 12], color: "#78350f", emissive: "#fbbf24", floors: 4 },
      { id: "finance", label: "Finance Center", simulationSlug: "finance-investing", pos: [90, 75], size: [13, 24, 13], color: "#92400e", emissive: "#d97706", floors: 6, shape: "octagon" },
      { id: "marketing", label: "Marketing Agency", simulationSlug: "marketing", pos: [73, 45], size: [10, 14, 10], color: "#b45309", emissive: "#fcd34d", floors: 3 },
    ],
  },
  {
    id: "law",
    label: "Legal District",
    category: "Law",
    color: "#1e1b4b",
    signColor: "#818cf8",
    center: [0, 95],
    radius: 30,
    buildings: [
      { id: "courthouse", label: "Courthouse", simulationSlug: "judge", pos: [0, 105], size: [20, 24, 18], color: "#1e1b4b", emissive: "#6366f1", floors: 6, shape: "stepped" },
      { id: "law-school", label: "Law School", simulationSlug: "defense-lawyer", pos: [-20, 88], size: [14, 18, 14], color: "#312e81", emissive: "#818cf8", floors: 4 },
      { id: "firm", label: "Law Firm", simulationSlug: "lawyer", pos: [20, 88], size: [12, 20, 12], color: "#1e1b4b", emissive: "#a5b4fc", floors: 5 },
    ],
  },
  {
    id: "trades",
    label: "Trades District",
    category: "Trades",
    color: "#7c2d12",
    signColor: "#fb923c",
    center: [-85, 60],
    radius: 30,
    buildings: [
      { id: "workshop", label: "Master Workshop", simulationSlug: "electrician", pos: [-90, 55], size: [16, 12, 16], color: "#7c2d12", emissive: "#ea580c", floors: 2 },
      { id: "plumbing", label: "Plumbing School", simulationSlug: "plumber", pos: [-70, 65], size: [12, 10, 12], color: "#9a3412", emissive: "#f97316", floors: 2 },
      { id: "hvac", label: "HVAC Training", simulationSlug: "hvac-technician", pos: [-95, 72], size: [14, 8, 14], color: "#78350f", emissive: "#fb923c", floors: 1 },
      { id: "auto", label: "Auto Shop", simulationSlug: "carpenter", pos: [-72, 48], size: [14, 9, 12], color: "#7c2d12", emissive: "#fdba74", floors: 1 },
    ],
  },
  {
    id: "creative-design",
    label: "Creative & Design Quarter",
    category: "Creative & Design",
    color: "#4a1942",
    signColor: "#e879f9",
    center: [45, 0],
    radius: 28,
    buildings: [
      { id: "architecture-studio", label: "Architecture Studio", simulationSlug: "architect", pos: [52, -16], size: [12, 22, 12], color: "#4a1942", emissive: "#e879f9", floors: 6, shape: "pyramid" },
      { id: "fashion-house", label: "Fashion Design House", simulationSlug: "fashion-designer", pos: [37, -18], size: [10, 20, 10], color: "#6b21a8", emissive: "#d946ef", floors: 5 },
      { id: "art-gallery", label: "Art Gallery & Museum", simulationSlug: "gallery-curator", pos: [58, 6], size: [14, 14, 14], color: "#4a1942", emissive: "#c026d3", floors: 3, shape: "dome" },
      { id: "branding-agency", label: "Branding Agency", simulationSlug: "brand-strategist", pos: [37, 18], size: [11, 18, 11], color: "#581c87", emissive: "#a855f7", floors: 4 },
      { id: "media-studio", label: "Media Production Studio", simulationSlug: "film-video-producer", pos: [50, 22], size: [13, 12, 13], color: "#4a1942", emissive: "#f0abfc", floors: 3 },
    ],
  },
  {
    id: "science",
    label: "Science & Research Park",
    category: "Science",
    color: "#0c2a4a",
    signColor: "#22d3ee",
    center: [-45, 0],
    radius: 28,
    buildings: [
      { id: "neuroscience-lab", label: "Neuroscience Lab", simulationSlug: "neuroscientist", pos: [-50, -12], size: [12, 20, 12], color: "#0c2a4a", emissive: "#22d3ee", floors: 5, shape: "cylinder" },
      { id: "physics-center", label: "Physics Research Center", simulationSlug: "physicist", pos: [-38, -16], size: [13, 16, 13], color: "#0a3352", emissive: "#38bdf8", floors: 4, shape: "octagon" },
      { id: "chemistry-dept", label: "Chemistry Department", simulationSlug: "chemist", pos: [-52, 6], size: [11, 14, 11], color: "#0e2244", emissive: "#67e8f9", floors: 3 },
      { id: "observatory", label: "Astronomy Observatory", simulationSlug: "astronomer", pos: [-38, 14], size: [12, 16, 12], color: "#071830", emissive: "#7dd3fc", floors: 4, shape: "dome" },
      { id: "marine-bio", label: "Marine Biology Institute", simulationSlug: "biologist", pos: [-56, 18], size: [10, 12, 10], color: "#0c3040", emissive: "#0ea5e9", floors: 3 },
      { id: "quantum-lab", label: "Quantum Computing Lab", simulationSlug: "quantum-computing", pos: [-40, -20], size: [11, 18, 11], color: "#0c2a4a", emissive: "#a5f3fc", floors: 4, shape: "pyramid" },
    ],
  },
  {
    id: "life-advice",
    label: "Life & Career Center",
    category: "Life & Career",
    color: "#064e3b",
    signColor: "#4ade80",
    center: [0, 40],
    radius: 20,
    buildings: [
      { id: "career-center", label: "Career Counseling Center", simulationSlug: "career-counselor", pos: [-12, 34], size: [10, 16, 10], color: "#064e3b", emissive: "#4ade80", floors: 4, shape: "stepped" },
      { id: "financial-office", label: "Financial Planning Office", simulationSlug: "budget-counselor", pos: [12, 36], size: [9, 14, 9], color: "#065f46", emissive: "#86efac", floors: 3 },
      { id: "resume-center", label: "Resume & Career Studio", simulationSlug: "resume-coach", pos: [-16, 44], size: [11, 12, 11], color: "#047857", emissive: "#6ee7b7", floors: 3, shape: "cylinder" },
      { id: "tax-clinic", label: "Tax & Budget Clinic", simulationSlug: "tax-advisor", pos: [-20, 50], size: [8, 10, 8], color: "#064e3b", emissive: "#34d399", floors: 2 },
      { id: "networking-hub", label: "Networking Hub", simulationSlug: "networking-coach", pos: [18, 50], size: [9, 12, 9], color: "#065f46", emissive: "#a7f3d0", floors: 3, shape: "octagon" },
    ],
  },
];

export const NPCS: NPCDef[] = [
  { id: "npc1", name: "Dr. Marcus Webb", role: "professional", category: "Engineering", color: "#60a5fa", patrol: [[-90, -65], [-75, -50], [-90, -45]], tagline: "Civil engineer, 15 yrs exp" },
  { id: "npc2", name: "Aisha Okonkwo", role: "mentor", category: "Technology", color: "#a78bfa", patrol: [[-5, -88], [10, -78], [0, -95]], tagline: "Senior SWE at a Fortune 500" },
  { id: "npc3", name: "Prof. Chen Liu", role: "counselor", category: "Healthcare", color: "#34d399", patrol: [[80, -70], [95, -60], [75, -55]], tagline: "Pre-med advisor" },
  { id: "npc4", name: "Jordan Pierce", role: "recruiter", category: "Business", color: "#fbbf24", patrol: [[80, 55], [95, 65], [75, 70]], tagline: "Talent acquisition, Big 4 firm" },
  { id: "npc5", name: "Esperanza Vega", role: "alumni", category: "Law", color: "#818cf8", patrol: [[-10, 95], [10, 88], [0, 100]], tagline: "Public defender, 8 yrs" },
  { id: "npc6", name: "Tommy Rawls", role: "student", category: "Trades", color: "#fb923c", patrol: [[-85, 55], [-70, 60], [-80, 70]], tagline: "2nd year electrician apprentice" },
  { id: "npc7", name: "Dr. Sara Ndiaye", role: "professional", category: "Healthcare", color: "#6ee7b7", patrol: [[70, -60], [85, -75], [95, -65]], tagline: "ER physician" },
  { id: "npc8", name: "Kenji Murakami", role: "mentor", category: "Technology", color: "#c4b5fd", patrol: [[5, -82], [-12, -90], [8, -95]], tagline: "Data scientist, startup founder" },
  { id: "npc9", name: "Olivia Stern", role: "recruiter", category: "Engineering", color: "#93c5fd", patrol: [[-70, -55], [-85, -70], [-95, -60]], tagline: "Recruiter at top aerospace firm" },
  { id: "npc10", name: "Devante Brooks", role: "alumni", category: "Business", color: "#fcd34d", patrol: [[70, 70], [90, 80], [85, 55]], tagline: "Founded 3 startups since grad" },
  { id: "npc11", name: "Ingrid Holm", role: "counselor", category: "Law", color: "#a5b4fc", patrol: [[-15, 90], [15, 100], [5, 85]], tagline: "Career counselor specializing in legal" },
  { id: "npc12", name: "Carlos Fuentes", role: "student", category: "Trades", color: "#fdba74", patrol: [[-95, 65], [-75, 55], [-80, 75]], tagline: "HVAC apprentice, yr 1" },
  { id: "npc13", name: "Dr. Priya Sharma", role: "professional", category: "Science", color: "#22d3ee", patrol: [[-48, -8], [-35, -15], [-55, 5]], tagline: "Neuroscientist, research lead" },
  { id: "npc14", name: "Leo Nakamura", role: "counselor", category: "Life & Career", color: "#4ade80", patrol: [[-8, 36], [8, 44], [0, 50]], tagline: "Career coach & financial planner" },
];

/* ── Filler Bots (20 ambient bots with career facts) ── */
export type FillerBotDef = {
  id: string;
  name: string;
  color: string;
  patrol: [number, number][];
  district: string;
  careerFact: string;
};

export const FILLER_BOTS: FillerBotDef[] = [
  {
    id: "fbot01", name: "Alex M.", color: "#60a5fa",
    patrol: [[-92, -70], [-78, -62]],
    district: "Engineering",
    careerFact: "Civil engineers design bridges that last 100+ years. Average starting salary: $65K/yr — and the field is always in demand.",
  },
  {
    id: "fbot02", name: "Sam K.", color: "#3b82f6",
    patrol: [[-70, -75], [-62, -58]],
    district: "Engineering",
    careerFact: "Electrical engineers earn a $98K median salary. They power everything from your phone to spacecraft — and the grid of the future.",
  },
  {
    id: "fbot03", name: "Riley T.", color: "#93c5fd",
    patrol: [[-100, -48], [-80, -40]],
    district: "Engineering",
    careerFact: "Aerospace engineers work on drones, satellites, and the Mars rover. It takes dedication — but you literally shape the future of space.",
  },
  {
    id: "fbot04", name: "Jordan C.", color: "#a78bfa",
    patrol: [[-8, -95], [8, -83]],
    district: "Technology",
    careerFact: "The average software developer earns $120K/yr. Many companies care more about your skills than your degree — start building things now.",
  },
  {
    id: "fbot05", name: "Morgan A.", color: "#8b5cf6",
    patrol: [[12, -92], [18, -76]],
    district: "Technology",
    careerFact: "Data scientists are one of the top 5 fastest-growing careers — demand is up 35% and isn't slowing down. Python + statistics = gold.",
  },
  {
    id: "fbot06", name: "Quinn H.", color: "#c4b5fd",
    patrol: [[-15, -85], [5, -95]],
    district: "Technology",
    careerFact: "There are 3.5 million unfilled cybersecurity jobs globally. Every organization in every industry needs a security expert — that could be you.",
  },
  {
    id: "fbot07", name: "Casey N.", color: "#34d399",
    patrol: [[80, -75], [92, -60]],
    district: "Healthcare",
    careerFact: "Nurses are the backbone of healthcare. RN median salary: $81K — with massive demand and hundreds of specializations to explore.",
  },
  {
    id: "fbot08", name: "Dana R.", color: "#6ee7b7",
    patrol: [[72, -60], [88, -72]],
    district: "Healthcare",
    careerFact: "Physician Assistants earn a $126K median salary with only 6-7 years of school. It's one of the best value paths in medicine.",
  },
  {
    id: "fbot09", name: "Avery L.", color: "#10b981",
    patrol: [[98, -58], [78, -65]],
    district: "Healthcare",
    careerFact: "Pharmacists earn $128K/yr median. Many open their own pharmacy businesses and serve as trusted health advisors in their communities.",
  },
  {
    id: "fbot10", name: "Taylor B.", color: "#fbbf24",
    patrol: [[82, 62], [95, 72]],
    district: "Business",
    careerFact: "Marketing managers earn $135K median salary. It's one of the best careers for creative people who also love data and strategy.",
  },
  {
    id: "fbot11", name: "Blake M.", color: "#f59e0b",
    patrol: [[88, 48], [100, 58]],
    district: "Business",
    careerFact: "90% of startups fail — but the 10% who succeed? They build their dream life. Entrepreneurship is a skill you can learn. Start now.",
  },
  {
    id: "fbot12", name: "Logan J.", color: "#fcd34d",
    patrol: [[72, 55], [85, 45]],
    district: "Business",
    careerFact: "Finance analysts at top firms earn $85K–$200K+ with bonuses. It's math + storytelling — you explain the numbers in a way that drives decisions.",
  },
  {
    id: "fbot13", name: "Reese P.", color: "#818cf8",
    patrol: [[-12, 98], [8, 90]],
    district: "Law",
    careerFact: "Lawyers start at $80K and top earners make $300K+. The path: 4 yrs college + 3 yrs law school. Specializations range from criminal to space law.",
  },
  {
    id: "fbot14", name: "Sage W.", color: "#a5b4fc",
    patrol: [[15, 88], [-5, 100]],
    district: "Law",
    careerFact: "Detectives earn $83K median salary. Every day is different — solving real-world mysteries using logic, interviews, and investigation.",
  },
  {
    id: "fbot15", name: "River H.", color: "#fb923c",
    patrol: [[-88, 62], [-72, 55]],
    district: "Trades",
    careerFact: "Master electricians earn $90K–$150K. Zero student loan debt via apprenticeship programs. Skilled trades are the most recession-proof careers.",
  },
  {
    id: "fbot16", name: "Sky D.", color: "#f97316",
    patrol: [[-95, 75], [-80, 65]],
    district: "Trades",
    careerFact: "HVAC technicians are in massive demand — the clean energy transition needs 115,000 more workers by 2030. Learn it once, work everywhere.",
  },
  {
    id: "fbot17", name: "Drew F.", color: "#fdba74",
    patrol: [[-72, 48], [-88, 58]],
    district: "Trades",
    careerFact: "Plumbers average $59K/yr — top plumbers earn $100K+. Always in demand, always recession-proof. You'll never struggle to find work.",
  },
  {
    id: "fbot18", name: "Scout V.", color: "#22d3ee",
    patrol: [[15, -20], [-10, -5]],
    district: "Central",
    careerFact: "The average American changes careers 5–7 times in their lifetime. Exploring early means less regret later. You're in exactly the right place!",
  },
  {
    id: "fbot19", name: "Finley O.", color: "#4ade80",
    patrol: [[-18, 12], [8, -8]],
    district: "Central",
    careerFact: "Research shows students who explore careers early earn 15% more in their first job. Career exploration isn't optional — it's a competitive edge.",
  },
  {
    id: "fbot20", name: "Emery G.", color: "#ec4899",
    patrol: [[12, 18], [-5, 8]],
    district: "Central",
    careerFact: "Passion + plan = a career you love. 1WayMirror was built so you can explore 85+ real careers before committing to any one path. Take your time.",
  },
  {
    id: "fbot21", name: "Zoe C.", color: "#22d3ee",
    patrol: [[-48, -18], [-35, -5]],
    district: "Science",
    careerFact: "Neuroscientists earn $100K+ median. Brain research is one of the last great frontiers — new discoveries are made every single year.",
  },
  {
    id: "fbot22", name: "Orion B.", color: "#0ea5e9",
    patrol: [[-55, 8], [-42, 18]],
    district: "Science",
    careerFact: "Physicists work on everything from quantum computers to particle accelerators. Many careers in finance, tech, and aerospace actively recruit physics grads.",
  },
  {
    id: "fbot23", name: "Mara V.", color: "#4ade80",
    patrol: [[-5, 36], [8, 48]],
    district: "Life & Career",
    careerFact: "Personal finance advisors help families build wealth. Knowing how money works early gives you a lifetime advantage most adults never had.",
  },
];
