# CAREER_OPS_AGENT_UPGRADE_PLAN.md
# Last updated: May 7, 2026

---

## 1. What My Current Agent Already Does

- `jobSearchAgent.ts` — reads recent job-related emails (LinkedIn, Indeed, recruiters), asks GPT-4o-mini to extract opportunities and next steps. Returns: response, opportunities array, optional draft email, next steps.
- `/api/job-leads/route.ts` — CRUD for JobLead records. GET/POST/PATCH. matchScore is a raw integer 0-100 with no logic behind it.
- `/api/jobs/search/route.ts` — LLM generates 6 fake job listings. Not connected to real job boards.
- `jobs/page.tsx` — Shows 8 hardcoded static job cards. Not connected to the database.
- `JobLead` schema — has 15+ fields including matchScore, requiredSkills, matchedSkills, missingSkills, workAuthNotes, nextAction, deadline.

Bottom line: solid foundation, no real evaluation logic anywhere.

---

## 2. What Career-Ops Does Better

| Feature | Career-Ops | PARAWI current |
|---|---|---|
| Job scoring | 10-dimension weighted model (CV match, North Star, compensation, culture, red flags) | Raw integer, no logic |
| Archetype detection | 6 role types with messaging strategy | None |
| Follow-up cadence | Status-aware timing (Applied: 7d, Responded: 1d, Interview: 1d), urgency levels | No follow-up system |
| Deduplication | 3-layer fuzzy matching (exact ID, entry number, company+role Jaccard) | No dedup |
| ATS keyword injection | Extract JD keywords, reformulate into real bullets (never fabricate) | None |
| Interview prep | Round-by-round breakdown, story mapping, red-flag Q&A | None |
| Company research | 6-axis framework (AI strategy, hiring trends, culture, challenges, competition, alignment) | None |
| Daily summary | Top actions, urgency queue, conversion funnel | None |

---

## 3. Which Career-Ops Features Are Worth Borrowing

HIGH VALUE — implement these:
- Scoring logic (simplified to 5-point scale with 8 dimensions for Osman's profile)
- Follow-up cadence (status-aware timing + urgency classification)
- Structured evaluation output format (title, score, recommendation, gaps, keywords, next action)
- Interview prep generation (adapted for Osman's target roles: SOC, GRC, HRIS, IT support)
- Company research framework (6-axis, used on demand not automatically)
- Daily summary structure (top jobs, follow-ups due, actions for today)

MEDIUM VALUE — borrow the concept, not the code:
- ATS keyword injection (adapt into resume tailoring prompts)
- Deduplication logic (simpler version for JobLead records)
- Archetype detection (map to Osman's 6 role types: SOC, GRC, HRIS, IT support, cybersecurity intern, IAM)

IGNORE — not useful for this app:
- PDF generation (Playwright dependency — too heavy, Osman has Word/Google Docs)
- Go dashboard TUI (already have Next.js dashboard)
- Batch runner shell scripts (replaced by existing API architecture)
- Multi-language support (not needed)
- LaTeX export (not needed)
- Portal scraping with Playwright (too heavy, use AI-generated leads for now)

---

## 4. Which Career-Ops Features Should Be Ignored

- Anything requiring Playwright (PDF, scraping, form filling) — heavy dependency, breaks serverless
- Go TUI dashboard — already have a better web dashboard
- Batch shell orchestration — already have Next.js API routes
- YAML config files — already have Prisma schema and personal context
- LaTeX templates — overkill for current needs
- Auto-apply logic — explicitly not wanted

---

## 5. Smallest Safe Upgrade Path

Step 1 — Better job evaluation (scoring + structured output) in jobSearchAgent
Step 2 — Resume tailoring prompts (honest, ATS-focused, gap-aware)
Step 3 — Tracker improvements (status enum, follow-up date, apply date)
Step 4 — Daily dashboard summary (top jobs, follow-ups due, today's actions)
Step 5 — On-demand: interview prep + company research (triggered by user request)

Each step is isolated. No step breaks existing functionality.

---

## 6. Files to Modify

- `src/lib/agents/jobSearchAgent.ts` — add scoring logic, structured evaluation, follow-up cadence
- `src/app/api/job-leads/route.ts` — add appliedAt, followUpDate fields, proper status handling
- `src/app/api/jobs/search/route.ts` — return scored evaluations, not fake listings
- `src/app/(dashboard)/jobs/page.tsx` — connect to real JobLead data, show scores and follow-ups
- `prisma/schema.prisma` — add appliedAt, followUpDate, interviewDate, followUpCount fields

---

## 7. Files to Create

- `src/lib/agents/jobEvaluator.ts` — standalone evaluation engine (score + gaps + keywords + recommendation)
- `src/app/api/jobs/evaluate/route.ts` — POST endpoint: paste a job description, get back a full evaluation
- `src/app/api/jobs/followups/route.ts` — GET endpoint: jobs with follow-ups due today

---

## 8. Commands to Run After Changes

```bash
# Push schema changes to database
npx prisma db push

# Type check
npx tsc --noEmit

# Restart dev server
npm run dev
```

---

## Status

- [x] Step 1 — Job evaluator engine (jobEvaluator.ts)
- [x] Step 2 — Resume tailoring in evaluator (resumeAngle + resumeKeywords fields)
- [x] Step 3 — Schema + tracker improvements (appliedAt, followUpDate, followUpCount, interviewDate, scoreBreakdown, recommendation, resumeKeywords, resumeAngle, sponsorshipRequired, clearanceRequired, notes)
- [x] Step 4 — Dashboard summary (getDailyJobSummary, GET /api/job-leads?summary=true)
- [x] Step 5 — Interview prep + company research (generateInterviewPrep, generateCompanyResearch, POST /api/jobs/evaluate?generatePrep=true)
