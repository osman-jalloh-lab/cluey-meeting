# Cluey

AI-powered meeting recap tool. Log meetings, extract decisions and action items with Groq AI, sync with Google Calendar, and track commitments across projects.

## Features

- Google OAuth sign-in (read-only calendar access)
- Guest mode for quick access without an account
- AI summarisation via Groq (Llama 3.1) — runs server-side, key never reaches the browser
- Meeting feed with search, filtering by project and person
- Action items, decisions, and commitments extracted automatically
- EmailJS integration to notify assignees when tasks are completed
- JSON data export
- Keyboard shortcut `N` to open a new recap from anywhere

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Auth | Google OAuth 2.0 via `@react-oauth/google` |
| AI | Groq API (serverless proxy) |
| Email | EmailJS |
| Hosting | Netlify (functions + static) |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Google Cloud](https://console.cloud.google.com) project with the OAuth 2.0 API enabled
- A [Groq](https://console.groq.com) account (free tier available)

### Local development

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local — see Environment Variables below

# 3. Start the dev server with Netlify functions (recommended)
npx netlify dev

# Or for frontend-only (AI summarisation will not work):
npm run dev
```

Open [http://localhost:8888](http://localhost:8888) when using `netlify dev`, or [http://localhost:5173](http://localhost:5173) for `npm run dev`.

### Build

```bash
npm run build
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values.

| Variable | Where used | Notes |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Browser (OAuth) | From Google Cloud → Credentials |
| `GROQ_API_KEY` | Server only (Netlify function) | **No `VITE_` prefix** — must never reach the browser |
| `VITE_EMAILJS_SERVICE_ID` | Browser | Optional — task-done emails |
| `VITE_EMAILJS_TEMPLATE_ID` | Browser | Optional |
| `VITE_EMAILJS_PUBLIC_KEY` | Browser | Optional |

> **Important:** `GROQ_API_KEY` deliberately has no `VITE_` prefix. Vite bundles any `VITE_*` variable into the client JavaScript. The Groq key is only read by the serverless function in `netlify/functions/summarize.ts`.

On Netlify, set `GROQ_API_KEY` under **Site settings → Environment variables**.

## Security

This project follows [OWASP Top 10](https://owasp.org/www-project-top-ten/) guidelines:

| OWASP | Control |
|---|---|
| A01 Broken Access Control | Google OAuth scopes limited to `calendar.readonly`; guest mode is clearly sandboxed |
| A02 Cryptographic Failures | HTTPS enforced via HSTS; `GROQ_API_KEY` kept server-side only |
| A03 Injection | HTML output escaped via `esc()` helper; no `dangerouslySetInnerHTML`; CSP header blocks inline injection |
| A04 Insecure Design | API key never bundled into the browser; all AI calls proxied through serverless function |
| A05 Security Misconfiguration | Security headers set in `netlify.toml`: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| A06 Vulnerable Components | Direct dependencies kept minimal; run `npm audit` regularly |
| A07 Auth Failures | OAuth token stored in `sessionStorage` (cleared on tab close); logout clears all session state |
| A08 Data Integrity | Serverless function validates content-type, rejects oversized payloads (8 KB cap), and never proxies raw upstream errors to the client |
| A09 Logging Failures | Server-side errors logged with context prefix `[summarize]`; client receives generic messages only |
| A10 SSRF | All outbound URLs are hardcoded constants; no user-controlled URL construction |

### Keeping secrets safe

- `.env.local` is git-ignored via `*.local` and `.env.*` patterns — **never commit it**
- Use `.env.example` as the canonical template (contains placeholder values only)
- Rotate the Groq key immediately if it is ever accidentally exposed

## Project Structure

```
cluey/
├── netlify/
│   └── functions/
│       └── summarize.ts     # Serverless AI proxy (GROQ_API_KEY lives here)
├── src/
│   ├── components/          # React UI components
│   ├── context/
│   │   └── AuthContext.tsx  # Google OAuth + guest mode
│   ├── hooks/
│   │   ├── useAI.ts         # Calls /api/summarize (never Groq directly)
│   │   ├── useCalendar.ts   # Google Calendar read
│   │   └── useStorage.ts    # localStorage persistence
│   ├── types/
│   │   └── index.ts         # Shared TypeScript types
│   └── utils/               # Helpers (emailjs, gcal URL, escaping, etc.)
├── .env.example             # Template — copy to .env.local
├── netlify.toml             # Build config + security headers
└── tailwind.config.js
```

## License

MIT
