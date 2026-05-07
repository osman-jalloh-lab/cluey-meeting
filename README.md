# PARAWI — Personal AI Command Center

A local-first personal AI dashboard and Telegram bot that manages email, calendar, tasks, job search, school, and HR/compliance workflows across multiple Google accounts.

Built with Next.js 16, Prisma 7, SQLite, and a multi-agent AI layer routing across Ollama (local), OpenAI, Gemini, and Anthropic.

---

## What It Does

PARAWI connects to your Google accounts, reads your email and calendar, manages your tasks, and surfaces everything through two interfaces:

1. **Web dashboard** at `localhost:3000` (or your deployed URL)
2. **Telegram bot** — a conversational AI partner on your phone with inline menus, agent personalities, and approval flows

Agents run automatically and push alerts, briefings, and priority summaries to Telegram without you having to open the app.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js 16 App                       │
│                  (App Router + Turbopack)                 │
├──────────────────┬──────────────────┬───────────────────┤
│   Web Dashboard  │   API Routes     │  Telegram Webhook  │
│   (React client) │  /api/**         │  /api/telegram/    │
├──────────────────┴──────────────────┴───────────────────┤
│                      Agent Layer                          │
│  emailAccountAgent  dailyBriefingAgent  hrAgent          │
│  jobSearchAgent     replyDraftAgent     taskExtractorAgent│
├─────────────────────────────────────────────────────────┤
│                      AI Router                            │
│  Ollama (local) → OpenAI GPT-4o-mini → Gemini Flash      │
│                                     → Anthropic Claude   │
├─────────────────────────────────────────────────────────┤
│                    Data Layer                             │
│  Prisma 7 + libSQL adapter + SQLite (dev) / Turso (prod) │
├─────────────────────────────────────────────────────────┤
│                  External Services                        │
│  Google OAuth  Gmail API  Google Calendar API            │
│  Telegram Bot API  Slack Webhooks (optional)             │
└─────────────────────────────────────────────────────────┘
```

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.4 (App Router, Turbopack) |
| Language | TypeScript strict mode |
| Styling | Tailwind CSS v4 |
| Database (dev) | SQLite via Prisma 7 + `@prisma/adapter-libsql` |
| Database (prod) | Turso (remote libSQL, one env var change) |
| Auth | NextAuth v5 beta + `@auth/prisma-adapter` |
| AI local | Ollama (`llama3.1`, `mistral`) |
| AI cloud | OpenAI GPT-4o-mini, Gemini 1.5 Flash, Anthropic Claude |
| Notifications | Telegram Bot API (primary), Slack webhook (optional) |
| Email | Gmail API — multi-account, parallel fetch |
| Calendar | Google Calendar API — multi-account, all calendars |
| Token security | AES-256-GCM encryption for all stored OAuth tokens |

---

## Agent Team

Each agent has a single defined role. No overlap.

| Agent | Telegram Name | Responsibility |
|---|---|---|
| `emailAccountAgent` | Zara — Inbox Specialist | Reads email, ranks by priority, detects needed replies, drafts responses |
| `dailyBriefingAgent` | Chief — Office Companion | Morning briefings, routes to correct agent, big-picture overview |
| `replyDraftAgent` | (used by Zara) | Drafts email replies — never sends without explicit user approval |
| `taskExtractorAgent` | Rex — Ops Manager | Creates and tracks tasks, reminders, follow-ups, action items |
| `hrAgent` | Lex — Work and Compliance | ACC HR, I-9, E-Verify, Workday, immigration and compliance workflows |
| `jobSearchAgent` | Nova — Career Advisor | Job applications, recruiter tracking, interview scheduling support |
| Calendar | Cal — Schedule Manager | Calendar events across all accounts, conflict detection, scheduling |
| Academic | Scout — Academic Tracker | Professor emails, assignment deadlines, class reminders |

---

## Telegram Bot

The bot is the primary mobile interface. Everything works with inline buttons — no memorizing commands required.

### Commands

```
/start          Office home screen
/office         Office home screen
/briefing       Full morning briefing with email priority cards
/emails         Scan all inboxes, sectioned by account type
/workemail      Work inbox only (ACC accounts)
/studentemail   Student and personal inbox
/today          Today's calendar events across all accounts
/week           Week ahead view
/tasks          Open task list
/addtask        Add a task: /addtask [title]
/jobs           Job search pipeline status
/hr             HR and compliance check
/team           Meet the full agent team
/menu           Office home screen (alias)
/help           Help and command list
```

### Office Home Screen

Shows a live snapshot:
- Urgent emails flagged
- Meetings scheduled for today
- Open tasks count

8-button department navigation: Inbox, Calendar, Tasks, Career, School, Work and HR, Briefing, Team.

### Email Priority Cards

After every email scan, the top 5 urgent emails appear as individual message cards showing:
- Sender and subject
- Why it matters (specific reason)
- Urgency level (high / medium / low)
- Suggested action
- [View in Gmail] — deep link to the exact message
- [Draft Reply] — Zara writes a draft for your review
- [Remind Later] — carries into tomorrow's briefing

### Draft Reply Flow

1. Tap [Draft Reply] on any email card
2. Zara drafts the reply using GPT-4o-mini
3. Bot sends the full draft for review
4. You choose one of five options:
   - Approve Send
   - Regenerate
   - Edit in Dashboard
   - Do Not Send
   - Remind Later
5. Nothing is ever sent automatically under any circumstance

### Navigation

Every response ends with `[Office] [Inbox] [Calendar] [Tasks]` for quick navigation. No dead ends.

---

## Dashboard Pages

| Route | Description |
|---|---|
| `/` | Dashboard home — Today tab, agent task board, morning briefing |
| `/email` | Email — multi-account inbox view |
| `/calendar` | Calendar — events across all connected accounts |
| `/tasks` | Task manager |
| `/notes` | Notes |
| `/assistant` | AI assistant chat |
| `/accounts` | Connected accounts — scope badges, reconnect flow |
| `/settings` | Settings — memory, usage, API preferences |
| `/jobs` | Job leads tracker |

---

## Google Integration

**Multi-account.** Connect multiple Google accounts. Each stored separately with its own encrypted tokens, fetched in parallel.

**Scopes requested per account:**
```
openid
email
profile
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/calendar.calendarlist.readonly
https://www.googleapis.com/auth/calendar.events.readonly
https://www.googleapis.com/auth/calendar.events
```

**Reconnect flow.** If an account is missing calendar scopes, the Accounts page shows a Reconnect button. Clicking it forces a new consent screen and upgrades the existing record — no duplicate account created.

**Token security.** Every access and refresh token is AES-256-GCM encrypted before writing to the database. Decrypted in memory only when making API calls.

---

## Email Intelligence

The email agent handles two inbox types automatically:

**Work inbox (`@austincc.edu`):**
Priority categories: HR onboarding, I-9 and E-Verify verification, Workday tasks and approvals, immigration documents (I-20, OPT, EAD, I-94, I-797, USCIS), name change requests, compliance deadlines, payroll and benefits enrollment.

**Student and personal inbox:**
Priority categories: professor messages, assignment deadlines, grade updates, academic warnings, recruiter outreach, interview requests, job offers, application status updates, phone screen invites, follow-up requests, rejection notices.

**Needs-response detection.** Flags emails containing: "Are you available", "Can we schedule", "Please confirm", "Let me know", "Action required", "Following up", "Interview", "Deadline", "Meeting", "Appointment", and similar phrases. Checks both unread emails and recently-read emails that still need a response.

---

## AI Model Routing

| Task | Model | Estimated cost |
|---|---|---|
| Email analysis | Gemini 1.5 Flash | Free (1500 req/day) |
| Reply drafting | GPT-4o-mini | ~$0.001 per draft |
| HR and compliance | GPT-4o-mini | ~$0.002 per query |
| General conversation | Ollama local, GPT-4o-mini fallback | Free locally |
| Daily briefing | GPT-4o-mini | ~$0.02 per briefing |
| Task extraction | Ollama local, GPT-4o-mini fallback | Free locally |

Ollama handles free local inference in development. Cloud models handle production automatically. The router checks `isOllamaAvailable()` before every local call and falls back silently.

---

## Project Structure

```
parawi/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Migration history
├── prisma.config.ts           # Prisma 7 config — adapter and URL here, not schema.prisma
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # All dashboard pages
│   │   │   ├── accounts/      # Connected accounts + scope badges + reconnect
│   │   │   ├── calendar/      # Multi-account calendar view
│   │   │   ├── email/         # Email inbox
│   │   │   ├── jobs/          # Job leads tracker
│   │   │   ├── notes/         # Notes
│   │   │   ├── settings/      # Settings
│   │   │   └── tasks/         # Task manager
│   │   ├── api/
│   │   │   ├── accounts/      # Google OAuth connect / callback / list / delete
│   │   │   ├── agent-messages/# Agent message log API
│   │   │   ├── agent-tasks/   # Agent task CRUD
│   │   │   ├── ai/            # Chat, briefing, monitor, calendar-action endpoints
│   │   │   ├── calendar/      # Events fetch, create-approved
│   │   │   ├── gmail/         # Per-account messages, summarize, draft, send-approved
│   │   │   ├── job-leads/     # Job lead CRUD
│   │   │   ├── tasks/         # Task CRUD
│   │   │   └── telegram/      # Webhook handler + setup endpoint
│   │   ├── login/             # Auth page
│   │   ├── globals.css        # Tailwind v4 imports
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   ├── dashboard/         # AgentTaskBoard, TodayClient, CEOCommand, etc.
│   │   └── layout/            # Sidebar, TopNav
│   └── lib/
│       ├── agents/            # All agent implementations
│       ├── ai/                # openai.ts, gemini.ts, claude.ts, ollama.ts, router.ts
│       ├── context/           # personal.ts — base context injected into AI prompts
│       ├── google/            # oauth.ts, gmail.ts, calendar.ts
│       ├── auth.ts            # NextAuth v5 config
│       ├── crypto.ts          # AES-256-GCM encryption and decryption
│       ├── db.ts              # Prisma singleton with libSQL adapter
│       ├── telegram.ts        # Bot API helpers — send, buttons, webhook utilities
│       └── utils.ts           # Shared utilities
├── .env.local                 # Local secrets — never committed
├── CLAUDE.md                  # AI-assisted development memory
├── SESSION_LOG.md             # Development history
└── TODO.md                    # Current task list
```

---

## Setup (Local Development)

### Prerequisites

- Node.js 20 or higher
- A Google Cloud project with OAuth 2.0 credentials configured
- Telegram bot token from [@BotFather](https://t.me/BotFather)
- Your Telegram chat ID (message your bot then check `getUpdates`)
- OpenAI API key
- Google Gemini API key
- Anthropic API key (optional)
- Ollama running locally (optional — improves cost, not required)

### 1. Clone and install

```bash
git clone https://github.com/osman-jalloh-lab/yash-assistant-
cd yash-assistant-
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root:

```env
# Database
DATABASE_URL="file:./dev.db"

# Auth
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret

# AI providers
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...

# Token encryption — must be exactly 64 hex characters (32 bytes)
# Generate: openssl rand -hex 32
ENCRYPTION_KEY="your-64-char-hex-string"

# Telegram
TELEGRAM_BOT_TOKEN=1234567890:ABCdef...
TELEGRAM_CHAT_ID=your-numeric-chat-id

# Optional
SLACK_WEBHOOK_URL=
OLLAMA_BASE_URL=http://localhost:11434
```

### 3. Initialize the database

```bash
npx prisma db push
```

### 4. Start the development server

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Configure Google OAuth

In [Google Cloud Console](https://console.cloud.google.com/):
1. APIs and Services → Credentials → Create OAuth 2.0 Client ID
2. Application type: Web application
3. Authorized redirect URIs: `http://localhost:3000/api/accounts/callback/google`
4. Add all required scopes in OAuth consent screen

### 6. Register the Telegram webhook

Start an HTTPS tunnel (ngrok or similar):

```bash
ngrok http 3000
```

Register the webhook — must be logged in first:

```bash
curl -X POST http://localhost:3000/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-ngrok-url.ngrok-free.app"}'
```

Verify it registered:

```bash
curl http://localhost:3000/api/telegram/webhook
```

### 7. Connect your Google accounts

1. Open `http://localhost:3000`
2. Sign in with Google
3. Go to the Accounts page
4. Connect each Google account (work, personal, school)
5. If any account shows missing calendar scope, tap Reconnect

---

## Production Deployment

### Option A: Vercel + Turso (recommended)

Computer can be off. Ollama replaced by cloud models automatically.

**Vercel free tier:** 10-second function timeout. Tight for briefings.
**Vercel Pro ($20/month):** 60-second timeout. Required if briefings time out.

**Step 1 — Create Turso database:**

```bash
npm install -g turso
turso auth login
turso db create parawi
turso db tokens create parawi
# Copy the URL and token
```

**Step 2 — Push schema to Turso:**

```bash
DATABASE_URL="libsql://your-db.turso.io" \
DATABASE_AUTH_TOKEN="your-token" \
npx prisma db push
```

**Step 3 — Deploy to Vercel:**

```bash
npm install -g vercel
vercel deploy
```

**Step 4 — Set environment variables in Vercel dashboard:**

All variables from `.env.local`, replacing:
```
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your-turso-token
NEXTAUTH_URL=https://your-app.vercel.app
```

**Step 5 — Re-register Telegram webhook:**

```bash
curl -X POST https://your-app.vercel.app/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-app.vercel.app"}'
```

---

### Option B: Cloudflare Tunnel (keep Ollama, computer stays on)

Your computer runs the app. Cloudflare provides a permanent public HTTPS URL.

```bash
# Install cloudflared
winget install Cloudflare.cloudflared

# Create a named tunnel pointing to localhost
cloudflared tunnel create parawi
cloudflared tunnel route dns parawi your-domain.com
cloudflared tunnel run parawi
```

No database migration. No Ollama changes. Computer must stay on.

---

## Estimated Monthly Cost in Production

| Service | Cost |
|---|---|
| Gemini 1.5 Flash (email scanning) | Free — stays within 1500 req/day free tier |
| OpenAI GPT-4o-mini (agents, drafts) | $2 to $8 per month at personal use volume |
| Turso database | Free tier covers personal use |
| Vercel free tier | Free (10s function limit) |
| Vercel Pro if needed | $20 per month |

Typical daily use: roughly $2 to $10 per month total without Vercel Pro.

---

## Key Design Rules

**Nothing sends without approval.** Every email draft, calendar event, and task creation shows a Telegram confirmation before executing. There is no auto-send path anywhere in the codebase.

**Webhook handlers are always awaited.** The Telegram webhook `await`s all message and callback handlers before returning 200. Fire-and-forget patterns cause Next.js to terminate the async work after the response is sent — messages appear received but nothing actually runs.

**Inbox type is auto-detected.** The email agent checks the account email address. `@austincc.edu` addresses get work-focused analysis (HR, immigration, compliance). All other addresses get student and career-focused analysis. Same agent, different prompt.

**Tokens never stored in plaintext.** Every Google OAuth access token and refresh token is encrypted with AES-256-GCM before the database write. The encryption key in `.env.local` must be exactly 32 bytes (64 hex characters).

**Calendar deduplication is per-account.** The same Google event can appear in multiple calendars (primary plus shared). Deduplication runs per connected account using a Set of seen event IDs, not globally, to avoid dropping legitimately duplicate cross-account events.

---

## Breaking Changes in This Stack

These differ from common documentation — read before modifying:

| Package | What changed |
|---|---|
| **Next.js 16** | `serverComponentsExternalPackages` renamed to top-level `serverExternalPackages` |
| **Prisma 7** | No `url` field in `schema.prisma` datasource. URL lives in `prisma.config.ts`. Must use `engineType = "client"` with `PrismaLibSql` adapter. |
| **NextAuth v5** | `getServerSession()` removed. Use `auth()` instead. Named exports: `handlers`, `auth`, `signIn`, `signOut`. |
| **Zod v4** | `.error.errors` renamed to `.error.issues` |
| **Tailwind CSS v4** | `@tailwind base/components/utilities` directives removed. Use `@import "tailwindcss"` |

---

## Security

- `.env.local` is in `.gitignore` — it is never committed
- `*.db` files are in `.gitignore` — the local SQLite database is never committed
- All Google OAuth tokens are AES-256-GCM encrypted before storage
- Telegram webhook validates every update against `TELEGRAM_CHAT_ID` — updates from other chat IDs are silently dropped with a 200 response
- Email content, calendar data, and HR/compliance information are processed locally or by explicitly configured AI providers only — never forwarded to third-party autonomous agent platforms

---

## Development Utilities

```bash
npm run dev          # Start dev server at localhost:3000 with Turbopack
npx prisma studio    # Open Prisma database browser
npx prisma db push   # Push schema changes to the database
npx tsc --noEmit     # TypeScript check without building
```

---

## License

Private — personal use only.
