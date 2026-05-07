# PARAWI — Master Context

_Only updated when architecture or priorities shift. For session history see SESSION_LOG.md. For tasks see TODO.md._

## What This Is
Local-first personal AI command center. Runs on localhost. No cloud hosting. One dashboard for multiple Gmail accounts, Google Calendar, tasks, notes, AI assistant, and job tracking.

## Current Phase
**Phase 1 — Make it real.** The scaffold is done. The blocker is credentials. Nothing works end to end until `.env.local` has real values and the Google OAuth flow is tested.

## Priority Order
1. Google OAuth working (unblocks everything)
2. Gmail multi-account sync verified
3. Jobs page UI built
4. Calendar approval flow UI
5. Agents running and returning real data

## Architecture Decisions (locked)
- SQLite via libsql — local only, no remote DB
- All Google tokens AES-256-GCM encrypted before storage
- AI router picks model by task: cheap tasks → GPT-3.5 / Gemini Flash, smart tasks → Claude / GPT-4
- Agent tasks async: stored in DB, polled by frontend — no websockets
- Human approval required before any email send or calendar event create
- CEOCommand = natural language → structured agent dispatch

## Known Constraints
- Next.js 16 + Prisma 7 + Zod v4 + NextAuth v5 all have breaking changes vs training data — see CLAUDE.md
- F-1 student, part-time schedule, limited dev hours — keep scope tight
- No paid hosting — stays on localhost unless explicitly changed

## Last Architecture Change
2026-05-06 — Initial architecture established. No changes yet.
