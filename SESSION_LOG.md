# PARAWI Session Log

---

## Session — 2026-05-10 (evening)

**What we changed:**
- Wired all 7 dept tile counts to real DB data (Career → JobLead, School → Note, Work/HR → AgentTask)
- Built and shipped the ⌘K command palette

**Files edited:**
- `src/app/(dashboard)/dashboard/page.tsx` — Added `jobCount`, `noteCount`, `hrCount` parallel DB queries
- `src/components/dashboard/DashboardClient.tsx` — Wired Career/School/HR tiles; added 3 new props
- `src/components/layout/CommandPalette.tsx` — NEW: full command palette component
- `src/components/layout/CommandTopBar.tsx` — Added ⌘K/Ctrl+K global listener, click handler, renders `<CommandPalette>`

**Decisions made:**
- Career count excludes `Rejected`, `Accepted`, `Skipped` JobLead statuses
- Work/HR count filters AgentTasks by `assignedTo` matching Lex/HR agent names
- Palette AI queries go to `/api/ai/ceo-command` (existing CEO command endpoint); response shown inline without closing the palette
- Nav items and quick actions shown grouped by default; filtering collapses groups and appends AI option

**Problems found:**
- Escaped single quote in JSX `placeholder` attribute caused TS1003/TS1382 — fixed by switching to double-quote string with HTML entities

**Next command to run:**
```
npm run dev  # ⌘K to open palette
```

---

## Session — 2026-05-10

**What we changed:**
- Implemented the full PARAWI Command Center design from the extracted design archive
- Rewrote the shell: `.shell` grid (260px rail + 64px topbar), new `CommandTopBar`, new `PixelSidebar` with DEPARTMENTS + AGENTS arrays
- Built full `DashboardClient` canvas: today hero, dept tile strip (7 tiles), unified activity feed (7 agent items), approval queue (real DB + static fallback), agent office floor (8 cells, load meters), model cost card, calendar schedule timeline
- Added `AnimatePresence` exit animations to `TaskModal`, `AgentTaskBoard` output drawer, `RecommendedJobs` add-lead form, `PixelSidebar` submenu (Phase 3)
- Added stagger animation to task list items (Phase 2)
- Fixed shell layout: `.shell > .shell-canvas` was missing padding/flex/background (was on unused `.cc-canvas`), removed duplicate old `.rail` rule, fixed double `.shell-canvas` wrapper in `DashboardClient`
- Fixed login page: removed `onMouseEnter`/`onMouseLeave` from server component button
- Updated `dashboard/page.tsx` to also fetch `pendingApprovals` (agentTasks with `requiresApproval: true`)

**Files edited:**
- `src/app/globals.css` — Full Command Center CSS added; fixed `.shell > .shell-canvas` and removed duplicate `.rail`
- `src/components/layout/CommandTopBar.tsx` — NEW: topbar with cost chip, Telegram status, user avatar
- `src/components/layout/PixelSidebar.tsx` — Complete rewrite: DEPARTMENTS + AGENTS, rail-status footer, Ollama/cost fetch
- `src/components/dashboard/DashboardClient.tsx` — Complete rewrite: full command center canvas, fixed fragment wrapper
- `src/app/(dashboard)/layout.tsx` — Updated to `<div className="shell">` with `CommandTopBar` + `PixelSidebar`
- `src/app/(dashboard)/dashboard/page.tsx` — Added `pendingApprovals` fetch
- `src/app/(dashboard)/tasks/page.tsx` — Stagger animation on task items
- `src/components/dashboard/TaskModal.tsx` — AnimatePresence exit animation
- `src/components/dashboard/AgentTaskBoard.tsx` — AnimatePresence on output drawer
- `src/components/dashboard/RecommendedJobs.tsx` — AnimatePresence on add-lead form
- `src/app/login/page.tsx` — Removed event handlers from server component
- `public/office-scene.png` — NEW: pixel office background image

**Decisions made:**
- Used `color-mix(in srgb, ...)` (not `oklab`) for dynamic tinting to match design
- Approval queue falls back to 5 static design items when no real `agentTasks` with `requiresApproval` exist
- Activity feed is static agent briefing items (no unified feed table in DB yet)
- Agent floor is static (agents are conceptual, not DB-driven)
- `DashboardClient` uses React fragment `<>` — layout's `<main className="shell-canvas">` provides the grid cell

**Problems found:**
- `.shell > .shell-canvas` was missing its padding/flex/background (those were on `.cc-canvas` which was never used) — canvas appeared empty
- Duplicate `.rail` CSS rule (old one overrode new command center one) — removed
- Login page had `onMouseEnter`/`onMouseLeave` on a server component button — caused RSC error
- `DashboardClient` was wrapping content in a second `.shell-canvas` div — fixed to use `<>`

**Next command to run:**
```
npm run dev  # http://localhost:3000/dashboard
```

---

## Session: 2026-05-09

### Server Fixes
- Fixed NextAuth v5 missing `AUTH_SECRET`/`AUTH_URL` in `.env.local` (renamed from v4 names)
- Fixed Prisma 7 `PrismaLibSql` API: changed from passing a pre-created libsql client to passing `{ url, authToken }` config object directly
- Cleared stale `.next/` Turbopack cache that was running old compiled code
- Killed stale server process on port 3000 that had old env vars

### UI/UX Update — Design System Applied
**Source:** `docs/claude-design-system/` (Pixel Agents design system)

- **`globals.css`** — Added token bridges (old `--foreground`/`--card`/etc. → design system vars) + full component CSS from office-dashboard prototype
- **`login/page.tsx`** — Fixed "Yash's Command Centre" → "PARAWI", applied design system card/button styling
- **`email/page.tsx`** — Redesigned with `.pg-wrap`, `.pg-topbar`, `.pg-panel`, `.pg-row`, `.badge-*`, `.btn-primary`, `.empty-state`, `.skel`
- **`calendar/page.tsx`** — Redesigned with same patterns + `.approval-strip` for calendar invite agent cards, `.tag-chip` for location/calendar badges
- **`tasks/page.tsx`** — Redesigned with `.pg-wrap`, `.pg-panel`, `.pg-row`, `.empty-state`, `.tag-chip`, `.skel`
- **`jobs/page.tsx`** — Redesigned topbar, evaluate panel, follow-ups, pipeline tabs, lead cards; updated `StatusBadge`/`StatusSelect`/`Detail` sub-components to design system tokens
- **`assistant/page.tsx`** — Redesigned chat UI with `.pg-topbar`, design system message bubbles, `.btn-ghost` quick prompts, `.btn-primary` send button

All logic (API calls, state, handlers) preserved unchanged.

### Navigation & Dashboard Restructure

**Before:** 10 flat sidebar items (Office, Email Center, Calendar, Tasks, Job Search, AI Agents, Projects, Knowledge Base, Accounts, Settings)

**After:** 5 top-level items with collapsible Integrations group:
1. Dashboard → `/dashboard` (clean overview)
2. Office View → `/office` (pixel office + agent workspace)
3. Tasks → `/tasks`
4. Integrations (collapsible) → Email / Calendar / Job Search / Accounts / Notes
5. Settings → `/settings`

**Files changed:**
- `src/components/layout/PixelSidebar.tsx` — Reduced to 5 nav items, added collapsible Integrations group
- `src/components/dashboard/DashboardClient.tsx` — Rewritten as clean overview (stats, pending tasks, email summary, integrations status, quick actions)
- `src/components/dashboard/OfficeClient.tsx` — NEW: Full office experience (pixel office, agent rooms, stats, activity feed, agent status, analytics)
- `src/app/(dashboard)/office/page.tsx` — NEW: Route for Office View

**Removed from nav (still accessible via routes):** Projects, AI Agents (accessible from quick actions), separate "Agent Room" concept merged into Office View
