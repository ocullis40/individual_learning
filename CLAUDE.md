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

## Key Technical Notes
- **Prisma 7**: Import from `@/generated/prisma/client` (not `@prisma/client`). Uses adapter pattern with `@prisma/adapter-pg`.
- **Database**: PostgreSQL, dev DB is `individual_learning_dev`, test DB is `individual_learning_test`
- **Testing**: Vitest for unit/integration tests, files in `tests/` directory
- **Auth**: Hardcoded dev user for Phases 1-2, NextAuth.js for Phase 3+

## Specs and Plans
- Design spec: `docs/superpowers/specs/2026-03-21-adaptive-learning-platform-design.md`
- Phase 1 plan: `docs/superpowers/plans/2026-03-21-phase1-infrastructure.md`
