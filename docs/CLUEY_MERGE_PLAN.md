# CLUEY_MERGE_PLAN.md
# Last updated: 2026-05-07

> Note: An earlier version of this file was named CLUEY_TAKEOVER_PLAN.md and used takeover language. This file supersedes it. The strategy is a merge-and-unify, not a replacement.

---

## Purpose

This file tracks how Cluey features will be reviewed and merged into Parawi.

---

## Strategy

Cluey should not replace Parawi.

Cluey should be treated as a **feature source**.

The goal is to extract the useful logic from Cluey and adapt it into Parawi's architecture.

The long-term result is one unified deployed web application, not two separate apps.

---

## Cluey — What It Is

**Repo:** `cluey-meeting` (local: `c:\Users\osman\OneDrive\Desktop\cluey`)

Cluey is an AI-powered meeting recap tool built with React 18, Vite, TypeScript, Tailwind CSS v3, and Netlify. It is a client-side SPA with a single Netlify serverless function for AI calls.

**What Cluey does:**
- Google OAuth sign-in (`@react-oauth/google`, `calendar.readonly` scope)
- Guest mode (bypasses login)
- Meeting feed with search and filtering by project and person
- AI summarization via Groq Llama 3.1 (proxied through Netlify function — key never reaches browser)
- Extracts action items, decisions, and commitments from meeting notes
- EmailJS integration for task assignment notifications
- JSON data export
- localStorage persistence (no server database)

**Security practices worth preserving:**
- `GROQ_API_KEY` has no `VITE_` prefix — never bundled to client
- All AI calls go through a serverless proxy (`netlify/functions/summarize.ts`)
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options in `netlify.toml`
- OAuth token in `sessionStorage` only (cleared on tab close)
- HTML escaping via `esc()` helper
- 8 KB payload cap on the serverless function
- Generic error messages to client — no raw upstream errors

---

## Cluey — Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS v3 |
| Auth | `@react-oauth/google` (client-side OAuth) |
| AI | Groq (Llama 3.1) via Netlify function |
| Email | EmailJS |
| Persistence | localStorage (no database) |
| Hosting | Netlify |

---

## Cluey Features to Review and Consider Porting

| Feature | Source File | Port Into Parawi? | Notes |
|---|---|---|---|
| Calendar read-only hook | `src/hooks/useCalendar.ts` | Yes — extract logic | Parawi already has `src/lib/google/calendar.ts`. Compare and improve. |
| AI meeting summarization | `netlify/functions/summarize.ts` | Yes — extract prompt logic | Parawi uses Next.js Route Handlers. Port the Groq prompt pattern and payload validation. |
| Action item extraction | Part of summarize function | Yes | Port into `taskExtractorAgent.ts` or a new `meetingRecapAgent`. |
| Decision + commitment extraction | Part of summarize function | Maybe | Evaluate if it adds value to Parawi's existing agent system. |
| AI hook (client-side proxy call) | `src/hooks/useAI.ts` | Partially | Extract the proxy call pattern. Parawi already has `/api/ai/*` routes. |
| Security header config | `netlify.toml` | Yes — translate to Next.js | Move CSP, HSTS, X-Frame-Options to `next.config.ts` or middleware. |
| Meeting feed UI | `src/components/` | Maybe | Evaluate for a future Meetings page in Parawi. |
| HTML escaping helper | `src/utils/` | Yes — small utility | Add to Parawi's `src/lib/utils.ts`. |
| JSON export | Not yet reviewed | Maybe | Evaluate if this adds value to Parawi's existing export patterns. |
| Guest mode | `src/context/AuthContext.tsx` | No | Parawi uses NextAuth v5 with a real DB session. Guest mode conflicts with approved-user access requirements. |
| EmailJS notifications | `src/utils/` | No | Parawi uses Telegram for notifications. EmailJS is redundant. |
| localStorage persistence | `src/hooks/useStorage.ts` | No | Parawi uses Prisma + SQLite/Turso. Do not regress to localStorage. |
| Netlify hosting config | `netlify.toml` | No — platform-level | Parawi targets Vercel. Preserve security header patterns only. |

---

## What Not to Do

- Do not overwrite Parawi with Cluey code.
- Do not keep both apps as separate production apps long-term.
- Do not duplicate auth systems.
- Do not expose Cluey's API keys or patterns to the browser.
- Do not port code that conflicts with Parawi's Prisma/libSQL architecture.
- Do not replace Parawi's NextAuth session system with Cluey's client-side OAuth.
- Do not use localStorage for persistence in Parawi.

---

## Migration Process (Per Feature)

For each Cluey feature being ported:

1. Identify the source file in Cluey.
2. Explain what the feature does.
3. Identify where it belongs in Parawi.
4. Check dependencies (does it conflict with existing Parawi code?).
5. Adapt to Parawi's architecture (Next.js Route Handler, Prisma, TypeScript strict).
6. Test locally.
7. Append entry to `CHANGELOG_AI.md`.
8. Update `PROJECT_STATUS.md`.

---

## Rollback Plan

- Use git branches for all migration steps.
- If Parawi breaks, revert the branch. Cluey remains untouched in its own directory.
- Cluey's local directory: `c:\Users\osman\OneDrive\Desktop\cluey`
- Cluey's GitHub: `https://github.com/osman-jalloh-lab/cluey-meeting`
