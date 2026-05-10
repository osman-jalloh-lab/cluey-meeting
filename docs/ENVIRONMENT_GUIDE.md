# ENVIRONMENT_GUIDE.md
# Last updated: 2026-05-07

---

## Rules

- Never commit `.env.local` or any `.env` file.
- Keep `.env.example` safe — placeholder values only.
- Production secrets belong in Vercel (or your hosting provider) environment settings.
- API keys must never be sent to the browser. All AI calls are server-side only.
- Ollama is optional and local only. Never set `OLLAMA_BASE_URL` in production.

---

## Required Environment Variables

### App

| Variable | Purpose | Dev Value | Required |
|---|---|---|---|
| `NEXTAUTH_URL` | Auth callback base URL | `http://localhost:3000` | Yes |
| `NEXTAUTH_SECRET` | NextAuth session encryption | `openssl rand -base64 32` | Yes |
| `NODE_ENV` | Environment mode | `development` / `production` | Auto |

### Auth — Google OAuth

| Variable | Purpose | Where to Get | Required |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | OAuth Client ID | Google Cloud Console → Credentials | Yes |
| `GOOGLE_CLIENT_SECRET` | OAuth Secret | Google Cloud Console → Credentials | Yes |

### Database

| Variable | Purpose | Dev Value | Required |
|---|---|---|---|
| `DATABASE_URL` | Prisma DB connection | `file:./dev.db` | Yes |
| `TURSO_DATABASE_URL` | Turso remote DB URL | From Turso dashboard | Production only |
| `TURSO_AUTH_TOKEN` | Turso auth token | From Turso dashboard | Production only |
| `ENCRYPTION_KEY` | AES-256-GCM for stored Google tokens | `openssl rand -hex 32` (exactly 64 chars) | Yes |

### AI Providers (Server-Side Only)

| Variable | Purpose | Where to Get | Required |
|---|---|---|---|
| `OPENAI_API_KEY` | OpenAI (GPT-4o-mini) | OpenAI dashboard | Optional |
| `ANTHROPIC_API_KEY` | Claude (complex tasks) | Anthropic console | Optional |
| `GEMINI_API_KEY` | Gemini Flash (cheap batch tasks) | Google AI Studio | Optional |
| `GROQ_API_KEY` | Groq (fast/cheap, from Cluey) | Groq console | Optional |

### Local Only

| Variable | Purpose | Dev Value | Required |
|---|---|---|---|
| `OLLAMA_BASE_URL` | Local LLM base URL | `http://localhost:11434` | Local dev only |

### Notifications

| Variable | Purpose | Where to Get | Required |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Telegram bot access | BotFather | Optional |
| `TELEGRAM_CHAT_ID` | Your Telegram user ID | `getUpdates` API | Optional |

### Optional / Legacy

| Variable | Purpose | Notes |
|---|---|---|
| `SLACK_WEBHOOK_URL` | Slack alert fallback | Leave empty if unused |

---

## Security Notes

- `ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes). Verify with `$env:ENCRYPTION_KEY.Length`.
- Never set `GROQ_API_KEY` or any AI key with a `VITE_` prefix. In Parawi (Next.js), only `NEXT_PUBLIC_` vars reach the client. Keep all AI keys without any public prefix.
- Google tokens are stored encrypted in the database. Never log decrypted tokens.
- Rotate any key immediately if it is accidentally exposed in a commit or log.
