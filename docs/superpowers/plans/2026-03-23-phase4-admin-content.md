# Phase 4: Admin Content Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin screen for generating lessons via Claude. Content creators enter a topic, title, and education level. Claude generates narrative-style lesson content with Mermaid diagrams. Lessons persist with archiving of previous versions.

**Architecture:** New LessonArchive model, educationLevel field on Lesson. Admin API routes for content generation and saving. Admin UI page with form, preview, and archive workflow.

**Tech Stack:** Next.js 16, TypeScript, Prisma 7, Anthropic SDK (Sonnet), Vitest

---

## File Structure

```
src/
├── app/
│   ├── admin/
│   │   └── lessons/
│   │       └── page.tsx                # Admin lesson generation page
│   ├── api/
│   │   └── admin/
│   │       ├── lessons/
│   │       │   ├── generate/route.ts   # POST: generate content via Claude
│   │       │   └── save/route.ts       # POST: save lesson, optionally archive
│   │       └── topics/
│   │           └── route.ts            # GET: list topics, POST: create topic
│   └── layout.tsx                      # Updated: add Admin nav link
prisma/
├── schema.prisma                       # Add LessonArchive, educationLevel on Lesson
tests/
├── models/
│   └── admin-schema.test.ts            # Schema tests
├── api/
│   └── admin.test.ts                   # Admin API data-layer tests
```

---

### Task 1: Add LessonArchive Model and educationLevel Field

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `tests/models/admin-schema.test.ts`

- [ ] **Step 1: Write failing tests (TDD)**

Tests for:
- Create a LessonArchive record linked to original lesson
- Lesson model has educationLevel field (nullable string)

- [ ] **Step 2: Run tests — verify they fail**

- [ ] **Step 3: Add to schema**

```prisma
model LessonArchive {
  id               String   @id @default(cuid())
  originalLessonId String   @map("original_lesson_id")
  title            String
  content          String
  difficultyLevel  Int      @map("difficulty_level")
  order            Int
  topicId          String   @map("topic_id")
  educationLevel   String?  @map("education_level")
  archivedAt       DateTime @default(now()) @map("archived_at")

  @@map("lesson_archives")
}
```

Add to existing Lesson model:
```prisma
educationLevel String? @map("education_level")
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name add_lesson_archive
```

- [ ] **Step 5: Run tests — verify they pass**

- [ ] **Step 6: Commit**

---

### Task 2: Build Admin API Routes

**Files:**
- Create: `src/app/api/admin/lessons/generate/route.ts`
- Create: `src/app/api/admin/lessons/save/route.ts`
- Create: `src/app/api/admin/topics/route.ts`
- Create: `tests/api/admin.test.ts`

- [ ] **Step 1: Write data-layer tests (TDD)**

Tests for:
- List all topics (flat list)
- Create a new topic
- Save a lesson to the database
- Archive and replace an existing lesson

- [ ] **Step 2: Create GET+POST /api/admin/topics**

GET: Return all topics with parent topic info, ordered by name.
POST: Create a new topic with name, description, optional parentTopicId.

- [ ] **Step 2.5: Add CONTENT_MODEL constant to src/lib/anthropic.ts**

```typescript
export const CONTENT_MODEL = "claude-sonnet-4-6";
```

Follow the established pattern alongside CHAT_MODEL and GRADING_MODEL.

- [ ] **Step 3: Create POST /api/admin/lessons/generate**

- Receive { topicId, title, educationLevel }
- Find topic (404 if not found)
- Check if lesson with same title exists under that topic (findFirst by title + topicId)
- Call Claude using CONTENT_MODEL with max_tokens: 8192
- Use prompt caching: system prompt as array with cache_control on both blocks:
  ```typescript
  system: [
    { type: "text", text: systemInstructions, cache_control: { type: "ephemeral" } },
    { type: "text", text: `TOPIC: ${topic.name}\n${topic.description}`, cache_control: { type: "ephemeral" } }
  ]
  ```
- Generation prompt must specify:
  - Use `##` for headings (not `#`) to avoid conflict with page title
  - Mermaid diagrams: use only `graph TD` or `sequenceDiagram` types, wrap node labels with special characters in quotes
  - 1000-1500 words, narrative style
  - Begin with engaging opening, organize into 3-5 sections
- Return { content, existingLesson } (existingLesson is null or the existing lesson info)
- Do NOT save to database — this is preview only
- Error envelope { error, code }

- [ ] **Step 4: Create POST /api/admin/lessons/save**

- Receive { topicId, title, content, educationLevel, archiveExisting }
- Auto-calculate `order`: count existing lessons for the topic + 1
- Default `difficultyLevel` to 1
- Independently look up existing lesson by title + topicId (do NOT trust client-provided IDs)
- If archiveExisting is true and existing lesson found:
  - Copy existing lesson to LessonArchive (including educationLevel)
  - Update existing lesson with new content, educationLevel
- If no existing lesson, create new lesson
- Return the saved lesson
- Error envelope { error, code }

- [ ] **Step 5: Run tests and build**

- [ ] **Step 6: Commit**

---

### Task 3: Build Admin Lesson Generation Page

**Files:**
- Create: `src/app/admin/lessons/page.tsx`
- Modify: `src/app/layout.tsx` — add Admin link to nav

- [ ] **Step 1: Create the admin page**

Client component with:
- Topic dropdown (fetched from GET /api/admin/topics — returns ALL topics, not just top-level)
- "Create new topic" option that shows name + description + parent topic fields
- Lesson title text input
- Education level dropdown (High School, College, Graduate)
- "Generate Lesson" button
- Loading state while generating
- After generation: rendered preview using LessonContent component
- Warning banner if existingLesson is returned
- "Save" button (or "Save & Archive Previous" if existing lesson found)
- Success/error feedback

- [ ] **Step 2: Add Admin link to navigation**

Add "Admin" link to the header nav in layout.tsx, linking to /admin/lessons.

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

---

### Task 4: Final Verification

- [ ] **Step 1: Run tests, lint, build**
- [ ] **Step 2: Manual smoke test**

Full flow:
1. Navigate to /admin/lessons
2. Select "Nuclear Energy" topic
3. Enter title "Nuclear Safety and Accidents"
4. Select "College" education level
5. Click Generate — preview appears
6. Click Save — lesson saved
7. Navigate to topic page — new lesson appears
8. Open lesson — content renders with markdown and diagrams
9. Go back to admin, regenerate same title — archive warning appears
10. Save & Archive — old version archived, new version replaces it

- [ ] **Step 3: Commit and push**
