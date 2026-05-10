# CLUEY_TAKEOVER_PLAN.md

## Strategy: Hybrid Takeover
Parawi (yash-assistant-to) is the main app (Next.js 16, Prisma). We are bringing useful features from Cluey (React 18, Vite, Netlify) over to Parawi.

### What is being taken from Cluey
- Google Calendar read-only hook concepts (for extracting meeting data).
- AI summarization prompt logic (action item and decision extraction).
- Strict security principles (keeping AI keys server-side in API routes).
- Meeting recap concepts.

### What is being replaced
- Cluey's Vite/React frontend is replaced by Parawi's Next.js 16 App Router.
- Cluey's local/session storage persistence is replaced by Parawi's Prisma/Turso database.
- Cluey's client-side OAuth (`@react-oauth/google`) is superseded by Parawi's secure Google OAuth flow.
- Netlify functions are replaced by Next.js Route Handlers (`/api/...`).

### Migration Steps
1. **Analyze:** Confirm both apps run and identify target components.
2. **Auth Merge:** Verify Parawi's Google Accounts connect flow supports the necessary scopes (Calendar read).
3. **Logic Porting:** Recreate Cluey's meeting recap AI logic in a new Parawi API route or Agent.
4. **UI Porting:** Adapt Cluey's meeting feed UI into Parawi's dashboard or Calendar page.
5. **Database:** Update Prisma schema if meeting logs need a dedicated table (currently Parawi relies on `Task`, `Note`, and `AgentTask`).

### Rollback Plan
- Use git branches for all migration steps.
- If Parawi breaks, we revert the branch. Cluey remains untouched in its original repo.
