# Adaptive Learning Platform

## Project Overview
A web application for self-directed learning, starting with nuclear energy. Built with Next.js 16, TypeScript, Tailwind CSS, PostgreSQL, and Prisma 7.

## Stride Integration
This project uses [Stride](https://www.stridelikeaboss.com) for task orchestration with Claude subagents.

### Stride Skills (in `stride/` directory)
Reference these skills when working with Stride tasks:
- `stride/stride-creating-tasks/SKILL.md` — How to create well-specified tasks
- `stride/stride-creating-goals/SKILL.md` — How to create goals with nested tasks (batch endpoint root key MUST be "goals" not "tasks")
- `stride/stride-enriching-tasks/SKILL.md` — How to enrich sparse task specs via codebase exploration
- `stride/stride-claiming-tasks/SKILL.md` — How to claim tasks (requires before_doing hook execution)
- `stride/stride-completing-tasks/SKILL.md` — How to complete tasks (requires after_doing AND before_review hooks)
- `stride/stride-subagent-workflow/SKILL.md` — Decision matrix for dispatching explorer/planner/reviewer subagents

### Stride Agents (in `stride/agents/` directory)
- `stride/agents/task-explorer.md` — Explores codebase for task context
- `stride/agents/task-decomposer.md` — Breaks down complex tasks
- `stride/agents/task-reviewer.md` — Reviews completed work
- `stride/agents/hook-diagnostician.md` — Diagnoses hook failures

### Stride Config Files
- `.stride.md` — Project hooks (before_doing, after_doing, before_review)
- `.stride_auth.md` — API credentials (gitignored, never commit)

### Stride Workflow Rules
- **ALL code changes must go through Stride** — no exceptions, regardless of size. Create task → claim → implement → run hooks → complete → user reviews.
- **When dispatching subagents**, fetch the task from the Stride API and include the exact `acceptance_criteria` in the subagent prompt — never paraphrase.
- **User moves tasks to Ready** on the Stride website before agents can claim them.
- **All tasks use `needs_review: true`** so the developer reviews every piece of work.

### Mandatory Code Review Before Commit
After every task implementation, BEFORE committing:
1. Dispatch a code review subagent that reads the git diff
2. The reviewer checks: correctness, security, pattern consistency, missed edge cases, acceptance criteria compliance
3. Display the findings to the user
4. User decides what to address
5. Only commit after the user approves

This step is NOT optional. Never commit without running the code review subagent first.

## Testing Strategy
- **Data/API logic** — TDD from Stride acceptance criteria. Write failing tests first, then implement.
- **UI components** — No automated tests. Manual review by the developer in the browser.
- **Integration flows** — Happy-path tests only (e.g., "generate quiz returns 10 questions"), not exhaustive.

## Key Technical Notes
- **Prisma 7**: Import from `@/generated/prisma/client` (not `@prisma/client`). Uses adapter pattern with `@prisma/adapter-pg`.
- **Database**: PostgreSQL, dev DB is `individual_learning_dev`, test DB is `individual_learning_test`
- **Testing**: Vitest for unit/integration tests, files in `tests/` directory
- **Auth**: Hardcoded dev user for Phases 1-2, NextAuth.js for Phase 3+

## Specs and Plans
- Design spec: `docs/superpowers/specs/2026-03-21-adaptive-learning-platform-design.md`
- Phase 1 plan: `docs/superpowers/plans/2026-03-21-phase1-infrastructure.md`
