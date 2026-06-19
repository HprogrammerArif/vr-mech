# Replitopolis → Pittsburgh Redesign: Replit Agent Prompts

You'll find two prompts below:

1. **MASTER PROMPT** — paste this first into Replit Agent. It's structured to do everything in one shot.
2. **PHASED FALLBACK** — if the master prompt times out, gets confused, or only does part of the job, use these phases one at a time.

Both start by telling the Agent to **inspect your codebase first** so it doesn't guess your stack wrong.

---

## ⚡ MASTER PROMPT (paste into Replit Agent)

```
You are upgrading an existing Replit project called "Replitopolis" — a 3D career exploration city for students. DO NOT rebuild from scratch. DO NOT delete features. This is a strict ADDITIVE / VISUAL REFACTOR job.

═══════════════════════════════════════════════
PHASE 0 — INSPECT BEFORE YOU TOUCH ANYTHING
═══════════════════════════════════════════════

Before writing a single line of code, do the following and PRINT WHAT YOU FIND:

1. List the project structure (top 3 directory levels).
2. Identify the tech stack:
   - Is this Three.js, React Three Fiber, Babylon.js, plain HTML/Canvas, or something else?
   - What framework is the dashboard? (React, Next, plain HTML, etc.)
   - What's the package manager? (npm, pnpm, bun)
3. Locate and report the file paths for:
   a. The 3D city scene / world rendering
   b. The dashboard / home page
   c. The avatar / movement / WASD controls
   d. District definitions (Engineering, Tech, Business, Healthcare, Trades, Law/Public Service, Exploratory, LiveWorld, Career Hub)
   e. Building / NPC click handlers
   f. Simulation routing
   g. Any existing user/profile state
4. Confirm there is currently NO sign-in system (or report what's there).

Print a short report of all this BEFORE making any changes. I want to see what you found.

═══════════════════════════════════════════════
PHASE 1 — HARD CONSTRAINTS (don't break these)
═══════════════════════════════════════════════

KEEP working exactly as they do today:
- All routes
- WASD/arrow movement and right-drag orbit
- District logic and navigation
- Building click → simulation flow
- NPC mentor click → dialogue flow
- LiveWorld / online play (3 online indicator)
- City map minimap (bottom right)
- Bulletin board
- Dashboard navigation
- Unlimited simulation access

DO NOT:
- Rebuild the app from scratch
- Delete any existing components
- Remove the city concept or the 3D walkable mode
- Break dashboard navigation
- Convert away from 3D — keep the existing engine

═══════════════════════════════════════════════
PHASE 2 — VISUAL REDESIGN: PITTSBURGH CAREER CITY
═══════════════════════════════════════════════

Replace the dark neon prototype look with a bright, polished, Pittsburgh-inspired city. Reference: downtown Pittsburgh — three rivers, yellow bridges, Point State Park, hilly skyline, walkable downtown.

LIGHTING (this is the biggest single change):
- Switch the scene background and fog to a warm daytime / golden-hour palette.
- Background: soft sky gradient (#FCE7B3 horizon → #87B8E0 zenith) OR sunset (#FFB87A → #6FA8DC).
- Ambient light intensity: ~0.6–0.8 (was probably ~0.2). Add a directional "sun" light at ~45° with soft shadows enabled.
- Remove or heavily reduce the dark base plane. Replace with a light street/grass ground.
- Keep small emissive glows on interactive elements (NPCs, building doors, simulation entry points) but the WORLD itself is daylit.

CITY LAYOUT — Pittsburgh-inspired:
- Two rivers crossing the map, meeting at a "Point" near the Career Hub (the Pittsburgh Point analogue).
- 3–5 yellow truss bridges (Pittsburgh's signature) connecting districts across the rivers. Use simple extruded geometry — they don't need to be photoreal, just READ as truss bridges with vertical cables/beams.
- Downtown core (Career Hub) = cluster of taller mixed-use towers with windows, setbacks, and varied rooflines. NOT solid colored rectangles. Use BoxGeometry with window textures or instanced small emissive squares as windows.
- Surrounding hills in the background (low-poly green/tan terrain or simple displaced plane) so the skyline feels nestled in.
- Streets with sidewalks, crosswalks (white striped), street trees (simple cone+cylinder trees, varied), benches, and a few parked/moving cars (low-poly boxes with wheels).

DISTRICT IDENTITY — each must look visually distinct:
- Career Hub (downtown): tallest skyscrapers, glass facades, plaza with fountain, central wayfinding obelisk.
- Engineering District: by the rivers/bridges. Construction cranes, a half-built tower, a robotics lab building (rounded modern), an infrastructure yard.
- Technology District: modern innovation campus. Low-rise glassy buildings, courtyards, solar panels on roofs, a "data center" building with a subtle glow.
- Business District: dense office towers, revolving doors, taxi drop-offs.
- Healthcare District: hospital campus — large white building with a red cross / "+" sign on the helipad, ambulances, medical office annexes.
- Trades District: workshops, garages with roll-up doors, a construction yard with stacked materials, a welding/fabrication shed.
- Law / Public Service District: courthouse with columns and steps, civic plaza, flagpole, government office building.
- Exploratory District: student success center — open quad, a "career library," kiosks, picnic tables.
- LiveWorld: riverfront plaza or amphitheater with stage, bleachers, big screen, gathering space (this is where multiplayer happens).

DISTRICT SIGNAGE:
- Replace arcade-style block labels with city-style wayfinding signs: brown/tan post-mounted directional signs OR overhead arch signs at district entrances ("ENGINEERING DISTRICT →"). Readable from a distance.

BUILDINGS — visually distinct, not colored cubes:
- Vary heights, widths, rooflines (flat, pitched, stepped).
- Add windows as instanced small lit rectangles on facades (warm interior light, not cyan).
- Add doors, awnings, signage strips.
- Use a muted Pittsburgh palette: brick red (#9B4A3F), warm tan (#D9B382), steel grey (#5A6470), slate blue (#3E5C76), forest green (#3F6B47), warm white (#F2EBDD). NO neon purple/cyan as primary fills.

STREETS & ENVIRONMENT:
- Asphalt streets (#3A3A3A) with white lane lines and white crosswalks.
- Sidewalks (#C8C0B4) flanking each road.
- Street trees every ~6 units along sidewalks.
- Lamp posts with warm point lights every ~10 units (subtle, daytime).
- Parks with green ground patches, benches, and a few NPCs idling.
- Add a riverfront walking path along both rivers.

UI POLISH:
- Top-left "Career City" HUD: keep position, but lighten the panel background to a frosted white (rgba(255,255,255,0.85)) with dark text. Soft shadow.
- Bottom-right minimap: redraw using the new district colors, add tiny river lines and bridge markers.
- Bottom dialog ("Click NPCs..."): same frosted-white treatment.
- "3 online" pill: keep, but match the lighter UI.

═══════════════════════════════════════════════
PHASE 3 — SIGN-IN + USER PROFILE SYSTEM
═══════════════════════════════════════════════

Add Replit Auth (the built-in one). Steps:

1. Install / enable Replit Auth in this project (the Replit-native authentication).
2. On first load, if user is not signed in: show a clean sign-in modal over the dashboard with:
   - "Sign in with Replit" button
   - "Continue as Guest" link (uses localStorage profile)
3. After sign-in, create or load a user profile keyed by Replit user ID.

Profile data schema (store in a `profiles` table if a DB exists, otherwise JSON file + localStorage fallback):

{
  userId: string,
  username: string,
  avatarName: string,
  avatarColor: string,
  createdAt: timestamp,
  careerInterests: string[],
  level: number,           // derived from XP
  xp: number,
  badges: string[],
  simulationsCompleted: [{ id, score, completedAt, district }],
  totalTimeMinutes: number,
  districtsVisited: string[],
  mentorsTalkedTo: string[],
  skillsEarned: [{ skill, level }],
  favoriteCareers: string[],
  recommendedNextCareers: string[],
  liveWorldEventsAttended: number,
  teamSimulationsCompleted: number
}

═══════════════════════════════════════════════
PHASE 4 — PROGRESS TRACKER
═══════════════════════════════════════════════

Build a Profile / Progress page (route: /profile) showing:
- Avatar + username + level + XP bar
- Total time on platform (auto-tracked: increment every minute the tab is active)
- Districts explored (X / 9) with a small map
- Simulations completed with scores
- Skill growth bars
- Career categories explored (donut or bar chart)
- Strongest career interests (top 3, derived from simulation scores + time per district)
- Recommended next simulations (3 cards)
- Career Passport progress (badges earned)

Tracking hooks to add:
- On district enter → push to districtsVisited (dedupe)
- On NPC dialogue open → push to mentorsTalkedTo
- On simulation complete → append to simulationsCompleted with score, award XP
- On LiveWorld join → increment liveWorldEventsAttended
- Time tracker: setInterval that increments totalTimeMinutes when document.visibilityState === 'visible'

If real simulation scoring isn't wired yet, USE MOCK DATA for the tracker UI but structure all the read/write functions (e.g., `recordSimulationComplete(simId, score)`) so swapping in real data is one-line later.

Add a "Profile" button to the dashboard nav and to the in-world HUD.

═══════════════════════════════════════════════
PHASE 5 — REPORT BACK
═══════════════════════════════════════════════

When done, print a final report with:
1. Files that control the 3D city: [list paths]
2. Files that control the dashboard: [list paths]
3. Files that control profile / progress tracking: [list paths]
4. What you changed (bullet list per file)
5. What still needs work / known limitations
6. How to test it: 3–5 step checklist

Work in this order: Phase 0 → 1 → 2 → 3 → 4 → 5. Do NOT skip Phase 0.
```

---

## 🧩 PHASED FALLBACK (use if the master prompt overwhelms the Agent)

Run these one at a time. Wait for each to finish before sending the next.

### Phase A — Inspect

```
Before changing anything in this Replit project, inspect the codebase and report:

1. The tech stack (Three.js? React Three Fiber? plain HTML?). Print package.json.
2. File paths for: the 3D city scene, the dashboard/home page, the avatar/WASD movement, district definitions, building click handlers, NPC logic, simulation routing, and any user/profile state.
3. Whether a sign-in system exists.

Just report. Make zero code changes in this step.
```

### Phase B — Lighting + sky pass (smallest visual win first)

```
Without changing layout or geometry, do ONLY this:

1. Change the scene background from dark to a warm daytime sky gradient: horizon #FCE7B3, zenith #87B8E0. If using Three.js, use a Sky shader or a large inverted sphere with a vertex-color gradient.
2. Set ambient light intensity to 0.7. Add a directional "sun" light at position (50, 80, 30), intensity 1.0, with castShadow=true and a soft shadow map.
3. Replace the dark ground plane material with a light asphalt grey (#5A5A5A) for streets and a warm tan (#D9C8A8) for sidewalks where applicable.
4. Reduce or remove fog. If fog is needed, use color #E8D9B8 with low density.
5. Tone-map: enable ACESFilmicToneMapping on the renderer, exposure 1.1.

Do not touch buildings, NPCs, routes, or UI yet. Report what you changed.
```

### Phase C — Pittsburgh layout (rivers + bridges + hills)

```
Add Pittsburgh geography to the existing world WITHOUT removing current districts:

1. Add two rivers as long blue planes (#4A7BA8 with slight transparency and a subtle scrolling normal map if easy — otherwise flat is fine) crossing the map and meeting at a "Point" near the Career Hub.
2. Add 3 yellow truss bridges (color #F4C430) over the rivers connecting districts. Use box geometry for the deck plus vertical beams and X-cross trusses. They don't need to be photoreal — they need to READ as Pittsburgh-yellow bridges.
3. Add background hills: a low-poly displaced plane in green/tan around the city perimeter so the skyline feels nestled.
4. Reposition districts (don't rename, don't delete) so:
   - Career Hub is at the "Point" (river confluence)
   - Engineering is across one bridge
   - Healthcare and Business are on the downtown side
   - Trades, Tech, Law, Exploratory, and LiveWorld each get a clear district zone
5. Update the minimap to show rivers and bridges.

Keep all click handlers, NPCs, and routes identical. Report changes.
```

### Phase D — Building upgrade + district identity

```
Replace the colored-block buildings with visually distinct district-appropriate buildings. KEEP the existing click handlers and building IDs — only swap the geometry/materials.

For each district, replace the placeholder blocks with at least 3 varied buildings using these guidelines:
- Career Hub: tallest mixed-use towers with window grids (instanced small warm-yellow squares as lit windows), glass facades, plaza fountain.
- Engineering: construction crane, half-built tower with exposed beams, modern robotics lab.
- Technology: low-rise glassy campus, solar-panel roofs, courtyard.
- Business: dense office towers with revolving-door entries.
- Healthcare: large white hospital with red cross, ambulance, medical annexes.
- Trades: workshop sheds with roll-up doors, materials yard, fabrication shed.
- Law/Public Service: columned courthouse with steps, civic plaza, flagpole.
- Exploratory: open student-center quad with picnic tables and kiosks.
- LiveWorld: amphitheater / riverfront plaza with a stage and big screen.

Palette (no neon): brick red #9B4A3F, warm tan #D9B382, steel grey #5A6470, slate blue #3E5C76, forest green #3F6B47, warm white #F2EBDD. Use yellow #F4C430 ONLY for bridges and accent signage.

Add district wayfinding signs (post-mounted brown/tan directional signs) at each district entrance.

Add streets with crosswalks, sidewalks, street trees (cone+cylinder), and a handful of low-poly parked cars.

Report which files you touched.
```

### Phase E — UI polish

```
Polish the existing HUD without changing functionality:

1. Top-left "Career City" panel: change background to rgba(255,255,255,0.88), dark text (#1a1a1a), soft shadow, 12px border radius.
2. Bottom-right minimap: redraw with new district colors and river/bridge overlays. Add a small "YOU" dot for the avatar.
3. Bottom "Click NPCs..." dialog: same frosted-white treatment.
4. "3 online" pill: keep but restyle to match lighter UI.
5. Add a "Profile" button (top-right area) that routes to /profile (we'll build that page next).

Do not change behavior. Report changes.
```

### Phase F — Replit Auth + profile

```
Add Replit Auth (built-in) to this project:

1. Set up Replit Auth following the Replit docs.
2. On app load, check auth state. If signed out, show a centered sign-in modal: "Sign in with Replit" + "Continue as Guest" link (guest uses localStorage).
3. Create a user profile object on first sign-in keyed by Replit user ID. Schema:

{
  userId, username, avatarName, avatarColor, createdAt,
  careerInterests: [], level: 1, xp: 0, badges: [],
  simulationsCompleted: [], totalTimeMinutes: 0,
  districtsVisited: [], mentorsTalkedTo: [], skillsEarned: [],
  favoriteCareers: [], recommendedNextCareers: [],
  liveWorldEventsAttended: 0, teamSimulationsCompleted: 0
}

4. Persist to a SQLite/JSON store on the server, with a localStorage mirror for guests.
5. Expose helper functions: getProfile(), updateProfile(patch), recordSimulationComplete(simId, score), recordDistrictVisit(districtId), recordMentorTalk(mentorId), addXP(amount).

Report new files and where state is stored.
```

### Phase G — Profile page + tracker

```
Build /profile route showing:

- Avatar + username + level + XP progress bar
- Total time on platform (auto-tracked — increment totalTimeMinutes every 60s while document.visibilityState === 'visible')
- Districts explored: X / 9 with mini-map highlighting visited
- Simulations completed: list with scores
- Skill growth: horizontal bars
- Career categories explored: simple bar chart
- Strongest career interests: top 3 (derived: most-visited districts + highest sim scores)
- Recommended next simulations: 3 cards
- Career Passport: badge grid

Wire tracking:
- On district enter → recordDistrictVisit(id)
- On NPC dialogue open → recordMentorTalk(id)
- On simulation complete → recordSimulationComplete(simId, score) and addXP based on score
- On LiveWorld join → increment liveWorldEventsAttended

If real simulation scoring isn't connected, populate the tracker with mock data — but structure the recorder functions so real wiring is a one-line swap.

Add Profile button to dashboard nav.

Report all new files and what's mock vs real.
```

### Phase H — Final report

```
Print the final report:

1. Files controlling the 3D city: [paths]
2. Files controlling the dashboard: [paths]
3. Files controlling profile / progress tracking: [paths]
4. Per-file change summary
5. Known issues / what still needs work
6. 5-step manual test checklist
```

---

## 💡 Tips for working with Replit Agent on this

- **Run Phase 0 / Phase A first no matter what.** Replit Agent guesses wrong about file structure surprisingly often, and the report it prints lets you sanity-check before letting it loose.
- **Commit between phases.** Use Replit's checkpoints/branches so you can roll back if a phase breaks something.
- **If it ignores "don't rebuild from scratch"** — stop it, paste: `STOP. You are deleting features. Restore from the last checkpoint and re-read the HARD CONSTRAINTS section. Make additive changes only.`
- **If lighting changes don't show up,** the renderer probably has `outputColorSpace` or tone-mapping overrides somewhere — ask the Agent to grep for `ToneMapping` and `outputColorSpace` and reconcile.
- **The video you uploaded** (OWM_GameSnippet.mp4) — if that's a reference for the *style* you're going for, upload it to Replit too and tell the Agent "match the lighting and palette of the attached video reference."
