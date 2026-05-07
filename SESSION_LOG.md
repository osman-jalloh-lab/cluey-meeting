## Session — 2026-05-06 (Part 3 — Multi-Account Calendar + Reconnect Flow + Ollama)

**What we changed:**
- `src/lib/google/oauth.ts`: Updated scopes to full set (openid, email, profile, gmail.readonly, gmail.modify, calendar.calendarlist.readonly, calendar.events.readonly, calendar.events). Added `hasCalendarScope()`, `hasGmailScope()`, `getReconnectAuthUrl()` (forces `prompt=consent`). `storeTokens` now preserves existing refresh token if Google doesn't re-issue one.
- `src/lib/google/calendar.ts`: Added `NormalizedCalendarEvent` interface with `sourceAccountId`, `sourceAccountEmail`, `calendarId`, `calendarName`. Added `fetchCalendarList()` and `getAllCalendarEvents(userId, options)` — fetches from ALL connected accounts that have calendar scopes, queries each calendar (not just primary), deduplicates, sorts by start time. Added scope guard in `createEvent()`. Kept old `fetchTodayEvents`/`fetchUpcomingEvents` for backwards compat.
- `src/app/api/accounts/route.ts`: Now returns `gmailConnected`, `calendarConnected`, `needsReconnect`, `isMcp` flags per account (derived from stored `scopes` string).
- `src/app/api/accounts/connect/google/route.ts`: Accepts optional `reconnectAccountId` — uses `getReconnectAuthUrl` for reconnects (forced consent).
- `src/app/api/accounts/callback/google/route.ts`: Handles reconnect state. `storeTokens` upsert on (userId, emailAddress) prevents duplicates. Redirects to `?success=reconnected`.
- `src/app/api/calendar/events/route.ts`: Now uses `getAllCalendarEvents()` for both today and upcoming — pulls from all calendar-enabled accounts.
- `src/app/(dashboard)/accounts/page.tsx`: Complete rebuild — shows Gmail/Calendar scope badges per account, Reconnect button for accounts with missing calendar scopes, amber warning banner, help instructions. No data lost on reconnect.
- `src/app/api/ai/calendar-action/route.ts` (new): Ollama-powered intent extraction from natural language instructions. Reads email context, account list, tasks from DB. Returns structured intent for user confirmation. Never auto-writes to Google Calendar.

**Database changes:** None — `scopes` column already exists. Reconnect updates existing row.

**Files changed:**
- `src/lib/google/oauth.ts` (modified)
- `src/lib/google/calendar.ts` (modified)
- `src/app/api/accounts/route.ts` (modified)
- `src/app/api/accounts/connect/google/route.ts` (modified)
- `src/app/api/accounts/callback/google/route.ts` (modified)
- `src/app/api/calendar/events/route.ts` (modified)
- `src/app/(dashboard)/accounts/page.tsx` (modified)
- `src/app/api/ai/calendar-action/route.ts` (new)

---

## Session — 2026-05-06 (Part 2 — Inbox Specialist + Today Tab)

**What we changed:**
- Upgraded `emailAccountAgent.ts`: added inbox type detection (`work` for @austincc.edu, `student_job` for gmail), specialized prompts per type, `detectedAlerts` array with category/suggestedAction, separate work/student-job categorization
- Upgraded `dailyBriefingAgent.ts`: now outputs `workEmailSection`, `studentJobSection`, `urgentFollowUps`, `suggestedNextActions` as separate structured sections
- Created `/app/(dashboard)/today/page.tsx`: new Today tab server component
- Created `TodayClient.tsx`: Today page UI with 4 clear sections (Work Email, Student/Job Email, Urgent Follow-Ups, Suggested Next Actions), Check Now button, Morning Briefing button, ngrok hosting tip
- Created `/api/ai/monitor/route.ts`: auto-monitoring endpoint that runs Inbox Specialist across all accounts, creates AgentMessage alerts for high-priority emails
- Updated `Sidebar.tsx`: added "Today" as the first nav item

**Files edited/created:**
- `src/lib/agents/emailAccountAgent.ts` (modified)
- `src/lib/agents/dailyBriefingAgent.ts` (modified)
- `src/app/(dashboard)/today/page.tsx` (new)
- `src/components/dashboard/TodayClient.tsx` (new)
- `src/app/api/ai/monitor/route.ts` (new)
- `src/components/layout/Sidebar.tsx` (modified)

**Architecture decisions:**
- One Inbox Specialist agent, two inbox types detected by email domain — no duplicate files
- Monitor endpoint creates `AgentMessage` records (messageType: alert) — surfaced in Today page and TeamFeed
- Alert format: "New ACC [Category]-related email detected. From: X. Subject: Y. Suggested next step: Z."
- Hosting: recommended ngrok for now, Vercel + Turso for permanent (compatible with existing libsql adapter)
- Alert system: dashboard Today tab now, Slack webhook planned for later

---

## Session — 2026-05-06

**What we changed:**
- Moved QUICK_CMDS chip buttons from the CEO Command bar (bottom of center column) to the right drawer (top, above Quick Assign)
- CEO CMD bar is now input + $RUN button only — no overflow row, always fully visible
- Quick Commands in the right drawer use a vertical stacked layout so all chips are visible without horizontal scroll

**Files edited:**
- `src/components/dashboard/DashboardClient.tsx`

**Decisions made:**
- Option A chosen: move chips to right drawer rather than capping PixelOffice height
- Vertical list layout in right drawer (not horizontal scroll) so nothing is ever clipped
- Also created CLAUDE.md, SESSION_LOG.md, TODO.md, MASTER_CONTEXT.md as project memory system

**Problems found:**
- QUICK_CMDS row was horizontally scrollable but clipped by parent `overflow:hidden` at smaller viewport heights
- PixelOffice height was unconstrained, pushing CEO CMD bar content out of view

**Next command to run:**
```
cd parawi && npm run dev
```
Then open http://localhost:3000/dashboard and confirm the Quick Commands are visible in the right sidebar and the CEO Command bar is fully visible at the bottom.
