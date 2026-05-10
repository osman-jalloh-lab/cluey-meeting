# AGENTS.md
# Last updated: 2026-05-07

---

## Agent Working Rules

- Always inspect before coding. Do not assume the repo structure.
- Do not delete existing work without approval.
- Keep Parawi as the core app. Treat Cluey as a feature source only.
- Merge the best parts into one unified app. Do not create two separate long-term apps.
- Keep app behavior stable unless the user approves a change.
- Keep secrets out of frontend code. All API keys must be server-side only.
- Keep all AI calls server-side.
- Use read-only Google scopes first.
- Update markdown memory files after major changes. Append to `CHANGELOG_AI.md` after code changes.
- Keep the app cloud-accessible. Do not make production depend on a local machine.
- Do not make production depend on Ollama. Use Ollama only as an optional local fallback.
- Respect the $30/month AI budget target.

### Actions That Require Manual Approval

- Send emails
- Archive, delete, or label emails
- Accept, decline, or modify calendar invites
- Create, edit, or delete calendar events

---

## Stack Rules

- **Tailwind v4:** `@import "tailwindcss"` only. Never `@tailwind` directives.
- **NextAuth v5:** Use `auth()`. `getServerSession()` does not exist.
- **Prisma 7:** DB URL is in `prisma.config.ts`. Never add `url` to `schema.prisma`.
- **Zod v4:** Use `.issues` not `.errors`.
- **Next.js 16:** `serverExternalPackages` at top level.

---

## Agent Roster

| Agent | File | Role | Status |
|---|---|---|---|
| Chief | `dailyBriefingAgent.ts` | Morning briefing, routing | Implemented |
| Zara | `emailAccountAgent.ts` | Inbox triage, priority sorting | Implemented |
| Rex | `taskExtractorAgent.ts` | Task extraction and tracking | Implemented |
| Nova | `jobSearchAgent.ts` + `jobEvaluator.ts` | Career search, job scoring | Implemented |
| Lex | `hrAgent.ts` | HR/compliance context | Stub |
| replyDraftAgent | `replyDraftAgent.ts` | Draft email replies, no auto-send | Implemented |
| calendarInviteAgent | `calendarInviteAgent.ts` (planned) | Invite detection, conflict check, RSVP | Not yet built |
| Scout | Not yet started | Academic tracker | Not yet built |

---

## calendarInviteAgent — Specification

**Planned file:** `src/lib/agents/calendarInviteAgent.ts`

**Purpose:** Review pending Google Calendar invitations and recommend an action.

**Inputs:** Events from `getAllCalendarEvents`, pending invites (`needsAction`), organizer, attendees, time, description, location/Meet link.

**Responsibilities:** Detect pending invites, check conflicts, assess importance, summarize in plain language, recommend accept/decline/reschedule, wait for approval.

**Allowed without approval:** Read, summarize, detect conflicts, suggest steps.

**Requires approval:** Accept, decline, RSVP, create, edit, or delete any event.

**Example output:**
```
New invite from Jonathan Tyner.
Meeting: I-9 Process Review — Thursday, May 9 at 10:00 AM (30 min)
Conflict: Overlaps with Student Advising (9:30–10:30 AM).
Priority: High — work compliance.

Suggested: Ask Jonathan to move to 11:00 AM.

[ Approve Reply ] [ Decline ] [ Skip ]
```

---

## Manual Approval Workflow

1. Detect item.
2. Summarize item.
3. Check conflict or risk.
4. Suggest action.
5. Wait for approval.
6. Perform action only after approval.
7. Log in `CHANGELOG_AI.md` or activity history.
