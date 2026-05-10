# CHANGELOG_AI.md
# All entries are append-only. Newest entries at the top.

---

## 2026-05-07

### Change

Updated implementation strategy from a takeover model to a merge-and-unify model. Rewrote all project memory files to reflect the correct strategy: Parawi is the core app, Cluey is a feature source, the final result is one unified cloud-accessible web application.

### Files Changed

- `IMPLEMENTATION_PLAN.md` — full rewrite with 5-phase roadmap and merge-and-unify framing
- `PROJECT_STATUS.md` — updated with current feature state, stack rules, risks, and priorities
- `CLUEY_MERGE_PLAN.md` — new file replacing CLUEY_TAKEOVER_PLAN.md with merge language and feature-by-feature port decision table
- `AGENTS.md` — updated with agent roster, stack rules, approval workflow, and `calendarInviteAgent` specification
- `GOOGLE_INTEGRATION_PLAN.md` — updated with scope strategy, conflict detection rules, and Google Cloud Console setup notes
- `ENVIRONMENT_GUIDE.md` — updated with full variable table organized by category
- `CHANGELOG_AI.md` — this file

### Reason

The project goal is to keep Parawi as the core app, reuse the best parts of Cluey, and produce one unified web application accessible from the hosted app, not two separate apps.

### Risk

Low. Documentation-only change. No source code was modified.

### Rollback

Restore any markdown file from git history if the plan changes again.

---

## 2026-05-07 — calendarInviteAgent Specification Added

### Change

Added `calendarInviteAgent` specification to `AGENTS.md` and `IMPLEMENTATION_PLAN.md`. Defined inputs, responsibilities, approval requirements, and example output format.

### Files Changed

- `IMPLEMENTATION_PLAN.md`
- `AGENTS.md`

### Reason

User provided detailed requirements for Phase 2 calendar invite awareness including conflict detection, priority classification, and manual approval workflow.

### Risk

Low. Specification only. Agent not yet built.

### Rollback

Revert markdown files from git history.

---

## 2026-05-07 — Initial Project Memory System Created

### Change

Created all 7 project memory files from scratch to establish a persistent knowledge base.

### Files Changed

- `PROJECT_STATUS.md`
- `IMPLEMENTATION_PLAN.md`
- `CLUEY_TAKEOVER_PLAN.md` (superseded by `CLUEY_MERGE_PLAN.md`)
- `CHANGELOG_AI.md`
- `AGENTS.md`
- `ENVIRONMENT_GUIDE.md`
- `GOOGLE_INTEGRATION_PLAN.md`

### Reason

Establish a memory system so any IDE or agent can continue from a known state without re-auditing the codebase.

### Risk

None.

### Rollback

Delete all markdown files and restart memory system if structure needs a hard reset.
