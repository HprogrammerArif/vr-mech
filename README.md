# 1WayMirror World — Developer Reference

AI-powered career exploration platform for high school students. Students explore 85 careers across 9 categories, run AI-generated simulations, chat with Dario (AI career counselor), earn XP/badges, and view a 3D career city. Parents get a safety dashboard with real-time moderation alerts.

---

## Table of Contents

1. [Repository Structure](#1-repository-structure)
2. [Tech Stack](#2-tech-stack)
3. [Environment Variables & Secrets](#3-environment-variables--secrets)
4. [Running Locally](#4-running-locally)
5. [Frontend Routes](#5-frontend-routes)
6. [API Reference](#6-api-reference)
   - [Health](#health)
   - [Simulations](#simulations)
   - [Missions (Challenges)](#missions-challenges)
   - [Progress](#progress)
   - [Dario AI Counselor](#dario-ai-counselor)
   - [NPC Chat](#npc-chat)
   - [Safety & Moderation](#safety--moderation)
   - [Admin — Video Upload](#admin--video-upload)
7. [Database Schema](#7-database-schema)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Security Model](#9-security-model)
10. [Client-Side Storage Keys](#10-client-side-storage-keys)
11. [Subscription Plans & Feature Gates](#11-subscription-plans--feature-gates)
12. [Badge System](#12-badge-system)
13. [Career Catalog](#13-career-catalog)
14. [Admin Panel](#14-admin-panel)
15. [Email Notifications](#15-email-notifications)
16. [Deployment](#16-deployment)

---

## 1. Repository Structure

```
/
├── artifacts/
│   ├── api-server/          Express 5 API — port 8080, base path /api
│   │   └── src/
│   │       ├── routes/      One file per route group
│   │       └── lib/         AI helpers, progress logic, moderation, email
│   └── mech-vr-lab/         React + Vite frontend — port 22303, base path /
│       └── src/
│           ├── pages/       One file per route/page
│           ├── components/  Shared UI components
│           └── lib/         auth, profile, badges, darioData, talksData, ...
├── lib/
│   ├── db/                  Drizzle ORM schema + PostgreSQL client
│   ├── api-spec/            OpenAPI YAML contract
│   ├── api-client-react/    Orval-generated React Query hooks
│   └── api-zod/             Orval-generated Zod schemas
└── scripts/                 Utility scripts
```

A global reverse proxy routes traffic by path. All requests reach services through `localhost:80`:

| Prefix | Service |
|--------|---------|
| `/api` | `artifacts/api-server` (port 8080) |
| `/`    | `artifacts/mech-vr-lab` (port 22303) |

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 7, TypeScript, Tailwind CSS |
| 3D / WebXR | Three.js, @react-three/fiber, @react-three/drei, @react-three/xr |
| Real-time | Socket.IO (multiplayer dashboard chat, online presence) |
| Backend | Express 5, TypeScript, pnpm monorepo |
| Database | PostgreSQL via Drizzle ORM |
| AI | OpenAI GPT-4o / GPT-4o-mini via Replit AI Integration proxy |
| Email | Resend (`RESEND_API_KEY`) |
| File uploads | multer (video files, stored in `artifacts/api-server/uploads/`) |
| Auth | Client-side localStorage (see §8) |
| Package manager | pnpm workspaces |

---

## 3. Environment Variables & Secrets

| Variable | Where set | Purpose |
|----------|-----------|---------|
| `DATABASE_URL` | Replit secret | PostgreSQL connection string |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | Replit AI Integration | OpenAI proxy base URL |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | Replit AI Integration | OpenAI proxy API key |
| `RESEND_API_KEY` | Replit secret | Email delivery via Resend |
| `SESSION_SECRET` | Replit secret | Reserved for future session signing |
| `ADMIN_PIN` | Optional env var | Overrides default admin PIN `1WAY2026` used by safety/dario admin endpoints |
| `PORT` | Injected by workflow | Port each service binds to |
| `BASE_PATH` | Injected by workflow | Base URL prefix for the service |
| `REPLIT_DOMAINS` | Injected by Replit | Comma-separated public hostnames (used to build parent dashboard URLs) |

> Never commit secrets. All values above must be set via Replit Secrets or environment configuration — never hardcoded in source.

---

## 4. Running Locally

The project uses **Replit Workflows** — do not run `pnpm dev` at the workspace root.

```bash
# Type-check all libs
pnpm run typecheck:libs

# Full type-check (libs + all artifacts)
pnpm run typecheck

# Re-generate API client after editing lib/api-spec/openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Run database migrations
pnpm --filter @workspace/db run migrate
```

Workflows are configured in `.replit` and restart automatically. Access the running app through the Replit preview pane (proxied at `localhost:80`).

---

## 5. Frontend Routes

| Path | Auth Required | Description |
|------|:---:|-------------|
| `/` | No | Public marketing landing page (no HeaderBar) |
| `/login` | No | Sign in / sign up |
| `/my-profile` | Yes | Profile editor — school, GPA, SAT, avatar, badges |
| `/replitopolis` | Yes | Main dashboard (tabs: Home, City, Simulations, Badges, Feed, Videos, Talks, Dario, Journal, Settings) |
| `/city` | Yes | 3D walkable career city (WebXR) |
| `/profile-setup` | Yes | Avatar/name setup |
| `/dario` | Yes | Dario AI career counselor |
| `/sim/:slug` | Yes | Individual simulation page |
| `/admin` | Admin only | Admin panel (email + password gate) |
| `/share/:learnerId` | No | Public shareable student profile |
| `/parent` | Token | Parent safety dashboard |

Routes listed in `FULLSCREEN_ROUTES` in `App.tsx` render without the `HeaderBar`:
`/`, `/city`, `/replitopolis`, `/profile-setup`, `/login`, `/my-profile`, `/dario`

---

## 6. API Reference

All endpoints are served under `/api`. The server binds to `PORT` (default 8080) and handles the `/api` prefix itself — paths are **not** stripped by the proxy.

Authentication on admin endpoints uses the `x-admin-pin` request header. The value must match the `ADMIN_PIN` environment variable (default: `1WAY2026`).

---

### Health

#### `GET /api/healthz`
Returns server status.

**Response `200`**
```json
{ "status": "ok" }
```

---

### Simulations

#### `GET /api/simulations`
Returns all 85 career simulations.

**Response `200`** — array of simulation summary objects:
```json
[
  {
    "slug": "mechanical-engineer",
    "title": "Mechanical Engineer",
    "category": "engineering",
    "available": true,
    "description": "...",
    "emoji": "⚙️"
  }
]
```

#### `GET /api/simulations/:slug`
Returns full simulation detail including role context and metadata.

**Path params:** `slug` — career slug (e.g. `software-engineer`)

**Response `200`** — full simulation object  
**Response `404`** — `{ "error": "Simulation not found" }`

---

### Missions (Challenges)

Missions are AI-generated multiple-choice questions tied to a simulation.

#### `POST /api/missions/next`
Generate a new AI mission for a learner.

**Body:**
```json
{
  "learnerId": "uuid",
  "simulationSlug": "mechanical-engineer",
  "targetDifficulty": "medium",
  "avoidTopics": ["thermodynamics"]
}
```

**Response `200`:**
```json
{
  "id": "uuid",
  "simulationSlug": "mechanical-engineer",
  "category": "engineering",
  "topic": "Stress Analysis",
  "difficulty": "medium",
  "title": "Bridge Load Problem",
  "roleIntro": "You are a structural engineer...",
  "scenario": "A bridge is experiencing...",
  "problem": "Calculate the maximum load...",
  "constraints": ["Wind speed: 40mph", "..."],
  "question": "Which approach best solves...?",
  "choices": [
    { "id": "a", "text": "Option A" },
    { "id": "b", "text": "Option B" }
  ],
  "scene": "...",
  "createdAt": "2026-05-12T00:00:00Z"
}
```

#### `POST /api/missions/:id/submit`
Submit an answer for a mission. Updates learner XP, level, and streak in the database.

**Body:**
```json
{
  "learnerId": "uuid",
  "choiceId": "b"
}
```

**Response `200`:**
```json
{
  "missionId": "uuid",
  "correct": true,
  "correctChoiceId": "b",
  "explanation": "Option B is correct because...",
  "encouragement": "Great job! You're on a roll.",
  "xpAwarded": 15,
  "newStreak": 4,
  "newLevel": 3,
  "newTotalXp": 185
}
```

#### `POST /api/missions/:id/hint`
Get an AI-generated hint for an unanswered mission.

**Body:** `{ "learnerId": "uuid" }`

**Response `200`:** `{ "hint": "Think about force distribution..." }`

---

### Progress

#### `GET /api/progress?learnerId=<uuid>`
Returns full learner progress summary.

**Response `200`:**
```json
{
  "learnerId": "uuid",
  "totalXp": 850,
  "level": 5,
  "streak": 3,
  "bestStreak": 7,
  "missionsCompleted": 42,
  "missionsCorrect": 35,
  "accuracy": 0.833,
  "topicsMastered": ["Thermodynamics", "Circuit Analysis"],
  "nextLevelXp": 1000,
  "categoryProgress": [
    { "category": "engineering", "attempted": 20, "correct": 17 }
  ]
}
```

#### `GET /api/progress/recent?learnerId=<uuid>`
Returns the 20 most recent mission attempts for a learner.

**Response `200`** — array of attempt objects with title, topic, category, difficulty, correct, xpAwarded, attemptedAt.

---

### Dario AI Counselor

Dario is a GPT-4o-mini powered career counselor. All chat routes consume Dario credits per the user's subscription plan.

#### `POST /api/dario/chat`
Send a message to Dario. Supports memory injection from past sessions.

**Body:**
```json
{
  "messages": [
    { "role": "user", "content": "I like working with my hands." },
    { "role": "assistant", "content": "That's great! Have you considered..." }
  ],
  "pastContext": "Previous session summary text (optional)"
}
```
When `pastContext` is provided, Dario greets the student as a returning user and avoids repeating covered topics.

**Response `200`:** `{ "message": "That sounds like carpentry or engineering could be a great fit!" }`

**Model:** `gpt-4o-mini` · `max_tokens: 300` · `temperature: 0.85`

---

#### `POST /api/dario/roadmap`
Generate a 5-phase career roadmap from a session's conversation.

**Body:**
```json
{
  "sessionMessages": [{ "role": "user", "content": "..." }],
  "careersDiscussed": ["biomedical engineer", "nurse practitioner"]
}
```

Uses the last 12 messages of the conversation.

**Response `200`:**
```json
{
  "milestones": [
    {
      "phase": "0-3mo",
      "phaseLabel": "Now — 3 months",
      "title": "Research biomedical programs",
      "description": "Visit 3 university biomedical engineering websites and compare admission requirements."
    }
  ]
}
```

Phases: `0-3mo` · `3-6mo` · `6-12mo` · `1-3yr` · `3-5yr` (2–3 milestones each)

**Model:** `gpt-4o-mini` · `max_tokens: 1200` · `temperature: 0.7`

---

#### `POST /api/dario/compare`
Side-by-side comparison of two careers. Requires **Explorer** plan or above.

**Body:** `{ "career1": "nurse practitioner", "career2": "physician assistant" }`

**Response `200`:**
```json
{
  "career1": {
    "name": "Nurse Practitioner",
    "avgSalary": "$120,000/yr",
    "salaryRange": "$90,000 – $150,000",
    "jobGrowth": "+40% (much faster than average)",
    "educationRequired": "Master of Science in Nursing",
    "keySkills": ["Patient Assessment", "Pharmacology", "..."],
    "prosForStudents": "Fast path to autonomous practice...",
    "typicalDay": "Diagnose and treat patients in clinic...",
    "entryLevel": "RN → BSN → MSN, starting ~$85,000"
  },
  "career2": { ... }
}
```

**Model:** `gpt-4o-mini` · `max_tokens: 800` · `temperature: 0.5`

---

#### `POST /api/dario/personality`
Derive a personality + work-style profile from conversation history. Requires **Builder** plan or above.

**Body:** `{ "allMessages": [{ "role": "user", "content": "..." }] }` (minimum 2 messages)

**Response `200`:**
```json
{
  "summary": "You're a creative problem-solver who...",
  "traits": [
    { "name": "Analytical Thinker", "score": 82, "description": "You consistently ask 'why' before 'how'." }
  ],
  "workStyle": "You prefer structured environments with room for creative input.",
  "strengths": ["Critical thinking", "Empathy", "Communication", "Persistence"],
  "careerCorrelations": ["UX Designer", "Product Manager", "Social Worker", "Journalist"],
  "learningStyle": "You learn best by doing — hands-on projects over lectures.",
  "motivators": ["Making an impact", "Creative expression", "Helping others"]
}
```

**Model:** `gpt-4o-mini` · `max_tokens: 800` · `temperature: 0.65`

---

#### `POST /api/dario/career-report`
Comprehensive career exploration report. Requires **Builder** plan or above.

**Body:**
```json
{
  "allMessages": [...],
  "careersDiscussed": ["software engineer", "data analyst"],
  "sessionCount": 3
}
```

**Response `200`:** Full report object with `headline`, `overallSummary`, `careerMatches` (scored 0–100), `keyStrengths`, `areasToExplore`, `educationRecommendations`, `nextSteps`.

**Model:** `gpt-4o-mini` · `max_tokens: 1000` · `temperature: 0.65`

---

#### `POST /api/dario/opportunities`
Find real-world internship / job-shadow opportunities near a location. Requires **Builder** plan or above.

**Body:**
```json
{
  "location": "Austin, TX",
  "careerInterest": "biomedical engineering",
  "opportunityType": "internship",
  "studentName": "Alex Smith",
  "studentEmail": "alex@example.com"
}
```

**Response `200`:** `{ "opportunities": [ { "orgName": "...", "type": "internship", "contactEmail": "...", "emailDraft": "...", ... } ] }`

Generates 4 opportunities with pre-written outreach email drafts.

**Model:** `gpt-4o-mini` · `max_tokens: 1500` · `temperature: 0.8`

---

#### `POST /api/dario/action-items`
Generate 6–8 concrete 30–60 day action items from conversation history. Requires **Builder** plan or above.

**Body:** `{ "allMessages": [...], "careersDiscussed": ["..."] }`

**Response `200`:** `{ "items": [ { "title": "...", "description": "...", "category": "research|experience|skills|network|apply", "dueDate": "YYYY-MM-DD" } ] }`

**Model:** `gpt-4o-mini` · `max_tokens: 900` · `temperature: 0.7`

---

#### `POST /api/dario/log-activity`
Log a completed Dario session to the database (called by the frontend on session end). No auth required.

**Body:** Full `ActivityLog` object — `sessionId` (required), `userId`, `userName`, `userEmail`, `careersDiscussed`, `messageCount`, `conversationExcerpt`, etc.

Uses `ON CONFLICT DO UPDATE` on `sessionId` — safe to call multiple times per session.

**Response `200`:** `{ "ok": true }`

---

#### `GET /api/dario/activity`
Admin endpoint — returns all logged Dario sessions. **Requires `x-admin-pin` header.**

Returns latest 500 sessions ordered by `loggedAt` descending.

**Response `200`:** `{ "logs": [ DarioSessionLog[] ] }`

---

### NPC Chat

#### `POST /api/npc/chat`
Chat with a career NPC in the 3D city.

**Body:**
```json
{
  "npcName": "Dr. Rivera",
  "npcRole": "Neuroscientist",
  "npcCategory": "science",
  "npcTagline": "Mapping the brain one neuron at a time",
  "question": "What does your daily work look like?"
}
```

**Response `200`:** `{ "reply": "Most days I'm in the lab analyzing MRI data..." }`

**Model:** `gpt-4o` · `max_tokens: 200`

---

### Safety & Moderation

The safety system protects minors through content moderation, trust scoring, and real-time parent notifications.

All admin-guarded endpoints require `x-admin-pin` header matching `ADMIN_PIN` env var (default: `1WAY2026`).

---

#### `POST /api/safety/register`
Register a student's extended safety profile. Creates a trust score and optionally a parent account with email alert access.

**Body:**
```json
{
  "learnerId": "uuid",
  "email": "student@school.edu",
  "name": "Alex Smith",
  "birthdate": "2008-03-15",
  "grade": 10,
  "graduationYear": 2026,
  "schoolName": "Lincoln High School",
  "schoolEmail": "asmith@lincolnhigh.edu",
  "phone": "+15125551234",
  "careerInterests": ["engineering", "technology"],
  "parentName": "Jordan Smith",
  "parentEmail": "jordan@example.com",
  "parentPhone": "+15125559876",
  "parentRelationship": "parent",
  "noParentContact": false,
  "counselorEmail": "counselor@lincolnhigh.edu"
}
```

**Verification Tiers:**
- **Tier A** — school email domain verified (`.edu`, `.k12.*`, or district pattern)
- **Tier B** — parent email provided and verified
- **Tier C** — no verification (basic account)

**Trust Score Formula** (0–100):
- Base: 25
- School email verified: +30
- Parent verified: +20
- Phone verified: +10
- Account ≥30 days, no flags: +15
- Account ≥7 days: +5
- Age consistency OK: +5
- Each Tier 2 flag: −15
- Each Tier 3 flag: −50
- Age consistency failed: −25
- No parent contact: capped at 75

**Response `200`:**
```json
{
  "ok": true,
  "studentId": "uuid",
  "verificationTier": "A",
  "trustScore": 80,
  "trustBadge": "verified",
  "supervisedModeUntil": "2026-05-26T...",
  "dmEnabledAt": "2026-05-19T..."
}
```

New accounts enter supervised mode for 14 days. DM access unlocks after 7 days.

If `parentEmail` is provided, a welcome email is sent immediately (fire-and-forget) with a parent dashboard access link.

---

#### `GET /api/safety/profile/:learnerId`
Returns the full safety profile for a learner, including trust score and parent info.

**Response `200`** — merged `SafetyAccount + trustScore + parent` object.

---

#### `POST /api/safety/moderate`
Classify a message using AI moderation. Logs contact exchanges and flags. Automatically notifies parents on Tier 3+ flags.

**Body:**
```json
{
  "message": "Text to moderate",
  "studentId": "uuid (optional — enables logging)",
  "context": [{ "role": "user", "content": "..." }]
}
```

**Moderation Tiers:**
| Tier | Description | Action |
|------|-------------|--------|
| 1 | Clean / off-topic | No action |
| 2 | Mild concern | Auto-warn user, log flag, −15 trust score |
| 3 | Serious concern | Log flag, −50 trust score, immediate parent email |
| 4 | Critical / urgent | Log flag, parent email marked URGENT |

**Response `200`:**
```json
{
  "tier": 2,
  "category": "personal_information",
  "reasoning": "Message contains phone number pattern",
  "contactExchange": true,
  "detectedPatterns": ["phone_number"],
  "trustScoreImpact": -15,
  "blocked": false,
  "warningMessage": "We noticed you may be sharing contact info..."
}
```

---

#### `POST /api/safety/contact-exchange-ack`
Record that a student acknowledged a contact-exchange warning (and whether they sent anyway). If sent anyway, a parent notification is queued and emailed.

**Body:**
```json
{
  "studentId": "uuid",
  "message": "Here's my number: 555-1234",
  "sentAnyway": true
}
```

**Response `200`:** `{ "ok": true }`

---

#### `GET /api/safety/flags` *(admin)*
Returns up to 200 moderation flags ordered by tier (highest first), enriched with student info.

**Header:** `x-admin-pin: <pin>`

**Response `200`:**
```json
{
  "flags": [ { ...flagFields, "student": { "name": "...", "email": "...", "grade": 10 } } ],
  "summary": { "total": 12, "open": 3, "tier4": 0, "tier3": 1, "tier2": 2 }
}
```

---

#### `PATCH /api/safety/flags/:id` *(admin)*
Resolve or escalate a moderation flag.

**Header:** `x-admin-pin: <pin>`

**Body:**
```json
{
  "status": "resolved",
  "resolution": "Reviewed — false positive",
  "reviewedBy": "Admin"
}
```

---

#### `GET /api/safety/trust/:studentId`
Returns the trust score record for a student.

---

#### `GET /api/safety/stats` *(admin)*
Returns platform-wide safety statistics.

**Header:** `x-admin-pin: <pin>`

**Response `200`:**
```json
{
  "totalStudents": 142,
  "tierAStudents": 38,
  "tierCStudents": 67,
  "openFlags": 4,
  "criticalFlags": 1,
  "contactExchanges": 9,
  "pendingEmails": 2
}
```

---

#### `POST /api/safety/heartbeat`
Record platform activity time for a student (called every ~30 seconds by the frontend).

**Body:** `{ "studentId": "uuid", "sessionDate": "2026-05-12" }`

---

#### `GET /api/safety/parent-dashboard?token=<token>`
Returns the parent dashboard data for a parent access token.

---

#### `PATCH /api/safety/parent/:parentId/pause`
Pause or resume email notifications for a parent.

**Body:** `{ "pausedUntil": "ISO date string or null" }`

---

### Admin — Video Upload

These endpoints are mounted under `/api/admin`.

#### `POST /api/admin/upload-video`
Upload a video file for the admin video library. Accepts multipart form data.

**Form field:** `video` — video file (MP4, WebM, MOV, etc.)  
**Limit:** 500 MB  
**File filter:** MIME type must match `video/*`

Filename is sanitized (alphanumeric + `_-` only, max 40 chars) and a timestamp is appended to prevent collisions.

**Response `200`:**
```json
{
  "url": "/api/admin/files/my_video_1715520000000.mp4",
  "filename": "my_video_1715520000000.mp4",
  "size": 15728640
}
```

**Response `400`:** `{ "error": "No video file provided or unsupported type." }`

Files are stored on disk at `artifacts/api-server/uploads/`. The returned `url` is a direct link to the file served by the next endpoint.

---

#### `GET /api/admin/files/:filename`
Serve a previously uploaded video file.

**Path traversal protection:** `path.basename()` is applied to strip any `../` sequences.

**Response `200`** — streams the file  
**Response `404`** — `{ "error": "File not found." }`

---

## 7. Database Schema

All tables use PostgreSQL via Drizzle ORM. Connection string is `DATABASE_URL`.

### `learners`
Core XP/level/streak tracking per student.

| Column | Type | Description |
|--------|------|-------------|
| `id` | text PK | Learner UUID (generated client-side) |
| `total_xp` | integer | Cumulative XP earned |
| `level` | integer | Current level (derived from XP) |
| `streak` | integer | Current daily streak |
| `best_streak` | integer | All-time best streak |
| `challenges_completed` | integer | Total missions attempted |
| `challenges_correct` | integer | Total missions answered correctly |

### `challenges`
AI-generated mission questions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | text PK | UUID |
| `learner_id` | text | FK → learners |
| `simulation_slug` | text | Career slug |
| `category` | text | Career category |
| `topic` | text | Specific topic within the simulation |
| `difficulty` | text | `easy` \| `medium` \| `hard` |
| `title` | text | Mission headline |
| `role_intro` | text | Student's role for this scenario |
| `scenario` | text | Background context |
| `problem` | text | The challenge statement |
| `constraints` | jsonb | Array of constraint strings |
| `question` | text | The actual question |
| `choices` | jsonb | Array of `{ id, text }` |
| `correct_choice_id` | text | ID of the correct answer |
| `explanation` | text | Why the correct answer is right |
| `scene` | text | Optional visual scene description |

### `attempts`
Student answers to missions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial PK | |
| `challenge_id` | text | FK → challenges |
| `learner_id` | text | FK → learners |
| `choice_id` | text | The answer submitted |
| `correct` | boolean | Whether it was right |
| `xp_awarded` | integer | XP earned for this attempt |
| `attempted_at` | timestamp | |

### `dario_sessions`
Dario AI counseling session logs (server-side analytics).

| Column | Type | Description |
|--------|------|-------------|
| `session_id` | text PK | UUID assigned per session |
| `user_id` | text | Learner ID |
| `user_name` | text | Student display name |
| `user_email` | text | Student email |
| `session_title` | text | Auto-generated title |
| `school` | text | School name |
| `graduation_year` | integer | |
| `gpa` / `sat` | text | Academic profile |
| `career_interest` | text | Primary interest |
| `careers_discussed` | jsonb | Array of career strings |
| `message_count` | integer | Number of exchanges |
| `conversation_excerpt` | jsonb | Last few messages |
| `opportunities_searched` | jsonb | Opportunity types searched |
| `action_item_count` | integer | Action items generated |
| `roadmap_milestone_count` | integer | Roadmap milestones generated |
| `personality_generated` | boolean | Was personality analysis run? |
| `report_generated` | boolean | Was a career report generated? |
| `session_started_at` / `session_ended_at` | text | ISO timestamps |
| `logged_at` | timestamp | Server-side log time |

### Safety Tables

| Table | Purpose |
|-------|---------|
| `safety_accounts` | Extended student safety profiles (school email, grade, verification tier) |
| `parent_accounts` | Parent/guardian accounts linked to students, with `access_token` for dashboard |
| `trust_scores` | Per-student trust score (0–100) + flag history |
| `moderation_flags` | All Tier 2+ moderation events |
| `contact_exchange_logs` | Detected contact info sharing attempts |
| `login_events` | Login geo/device tracking |
| `parent_notifications` | Email notification queue (sent status tracked) |
| `platform_time_logs` | Heartbeat-based activity time per day per student |

---

## 8. Authentication & Authorization

### Student Auth (Client-Side)

Authentication is entirely **client-side localStorage**. There is no server-side session for regular users.

| localStorage key | Content | Purpose |
|-----------------|---------|---------|
| `1waymirror_auth_v1` | `{ name, email }` | Active session |
| `1waymirror_accounts_v1` | `Account[]` | Registered account registry |

**Account type:**
```ts
{
  email: string;         // normalized to lowercase
  name: string;
  password: string;      // "$sha256$" + 64-char hex, or plaintext (legacy)
  registeredAt: number;  // Unix ms
  learnerId?: string;
  plan?: "free" | "pro" | "premium";
}
```

**Password hashing:** SHA-256 via `crypto.subtle.digest` (Web Crypto API). Format: `$sha256$<64hexchars>`.  
Salt: `email.toLowerCase() + ":" + password` — email is incorporated into the hash so passwords are not portable across accounts.

**Migration:** Legacy plaintext passwords are automatically hashed to SHA-256 on the next successful login.

**Key functions** (`artifacts/mech-vr-lab/src/lib/auth.ts`):

| Function | Description |
|----------|-------------|
| `registerAccount(name, email, password, learnerId?)` | Creates hashed account, returns `{ ok, error? }` |
| `verifyAccount(email, password)` | Returns `Account \| null`, migrates plaintext on success |
| `updateAccount(email, Partial<Account>)` | In-place update of any account fields |
| `deleteAccount(email)` | Removes account from registry |
| `getAllAccounts()` | Returns all registered accounts |
| `signIn(name, email)` | Writes session to `AUTH_KEY` |
| `signOut()` | Removes session |
| `getAuthUser()` | Returns `{ name, email } \| null` |
| `isLoggedIn()` | Boolean check |

### Admin Auth

The admin panel at `/admin` is protected by a hardcoded email + password gate (client-side):

- **Email:** `one.waymirror@outlook.com`
- **Password:** `Shipnot2020!`

This is a UI-level gate only. Backend admin endpoints use the `x-admin-pin` header (`ADMIN_PIN` env var, default `1WAY2026`). To change the backend PIN, set `ADMIN_PIN` in environment secrets.

### Parent Dashboard Auth

Parents access their dashboard via a 32-byte random hex `access_token` issued at registration and sent in the welcome email. The token expires after 30 days.

---

## 9. Security Model

### Content Moderation

Every Dario message can optionally be screened via `POST /api/safety/moderate`. The AI classifier assigns a tier:

- **Tier 1** — benign content → no action
- **Tier 2** — mild concern (personal info, mild inappropriate language) → user warning shown, trust score −15
- **Tier 3** — serious concern (explicit, age-inconsistent behavior, predatory patterns) → parent email alert immediately
- **Tier 4** — critical (self-harm, CSAM indicators, emergency) → parent email marked URGENT, flagged for manual review within 30 min

### Trust Score

Every registered student has a trust score (0–100):
- `verified` badge: ≥70
- `active` badge: 40–69
- `new` badge: <40

Score degrades with flags and recovers with account age + verification.

### Supervised Mode

All new accounts are in supervised mode for the first **14 days**. Direct messaging (DM) between users is unlocked after **7 days**.

### Verification Tiers

| Tier | Condition | Significance |
|------|-----------|-------------|
| A | `.edu` / district school email | Highest trust — confirmed student |
| B | Parent email provided | Moderate trust |
| C | No verification | Basic — DM and certain features restricted |

### Input Validation

- All API inputs are validated with Zod schemas (generated from OpenAPI spec in `lib/api-zod`)
- File uploads sanitize filenames with `path.basename()` and a character allowlist
- Multer limits uploads to 500 MB and `video/*` MIME types only
- SQL injection is prevented by Drizzle ORM parameterized queries throughout

### No Server-Side User Sessions

Regular user auth is localStorage-only — there is no session cookie or JWT issued. This means:
- No CSRF surface for user auth endpoints
- State is portable across devices only if the user explicitly exports/imports data
- Account deletion only removes local data (use admin panel to truly purge)

---

## 10. Client-Side Storage Keys

All data prefixed `1waymirror_` in localStorage.

| Key | Content | Cleared on sign-out? |
|-----|---------|:---:|
| `1waymirror_auth_v1` | Active session `{ name, email }` | Yes |
| `1waymirror_accounts_v1` | All registered accounts (password-hashed) | No |
| `1waymirror_profile_v2` | `PlayerProfile` (avatar, school, GPA, SAT, etc.) | No |
| `1waymirror_plan_v1` | Subscription plan string | No |
| `1waymirror_dario_sessions_v1` | All Dario sessions + message history | No |
| `1waymirror_career_roadmap_v1` | Roadmap milestones | No |
| `1waymirror_personality_v1` | Personality insights | No |
| `1waymirror_career_report_v1` | Career report | No |
| `1waymirror_opportunities_v1` | Saved opportunities | No |
| `1waymirror_action_items_v1` | Action items | No |
| `1waymirror_dario_credits_used_v1` | Credits consumed this period | No |
| `1waymirror_dario_xp_v1` | Dario XP total | No |
| `1waymirror_dario_compare_used_v1` | Flag: compare feature used | No |
| `1waymirror_contact_v1` | Contact form submissions (leads) | No |
| `1waymirror_newsletter_v1` | Newsletter signups (leads) | No |
| `1waymirror_admin_videos_v1` | Admin-added custom videos | No |
| `1waymirror_admin_settings_v1` | Admin content settings | No |

---

## 11. Subscription Plans & Feature Gates

Plans are stored client-side in `1waymirror_plan_v1`. Stripe billing is not yet integrated — plan is set manually or via admin.

| Plan | Monthly | Annual | Dario Credits | Key Features |
|------|--------:|-------:|--------------:|-------------|
| **None** | Free | — | 0 | No access |
| **Starter** | $19.99 | $16.59/mo | 0 | Simulations, videos, feed, progress, profile sharing |
| **Explorer** | $49.99 | $41.49/mo | 200 | + Dario chat, compare, roadmap, 7 livestreams |
| **Builder** | $99.99 | $82.99/mo | 700 | + Personality, career report, opportunities, action items, athletic recruiting, college advising |
| **Accelerator** | $199.99 | $165.99/mo | 1,200 | + 1-on-1 advisor |

Annual billing saves 17%. Annual prices are billed as: Starter $199/yr, Explorer $499/yr, Builder $995/yr, Accelerator $1,991/yr.

Feature gate check:
```ts
import { hasPlanFeature } from "./lib/profile";
if (hasPlanFeature(plan, "dario-chat")) { /* show Dario */ }
```

All `PlanFeature` values: `simulations` · `videos` · `feed` · `progress` · `profile-sharing` · `dario-chat` · `dario-compare` · `dario-roadmap` · `dario-exploratory` · `recorded-talks` · `personality` · `career-report` · `opportunities` · `action-items` · `athletic-recruiting` · `college-advising` · `advisor-1on1`

---

## 12. Badge System

71 total badges defined in `artifacts/mech-vr-lab/src/lib/badges.ts`.

**50 Level Badges** — `level-1` ("Rookie") through `level-50` ("LEGEND"). Awarded automatically when the learner's level reaches the requirement.

**21 Achievement Badges:**

| ID | Trigger |
|----|---------|
| `first-sim` | Completed first simulation |
| `ten-xp` | Earned first 10 XP |
| `100xp` / `500xp` | XP milestone |
| `streak3` / `streak7` | Daily streak |
| `cat-engineering` … `cat-law` | Attempted all 8 career categories |
| `world-explorer` | Played simulations in all 8 categories |
| `first-dario` | First Dario session |
| `dario-3` / `dario-10` | 3 / 10 Dario sessions |
| `dario-roadmap` | Generated first roadmap |
| `dario-compare` | Used career compare |
| `dario-xp-50` | Earned 50 Dario XP |

**Badge computation:**
```ts
import { computeEarnedBadgeIds } from "./lib/badges";

const earned = computeEarnedBadgeIds(
  totalXp, level, streak, completedCategories,
  { darioSessions, darioXp, darioRoadmapGenerated, darioCompareUsed }
);
```

---

## 13. Career Catalog

85 careers across 9 categories (defined in `artifacts/api-server/src/lib/simulations.ts`):

| Category | Count | Example Slugs |
|----------|------:|--------------|
| `engineering` | 9 | mechanical, civil, electrical, aerospace, biomedical |
| `business` | 10 | entrepreneurship, marketing, finance, stock-trader, crypto-analyst |
| `healthcare` | 11 | nursing, physician, PA, pharmacist, radiologist, dentist, vet |
| `trades` | 10 | electrician, plumber, hvac, carpenter, culinary-chef |
| `technology` | 10 | AI, cybersecurity, data-analyst, quantum-computing, ux-ui-designer |
| `law` | 8 | lawyer, prosecutor, police-officer, judge, detective, federal-agent |
| `science` | 9 | neuroscientist, chemist, physicist, astronomer, quantum-researcher |
| `life-advice` | 8 | tax-advisor, budget-counselor, personal-investing, resume-coach |
| `creative-design` | 10 | architect, fashion-designer, art-director, interior-designer, film-video-producer |

Each simulation has: `slug`, `title`, `category`, `emoji`, `description`, `available` flag, and a set of topics used to vary AI-generated missions.

---

## 14. Admin Panel

Access at `/admin`. Protected by email + password gate (see §8).

### Tabs

| Tab | Function |
|-----|----------|
| **Overview** | Platform stats — users, articles, videos, livestreams, content health |
| **Feed** | Create, edit, and delete career feed articles; analytics per article |
| **Videos** | Add videos by URL (YouTube / Vimeo / direct) or upload file (→ `/api/admin/upload-video`); delete |
| **Talks** | Manage expert talks (recorded), upcoming livestreams, recorded past livestreams |
| **Users** | View all registered accounts; edit name + plan; delete accounts; password hash status |
| **Dario** | View all Dario AI session logs from the database with conversation excerpts |
| **Leads** | Contact form + newsletter signups from localStorage |
| **Safety** | Moderation flags, trust scores, parent notifications (uses `x-admin-pin` API) |
| **Settings** | Daily article rotation count; platform feature toggles |

### Livestream Tier Visibility

When scheduling a new livestream, the admin can restrict visibility to specific subscription tiers (Starter, Explorer, Builder, Accelerator). Leaving no tiers selected means all plans can see the session.

### Video Upload

Two modes in the Add Video form:
- **URL mode** — paste a YouTube, Vimeo, or direct video URL
- **File upload mode** — upload a video file (≤500 MB) directly; it is stored server-side and served via `/api/admin/files/:filename`

---

## 15. Email Notifications

Email is sent via **Resend** (`RESEND_API_KEY`). The `sendEmail` helper is in `artifacts/api-server/src/lib/email.ts`.

Emails are sent in these scenarios:

| Trigger | Recipient | Type |
|---------|-----------|------|
| Student registers with parent email | Parent | Welcome + dashboard link |
| Tier 3 moderation flag | Parent | Safety alert |
| Tier 4 moderation flag | Parent | URGENT safety alert |
| Student shares contact info despite warning | Parent | Contact exchange alert |

All email sends are fire-and-forget (non-blocking to the registering request). Send status (`sent`, `sentAt`, `error`) is recorded in `parent_notifications`.

Parent dashboard URL format: `https://<REPLIT_DOMAIN>/parent?token=<accessToken>`

---

## 16. Deployment

The project is deployed via Replit Deployments. The published app runs at a `.replit.app` domain (or a custom domain if configured).

**Production environment differences:**
- `NODE_ENV=production`
- `DATABASE_URL` points to the production PostgreSQL instance
- `REPLIT_DOMAINS` contains the live hostname (used to build parent dashboard links)
- The reverse proxy (same path-based routing) is active on the public domain

**To push schema changes to production:**
```bash
# From the Replit shell, targeting the production DB
pnpm --filter @workspace/db run migrate
```

**Checking production logs:** Use the Replit deployment logs viewer, or the `fetch_deployment_logs` tool in the agent.

**Health check:** `GET https://<your-domain>/api/healthz` — returns `{ "status": "ok" }` when the API is up.
