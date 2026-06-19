export type RBuilding = {
  id: string;
  name: string;
  icon: string;
  slug: string | null;
  description: string;
  difficulty: 1 | 2 | 3;
  estimatedTime: string;
  tags: string[];
};

export type RDistrict = {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  glow: string;
  border: string;
  buildings: RBuilding[];
  gridArea: string;
};

export const DISTRICTS: RDistrict[] = [
  {
    id: "engineering",
    name: "Engineering District",
    icon: "⚙️",
    description: "Build the future — structures, circuits, and machines.",
    color: "#1e3a8a",
    glow: "rgba(59,130,246,0.35)",
    border: "#3b82f6",
    gridArea: "eng",
    buildings: [
      { id: "civil-lab", name: "Civil Engineering Lab", icon: "🏗️", slug: "civil-engineering", description: "Design bridges, roads, and urban infrastructure under real constraints.", difficulty: 2, estimatedTime: "8 min", tags: ["civil", "infrastructure"] },
      { id: "mech-studio", name: "Mechanical Design Studio", icon: "⚙️", slug: "mechanical-engineering", description: "Engineer machines, systems, and thermal solutions.", difficulty: 2, estimatedTime: "8 min", tags: ["mechanical", "design"] },
      { id: "elec-center", name: "Electrical Systems Center", icon: "⚡", slug: "electrical-engineering", description: "Build circuits, power grids, and control systems.", difficulty: 3, estimatedTime: "10 min", tags: ["electrical", "power"] },
      { id: "robotics", name: "Robotics Workshop", icon: "🤖", slug: "industrial-engineering", description: "Program and optimize automated industrial systems.", difficulty: 3, estimatedTime: "10 min", tags: ["robotics", "automation"] },
      { id: "aerospace", name: "Aerospace Hangar", icon: "🚀", slug: "aerospace-engineering", description: "Design aircraft, spacecraft, and propulsion systems.", difficulty: 3, estimatedTime: "12 min", tags: ["aerospace", "flight"] },
      { id: "biomedical", name: "Biomedical Lab", icon: "🧬", slug: "biomedical-engineering", description: "Develop medical devices and life-saving technology.", difficulty: 2, estimatedTime: "8 min", tags: ["biomedical", "health"] },
      { id: "env-facility", name: "Environmental Facility", icon: "🌿", slug: "environmental-engineering", description: "Solve pollution, sustainability, and climate challenges.", difficulty: 2, estimatedTime: "8 min", tags: ["environment", "green"] },
      { id: "chem-lab", name: "Chemical Engineering Lab", icon: "🧪", slug: "chemical-engineering", description: "Design chemical processes and safety systems.", difficulty: 3, estimatedTime: "10 min", tags: ["chemical", "process"] },
    ],
  },
  {
    id: "technology",
    name: "Technology District",
    icon: "💻",
    description: "Code, secure, and scale the digital world.",
    color: "#4c1d95",
    glow: "rgba(139,92,246,0.35)",
    border: "#8b5cf6",
    gridArea: "tech",
    buildings: [
      { id: "ai-lab", name: "AI Innovation Lab", icon: "🧠", slug: "artificial-intelligence", description: "Build AI models, train neural networks, deploy intelligent systems.", difficulty: 3, estimatedTime: "12 min", tags: ["AI", "ml"] },
      { id: "cyber-ops", name: "Cybersecurity Operations", icon: "🔒", slug: "cybersecurity", description: "Detect threats, investigate breaches, and harden systems.", difficulty: 3, estimatedTime: "10 min", tags: ["security", "hacking"] },
      { id: "swe-studio", name: "Software Engineering Studio", icon: "💻", slug: "software-engineering", description: "Architect systems, write production code, and ship features.", difficulty: 2, estimatedTime: "8 min", tags: ["software", "code"] },
      { id: "data-room", name: "Data Analytics Room", icon: "📊", slug: "data-analyst", description: "Interpret real datasets, build dashboards, and drive decisions.", difficulty: 2, estimatedTime: "8 min", tags: ["data", "analytics"] },
      { id: "cloud-center", name: "Cloud Infrastructure Center", icon: "☁️", slug: "cloud-devops", description: "Deploy, scale, and monitor cloud-native applications.", difficulty: 3, estimatedTime: "10 min", tags: ["cloud", "devops"] },
      { id: "quantum-lab", name: "Quantum Computing Lab", icon: "⚛️", slug: "quantum-computing", description: "Program quantum algorithms and explore quantum advantage.", difficulty: 3, estimatedTime: "12 min", tags: ["quantum", "physics"] },
      { id: "it-desk", name: "IT Help Desk", icon: "🖥️", slug: "information-technology", description: "Troubleshoot systems, support users, manage networks.", difficulty: 1, estimatedTime: "6 min", tags: ["IT", "support"] },
      { id: "product-studio", name: "Product Design Studio", icon: "🎨", slug: "ux-ui-designer", description: "Design user experiences, wireframes, and interfaces.", difficulty: 2, estimatedTime: "8 min", tags: ["UX", "design"] },
    ],
  },
  {
    id: "business",
    name: "Business District",
    icon: "💼",
    description: "Market, finance, and grow companies from the ground up.",
    color: "#78350f",
    glow: "rgba(245,165,36,0.3)",
    border: "#f5a524",
    gridArea: "biz",
    buildings: [
      { id: "marketing-agency", name: "Marketing Agency", icon: "📣", slug: "marketing", description: "Craft campaigns, build brand strategy, and drive growth.", difficulty: 2, estimatedTime: "8 min", tags: ["marketing", "brand"] },
      { id: "finance-office", name: "Finance & Investing Office", icon: "📈", slug: "finance-investing", description: "Analyze markets, manage portfolios, and evaluate risk.", difficulty: 3, estimatedTime: "10 min", tags: ["finance", "investing"] },
      { id: "accounting-firm", name: "Accounting Firm", icon: "🧾", slug: "accounting", description: "Manage books, prepare taxes, and advise on financial health.", difficulty: 2, estimatedTime: "8 min", tags: ["accounting", "finance"] },
      { id: "startup-studio", name: "Entrepreneurship Studio", icon: "💡", slug: "entrepreneurship", description: "Launch a startup, pitch investors, and build a team.", difficulty: 3, estimatedTime: "12 min", tags: ["startup", "entrepreneur"] },
      { id: "mgmt-room", name: "Management Strategy Room", icon: "🏢", slug: "management", description: "Lead teams, navigate org challenges, and make strategic calls.", difficulty: 2, estimatedTime: "8 min", tags: ["management", "leadership"] },
      { id: "sales-lab", name: "Sales & Negotiation Lab", icon: "🤝", slug: "sales", description: "Close deals, handle objections, and build lasting client relationships.", difficulty: 2, estimatedTime: "8 min", tags: ["sales", "negotiation"] },
    ],
  },
  {
    id: "healthcare",
    name: "Healthcare District",
    icon: "🏥",
    description: "Save lives — medicine, nursing, and clinical care.",
    color: "#064e3b",
    glow: "rgba(16,185,129,0.3)",
    border: "#10b981",
    gridArea: "health",
    buildings: [
      { id: "hospital-sim", name: "Hospital Simulation Center", icon: "🏥", slug: "physician", description: "Diagnose patients, manage emergencies, and lead care teams.", difficulty: 3, estimatedTime: "12 min", tags: ["doctor", "hospital"] },
      { id: "nursing-floor", name: "Nursing Floor", icon: "💉", slug: "nursing", description: "Care for patients, administer treatments, and advocate for health.", difficulty: 2, estimatedTime: "8 min", tags: ["nursing", "care"] },
      { id: "pharmacy-counter", name: "Pharmacy Counter", icon: "💊", slug: "pharmacist", description: "Dispense medication, check interactions, and counsel patients.", difficulty: 2, estimatedTime: "8 min", tags: ["pharmacy", "medication"] },
      { id: "pt-clinic", name: "Physical Therapy Clinic", icon: "🦿", slug: "physical-therapist", description: "Rehabilitate patients and design recovery plans.", difficulty: 2, estimatedTime: "8 min", tags: ["PT", "rehab"] },
      { id: "dental-office", name: "Dental Office", icon: "🦷", slug: "dentist", description: "Diagnose oral conditions and perform procedures.", difficulty: 2, estimatedTime: "8 min", tags: ["dentist", "oral"] },
      { id: "vet-clinic", name: "Veterinary Clinic", icon: "🐾", slug: "veterinarian", description: "Treat animals, run diagnostics, and support pet owners.", difficulty: 2, estimatedTime: "8 min", tags: ["vet", "animals"] },
      { id: "radiology-room", name: "Radiology Imaging Room", icon: "🩻", slug: "radiologist", description: "Read scans, interpret images, and guide clinical decisions.", difficulty: 3, estimatedTime: "10 min", tags: ["radiology", "imaging"] },
      { id: "public-health", name: "Public Health Command", icon: "🌍", slug: "health-services-manager", description: "Manage population health, policy, and health systems.", difficulty: 2, estimatedTime: "8 min", tags: ["public health", "policy"] },
    ],
  },
  {
    id: "trades",
    name: "Trades District",
    icon: "🔧",
    description: "Wire, weld, and build with hands-on skilled trades.",
    color: "#7c2d12",
    glow: "rgba(234,88,12,0.3)",
    border: "#ea580c",
    gridArea: "trades",
    buildings: [
      { id: "electrician-house", name: "Electrician Training House", icon: "⚡", slug: "electrician", description: "Wire buildings, troubleshoot circuits, and ensure electrical safety.", difficulty: 2, estimatedTime: "8 min", tags: ["electrical", "wiring"] },
      { id: "hvac-bldg", name: "HVAC Systems Building", icon: "❄️", slug: "hvac-technician", description: "Install and service heating, ventilation, and AC systems.", difficulty: 2, estimatedTime: "8 min", tags: ["HVAC", "mechanical"] },
      { id: "plumbing-shop", name: "Plumbing Workshop", icon: "🔧", slug: "plumber", description: "Fix leaks, install systems, and ensure clean water flow.", difficulty: 1, estimatedTime: "6 min", tags: ["plumbing", "pipes"] },
      { id: "carpentry", name: "Carpentry Shop", icon: "🪚", slug: "carpenter", description: "Build and finish structures using wood and precision tools.", difficulty: 1, estimatedTime: "6 min", tags: ["carpentry", "building"] },
      { id: "construction-yard", name: "Construction Equipment Yard", icon: "🚜", slug: "construction-equipment-operator", description: "Operate heavy machinery and manage construction sites.", difficulty: 2, estimatedTime: "8 min", tags: ["construction", "equipment"] },
      { id: "solar-roof", name: "Solar Installation Roof", icon: "☀️", slug: "solar-installer", description: "Design and install solar systems on commercial and residential sites.", difficulty: 2, estimatedTime: "8 min", tags: ["solar", "green energy"] },
    ],
  },
  {
    id: "law",
    name: "Law & Public Service",
    icon: "⚖️",
    description: "Argue, defend, and advocate for justice in court.",
    color: "#1e1b4b",
    glow: "rgba(99,102,241,0.3)",
    border: "#6366f1",
    gridArea: "law",
    buildings: [
      { id: "courtroom", name: "Courtroom", icon: "⚖️", slug: "lawyer", description: "Argue cases, cross-examine witnesses, and navigate legal strategy.", difficulty: 3, estimatedTime: "12 min", tags: ["law", "litigation"] },
      { id: "law-office", name: "Law Firm Office", icon: "📋", slug: "lawyer", description: "Draft contracts, advise clients, and prepare for hearings.", difficulty: 2, estimatedTime: "8 min", tags: ["law", "corporate"] },
    ],
  },
  {
    id: "exploratory",
    name: "Exploratory District",
    icon: "🧭",
    description: "Discover what career fits you best — no pressure.",
    color: "#134e4a",
    glow: "rgba(20,184,166,0.3)",
    border: "#14b8a6",
    gridArea: "explore",
    buildings: [
      { id: "career-match", name: "Career Match Center", icon: "🎯", slug: null, description: "Discover careers that match your personality, strengths, and goals.", difficulty: 1, estimatedTime: "5 min", tags: ["exploration", "matching"] },
      { id: "counselor-office", name: "AI Career Counselor", icon: "🤖", slug: null, description: "Get personalized career advice, path planning, and skill gap analysis.", difficulty: 1, estimatedTime: "5 min", tags: ["counseling", "AI"] },
      { id: "interview-theater", name: "Expert Interview Theater", icon: "🎤", slug: null, description: "Watch real-world professionals share their journeys and insights.", difficulty: 1, estimatedTime: "6 min", tags: ["interviews", "stories"] },
      { id: "shadowing", name: "Shadowing Center", icon: "👀", slug: null, description: "Shadow a professional for a day and see the real workplace up close.", difficulty: 1, estimatedTime: "5 min", tags: ["shadowing", "experience"] },
    ],
  },
  {
    id: "entrepreneurship",
    name: "Entrepreneurship District",
    icon: "🚀",
    description: "Launch startups, pitch investors, and disrupt industries.",
    color: "#713f12",
    glow: "rgba(234,179,8,0.3)",
    border: "#eab308",
    gridArea: "entre",
    buildings: [
      { id: "startup-studio-e", name: "Startup Studio", icon: "💡", slug: "entrepreneurship", description: "Build your startup from idea to MVP with real business decisions.", difficulty: 3, estimatedTime: "12 min", tags: ["startup", "MVP"] },
      { id: "pitch-room", name: "Pitch Room", icon: "🎤", slug: "sales", description: "Practice pitching investors with high-stakes pressure and feedback.", difficulty: 3, estimatedTime: "10 min", tags: ["pitch", "investors"] },
      { id: "product-lab", name: "Product Design Lab", icon: "🎨", slug: "ux-ui-designer", description: "Prototype products that solve real user problems.", difficulty: 2, estimatedTime: "8 min", tags: ["product", "design"] },
    ],
  },
  {
    id: "science",
    name: "Science & Research Park",
    icon: "🔭",
    description: "Explore the universe — from quantum particles to ocean depths.",
    color: "#0f3460",
    glow: "rgba(56,189,248,0.3)",
    border: "#38bdf8",
    gridArea: "science",
    buildings: [
      { id: "neurosci-lab", name: "Neuroscience Lab", icon: "🧠", slug: "neuroscientist", description: "Map the brain, study cognition, and unlock the secrets of consciousness.", difficulty: 3, estimatedTime: "12 min", tags: ["neuroscience", "brain"] },
      { id: "chem-research", name: "Chemistry Research Center", icon: "⚗️", slug: "chemist", description: "Synthesize compounds, run experiments, and advance material science.", difficulty: 3, estimatedTime: "10 min", tags: ["chemistry", "research"] },
      { id: "physics-lab", name: "Physics Laboratory", icon: "⚛️", slug: "physicist", description: "Investigate fundamental forces, particles, and the nature of reality.", difficulty: 3, estimatedTime: "12 min", tags: ["physics", "quantum"] },
      { id: "observatory", name: "Astronomy Observatory", icon: "🔭", slug: "astronomer", description: "Observe galaxies, analyze celestial data, and explore cosmology.", difficulty: 2, estimatedTime: "10 min", tags: ["astronomy", "space"] },
      { id: "bio-lab", name: "Biology Research Lab", icon: "🧫", slug: "biologist", description: "Study living systems, run genetic experiments, and advance life sciences.", difficulty: 2, estimatedTime: "8 min", tags: ["biology", "genetics"] },
      { id: "ocean-institute", name: "Oceanography Institute", icon: "🌊", slug: "oceanographer", description: "Explore ocean ecosystems, climate data, and marine biodiversity.", difficulty: 2, estimatedTime: "8 min", tags: ["ocean", "environment"] },
    ],
  },
  {
    id: "life-advice",
    name: "Life & Career Center",
    icon: "🧭",
    description: "Master money, taxes, insurance, and your professional future.",
    color: "#1a3a2a",
    glow: "rgba(74,222,128,0.25)",
    border: "#4ade80",
    gridArea: "life",
    buildings: [
      { id: "tax-office", name: "Tax Advisory Office", icon: "📋", slug: "tax-advisor", description: "Navigate tax filings, deductions, and financial obligations.", difficulty: 2, estimatedTime: "8 min", tags: ["taxes", "finance"] },
      { id: "budget-desk", name: "Budget Counseling Desk", icon: "💰", slug: "budget-counselor", description: "Build spending plans, manage debt, and work toward financial freedom.", difficulty: 1, estimatedTime: "6 min", tags: ["budget", "money"] },
      { id: "invest-hub", name: "Personal Investing Hub", icon: "📈", slug: "personal-investing", description: "Learn index funds, compound growth, and long-term wealth building.", difficulty: 2, estimatedTime: "8 min", tags: ["investing", "wealth"] },
      { id: "insurance-ctr", name: "Insurance Resource Center", icon: "🛡️", slug: "insurance-agent", description: "Understand health, auto, life, and renters insurance coverage.", difficulty: 1, estimatedTime: "6 min", tags: ["insurance", "protection"] },
      { id: "resume-lab", name: "Resume & Career Lab", icon: "📄", slug: "resume-coach", description: "Write compelling resumes, ace interviews, and land your first job.", difficulty: 1, estimatedTime: "6 min", tags: ["resume", "career"] },
    ],
  },
  {
    id: "liveworld",
    name: "LiveWorld",
    icon: "🌐",
    description: "Meet real players exploring careers just like you.",
    color: "#0c4a6e",
    glow: "rgba(14,165,233,0.3)",
    border: "#0ea5e9",
    gridArea: "live",
    buildings: [
      { id: "liveworld-plaza", name: "LiveWorld Plaza", icon: "🌐", slug: null, description: "The social hub of Career City — meet others exploring the same careers.", difficulty: 1, estimatedTime: "Open", tags: ["social", "community"] },
      { id: "friend-lounge", name: "Friend Meet-Up Lounge", icon: "👥", slug: null, description: "Connect with friends, compare career paths, and team up on simulations.", difficulty: 1, estimatedTime: "Open", tags: ["friends", "social"] },
      { id: "group-arena", name: "Group Simulation Arena", icon: "🏟️", slug: null, description: "Complete simulations as a team and earn collaborative XP.", difficulty: 2, estimatedTime: "15 min", tags: ["multiplayer", "team"] },
    ],
  },
];

export type RNPCMentor = {
  id: string;
  name: string;
  title: string;
  district: string;
  color: string;
  avatar: string;
  quote: string;
  category: string;
  recommendedSlug: string | null;
};

export const NPC_MENTORS: RNPCMentor[] = [
  { id: "ava", name: "Ava Chen", title: "AI Engineer", district: "technology", color: "#8b5cf6", avatar: "👩🏻‍💻", quote: "I love solving problems that help millions of people every day.", category: "Technology", recommendedSlug: "artificial-intelligence" },
  { id: "marcus", name: "Dr. Marcus Webb", title: "Civil Engineer", district: "engineering", color: "#3b82f6", avatar: "👨🏾‍🔧", quote: "Every bridge you cross was someone's dream on a drawing board.", category: "Engineering", recommendedSlug: "civil-engineering" },
  { id: "priya", name: "Priya Nair", title: "Nurse Manager", district: "healthcare", color: "#10b981", avatar: "👩🏽‍⚕️", quote: "The best part of nursing is making someone feel less scared.", category: "Healthcare", recommendedSlug: "nursing" },
  { id: "tommy", name: "Tommy Rawls", title: "Master Electrician", district: "trades", color: "#ea580c", avatar: "👨🏿‍🔨", quote: "Trades are in demand and you can start earning fast.", category: "Trades", recommendedSlug: "electrician" },
  { id: "elena", name: "Elena Voss", title: "Startup Founder", district: "entrepreneurship", color: "#eab308", avatar: "👩🏼‍💼", quote: "Failed 3 times before my first exit. Failure is the curriculum.", category: "Business", recommendedSlug: "entrepreneurship" },
  { id: "james", name: "James Okafor", title: "Public Defender", district: "law", color: "#6366f1", avatar: "👨🏾‍⚖️", quote: "The law is a tool — learn to wield it for the people who need it most.", category: "Law", recommendedSlug: "lawyer" },
  { id: "sofia", name: "Sofia Reyes", title: "Data Scientist", district: "technology", color: "#a78bfa", avatar: "👩🏽‍💻", quote: "Data tells stories. My job is to find them and translate them.", category: "Technology", recommendedSlug: "data-analyst" },
  { id: "dev", name: "Dev Patel", title: "Product Manager", district: "business", color: "#f5a524", avatar: "👨🏽‍💼", quote: "Great products come from understanding humans first, technology second.", category: "Business", recommendedSlug: "management" },
];

export const CAREER_QUESTS = [
  { id: "q1", label: "Explore a new district", xp: 100, completed: false },
  { id: "q2", label: "Talk to 2 career mentors", xp: 100, completed: false },
  { id: "q3", label: "Complete a simulation", xp: 200, completed: false },
  { id: "q4", label: "Visit the LiveWorld", xp: 150, completed: false },
  { id: "q5", label: "Earn 3 new badges", xp: 150, completed: false },
];
