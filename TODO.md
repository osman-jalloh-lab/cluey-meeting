# PARAWI — TODO

## Immediate (Blocker)
- [ ] Add real values to `.env.local` (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET, ENCRYPTION_KEY, API keys)
- [ ] Test Google OAuth connect flow end to end
- [ ] Verify Gmail messages load for at least one account

## In Progress
- [ ] Wire activity feed to real DB events (need unified feed table or aggregate from emails/tasks/agentTasks)

## Up Next
- [ ] Test multi-Gmail account sync (add second account)
- [ ] Add calendar event approval flow UI
- [ ] Connect `jobSearchAgent` to a real job data source
- [ ] Daily briefing agent: verify it runs and returns correct summary
- [x] Wire dept tile counts to real DB (Career/Jobs, School/Notes, HR/agentTasks)
- [x] Command bar (⌘K): implement actual command palette

## Backlog
- [ ] Notes page: test task extraction via `taskExtractorAgent`
- [ ] Assistant page: test CEOCommand natural language dispatch
- [ ] Settings page: verify memory and usage endpoints
- [ ] Add error states and loading skeletons to all pages
- [ ] Mobile layout check

## Done
- [x] Implement PARAWI Command Center design (shell grid, topbar, rail, canvas, all sections)
- [x] AnimatePresence exit animations (TaskModal, AgentTaskBoard, RecommendedJobs, PixelSidebar)
- [x] Move QUICK_CMDS to right drawer — CEO CMD bar no longer clips on short screens
- [x] Scaffold all pages and API routes
- [x] Prisma 7 + libsql adapter wired
- [x] NextAuth v5 config
- [x] AES-256-GCM token encryption
- [x] AI router (OpenAI / Gemini / Claude)
- [x] All 6 agents stubbed
- [x] Production build passing, TypeScript clean
- [x] CLAUDE.md, SESSION_LOG.md, TODO.md, MASTER_CONTEXT.md created
