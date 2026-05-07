@AGENTS.md

# PARAWI — Project Memory

## Goal
Local-first personal AI command center for Osman. One dashboard: multiple Gmail accounts, Google Calendar, tasks, notes, AI assistant, job tracking. Private, runs on localhost.

## Stack
- Next.js 16.2.4 (App Router, Turbopack)
- TypeScript strict
- Tailwind CSS v4 — use `@import "tailwindcss"` NOT `@tailwind` directives
- Prisma 7.8.0 + `@prisma/adapter-libsql` (SQLite via libsql)
- NextAuth v5 beta + `@auth/prisma-adapter`
- Zod v4 — use `.issues` NOT `.errors`
- shadcn/radix-ui components

## Critical Breaking Changes
1. **Prisma 7**: No `url` in `schema.prisma` datasource. URL lives in `prisma.config.ts`. Must use `engineType = "client"` + `PrismaLibSql` adapter.
2. **Next.js 16**: `serverComponentsExternalPackages` → top-level `serverExternalPackages`.
3. **Zod v4**: `.error.errors` → `.error.issues`.
4. **NextAuth v5**: Use `auth()` not `getServerSession()`. Exports: `handlers, auth, signIn, signOut`.

## Architecture

### Pages (`src/app/(dashboard)/`)
`dashboard` | `email` | `calendar` | `tasks` | `notes` | `assistant` | `accounts` | `settings` | `jobs`

### API Routes (`src/app/api/`)
- `accounts/` — Google OAuth connect/callback, CRUD
- `ai/` — chat, agent, daily-briefing, ceo-command, auto-check
- `gmail/[accountId]/` — messages, summarize, draft-reply, send-approved
- `calendar/` — events, create-approved
- `tasks/` | `notes/` | `job-leads/` | `jobs/search/`
- `agent-messages/` | `agent-tasks/`
- `settings/` — memory, usage
- `dev/` — login (dev only), sync-emails

### Lib (`src/lib/`)
- `db.ts` — Prisma singleton with libsql adapter
- `auth.ts` — NextAuth v5 config
- `crypto.ts` — AES-256-GCM token encryption
- `google/` — `oauth.ts`, `gmail.ts`, `calendar.ts`
- `ai/` — `openai.ts`, `gemini.ts`, `claude.ts`, `router.ts`
- `agents/` — `emailAccountAgent`, `dailyBriefingAgent`, `replyDraftAgent`, `taskExtractorAgent`, `hrAgent`, `jobSearchAgent`
- `context/personal.ts` — Osman's personal context for AI

### Components (`src/components/`)
- `layout/` — `Sidebar.tsx`, `TopNav.tsx`
- `dashboard/` — `DashboardClient`, `AgentPanel`, `AgentTaskBoard`, `CEOCommand`, `PixelOffice`, `RecommendedJobs`, `TaskModal`, `TeamFeed`

## Design Decisions
- All Google tokens encrypted at rest (AES-256-GCM) in SQLite
- Multi-account Gmail: each account stored separately, fetched in parallel
- AI router selects model based on task type (cheap = GPT-3.5/Gemini Flash, smart = Claude/GPT-4)
- Agent tasks are async, stored in DB, polled by frontend
- CEOCommand = natural language → structured agent dispatch
- Jobs page tracks applications; job search agent scrapes leads

## Google/Gmail/Calendar Integration
- OAuth flow: `accounts/connect/google` → Google consent → `accounts/callback/google`
- Tokens stored encrypted, refreshed on use
- Gmail: fetch messages by accountId, AI summarize, draft reply, human-approve before send
- Calendar: read events, AI can propose new events, human-approve before create

## Agent Roles
| Agent | Purpose |
|---|---|
| `emailAccountAgent` | Sync and triage emails across accounts |
| `dailyBriefingAgent` | Morning summary: email + calendar + tasks |
| `replyDraftAgent` | Draft email replies for human approval |
| `taskExtractorAgent` | Pull tasks out of notes or emails |
| `hrAgent` | HR/compliance context (I-9, Workday patterns) |
| `jobSearchAgent` | Find and score job leads |

## .env.local Requirements
```
DATABASE_URL=file:./dev.db
NEXTAUTH_SECRET=<random>
ENCRYPTION_KEY=<32-byte hex>
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OPENAI_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
```

## Project Files — Roles
| File | Purpose |
|---|---|
| `CLAUDE.md` | Permanent project memory — architecture, decisions, rules |
| `SESSION_LOG.md` | Daily progress history — appended at end of every session |
| `MASTER_CONTEXT.md` | Updated only when architecture or priorities shift |
| `README.md` | Public project explanation |
| `TODO.md` | Current task list — updated every session |

## End-of-Session Checklist (run in order)
1. Append entry to `SESSION_LOG.md` (date, changes, files, decisions, problems, next command)
2. Update `TODO.md` (mark done, add new items)
3. Update `MASTER_CONTEXT.md` if architecture or priorities changed
4. Keep all entries concise — no padding

## Run Commands
```bash
cd parawi
npm run dev          # http://localhost:3000
npx prisma studio    # DB browser
```

## Build Status
Production build passes. TypeScript clean. Dev server runs on port 3000.

## Osman's Hard Rules (apply everywhere)
- No em dashes in any output
- No CPT mentions in application materials
- No: "excited", "passionate", "leverage", "utilize", "delve", "pivotal"
- Workday = daily operational use (reports, tasks, I-9 verification) — never "administered"
- Cover letters under 250 words, hook-proof-close format
- Never pad. Get to the point.

## Next Tasks (as of May 2026)
- Wire up real Google OAuth credentials in `.env.local`
- Test multi-Gmail account sync end to end
- Build Jobs page UI (tracking 100+ applications)
- Add calendar event approval flow UI
- Connect `jobSearchAgent` to a real job data source
