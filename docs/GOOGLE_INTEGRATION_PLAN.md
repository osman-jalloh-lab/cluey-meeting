# GOOGLE_INTEGRATION_PLAN.md
# Last updated: 2026-05-07

---

## Google Integration Strategy

Start with read-only access. Do not request write scopes until read-only intelligence is working and tested.

---

## Initial Gmail Scope

**Scope:** `https://www.googleapis.com/auth/gmail.readonly`

The Gmail agent should provide:
- Sender name and email
- Subject
- Main message summary
- Urgency detection (compliance, HR, deadline, billing keywords)
- Priority ranking (Critical, Important, Normal, Low)
- Category (meeting, job application, school, HR, bill, personal)
- Suggested next action
- Related calendar context when useful

The Gmail agent must NOT send, archive, delete, or label emails without approval.

---

## Initial Calendar Scope

**Scope:** `https://www.googleapis.com/auth/calendar.readonly`

The Calendar agent should provide:
- Event title
- Organizer name and email
- Date, time, and duration
- Attendee list
- Location or Google Meet link
- RSVP status (`accepted`, `declined`, `needsAction`, `tentative`)
- Conflict or overlap with other events
- Suggested next action

---

## Calendar Invite Detection

Detect pending invites where `attendees[].self == true` and `attendees[].responseStatus == "needsAction"`.

The agent checks:
- Event organizer
- Event time and overlap with existing events
- Importance based on title, description, sender context, and keywords
- Whether a Google Meet link is included

---

## Conflict Detection Rules

A conflict exists when:
- Two events overlap in time.
- A pending invite overlaps with an existing confirmed event.
- Travel or prep time makes attendance unrealistic.
- The event conflicts with class, work shift, or a high-priority existing task.

---

## Later Optional Write Scopes (Phase 3+)

Only add these when the approval-based write workflow is fully implemented:

| Scope | Purpose |
|---|---|
| `gmail.send` | Send approved reply drafts |
| `gmail.modify` | Archive or label emails after approval |
| `calendar.events` | Accept/decline invites, create events after approval |

---

## Google Cloud Console Setup

- **OAuth Consent Screen:** Keep as "Testing" (External) for personal use. This avoids Google's security review.
- **Test users:** Add your personal Gmail and work Gmail to the test users list.
- **Authorized JavaScript Origins** *(base URL only — no path):*
  - Dev: `http://localhost:3000`
  - Production: `https://<your-domain>`
- **Authorized Redirect URIs** *(full path — goes in the Redirect URIs field):*
  - Dev: `http://localhost:3000/api/auth/callback/google`
  - Dev (Connected Accounts): `http://localhost:3000/api/accounts/callback/google`
  - Production: `https://<your-domain>/api/auth/callback/google`
  - Production (Connected Accounts): `https://<your-domain>/api/accounts/callback/google`
- **Token expiry:** In Testing mode, tokens may need re-consent after 7 days. The `refreshAccessToken` flow in Parawi handles this.

---

## Approval Rule

The app may read and summarize calendar and email data without any approval.

The app must ask for approval before making any changes, including RSVP responses, sending emails, or creating, editing, or deleting any calendar event.
