# Adaptive Learning Platform — Design Spec

## Purpose

Build an adaptive learning web application that presents structured lessons on topics (starting with nuclear energy), quizzes the user, and builds a learner profile to personalize future content. The primary learning objective for the developer is mastering Claude subagents as a development workflow tool, orchestrated by Stride.

## Two-Layer Subagent Strategy

### Build-time (primary learning goal)
Claude subagents orchestrated by Stride handle all development work: claiming tasks, implementing features, running tests, and creating PRs. The developer defines features and reviews output.

### Runtime (future phase)
Subagents embedded in the application handle content generation, quiz creation, profile analysis, and lesson adaptation.

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js (App Router) + TypeScript | Full-stack React framework, lessons + chat UI |
| Backend | Next.js API routes | Single project, simpler for subagents |
| Database | PostgreSQL | Structured learner data, user's choice |
| ORM | Prisma | Type-safe, generates migrations |
| AI | Claude API (Anthropic SDK) | Powers build-time and runtime agents |
| Orchestration | Stride (stridelikeaboss.com) | Task management and agent coordination |
| Styling | Tailwind CSS | Utility-first, agents produce consistent UI |

## Project Structure

```
individual_learning/
├── src/
│   ├── app/              # Next.js pages and layouts
│   ├── components/       # React components
│   ├── lib/              # Shared utilities, DB client, API helpers
│   └── agents/           # Subagent definitions and configs
├── prisma/
│   └── schema.prisma     # Database schema
├── docs/
│   └── superpowers/specs/ # Design docs
├── stride/               # Stride task definitions and agent configs
├── tests/
├── .stride_auth.md       # Stride API credentials (gitignored)
├── .stride.md            # Project hooks for Stride workflow
└── package.json
```

## Data Model

### User
- id, email, name, created_at

### LearnerProfile
- id, user_id (FK), learning_style (JSON — preferences like depth, pace, format), updated_at

### TopicMastery
- id, user_id (FK), topic_id (FK), mastery_level (enum: not_started, learning, familiar, proficient), last_assessed_at, updated_at

### Topic
- id, name, parent_topic_id (FK, nullable — self-referencing for subtopics), description

### Lesson
- id, topic_id (FK), title, content (markdown), difficulty_level, created_at

### Quiz
- id, lesson_id (FK), questions (JSON array of question objects), created_at

### QuizAttempt
- id, user_id (FK), quiz_id (FK), answers (JSON), score, knowledge_gaps_identified (JSON), completed_at

Key decisions:
- JSON fields for learning_style, questions, and answers — flexible for early iteration
- Self-referencing Topic table for hierarchical subtopics
- TopicMastery as a separate table (not a JSON blob) for actionable per-topic tracking
- QuizAttempt captures identified gaps to feed TopicMastery updates

## Stride Integration

### Skill Chain
The project uses 6 Stride skills (from github.com/cheezy/stride):
1. **stride-creating-tasks** — Rich task specifications
2. **stride-creating-goals** — Grouped tasks with dependencies
3. **stride-enriching-tasks** — Auto-enriches sparse task specs via codebase exploration
4. **stride-claiming-tasks** — Agent claims task, runs before_doing hooks, begins work
5. **stride-subagent-workflow** — Dispatches explorer/planner subagents for complex tasks
6. **stride-completing-tasks** — Runs after_doing/before_review hooks, marks complete

### Project Hooks (.stride.md)
- `before_doing`: `git pull origin main && npm install`
- `after_doing`: `npm test && npm run lint`
- `before_review`: `gh pr create --title "$TASK_TITLE"`

### Review Policy
All tasks set to `needs_review=true` initially so the developer can inspect every piece of work and learn the workflow.

### Automated Loop
```
Define features → Stride goals/tasks
  → Agent claims → runs setup hooks
  → Subagents explore & plan (if complex)
  → Agent implements → runs test/lint hooks
  → Creates PR → marks complete
  → Developer reviews (needs_review=true)
```

## App Features

### Lesson Display (Phase 2)
- Structured lessons rendered from markdown
- Topic hierarchy navigation
- Embedded chat panel for follow-up questions (Claude API)

### Quiz System (Phase 3)
- Auto-generated quizzes based on lesson content
- Multiple question types (multiple choice, open-ended)
- Immediate feedback on answers
- TopicMastery updates based on quiz performance

### Learner Profile (Phase 3)
- Per-topic mastery levels (not_started → learning → familiar → proficient)
- Learning style preferences (depth, pace, format)
- Dashboard showing progress across topics

### Adaptive Content (Phase 4 — runtime agents)
- Content Agent: generates lesson material tailored to learner profile
- Quiz Agent: creates assessments calibrated to mastery level
- Profile Agent: analyzes results and updates learner profile
- Adaptation Agent: adjusts lesson delivery based on learning style

## Phased Build Sequence

### Phase 1: Infrastructure (manual setup)
- Initialize Next.js + TypeScript + Tailwind
- Set up PostgreSQL + Prisma
- Configure Stride credentials and hooks
- Install Stride skills as Claude Code plugin

### Phase 2: First Stride Goal — Basic Lesson Display
- DB schema (Topic, Lesson tables)
- API endpoint GET /api/lessons/[id]
- LessonPage component with markdown rendering
- Tests

### Phase 3: Quiz + Learner Profile
- Quiz, QuizAttempt, TopicMastery tables
- Quiz UI and scoring
- Embedded chat (Claude API)
- Learner profile dashboard

### Phase 4: Runtime Agents
- Content generation agent
- Quiz generation agent
- Profile/adaptation agents

## Out of Scope (for now)
- Engagement analytics (time on page, skip tracking)
- Multi-user / classroom features
- Mobile app
- Content authoring tools
