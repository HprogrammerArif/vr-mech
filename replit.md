# 1WayMirror World

AI-powered career exploration platform targeting high school students and parents.
Professional marketing landing page at `/` (no auth required), full simulation platform behind login.

Branding: dark navy (`hsl(217 60% 6%)`), gold (`#f5a524`), orange (`#ea580c`), blue (`#1d4ed8`).

## Stack
- pnpm monorepo
- React + Vite frontend (`artifacts/mech-vr-lab`, port 22303, basePath `/`)
- Express 5 API server (`artifacts/api-server`, port 8080, basePath `/api`)
- Drizzle ORM + PostgreSQL (`lib/db`)
- OpenAPI + Orval codegen (`lib/api-spec`, `lib/api-client-react`, `lib/api-zod`)
- OpenAI via Replit AI Integration (`AI_INTEGRATIONS_OPENAI_BASE_URL` / `AI_INTEGRATIONS_OPENAI_API_KEY`)
- 3D / WebXR: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/xr`

## Routes
| Path | Description |
|------|-------------|
| `/` | Public marketing landing page (no HeaderBar) |
| `/login` | Sign in / sign up page |
| `/my-profile` | User profile — school, GPA, SAT, career interest, avatar, badges |
| `/replitopolis` | Main dashboard (tabs: Home, City, Simulations, Badges, Feed, Videos, Talks, Dario, Journal, Settings) |
| `/city` | 3D walkable career city (WebXR) |
| `/profile-setup` | Avatar/name setup for 3D city |
| `/dario` | AI career counselor — chat, career compare, career roadmap |
| `/sim/:slug` | Individual simulation page |

## FULLSCREEN_ROUTES (no HeaderBar)
`/`, `/city`, `/replitopolis`, `/profile-setup`, `/login`, `/my-profile`, `/dario`

## Career Catalog (`artifacts/api-server/src/lib/simulations.ts`)
**85 careers across 9 categories:**
- `engineering` (9): mechanical, civil, electrical, chemical, aerospace, biomedical, industrial, environmental, software
- `business` (10): entrepreneurship, marketing, finance, accounting, management, sales, stock-trader, crypto-analyst, economist, investment-banker
- `healthcare` (11): nursing, physician, PA, pharmacist, PT, radiologist, dentist, vet, psychologist, SLP, health-services-manager
- `trades` (10): electrician, plumber, hvac, carpenter, construction-equipment-operator, solar-installer, wind-turbine-tech, industrial-maintenance, culinary-chef, esthetician
- `technology` (10): AI, cybersecurity, IT, data-analyst, quantum-computing, saas-product-builder, ux-ui-designer, cloud-devops, biocomputing, fusion-engineer
- `law` (8): lawyer, defense-lawyer, prosecutor, police-officer, corporate-lawyer, judge, detective, federal-agent
- `science` (9): neuroscientist, chemist, physicist, astronomer, mathematician, biologist, geologist, quantum-researcher, oceanographer
- `life-advice` (8): tax-advisor, budget-counselor, personal-investing, insurance-agent, retirement-planner, resume-coach, networking-coach, career-counselor
- `creative-design` (10): architect, fashion-designer, art-director, gallery-curator, interior-designer, urban-planner, social-media-manager, brand-strategist, graphic-designer, film-video-producer

## Badge System (`artifacts/mech-vr-lab/src/lib/badges.ts`)
**71 total badges:**
- 21 Achievement badges (first sim, XP milestones, streaks, all 8 category badges, world explorer, 6 Dario badges)
- 50 Level badges (Level 1 "Rookie" → Level 50 "LEGEND")
- `computeEarnedBadgeIds()` accepts optional Dario params: `darioSessions`, `darioXp`, `darioRoadmapGenerated`, `darioCompareUsed`
- Dario badges: `first-dario`, `dario-3`, `dario-10`, `dario-roadmap`, `dario-compare`, `dario-xp-50`

## Auth & Profile (`artifacts/mech-vr-lab/src/lib/`)
- `auth.ts` — `getAuthUser()`, `signIn()`, `signOut()` via localStorage key `1waymirror_auth_v1`
- `profile.ts` — `PlayerProfile` type includes: `learnerId`, `name`, `email`, `careerInterest`, `avatarId`, `school`, `graduationYear`, `gpa`, `sat`
- `learner.ts` — `getLearnerId()` reads from profile or generates UUID

## Landing Page Sections (`artifacts/mech-vr-lab/src/pages/HomePage.tsx`)
1. **NavBar** — sticky, transparent-to-dark-on-scroll, mobile hamburger menu
2. **Hero** — animated particles, gold gradient headline, stats bar, CTAs → /login
3. **About** — "Track Your Growth. Compete. Improve." white section
4. **Features** — 6-feature grid on blue (#1d4ed8) background
5. **How It Works** — 4-step process, white background
6. **Technology** — AI engine, 3D/WebXR, progress tracking — dark navy
7. **Experts** — Lenroy Jones, Derrick Franco, Christopher Penny — light bg
8. **Pricing** — 4 plans: Starter $19.99 / Explorer $49.99 / Builder $99.99 / Accelerator $249.99
9. **CTA Banner** — gradient navy/blue with gold CTA button
10. **Contact** — split layout with form (name, email, phone, message)
11. **Footer** — links, newsletter signup, copyright

## Pricing Plans
- Annual billing toggle (17% savings) in the Pricing section UI
- **Starter** $19.99/mo (no trial, **NO Dario AI**, 2 live streams/mo, annual $16.59/mo billed $199/yr)
- **Explorer** $49.99/mo (7-day trial, **200 Dario credits/mo**, 7 live streams, compare+roadmap, annual $41.49/mo billed $499/yr)
- **Builder** $99.99/mo MOST POPULAR (7-day trial, **700 Dario credits/mo**, all streams, personality+report+opportunities+action-items, annual $82.99/mo billed $995/yr)
- **Accelerator** $199.99/mo (7-day trial, **1,200 Dario credits/mo**, 1-on-1 advisor, annual $165.99/mo billed $1,991/yr)

## Plan Feature Gates (`artifacts/mech-vr-lab/src/lib/profile.ts`)
- `PLAN_DARIO_CREDITS`: starter→0, explorer→200, builder→700, accelerator→1200
- `hasPlanFeature(plan, feature)` — gates individual features by plan
- Dario AI (chat/compare/roadmap): Explorer+ only (starter excluded)
- Personality Insights, Career Report, Opportunities, Action Items: Builder+ only
- 1-on-1 advisor: Accelerator only
- Profile sharing: all plans including Starter

## Leads Capture
- Contact form submissions → `1waymirror_contact_v1` (localStorage)
- Newsletter signups → `1waymirror_newsletter_v1` (localStorage)
- Admin "Leads" tab reads both keys and displays them in tables with reply-via-email links
- Dario XP → `1waymirror_dario_xp_v1` (localStorage, awarded on session end, min 5 / max 50 XP per session)
- Dario compare used flag → `1waymirror_dario_compare_used_v1` (localStorage)

## Dario AI Counselor (`/dario`)
- Left sidebar: sessions list, nav (Chat/Compare/Roadmap), voice input toggle, back to dashboard
- Chat view: AI conversation with Dario → session stored to `1waymirror_dario_sessions_v1`
- Compare view: two career inputs → POST `/api/dario/compare` → side-by-side comparison table
- Roadmap view: 5-phase timeline (0-3mo → 3-5yr) → stored to `1waymirror_career_roadmap_v1`
- Session end: POST `/api/dario/roadmap` to generate milestones from conversation
- Voice input: Web Speech API (SpeechRecognition), gracefully degraded
- Dashboard widget on `/replitopolis` home tab showing session count + roadmap progress
- API routes: `artifacts/api-server/src/routes/dario.ts` (chat / roadmap / compare)
- Data helpers: `artifacts/mech-vr-lab/src/lib/darioData.ts`

## Livestreams
- `UpcomingLivestream` interface supports `zoomLink?` and `zoomPassword?`
- Zoom info displayed in `LivestreamCard` on TalksPage when present
- Admin schedule form + LivestreamEditModal both include Zoom Link/Password fields

## Key Files
- `artifacts/mech-vr-lab/src/pages/HomePage.tsx` — landing page
- `artifacts/mech-vr-lab/src/pages/LoginPage.tsx` — sign in / sign up
- `artifacts/mech-vr-lab/src/pages/UserProfilePage.tsx` — profile editing + badge views
- `artifacts/mech-vr-lab/src/pages/ReplitopolisPage.tsx` — dashboard
- `artifacts/mech-vr-lab/src/pages/DarioPage.tsx` — AI career counselor
- `artifacts/mech-vr-lab/src/lib/badges.ts` — all 65 badge definitions + computeEarnedBadgeIds
- `artifacts/mech-vr-lab/src/lib/auth.ts` — localStorage auth
- `artifacts/mech-vr-lab/src/lib/profile.ts` — PlayerProfile type + save/load
- `artifacts/mech-vr-lab/src/lib/darioData.ts` — Dario session/roadmap types + localStorage helpers
- `artifacts/api-server/src/lib/simulations.ts` — career catalog
- `artifacts/api-server/src/routes/dario.ts` — Dario AI endpoints
- `lib/api-spec/openapi.yaml` — API contract
- `artifacts/mech-vr-lab/src/App.tsx` — routing + FULLSCREEN_ROUTES

## Stripe / Payments
Not yet integrated. Plans are displayed on the landing page. Stripe billing to be connected later.

## SEO Notes
- Landing page headline targets: "AI-powered career exploration for high school students"
- Sub-keywords: college career readiness, career simulations, high school career guidance, explore careers before college
- `<title>` tag set in HomePage for the root route
