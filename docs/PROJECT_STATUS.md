# PROJECT_STATUS.md
# Last updated: 2026-05-07

---

## Project Purpose

Parawi is the core app. It is being built into a personal AI assistant command center accessible through a hosted web application.

The app supports:

- AI agents (Chief, Zara, Rex, Nova, Lex, Cal, and more planned)
- Gmail summaries with priority, sender, topic, and suggested action
- Google Calendar summaries and invite awareness
- Calendar conflict detection
- Task extraction from emails and meetings
- Meeting recap intelligence (porting from Cluey)
- Job search support
- Cloud access through login (Google OAuth, NextAuth v5)
- Local development mode
- Ollama as an optional local-only AI fallback
- OpenAI, Claude, Gemini, Groq through server-side API routes only

---

## Current Strategy

This is a **merge-and-unify strategy**.

- Parawi remains the main app.
- Cluey is a source of reusable features.
- Useful Cluey features are ported into Parawi.
- The long-term result is one unified deployed web application.
- Local development continues to work, but production access happens through the hosted app.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.4 (App Router + Turbopack) |
| Language | TypeScript strict |
| Styling | Tailwind CSS v4 — `@import "tailwindcss"` only |
| Database (dev) | SQLite via Prisma 7 + `@prisma/adapter-libsql` |
| Database (prod) | Turso (same libSQL adapter, one env var swap) |
| Auth | NextAuth v5 beta — use `auth()` not `getServerSession()` |
| AI (local) | Ollama — optional, auto-fallback to cloud |
| AI (cloud) | OpenAI GPT-4o-mini, Gemini 1.5 Flash, Anthropic Claude, Groq |
| Email | Gmail API (multi-account, `gmail.readonly`) |
| Calendar | Google Calendar API (multi-account, `calendar.readonly`) |
| Token security | AES-256-GCM — all Google tokens encrypted at rest |
| Notifications | Telegram Bot API |
| Package manager | npm |

### Breaking Changes — Read Before Touching Anything

- **Prisma 7:** DB URL is in `prisma.config.ts`, not `schema.prisma`.
- **NextAuth v5:** Use `auth()`. `getServerSession()` is gone.
- **Next.js 16:** `serverExternalPackages` at top level, not `serverComponentsExternalPackages`.
- **Zod v4:** Use `.issues`, not `.errors`.
- **Tailwind v4:** `@import "tailwindcss"` only. No `@tailwind base/components/utilities`.

---

## Current Working Features

### Infrastructure
- Dev server starts clean in ~1.4s (Turbopack)
- Prisma 7 + SQLite running, `dev.db` has data
- NextAuth v5 Google sign-in
- AES-256-GCM token encryption
- All env vars populated in `.env.local`
- Turbopack workspace root fixed (`next.config.ts`)
- Telegram webhook registered and tested

### Pages (all scaffolded)
- `/today` — email alerts, morning briefing, Check Now button
- `/dashboard` — PixelOffice, AgentTaskBoard, CEOCommand, TeamFeed
- `/email` — per-account tabs, email list from cache, AI Summarize
- `/calendar` — today + upcoming events, multi-account badges, Meet links
- `/jobs` — 10-tab pipeline, scored lead cards, follow-ups, Evaluate Job panel
- `/tasks` — full CRUD
- `/notes` — notes with task extraction
- `/assistant` — AI chat
- `/accounts` — Gmail/Calendar scope badges, Reconnect button
- `/settings` — memory and usage

### Agents
- `emailAccountAgent` (Zara) — work vs student/job inbox triage
- `dailyBriefingAgent` (Chief) — 4-section morning briefing
- `replyDraftAgent` — draft replies, never auto-sends
- `taskExtractorAgent` (Rex) — extract tasks from text
- `hrAgent` (Lex) — HR/compliance context
- `jobSearchAgent` (Nova) — job lead analysis
- `jobEvaluator` — full job scoring engine

### Google Integration
- OAuth connect + callback flow
- Multi-account storage with encrypted tokens
- Reconnect flow for missing scopes
- Gmail fetch to `EmailCache` table
- Calendar fetch across all accounts, all calendars, deduplicated

---

## Incomplete / Not Yet Tested

- Google OAuth connect flow end-to-end with real credentials
- Gmail messages loading and displaying
- Multi-account sync (second account)
- Telegram bot commands (webhook registered, not fully tested)
- Draft Reply UI (API exists, no frontend trigger)
- Calendar event approval UI (API exists, no frontend)
- `calendarInviteAgent` — not yet built (planned for Phase 2)

---

## Current Risks

- Breaking Parawi while porting Cluey code.
- Accidentally exposing API keys.
- Requesting too many Google OAuth scopes too early.
- Making production depend on local Ollama.
- Creating two separate apps instead of one unified app.
- Calendar or Gmail write actions happening without approval.

---

## Current Priorities

1. Keep Parawi stable.
2. Document the useful parts of Cluey.
3. Port Calendar read-only logic carefully.
4. Build `calendarInviteAgent`.
5. Add Gmail intelligence (specific summaries, priority ranking).
6. Deploy Parawi so it works from phone and desktop.
7. Keep API calls server-side only.
8. Keep AI spending near $30/month.
9. Require approval for all write actions.

---

## Memory Files

| File | Purpose |
|---|---|
| `IMPLEMENTATION_PLAN.md` | Full 5-phase roadmap |
| `CLUEY_MERGE_PLAN.md` | What is being ported from Cluey and how |
| `AGENTS.md` | Agent roster, rules, and specifications |
| `GOOGLE_INTEGRATION_PLAN.md` | OAuth scopes and integration strategy |
| `ENVIRONMENT_GUIDE.md` | All env vars, purpose, and security notes |
| `CHANGELOG_AI.md` | Append-only log of all changes |
