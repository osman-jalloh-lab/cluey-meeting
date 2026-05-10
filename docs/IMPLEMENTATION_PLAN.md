# IMPLEMENTATION_PLAN.md
# Last updated: 2026-05-07

---

## Core Migration Strategy

The goal is not to fully overtake or blindly replace one repo with another.

The goal is to combine the best parts of both repos into one main production app.

**Parawi** will remain the core app and primary web application.

**Cluey** will be treated as a feature source. Useful Cluey features should be reviewed, extracted, adapted, and ported into Parawi only when they improve the final app.

The final app should be accessible through the existing hosted web application, not only through a local development server.

Local development should still work, but production use should happen through the deployed web app with login, protected routes, secure server-side API calls, and cloud database access.

**This is a merge-and-unify strategy, not a full replacement strategy.**

- Parawi is the main app.
- Cluey is a source of reusable features.
- The final result should be one cloud-accessible web app.

---

## Phase 1: Stabilization & Hybrid Foundation (Current)

### Goal

Use Parawi as the core app and merge in the best features from Cluey without breaking the existing web application.

### Tasks

- Audit both codebases: Parawi and Cluey.
- Confirm Parawi installs and runs locally.
- Confirm Parawi can still deploy to the existing web application.
- Verify required environment variables.
- Identify reusable Cluey features:
  - Google Calendar read-only logic
  - meeting recap AI extraction
  - action item extraction
  - server-side AI call pattern
- Decide which Cluey features should be ported into Parawi.
- Do not overwrite Parawi core files until the migration plan is approved.
- Do not keep two separate apps long-term. Final goal is one unified app.
- Create or update project memory files:
  - PROJECT_STATUS.md
  - IMPLEMENTATION_PLAN.md
  - CLUEY_MERGE_PLAN.md
  - CHANGELOG_AI.md
  - ENVIRONMENT_GUIDE.md
  - GOOGLE_INTEGRATION_PLAN.md
  - AGENTS.md

### Done When

- Parawi runs locally. ✅
- Parawi can still deploy to the existing web application.
- Cluey features worth preserving are documented. ✅
- No secrets are exposed in the browser. ✅
- Migration risks are documented. ✅
- The merge strategy is clear. ✅
- The next safe feature migration is identified.

---

## Phase 2: Core Auth, Calendar, and Invite Awareness

### Goal

Make Parawi aware of calendar events, invites, conflicts, and pending approvals.

### Tasks

- Use Parawi's existing Google OAuth infrastructure.
- Add or confirm `calendar.readonly` scope.
- Read upcoming calendar events.
- Read pending calendar invitations (status: `needsAction`).
- Detect event conflicts and time overlaps.
- Show event details:
  - title
  - sender/organizer
  - date and time
  - location
  - Google Meet link if available
  - attendees
  - RSVP status
- Build a `calendarInviteAgent` that can explain:
  - what the invite is about
  - who sent it
  - whether it overlaps with another event
  - whether it looks important
  - recommended action

### Approval Rule

The agent must NOT accept, decline, or edit calendar events automatically.

Example output:

> "New invite from Sarah for Tuesday at 2 PM. It overlaps with your HR meeting from 1:30 to 2:30 PM. Suggested action: decline or ask to reschedule. Approve action?"

### Done When

- Calendar events display correctly.
- Pending invites are detected.
- Overlapping events are flagged.
- Agent gives a recommendation.
- User approval is required before any calendar action.

---

## Phase 3: AI Gmail and Task Agents

### Goal

Move from basic unread counts to useful email intelligence.

### Tasks

- Expand Gmail agent to read recent emails with `gmail.readonly`.
- Summarize emails with:
  - sender
  - subject
  - main message
  - urgency
  - priority
  - suggested next action
- Connect Gmail context to Calendar context.
- Detect emails related to:
  - meetings
  - deadlines
  - job applications
  - HR work
  - school
  - bills
  - urgent requests
- Implement task extraction from Cluey's meeting recap logic into Parawi's agent system.
- Add or improve `taskExtractorAgent`.

### Approval Rule

The agent must NOT send, archive, delete, or label emails unless I approve.

### Done When

- Gmail agent gives specific summaries.
- Emails are ranked by priority.
- Tasks are extracted from emails and meeting recaps.
- No email write actions happen without approval.

---

## Phase 4: Multi-device and Cloud Deploy

### Goal

Make the unified Parawi app accessible from the existing hosted web application so I can log in from anywhere without keeping my laptop on.

### Tasks

- Deploy Parawi to the chosen production host (likely Vercel unless current setup points elsewhere).
- Connect the existing website/domain if already available.
- Configure production environment variables.
- Configure Turso remote database.
- Keep all AI calls inside server-side API routes.
- Keep Google tokens secure (AES-256-GCM encrypted in DB).
- Protect dashboard routes with login.
- Add approved-user-only access.
- Confirm mobile and desktop access.
- Keep local development available, but do not make production depend on the local machine.

### Done When

- I can log in from phone, work computer, and personal computer.
- My laptop does not need to stay on.
- API keys are server-side only.
- Database works in production.
- Dashboard is protected.
- The unified app is available through the hosted web app.
- Local development still works separately from production.

---

## Phase 5: AI Cost Control and Model Router

### Goal

Keep AI usage around $30/month.

### Tasks

- Add AI model router.
- Use cheaper models for simple tasks (Gemini Flash, Groq).
- Use stronger models only for deeper reasoning (GPT-4o-mini, Claude).
- Use Ollama only when running locally.
- Add caching for repeated summaries.
- Add daily and monthly API usage limits.
- Add agent-level budget limits.
- Log AI requests and estimated cost.

### Done When

- Each agent has a clear model choice.
- Expensive calls are limited.
- Usage is visible in dashboard.
- The app stays near the $30/month budget.

---

## Priorities

1. Safe migration without breaking Parawi.
2. Keep Parawi as the core app.
3. Reuse only the best parts of Cluey.
4. Build one unified app, not two separate apps.
5. Keep API keys server-side.
6. Use read-only Google scopes first.
7. Require manual approval for actions.
8. Keep the app cloud-accessible.
9. Keep local development available.
10. Update memory markdown files after every major change.

---

## Security Rules

- Never expose API keys in frontend code.
- Never commit `.env` files.
- Never auto-send emails.
- Never auto-accept or decline calendar invites.
- Never create or edit calendar events without approval.
- Start with read-only scopes before adding write scopes.
- Store Google tokens securely — AES-256-GCM encrypted in the database.
- Log important agent decisions.
- Keep production secrets in the hosting provider's environment settings.
- Keep all AI calls server-side.

---

## Calendar Invite Agent Behavior

When a new calendar invite is found, the agent must answer:

- Who sent the invite?
- What is the meeting about?
- When is it?
- Does it overlap with another event?
- Is there a Google Meet link?
- Who else is invited?
- Is this likely important?
- What should I do next?

Example output:

> "New calendar invite from Jonathan Tyner for Thursday, May 9 at 10:00 AM. Topic: I-9 process review. It overlaps with your student advising meeting from 9:30 to 10:30 AM. Priority: high. Suggested action: ask Jonathan if the meeting can move to 11:00 AM. Approve reply?"

---

## Manual Approval Workflow

All agent actions must follow this pattern:

1. Detect item.
2. Summarize item.
3. Check conflict or risk.
4. Suggest action.
5. Wait for approval.
6. Perform action only after approval.
7. Log the action in `CHANGELOG_AI.md` or activity history.

**Example UI card:**

```
You received a calendar invite from Maria.

Meeting: I-9 Reverification Cleanup
Time: Tuesday, 2:00 PM to 2:30 PM
Status: Pending RSVP
Conflict: Yes — overlaps with your class from 1:30 PM to 2:45 PM.
Priority: High — work compliance related.

Suggested action:
Ask Maria if the meeting can move after 3:00 PM.

[ Approve ] [ Edit ] [ Skip ]
```

---

## calendarInviteAgent — Agent Specification

**Planned file:** `src/lib/agents/calendarInviteAgent.ts`

### Purpose

Review new Google Calendar invitations and help the user decide whether to accept, decline, or ask for a new time.

### Inputs

- Upcoming calendar events from `getAllCalendarEvents`
- Pending invites with status `needsAction`
- Event organizer, attendees, time, description, location, and Google Meet link

### Responsibilities

- Detect pending invites.
- Check for time conflicts with existing events.
- Identify event importance (compliance, HR, school, job, bills, deadlines, urgent personal items).
- Summarize the invite in plain language.
- Recommend accept, decline, or reschedule.
- Ask for user approval before taking any action.

### Allowed Without Approval

- Read calendar events.
- Summarize invites.
- Detect conflicts.
- Suggest next steps.

### Requires Approval

- Accept invite.
- Decline invite.
- Send RSVP note.
- Create new event.
- Edit event.
- Delete event.
