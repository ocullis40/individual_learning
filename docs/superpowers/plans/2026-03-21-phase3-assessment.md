# Phase 3: Assessment System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add prompt caching for cost reduction, conversational assessment in the lesson chat, and a per-topic short-answer quiz with AI grading and TopicMastery tracking.

**Architecture:** Prompt caching on the existing chat API. Updated chat system prompt for assessment mode. New TopicMastery and QuizAttempt Prisma models. New API routes for quiz generation (Sonnet) and grading (Haiku). Quiz UI as a client component on topic pages.

**Tech Stack:** Next.js 16, TypeScript, Prisma 7, Anthropic SDK (Sonnet + Haiku), Vitest

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── lessons/[id]/chat/route.ts    # Updated: prompt caching + assessment mode
│   │   └── topics/[id]/quiz/
│   │       ├── generate/route.ts          # POST: generate 10 questions
│   │       └── grade/route.ts             # POST: grade answers, update mastery
│   └── topics/[id]/
│       └── page.tsx                       # Updated: add Take Quiz button
├── components/
│   └── QuizPanel.tsx                      # Client component: quiz taking UI
├── lib/
│   ├── anthropic.ts                       # Updated: add GRADING_MODEL constant
│   └── prisma.ts                          # (existing)
prisma/
├── schema.prisma                          # Add TopicMastery + QuizAttempt
tests/
├── models/
│   └── assessment-schema.test.ts          # Schema tests
├── api/
│   └── quiz.test.ts                       # Quiz API data-layer tests
```

---

### Task 1: Enable Prompt Caching on Chat API

**Files:**
- Modify: `src/app/api/lessons/[id]/chat/route.ts`

- [ ] **Step 1: Update the POST handler to use cached system prompt**

Change the `anthropic.messages.create` call to use the structured system prompt format with `cache_control`:

```typescript
system: [
  {
    type: "text",
    text: "You are a knowledgeable tutor...\n\nASSESSMENT MODE:\n...",
    cache_control: { type: "ephemeral" }
  },
  {
    type: "text",
    text: `LESSON CONTENT:\n${lessonContent}`,
    cache_control: { type: "ephemeral" }
  }
]
```

- [ ] **Step 2: Add assessment mode instructions to the system prompt**

Append to the existing system prompt:

```
ASSESSMENT MODE:
If the user says "quiz me", "test me", "check my knowledge", or similar:
- Switch to assessment mode
- Ask a comprehension question about the lesson content
- When the user answers:
  - If correct: acknowledge briefly, optionally ask another question
  - If incorrect or incomplete: explain the correct concept clearly, then ask a follow-up to confirm understanding
- After assessment, you may update the user on how well they demonstrated understanding
- Return to normal tutoring mode when the user is done being quizzed
```

- [ ] **Step 3: Verify build and tests**

```bash
npm run build && npm test
```

- [ ] **Step 4: Manual test**

Start dev server, open a lesson chat, ask a question (verify caching doesn't break anything), then say "quiz me" and verify Claude switches to assessment mode.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/lessons/[id]/chat/route.ts
git commit -m "feat: enable prompt caching and add assessment mode to chat

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Add TopicMastery and QuizAttempt Models

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `tests/models/assessment-schema.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/models/assessment-schema.test.ts` testing:
- Create a TopicMastery record linked to user and topic
- Unique constraint on userId + topicId (upsert works)
- Create a QuizAttempt with questions, answers, score, feedback JSON fields

- [ ] **Step 2: Run tests — verify they fail**

- [ ] **Step 3: Add models to schema**

```prisma
model TopicMastery {
  id             String   @id @default(cuid())
  userId         String   @map("user_id")
  topicId        String   @map("topic_id")
  topic          Topic    @relation(fields: [topicId], references: [id])
  masteryLevel   String   @default("not_started") @map("mastery_level")
  lastAssessedAt DateTime? @map("last_assessed_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@unique([userId, topicId])
  @@map("topic_mastery")
}

model QuizAttempt {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  topicId   String   @map("topic_id")
  topic     Topic    @relation(fields: [topicId], references: [id])
  questions Json
  answers   Json
  score     Int
  feedback  Json
  createdAt DateTime @default(now()) @map("created_at")

  @@map("quiz_attempts")
}
```

Add relations to Topic model: `topicMastery TopicMastery[]` and `quizAttempts QuizAttempt[]`

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name add_assessment
```

- [ ] **Step 5: Run tests — verify they pass**

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations tests/models/assessment-schema.test.ts
git commit -m "feat: add TopicMastery and QuizAttempt models

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Build Quiz Generation and Grading API Routes

**Files:**
- Modify: `src/lib/anthropic.ts` — add GRADING_MODEL constant
- Create: `src/app/api/topics/[id]/quiz/generate/route.ts`
- Create: `src/app/api/topics/[id]/quiz/grade/route.ts`
- Create: `tests/api/quiz.test.ts`

- [ ] **Step 1: Add grading model constant**

In `src/lib/anthropic.ts`, add:
```typescript
export const GRADING_MODEL = "claude-haiku-4-5-20251001";
```

- [ ] **Step 2: Write data-layer tests for quiz**

Test TopicMastery upsert and QuizAttempt creation.

- [ ] **Step 3: Create POST /api/topics/[id]/quiz/generate**

- Find topic and all its lessons (including child topic lessons)
- Concatenate all lesson content (respect MAX_LESSON_CHARS per lesson)
- Call Claude Sonnet to generate 10 short-answer questions
- Return JSON array of questions (no answers sent to client)
- Store reference answers server-side in a temporary way (or return them encrypted/hashed)

Note: Reference answers must not be sent to the client. Options:
- Return a `quizSessionId` that maps to the answers on the server
- Or just send answers back to the grade endpoint with the questions

- [ ] **Step 4: Create POST /api/topics/[id]/quiz/grade**

- Receive: questions array, user answers array, reference answers
- Call Claude Haiku to grade each answer
- Calculate score
- Upsert TopicMastery based on score thresholds (80%+ proficient, 50-79% familiar, 20-49% learning, <20% not_started)
- Save QuizAttempt to DB
- Return: score, per-question feedback, suggested review sections

- [ ] **Step 5: Run tests and build**

```bash
npm test && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/anthropic.ts src/app/api/topics/[id]/quiz/ tests/api/quiz.test.ts
git commit -m "feat: add quiz generation and grading API routes

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Build Quiz UI Component

**Files:**
- Create: `src/components/QuizPanel.tsx`
- Modify: `src/app/topics/[id]/page.tsx` — add Take Quiz button

- [ ] **Step 1: Create QuizPanel client component**

States: `idle` → `loading` → `taking` → `submitting` → `results`

**idle**: Take Quiz button visible on topic page
**loading**: Generating questions (spinner)
**taking**: Show one question at a time with text input, Next button, progress indicator (1/10)
**submitting**: Grading answers (spinner)
**results**: Show score, per-question feedback with correct/incorrect, suggested review links

- [ ] **Step 2: Add Take Quiz button to topic detail page**

Add QuizPanel to `src/app/topics/[id]/page.tsx` — show it below the lessons section.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Manual test**

Full flow: Topic page → Take Quiz → answer 10 questions → submit → see results with feedback.

- [ ] **Step 5: Commit**

```bash
git add src/components/QuizPanel.tsx src/app/topics/[id]/page.tsx
git commit -m "feat: add quiz UI with question-by-question flow and results

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Full test suite**

```bash
npm test
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Manual smoke test**

1. Open a lesson → chat → say "quiz me" → verify conversational assessment works
2. Open a topic → Take Quiz → answer 10 questions → see results with feedback
3. Verify TopicMastery updated (check via Prisma Studio or API)
4. Chat still works normally when not in assessment mode
5. Prompt caching working (check response headers or cost in Anthropic dashboard)

- [ ] **Step 5: Review commit history**

```bash
git log --oneline
```
