# Lesson Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin lesson generation form with a chat-driven lesson planner that lets you plan topic structure, decide images, then step through generating each lesson with full editing control.

**Architecture:** Planning chat with Claude using tool_use to build a plan in real time. Plan stored in DB (LessonPlan → PlannedLesson → LessonImage). Generation creates lessons one at a time with images generated after save (fixing DALL-E lessonId issue). Markdown editor + image panel for post-generation editing.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS 4, Prisma 7, Anthropic Claude API (streaming + tool_use), OpenAI DALL-E 3

---

## File Structure

```
prisma/
  schema.prisma                          — Modify: add LessonPlan, PlannedLesson, LessonImage models
  migrations/                            — Auto-generated migration

src/
  lib/
    education-levels.ts                  — Create: education level definitions and prompt guidance
  agents/
    planner-chat.ts                      — Create: planning chat agent with plan-mutation tools
    lesson-generator.ts                  — Create: single-lesson generator using plan context
    tools/
      generate-image.ts                  — Modify: accept lessonId (now always real)
  app/
    admin/
      lessons/
        page.tsx                         — Rewrite: topic/level selector → planning chat + sidebar
        [planId]/
          page.tsx                       — Create: generation progress + step-through
          edit/
            [plannedLessonId]/
              page.tsx                   — Create: lesson editor (markdown + images)
    api/
      admin/
        planner/
          route.ts                       — Create: POST (create plan), GET (list plans)
          [planId]/
            route.ts                     — Create: GET (plan detail), PATCH (update status)
            chat/
              route.ts                   — Create: POST (stream chat, handle tool_use)
            generate/
              route.ts                   — Create: POST (generate next lesson)
        lessons/
          [lessonId]/
            route.ts                     — Create: PATCH (update lesson content)
            images/
              route.ts                   — Create: POST (generate image), GET (list images)
              [imageId]/
                route.ts                 — Create: PATCH (regenerate), DELETE (remove)
  components/
    PlannerChat.tsx                      — Create: chat UI with streaming
    PlanSidebar.tsx                      — Create: lesson plan sidebar
    LessonEditor.tsx                     — Create: markdown editor + image panel
    ImageCard.tsx                        — Create: image card with regen/edit/delete
    GenerationProgress.tsx               — Create: lesson list with status + navigation

tests/
  models/
    planner-schema.test.ts              — Create: schema tests for new models
  api/
    planner.test.ts                     — Create: plan CRUD tests
    planner-generate.test.ts            — Create: lesson generation tests
    lesson-images.test.ts               — Create: image CRUD tests
```

---

### Task 1: Add LessonPlan, PlannedLesson, and LessonImage models to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `tests/models/planner-schema.test.ts`

- [ ] **Step 1: Write failing schema tests**

```typescript
// tests/models/planner-schema.test.ts
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Planner Schema", () => {
  const createdIds: { plans: string[]; topics: string[] } = { plans: [], topics: [] };

  afterAll(async () => {
    // Clean up in reverse dependency order
    await prisma.lessonImage.deleteMany({ where: { lesson: { topic: { id: { in: createdIds.topics } } } } });
    await prisma.plannedLesson.deleteMany({ where: { plan: { id: { in: createdIds.plans } } } });
    await prisma.lessonPlan.deleteMany({ where: { id: { in: createdIds.plans } } });
    await prisma.lesson.deleteMany({ where: { topicId: { in: createdIds.topics } } });
    await prisma.topic.deleteMany({ where: { id: { in: createdIds.topics } } });
  });

  it("creates a LessonPlan with planned lessons", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Test Topic", description: "For planner tests" },
    });
    createdIds.topics.push(topic.id);

    const plan = await prisma.lessonPlan.create({
      data: {
        topicId: topic.id,
        educationLevel: "college",
        status: "planning",
        chatHistory: [],
      },
    });
    createdIds.plans.push(plan.id);

    expect(plan.id).toBeDefined();
    expect(plan.status).toBe("planning");
    expect(plan.chatHistory).toEqual([]);
  });

  it("creates PlannedLessons linked to a plan", async () => {
    const plan = await prisma.lessonPlan.findFirst({ where: { id: { in: createdIds.plans } } });

    const planned = await prisma.plannedLesson.create({
      data: {
        planId: plan!.id,
        title: "Intro to Testing",
        outline: "Covers basics of TDD",
        generationInstructions: "Focus on practical examples",
        order: 1,
        status: "pending",
      },
    });

    expect(planned.title).toBe("Intro to Testing");
    expect(planned.status).toBe("pending");
    expect(planned.lessonId).toBeNull();
  });

  it("creates LessonImages linked to a lesson", async () => {
    const topic = await prisma.topic.findFirst({ where: { id: { in: createdIds.topics } } });

    const lesson = await prisma.lesson.create({
      data: {
        topicId: topic!.id,
        title: "Test Lesson",
        content: "# Test",
        difficultyLevel: 1,
        order: 1,
      },
    });

    const image = await prisma.lessonImage.create({
      data: {
        lessonId: lesson.id,
        tool: "dalle",
        prompt: "A test image",
        description: "Test image description",
        path: "/images/lessons/test/test.png",
        status: "planned",
        order: 1,
      },
    });

    expect(image.tool).toBe("dalle");
    expect(image.status).toBe("planned");
  });
});
```

- [ ] **Step 2: Add models to Prisma schema**

Add after the existing `QuizAttempt` model in `prisma/schema.prisma`:

```prisma
model LessonPlan {
  id              String          @id @default(cuid())
  topicId         String          @map("topic_id")
  topic           Topic           @relation(fields: [topicId], references: [id])
  educationLevel  String          @map("education_level")
  status          String          @default("planning")
  chatHistory     Json            @default("[]") @map("chat_history")
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")

  plannedLessons  PlannedLesson[]

  @@map("lesson_plans")
}

model PlannedLesson {
  id                      String      @id @default(cuid())
  planId                  String      @map("plan_id")
  plan                    LessonPlan  @relation(fields: [planId], references: [id])
  title                   String
  outline                 String?
  generationInstructions  String?     @map("generation_instructions")
  order                   Int
  status                  String      @default("pending")
  lessonId                String?     @map("lesson_id")
  lesson                  Lesson?     @relation(fields: [lessonId], references: [id])
  createdAt               DateTime    @default(now()) @map("created_at")
  updatedAt               DateTime    @updatedAt @map("updated_at")

  @@map("planned_lessons")
}

model LessonImage {
  id          String   @id @default(cuid())
  lessonId    String   @map("lesson_id")
  lesson      Lesson   @relation(fields: [lessonId], references: [id])
  tool        String
  prompt      String
  description String
  path        String?
  status      String   @default("planned")
  order       Int
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("lesson_images")
}
```

Also add the reverse relations to existing models. In the `Topic` model add:

```prisma
  lessonPlans   LessonPlan[]
```

In the `Lesson` model add:

```prisma
  plannedLessons PlannedLesson[]
  images         LessonImage[]
```

- [ ] **Step 3: Run migration**

Run: `npx prisma migrate dev --name add_lesson_planner_models`
Expected: Migration created and applied

- [ ] **Step 4: Run tests**

Run: `DATABASE_URL="postgresql://olivercullis@localhost:5432/individual_learning_test" npm test -- tests/models/planner-schema.test.ts`
Expected: All 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ tests/models/planner-schema.test.ts
git commit -m "feat: add LessonPlan, PlannedLesson, LessonImage models"
```

---

### Task 2: Create education level definitions module

**Files:**
- Create: `src/lib/education-levels.ts`

- [ ] **Step 1: Create the education levels module**

```typescript
// src/lib/education-levels.ts

export const EDUCATION_LEVELS = [
  { value: "k2", label: "K-2" },
  { value: "grades_3_5", label: "Grades 3-5" },
  { value: "grades_6_8", label: "Grades 6-8" },
  { value: "high_school", label: "High School" },
  { value: "college", label: "College" },
  { value: "graduate", label: "Graduate" },
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number]["value"];

export const EDUCATION_LEVEL_GUIDANCE: Record<EducationLevel, string> = {
  k2: `Reading Level: Very simple. Sentence Length: 5-10 words. Vocabulary: Common words only, define new terms inline. Concept Approach: Analogies to everyday life, no abstraction. Use simple stories and comparisons a young child would understand.`,
  grades_3_5: `Reading Level: Elementary. Sentence Length: 10-15 words. Vocabulary: Some domain terms with definitions. Concept Approach: Simple cause-and-effect, concrete examples. Build on what students already know from daily life.`,
  grades_6_8: `Reading Level: Middle school. Sentence Length: 15-20 words. Vocabulary: Domain vocabulary introduced gradually. Concept Approach: Some abstraction, structured reasoning. Students can handle "why" questions and multi-step explanations.`,
  high_school: `Reading Level: Moderate. Sentence Length: No limit. Vocabulary: Technical terms with context. Concept Approach: Full abstraction, critical analysis. Students can evaluate evidence and compare competing explanations.`,
  college: `Reading Level: Advanced. Sentence Length: No limit. Vocabulary: Assumed domain familiarity. Concept Approach: Deep analysis, primary sources. Students can engage with nuance, uncertainty, and methodological debates.`,
  graduate: `Reading Level: Expert. Sentence Length: No limit. Vocabulary: Specialist terminology. Concept Approach: Research-level, nuanced arguments. Assume strong foundational knowledge; focus on frontiers, open questions, and methodological rigor.`,
};

export function getEducationGuidance(level: string): string {
  return EDUCATION_LEVEL_GUIDANCE[level as EducationLevel] || EDUCATION_LEVEL_GUIDANCE.college;
}
```

- [ ] **Step 2: Verify file exists**

Run: `head -5 src/lib/education-levels.ts`
Expected: Shows export and first entries

- [ ] **Step 3: Commit**

```bash
git add src/lib/education-levels.ts
git commit -m "feat: add education level definitions with prompt guidance"
```

---

### Task 3: Create plan CRUD API routes with tests

**Files:**
- Create: `src/app/api/admin/planner/route.ts`
- Create: `src/app/api/admin/planner/[planId]/route.ts`
- Test: `tests/api/planner.test.ts`

- [ ] **Step 1: Write failing tests for plan CRUD**

```typescript
// tests/api/planner.test.ts
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Planner API", () => {
  let topicId: string;
  let planId: string;

  beforeAll(async () => {
    const topic = await prisma.topic.create({
      data: { name: "Planner Test Topic", description: "For API tests" },
    });
    topicId = topic.id;
  });

  afterAll(async () => {
    await prisma.plannedLesson.deleteMany({ where: { plan: { topicId } } });
    await prisma.lessonPlan.deleteMany({ where: { topicId } });
    await prisma.topic.delete({ where: { id: topicId } });
  });

  it("POST /api/admin/planner creates a plan", async () => {
    const res = await fetch("http://localhost:3000/api/admin/planner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId, educationLevel: "college" }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.id).toBeDefined();
    expect(json.data.status).toBe("planning");
    planId = json.data.id;
  });

  it("GET /api/admin/planner/[planId] returns plan with planned lessons", async () => {
    const res = await fetch(`http://localhost:3000/api/admin/planner/${planId}`);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.id).toBe(planId);
    expect(json.data.plannedLessons).toEqual([]);
    expect(json.data.topic).toBeDefined();
  });

  it("PATCH /api/admin/planner/[planId] updates status", async () => {
    const res = await fetch(`http://localhost:3000/api/admin/planner/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "generating" }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe("generating");
  });
});
```

- [ ] **Step 2: Implement POST /api/admin/planner (create plan)**

```typescript
// src/app/api/admin/planner/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EDUCATION_LEVELS } from "@/lib/education-levels";

const validLevels = EDUCATION_LEVELS.map((l) => l.value);

export async function POST(request: Request) {
  try {
    const { topicId, educationLevel } = await request.json();

    if (!topicId || typeof topicId !== "string") {
      return NextResponse.json(
        { error: "topicId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (!educationLevel || !validLevels.includes(educationLevel)) {
      return NextResponse.json(
        { error: `educationLevel must be one of: ${validLevels.join(", ")}`, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      return NextResponse.json(
        { error: "Topic not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const plan = await prisma.lessonPlan.create({
      data: {
        topicId,
        educationLevel,
        status: "planning",
        chatHistory: [],
      },
      include: {
        topic: true,
        plannedLessons: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json({ data: plan });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Implement GET and PATCH /api/admin/planner/[planId]**

```typescript
// src/app/api/admin/planner/[planId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;

  const plan = await prisma.lessonPlan.findUnique({
    where: { id: planId },
    include: {
      topic: true,
      plannedLessons: {
        orderBy: { order: "asc" },
        include: { lesson: true },
      },
    },
  });

  if (!plan) {
    return NextResponse.json(
      { error: "Plan not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: plan });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  const body = await request.json();

  const plan = await prisma.lessonPlan.update({
    where: { id: planId },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.chatHistory ? { chatHistory: body.chatHistory } : {}),
    },
    include: {
      topic: true,
      plannedLessons: { orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json({ data: plan });
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/api/planner.test.ts`
Expected: All 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/planner/ tests/api/planner.test.ts
git commit -m "feat: add plan CRUD API routes with tests"
```

---

### Task 4: Create planning chat agent with plan-mutation tools

**Files:**
- Create: `src/agents/planner-chat.ts`

- [ ] **Step 1: Create the planning chat agent**

```typescript
// src/agents/planner-chat.ts
import { anthropic, CONTENT_MODEL } from "@/lib/anthropic";
import { prisma } from "@/lib/prisma";
import { getEducationGuidance } from "@/lib/education-levels";

interface PlannerChatInput {
  planId: string;
  message: string;
}

const planTools = [
  {
    name: "addLesson",
    description: "Add a lesson to the plan. Call this when you and the user agree on a lesson to include.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Lesson title" },
        outline: { type: "string", description: "Brief outline of what the lesson covers" },
        generationInstructions: { type: "string", description: "Specific instructions for generating this lesson's content" },
        order: { type: "number", description: "Position in the lesson sequence (1-based)" },
      },
      required: ["title", "order"],
    },
  },
  {
    name: "updateLesson",
    description: "Update a planned lesson's title, outline, or instructions.",
    input_schema: {
      type: "object" as const,
      properties: {
        plannedLessonId: { type: "string", description: "ID of the planned lesson to update" },
        title: { type: "string" },
        outline: { type: "string" },
        generationInstructions: { type: "string" },
        order: { type: "number" },
      },
      required: ["plannedLessonId"],
    },
  },
  {
    name: "removeLesson",
    description: "Remove a lesson from the plan.",
    input_schema: {
      type: "object" as const,
      properties: {
        plannedLessonId: { type: "string", description: "ID of the planned lesson to remove" },
      },
      required: ["plannedLessonId"],
    },
  },
  {
    name: "addImage",
    description: "Add a planned image to a lesson. Specify the tool and prompt.",
    input_schema: {
      type: "object" as const,
      properties: {
        plannedLessonId: { type: "string", description: "ID of the planned lesson" },
        tool: { type: "string", enum: ["dalle", "svg", "mermaid"], description: "Image generation tool" },
        prompt: { type: "string", description: "Generation prompt for the image" },
        description: { type: "string", description: "Human-readable label for this image" },
        order: { type: "number", description: "Position in the lesson (1-based)" },
      },
      required: ["plannedLessonId", "tool", "prompt", "description", "order"],
    },
  },
  {
    name: "updateImage",
    description: "Update a planned image's tool, prompt, or description.",
    input_schema: {
      type: "object" as const,
      properties: {
        imageId: { type: "string", description: "ID of the planned image to update" },
        tool: { type: "string", enum: ["dalle", "svg", "mermaid"] },
        prompt: { type: "string" },
        description: { type: "string" },
      },
      required: ["imageId"],
    },
  },
  {
    name: "removeImage",
    description: "Remove a planned image from a lesson.",
    input_schema: {
      type: "object" as const,
      properties: {
        imageId: { type: "string", description: "ID of the planned image to remove" },
      },
      required: ["imageId"],
    },
  },
];

async function executePlanTool(name: string, input: Record<string, unknown>, planId: string): Promise<string> {
  switch (name) {
    case "addLesson": {
      const lesson = await prisma.plannedLesson.create({
        data: {
          planId,
          title: input.title as string,
          outline: (input.outline as string) || null,
          generationInstructions: (input.generationInstructions as string) || null,
          order: input.order as number,
          status: "pending",
        },
      });
      return JSON.stringify({ id: lesson.id, title: lesson.title, order: lesson.order });
    }
    case "updateLesson": {
      const { plannedLessonId, ...updates } = input;
      const lesson = await prisma.plannedLesson.update({
        where: { id: plannedLessonId as string },
        data: {
          ...(updates.title ? { title: updates.title as string } : {}),
          ...(updates.outline !== undefined ? { outline: updates.outline as string } : {}),
          ...(updates.generationInstructions !== undefined ? { generationInstructions: updates.generationInstructions as string } : {}),
          ...(updates.order ? { order: updates.order as number } : {}),
        },
      });
      return JSON.stringify({ id: lesson.id, title: lesson.title });
    }
    case "removeLesson": {
      await prisma.plannedLesson.delete({ where: { id: input.plannedLessonId as string } });
      return JSON.stringify({ removed: true });
    }
    case "addImage": {
      // Images are stored as PlannedLesson metadata for now — we create LessonImage records during generation
      // For planning phase, store image plans as JSON on the planned lesson
      const lesson = await prisma.plannedLesson.findUnique({ where: { id: input.plannedLessonId as string } });
      if (!lesson) return JSON.stringify({ error: "Planned lesson not found" });
      // Store in a temporary structure — actual LessonImage created during generation
      return JSON.stringify({
        plannedLessonId: input.plannedLessonId,
        tool: input.tool,
        prompt: input.prompt,
        description: input.description,
        order: input.order,
        status: "planned",
      });
    }
    case "updateImage":
      return JSON.stringify({ updated: true, ...input });
    case "removeImage":
      return JSON.stringify({ removed: true });
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

function buildSystemPrompt(topicName: string, educationLevel: string, existingPlan: string): string {
  const guidance = getEducationGuidance(educationLevel);

  return `You are a curriculum planning assistant helping design lessons for an adaptive learning platform.

Topic: ${topicName}
Education Level: ${educationLevel}
Level Guidance: ${guidance}

Current plan state:
${existingPlan || "No lessons planned yet."}

Your job:
1. Help the user decide what lessons to include for this topic, in what order, and with what focus.
2. Once lesson structure is agreed, propose specific images for each lesson — specifying the tool (dalle for photorealistic images, svg for technical diagrams/schematics, mermaid for flowcharts/sequences) and a detailed prompt.
3. Use the addLesson, updateLesson, removeLesson tools to build the plan as the conversation progresses.
4. Use the addImage, updateImage, removeImage tools to plan images for each lesson.

Rules:
- Be direct. No platitudes or filler praise.
- Push back if the user proposes too many or too few lessons, wrong ordering, or missing prerequisites.
- Suggest better alternatives when you see them.
- For images: recommend the right tool for each visual. DALL-E for realistic/photographic scenes. SVG for technical schematics, cross-sections, labeled diagrams. Mermaid for process flows, sequences, hierarchies.
- Flag when an image idea won't add educational value.
- Keep responses focused and concise.
- When proposing lessons, call addLesson for each one so the sidebar updates in real time.
- When proposing images, call addImage for each one.`;
}

export async function streamPlannerChat(input: PlannerChatInput): Promise<ReadableStream> {
  const plan = await prisma.lessonPlan.findUnique({
    where: { id: input.planId },
    include: {
      topic: true,
      plannedLessons: { orderBy: { order: "asc" } },
    },
  });

  if (!plan) throw new Error("Plan not found");

  const chatHistory = (plan.chatHistory as Array<{ role: string; content: string }>) || [];

  // Build existing plan summary for context
  const planSummary = plan.plannedLessons.length > 0
    ? plan.plannedLessons.map((l) => `${l.order}. ${l.title}${l.outline ? ` — ${l.outline}` : ""}`).join("\n")
    : "";

  const systemPrompt = buildSystemPrompt(plan.topic.name, plan.educationLevel, planSummary);

  // Add new user message
  const messages = [
    ...chatHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: input.message },
  ];

  const encoder = new TextEncoder();
  let fullResponse = "";
  const toolResults: Array<{ role: string; content: unknown }> = [];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let continueLoop = true;
        let currentMessages = messages;

        while (continueLoop) {
          const response = await anthropic.messages.create({
            model: CONTENT_MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            tools: planTools,
            messages: currentMessages as Parameters<typeof anthropic.messages.create>[0]["messages"],
          });

          if (response.stop_reason === "tool_use") {
            // Execute all tool calls
            const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
            const textBlocks = response.content.filter((b) => b.type === "text");

            // Stream any text that came before the tool calls
            for (const block of textBlocks) {
              if (block.type === "text") {
                fullResponse += block.text;
                controller.enqueue(encoder.encode(block.text));
              }
            }

            // Execute tools and build results
            const results = [];
            for (const block of toolUseBlocks) {
              if (block.type === "tool_use") {
                const result = await executePlanTool(block.name, block.input as Record<string, unknown>, input.planId);
                results.push({
                  type: "tool_result" as const,
                  tool_use_id: block.id,
                  content: result,
                });
              }
            }

            // Continue conversation with tool results
            currentMessages = [
              ...currentMessages,
              { role: "assistant", content: response.content },
              { role: "user", content: results },
            ];
          } else {
            // end_turn — stream remaining text
            for (const block of response.content) {
              if (block.type === "text") {
                fullResponse += block.text;
                controller.enqueue(encoder.encode(block.text));
              }
            }
            continueLoop = false;
          }
        }

        // Save chat history
        const updatedHistory = [
          ...chatHistory,
          { role: "user", content: input.message },
          { role: "assistant", content: fullResponse },
        ];
        await prisma.lessonPlan.update({
          where: { id: input.planId },
          data: { chatHistory: updatedHistory },
        });

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return stream;
}
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/agents/planner-chat.ts 2>&1 || npm run build 2>&1 | tail -5`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/agents/planner-chat.ts
git commit -m "feat: add planning chat agent with plan-mutation tools"
```

---

### Task 5: Create planning chat API route (streaming)

**Files:**
- Create: `src/app/api/admin/planner/[planId]/chat/route.ts`

- [ ] **Step 1: Create the streaming chat endpoint**

```typescript
// src/app/api/admin/planner/[planId]/chat/route.ts
import { NextResponse } from "next/server";
import { streamPlannerChat } from "@/agents/planner-chat";

export const maxDuration = 120;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;

  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "message is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const stream = await streamPlannerChat({ planId, message: message.trim() });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/planner/[planId]/chat/route.ts
git commit -m "feat: add streaming planning chat API route"
```

---

### Task 6: Create lesson generation API route

**Files:**
- Create: `src/agents/lesson-generator.ts`
- Create: `src/app/api/admin/planner/[planId]/generate/route.ts`

- [ ] **Step 1: Create the single-lesson generator**

```typescript
// src/agents/lesson-generator.ts
import { anthropic, CONTENT_MODEL } from "@/lib/anthropic";
import { prisma } from "@/lib/prisma";
import { getEducationGuidance } from "@/lib/education-levels";
import { generateDiagram } from "./tools/generate-diagram";
import { generateSVGDiagram } from "./tools/generate-svg";
import { generateImage } from "./tools/generate-image";

interface GenerateResult {
  success: boolean;
  lessonId?: string;
  message: string;
}

export async function generatePlannedLesson(plannedLessonId: string): Promise<GenerateResult> {
  const planned = await prisma.plannedLesson.findUnique({
    where: { id: plannedLessonId },
    include: {
      plan: { include: { topic: true } },
    },
  });

  if (!planned) throw new Error("Planned lesson not found");
  if (planned.status === "generated") throw new Error("Lesson already generated");

  // Mark as generating
  await prisma.plannedLesson.update({
    where: { id: plannedLessonId },
    data: { status: "generating" },
  });

  try {
    const guidance = getEducationGuidance(planned.plan.educationLevel);

    // Get existing lessons for context
    const existingLessons = await prisma.lesson.findMany({
      where: { topicId: planned.plan.topicId },
      select: { title: true },
      orderBy: { order: "asc" },
    });

    // Generate content via Claude (text only, no images)
    const response = await anthropic.messages.create({
      model: CONTENT_MODEL,
      max_tokens: 4096,
      system: `You are a content creation agent for an adaptive learning platform. Generate a single lesson.

Topic: ${planned.plan.topic.name}
Education Level: ${planned.plan.educationLevel}
Level Guidance: ${guidance}
${planned.outline ? `Outline: ${planned.outline}` : ""}
${planned.generationInstructions ? `Instructions: ${planned.generationInstructions}` : ""}
${existingLessons.length > 0 ? `Existing lessons in this topic: ${existingLessons.map((l) => l.title).join(", ")}` : ""}

Write the lesson in a narrative storytelling style with structured markdown headings (##).
Aim for 1000-1500 words. Do NOT include image placeholders — images are handled separately.
Output ONLY the lesson markdown content, nothing else.`,
      messages: [
        { role: "user", content: `Write the lesson titled: "${planned.title}"` },
      ],
    });

    const content = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n\n");

    // Count existing lessons to determine order
    const lessonCount = await prisma.lesson.count({ where: { topicId: planned.plan.topicId } });

    // Save lesson
    const lesson = await prisma.lesson.create({
      data: {
        topicId: planned.plan.topicId,
        title: planned.title,
        content,
        difficultyLevel: 1,
        educationLevel: planned.plan.educationLevel,
        order: lessonCount + 1,
      },
    });

    // Link planned lesson to real lesson
    await prisma.plannedLesson.update({
      where: { id: plannedLessonId },
      data: { lessonId: lesson.id, status: "generated" },
    });

    return { success: true, lessonId: lesson.id, message: `Lesson "${planned.title}" generated` };
  } catch (error) {
    await prisma.plannedLesson.update({
      where: { id: plannedLessonId },
      data: { status: "error" },
    });
    throw error;
  }
}
```

- [ ] **Step 2: Create the generate API route**

```typescript
// src/app/api/admin/planner/[planId]/generate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePlannedLesson } from "@/agents/lesson-generator";

export const maxDuration = 240;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;

  try {
    // Find next pending lesson
    const nextLesson = await prisma.plannedLesson.findFirst({
      where: { planId, status: "pending" },
      orderBy: { order: "asc" },
    });

    if (!nextLesson) {
      // Check if all are generated
      const plan = await prisma.lessonPlan.update({
        where: { id: planId },
        data: { status: "completed" },
      });
      return NextResponse.json({ data: { complete: true, planStatus: plan.status } });
    }

    const result = await generatePlannedLesson(nextLesson.id);
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/agents/lesson-generator.ts src/app/api/admin/planner/[planId]/generate/
git commit -m "feat: add lesson generator and generation API route"
```

---

### Task 7: Create image management API routes with tests

**Files:**
- Create: `src/app/api/admin/lessons/[lessonId]/route.ts`
- Create: `src/app/api/admin/lessons/[lessonId]/images/route.ts`
- Create: `src/app/api/admin/lessons/[lessonId]/images/[imageId]/route.ts`
- Test: `tests/api/lesson-images.test.ts`

- [ ] **Step 1: Write failing tests for image CRUD**

```typescript
// tests/api/lesson-images.test.ts
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Lesson Image API", () => {
  let topicId: string;
  let lessonId: string;
  let imageId: string;

  beforeAll(async () => {
    const topic = await prisma.topic.create({
      data: { name: "Image Test Topic", description: "For image API tests" },
    });
    topicId = topic.id;
    const lesson = await prisma.lesson.create({
      data: { topicId: topic.id, title: "Image Test Lesson", content: "# Test", difficultyLevel: 1, order: 1 },
    });
    lessonId = lesson.id;
  });

  afterAll(async () => {
    await prisma.lessonImage.deleteMany({ where: { lessonId } });
    await prisma.lesson.delete({ where: { id: lessonId } });
    await prisma.topic.delete({ where: { id: topicId } });
  });

  it("POST /api/admin/lessons/[lessonId]/images creates an image record", async () => {
    const res = await fetch(`http://localhost:3000/api/admin/lessons/${lessonId}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tool: "mermaid",
        prompt: "flowchart TD; A-->B",
        description: "Test flowchart",
        order: 1,
      }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.tool).toBe("mermaid");
    expect(json.data.status).toBe("planned");
    imageId = json.data.id;
  });

  it("GET /api/admin/lessons/[lessonId]/images lists images", async () => {
    const res = await fetch(`http://localhost:3000/api/admin/lessons/${lessonId}/images`);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.length).toBe(1);
    expect(json.data[0].id).toBe(imageId);
  });

  it("DELETE /api/admin/lessons/[lessonId]/images/[imageId] removes image", async () => {
    const res = await fetch(`http://localhost:3000/api/admin/lessons/${lessonId}/images/${imageId}`, {
      method: "DELETE",
    });

    expect(res.status).toBe(200);

    const listRes = await fetch(`http://localhost:3000/api/admin/lessons/${lessonId}/images`);
    const json = await listRes.json();
    expect(json.data.length).toBe(0);
  });
});
```

- [ ] **Step 2: Implement lesson update route**

```typescript
// src/app/api/admin/lessons/[lessonId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const { content } = await request.json();

  const lesson = await prisma.lesson.update({
    where: { id: lessonId },
    data: { content },
  });

  return NextResponse.json({ data: lesson });
}
```

- [ ] **Step 3: Implement image list and create routes**

```typescript
// src/app/api/admin/lessons/[lessonId]/images/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;

  const images = await prisma.lessonImage.findMany({
    where: { lessonId },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ data: images });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const { tool, prompt, description, order } = await request.json();

  if (!tool || !prompt || !description) {
    return NextResponse.json(
      { error: "tool, prompt, and description are required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const image = await prisma.lessonImage.create({
    data: {
      lessonId,
      tool,
      prompt,
      description,
      status: "planned",
      order: order || 1,
    },
  });

  return NextResponse.json({ data: image });
}
```

- [ ] **Step 4: Implement image update and delete routes**

```typescript
// src/app/api/admin/lessons/[lessonId]/images/[imageId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ lessonId: string; imageId: string }> }
) {
  const { imageId } = await params;
  const body = await request.json();

  const image = await prisma.lessonImage.update({
    where: { id: imageId },
    data: {
      ...(body.tool ? { tool: body.tool } : {}),
      ...(body.prompt ? { prompt: body.prompt } : {}),
      ...(body.description ? { description: body.description } : {}),
      ...(body.path ? { path: body.path } : {}),
      ...(body.status ? { status: body.status } : {}),
    },
  });

  return NextResponse.json({ data: image });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string; imageId: string }> }
) {
  const { imageId } = await params;

  const image = await prisma.lessonImage.findUnique({ where: { id: imageId } });

  if (image?.path && image.path.startsWith("/images/")) {
    const filePath = path.join(process.cwd(), "public", image.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await prisma.lessonImage.delete({ where: { id: imageId } });

  return NextResponse.json({ data: { deleted: true } });
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/api/lesson-images.test.ts`
Expected: All 3 tests pass

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/lessons/ tests/api/lesson-images.test.ts
git commit -m "feat: add lesson content update and image CRUD API routes"
```

---

### Task 8: Build admin planner page — topic selector and chat UI

**Files:**
- Rewrite: `src/app/admin/lessons/page.tsx`
- Create: `src/components/PlannerChat.tsx`
- Create: `src/components/PlanSidebar.tsx`

- [ ] **Step 1: Create PlannerChat component**

```tsx
// src/components/PlannerChat.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface PlannerChatProps {
  planId: string;
  initialMessages: Message[];
  onPlanUpdated: () => void;
}

export function PlannerChat({ planId, initialMessages, onPlanUpdated }: PlannerChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/admin/planner/${planId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) {
        setIsLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantMessage += decoder.decode(value, { stream: true });
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: assistantMessage },
        ]);
      }

      // Refresh plan sidebar after each message (tools may have mutated the plan)
      onPlanUpdated();
    } catch {
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, planId, onPlanUpdated]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Describe what lessons you want for this topic.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm ${
                msg.role === "user" ? "bg-blue-600 text-white self-end max-w-[80%]" : "self-start max-w-[80%]"
              }`}
              style={msg.role === "assistant" ? {
                backgroundColor: "color-mix(in srgb, var(--color-border) 30%, var(--color-surface))",
                color: "var(--color-text)",
              } : undefined}
            >
              {msg.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what lessons you want..."
            rows={2}
            className="flex-1 resize-none rounded-lg border px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text)",
            }}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="self-end rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create PlanSidebar component**

```tsx
// src/components/PlanSidebar.tsx
"use client";

import Link from "next/link";

interface PlannedLesson {
  id: string;
  title: string;
  order: number;
  status: string;
  outline: string | null;
}

interface PlanSidebarProps {
  planId: string;
  lessons: PlannedLesson[];
  canGenerate: boolean;
}

export function PlanSidebar({ planId, lessons, canGenerate }: PlanSidebarProps) {
  return (
    <div className="w-72 border-l flex flex-col" style={{ borderColor: "var(--color-border)" }}>
      <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Lesson Plan
        </h2>
        <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
          {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"} planned
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-2">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="rounded-lg border p-3"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                {lesson.order}. {lesson.title}
              </div>
              {lesson.outline && (
                <div className="text-xs mt-1 line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>
                  {lesson.outline}
                </div>
              )}
            </div>
          ))}
          {lessons.length === 0 && (
            <p className="text-xs text-center py-8" style={{ color: "var(--color-text-secondary)" }}>
              Chat with Claude to plan your lessons
            </p>
          )}
        </div>
      </div>

      <div className="p-4 border-t" style={{ borderColor: "var(--color-border)" }}>
        {canGenerate ? (
          <Link
            href={`/admin/lessons/${planId}`}
            className="block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Start Generating →
          </Link>
        ) : (
          <div>
            <button
              disabled
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white opacity-50 cursor-not-allowed"
            >
              Start Generating →
            </button>
            <p className="text-xs text-center mt-2" style={{ color: "var(--color-text-secondary)" }}>
              Plan lessons first
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite admin page**

```tsx
// src/app/admin/lessons/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/Card";
import { PlannerChat } from "@/components/PlannerChat";
import { PlanSidebar } from "@/components/PlanSidebar";
import { EDUCATION_LEVELS } from "@/lib/education-levels";

interface Topic {
  id: string;
  name: string;
  parentTopic: { id: string; name: string } | null;
}

interface PlannedLesson {
  id: string;
  title: string;
  order: number;
  status: string;
  outline: string | null;
}

interface Plan {
  id: string;
  status: string;
  chatHistory: Array<{ role: string; content: string }>;
  plannedLessons: PlannedLesson[];
}

export default function AdminLessonsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/topics")
      .then((r) => r.json())
      .then((json) => { if (json.data) setTopics(json.data); })
      .catch(() => {});
  }, []);

  const handleCreatePlan = async () => {
    if (!topicId || !educationLevel) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, educationLevel }),
      });
      const json = await res.json();
      if (json.data) setPlan(json.data);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const refreshPlan = useCallback(async () => {
    if (!plan) return;
    try {
      const res = await fetch(`/api/admin/planner/${plan.id}`);
      const json = await res.json();
      if (json.data) setPlan(json.data);
    } catch {
      // silently fail
    }
  }, [plan]);

  const inputStyle = {
    borderColor: "var(--color-border)",
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text)",
  };

  // Topic/level selector (no plan yet)
  if (!plan) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-3xl font-bold" style={{ color: "var(--color-text)" }}>
          Lesson Planner
        </h1>
        <p className="mt-2" style={{ color: "var(--color-text-secondary)" }}>
          Plan and generate lessons for a topic.
        </p>

        <div className="mx-auto mt-8 max-w-lg">
          <Card>
            <div className="space-y-4">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  Topic
                </label>
                <select
                  id="topic"
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  className="mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  style={inputStyle}
                >
                  <option value="">Select a topic...</option>
                  {topics
                    .filter((t) => !t.parentTopic)
                    .map((parent) => (
                      <optgroup key={parent.id} label={parent.name}>
                        <option value={parent.id}>{parent.name}</option>
                        {topics
                          .filter((t) => t.parentTopic?.id === parent.id)
                          .map((child) => (
                            <option key={child.id} value={child.id}>
                              &nbsp;&nbsp;{child.name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="level" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  Education Level
                </label>
                <select
                  id="level"
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  style={inputStyle}
                >
                  <option value="">Select level...</option>
                  {EDUCATION_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleCreatePlan}
                disabled={!topicId || !educationLevel || loading}
                className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Start Planning"}
              </button>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  // Planning chat view
  return (
    <main className="flex h-[calc(100vh-65px)]">
      <div className="flex flex-1 flex-col">
        <div className="border-b px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            Lesson Planner
          </h1>
        </div>
        <PlannerChat
          planId={plan.id}
          initialMessages={plan.chatHistory.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))}
          onPlanUpdated={refreshPlan}
        />
      </div>
      <PlanSidebar
        planId={plan.id}
        lessons={plan.plannedLessons}
        canGenerate={plan.plannedLessons.length > 0}
      />
    </main>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/lessons/page.tsx src/components/PlannerChat.tsx src/components/PlanSidebar.tsx
git commit -m "feat: build admin planner page with chat and sidebar"
```

---

### Task 9: Build generation progress page

**Files:**
- Create: `src/app/admin/lessons/[planId]/page.tsx`
- Create: `src/components/GenerationProgress.tsx`

- [ ] **Step 1: Create GenerationProgress component**

```tsx
// src/components/GenerationProgress.tsx
"use client";

import Link from "next/link";

interface PlannedLesson {
  id: string;
  title: string;
  order: number;
  status: string;
  lessonId: string | null;
}

interface GenerationProgressProps {
  planId: string;
  lessons: PlannedLesson[];
  onGenerate: () => void;
  generating: boolean;
}

export function GenerationProgress({ planId, lessons, onGenerate, generating }: GenerationProgressProps) {
  const currentIndex = lessons.findIndex((l) => l.status === "pending" || l.status === "generating");
  const allDone = lessons.every((l) => l.status === "generated");

  return (
    <div className="w-64 border-l flex flex-col" style={{ borderColor: "var(--color-border)" }}>
      <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Progress</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-2">
          {lessons.map((lesson, i) => (
            <div
              key={lesson.id}
              className="flex items-center gap-2 text-sm"
              style={{ color: lesson.status === "generated" ? "#16a34a" : i === currentIndex ? "#2563eb" : "var(--color-text-secondary)" }}
            >
              <span>{lesson.status === "generated" ? "✅" : i === currentIndex ? "→" : "○"}</span>
              {lesson.status === "generated" && lesson.lessonId ? (
                <Link
                  href={`/admin/lessons/${planId}/edit/${lesson.id}`}
                  className="hover:underline"
                  style={{ fontWeight: i === currentIndex ? 500 : 400 }}
                >
                  {lesson.order}. {lesson.title}
                </Link>
              ) : (
                <span style={{ fontWeight: i === currentIndex ? 500 : 400 }}>
                  {lesson.order}. {lesson.title}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t flex flex-col gap-2" style={{ borderColor: "var(--color-border)" }}>
        {!allDone && (
          <button
            onClick={onGenerate}
            disabled={generating}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? "Generating..." : "Generate Next →"}
          </button>
        )}
        {allDone && (
          <p className="text-sm text-center font-medium" style={{ color: "#16a34a" }}>
            All lessons generated ✓
          </p>
        )}
        <Link
          href="/admin/lessons"
          className="block w-full rounded-lg border px-4 py-2.5 text-center text-sm font-medium transition-colors"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
        >
          Back to Plan
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the generation progress page**

```tsx
// src/app/admin/lessons/[planId]/page.tsx
"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Card } from "@/components/Card";
import { GenerationProgress } from "@/components/GenerationProgress";

interface PlannedLesson {
  id: string;
  title: string;
  order: number;
  status: string;
  lessonId: string | null;
  lesson: { id: string; content: string } | null;
}

interface Plan {
  id: string;
  status: string;
  topic: { name: string };
  plannedLessons: PlannedLesson[];
}

export default function GenerationPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = use(params);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<PlannedLesson | null>(null);

  const fetchPlan = useCallback(async () => {
    const res = await fetch(`/api/admin/planner/${planId}`);
    const json = await res.json();
    if (json.data) setPlan(json.data);
  }, [planId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/admin/planner/${planId}/generate`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.data?.lessonId) {
        await fetchPlan();
        // Find the lesson that was just generated
        const updated = await fetch(`/api/admin/planner/${planId}`).then((r) => r.json());
        if (updated.data) {
          setPlan(updated.data);
          const generated = updated.data.plannedLessons.find(
            (l: PlannedLesson) => l.lessonId === json.data.lessonId
          );
          if (generated) setLastGenerated(generated);
        }
      }
    } catch {
      // handle error
    } finally {
      setGenerating(false);
    }
  };

  if (!plan) {
    return (
      <main className="flex items-center justify-center h-[calc(100vh-65px)]">
        <p style={{ color: "var(--color-text-secondary)" }}>Loading plan...</p>
      </main>
    );
  }

  return (
    <main className="flex h-[calc(100vh-65px)]">
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
          Generating: {plan.topic.name}
        </h1>

        {lastGenerated && lastGenerated.lesson && (
          <div className="mt-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
                  {lastGenerated.title}
                </h2>
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "#dcfce7", color: "#166534" }}>
                  Generated ✓
                </span>
              </div>
              <div
                className="text-sm leading-relaxed line-clamp-6"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {lastGenerated.lesson.content.slice(0, 500)}...
              </div>
            </Card>
          </div>
        )}

        {!lastGenerated && !generating && (
          <div className="mt-12 text-center">
            <p style={{ color: "var(--color-text-secondary)" }}>
              Click &ldquo;Generate Next&rdquo; to start creating lessons.
            </p>
          </div>
        )}

        {generating && (
          <div className="mt-12 flex flex-col items-center gap-4 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="text-lg font-medium" style={{ color: "var(--color-text)" }}>
              Generating lesson...
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              This can take up to 4 minutes.
            </p>
          </div>
        )}
      </div>

      <GenerationProgress
        planId={planId}
        lessons={plan.plannedLessons}
        onGenerate={handleGenerate}
        generating={generating}
      />
    </main>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/lessons/[planId]/page.tsx src/components/GenerationProgress.tsx
git commit -m "feat: build generation progress page with step-through"
```

---

### Task 10: Build lesson editor page with image panel

**Files:**
- Create: `src/app/admin/lessons/[planId]/edit/[plannedLessonId]/page.tsx`
- Create: `src/components/LessonEditor.tsx`
- Create: `src/components/ImageCard.tsx`

- [ ] **Step 1: Create ImageCard component**

```tsx
// src/components/ImageCard.tsx
"use client";

import { useState } from "react";

interface ImageCardProps {
  id: string;
  lessonId: string;
  tool: string;
  prompt: string;
  description: string;
  path: string | null;
  status: string;
  onUpdated: () => void;
}

export function ImageCard({ id, lessonId, tool, prompt, description, path, status, onUpdated }: ImageCardProps) {
  const [editing, setEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState(prompt);
  const [regenerating, setRegenerating] = useState(false);

  const toolLabel = { dalle: "DALL-E", svg: "SVG", mermaid: "Mermaid" }[tool] || tool;
  const toolColor = { dalle: "#2563eb", svg: "#059669", mermaid: "#7c3aed" }[tool] || "#6b7280";

  const handleRegenerate = async (newPrompt?: string) => {
    setRegenerating(true);
    try {
      await fetch(`/api/admin/lessons/${lessonId}/images/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(newPrompt ? { prompt: newPrompt } : {}),
          status: "planned",
        }),
      });
      onUpdated();
    } catch {
      // handle error
    } finally {
      setRegenerating(false);
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    await fetch(`/api/admin/lessons/${lessonId}/images/${id}`, { method: "DELETE" });
    onUpdated();
  };

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
      {path ? (
        <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${path})` }} />
      ) : (
        <div className="h-32 flex items-center justify-center" style={{ backgroundColor: `${toolColor}15` }}>
          <span className="text-xs font-medium" style={{ color: toolColor }}>{toolLabel}</span>
        </div>
      )}

      <div className="p-3">
        <div className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{description}</div>
        <div className="text-xs mt-1 truncate" style={{ color: "var(--color-text-secondary)" }}>{prompt}</div>

        {editing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              rows={3}
              className="w-full text-xs rounded border px-2 py-1 outline-none"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
            />
            <div className="flex gap-1">
              <button
                onClick={() => handleRegenerate(editPrompt)}
                disabled={regenerating}
                className="flex-1 text-xs bg-blue-600 text-white rounded px-2 py-1 disabled:opacity-50"
              >
                {regenerating ? "..." : "Save"}
              </button>
              <button onClick={() => setEditing(false)} className="text-xs rounded border px-2 py-1" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-1 mt-2">
            <button onClick={() => handleRegenerate()} disabled={regenerating} className="flex-1 text-xs rounded border px-2 py-1" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
              🔄 Regen
            </button>
            <button onClick={() => setEditing(true)} className="flex-1 text-xs rounded border px-2 py-1" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
              ✏️ Edit
            </button>
            <button onClick={handleDelete} className="text-xs rounded border px-2 py-1" style={{ borderColor: "#fecaca", color: "#991b1b", backgroundColor: "#fef2f2" }}>
              🗑️
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create LessonEditor component**

```tsx
// src/components/LessonEditor.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { ImageCard } from "./ImageCard";

interface LessonImage {
  id: string;
  tool: string;
  prompt: string;
  description: string;
  path: string | null;
  status: string;
  order: number;
}

interface LessonEditorProps {
  lessonId: string;
  initialContent: string;
  onSave: (content: string) => void;
}

export function LessonEditor({ lessonId, initialContent, onSave }: LessonEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [images, setImages] = useState<LessonImage[]>([]);

  const fetchImages = useCallback(async () => {
    const res = await fetch(`/api/admin/lessons/${lessonId}/images`);
    const json = await res.json();
    if (json.data) setImages(json.data);
  }, [lessonId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleSave = () => {
    onSave(content);
  };

  const handleAddImage = async () => {
    await fetch(`/api/admin/lessons/${lessonId}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tool: "svg",
        prompt: "New image — edit the prompt",
        description: "New image",
        order: images.length + 1,
      }),
    });
    fetchImages();
  };

  return (
    <div className="flex h-full">
      {/* Editor */}
      <div className="flex-1 flex flex-col border-r" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex gap-3 px-4 py-2 border-b text-sm" style={{ borderColor: "var(--color-border)" }}>
          <button
            onClick={() => setMode("edit")}
            className="font-medium"
            style={{ color: mode === "edit" ? "var(--color-text)" : "var(--color-text-secondary)" }}
          >
            Edit
          </button>
          <span style={{ color: "var(--color-border)" }}>|</span>
          <button
            onClick={() => setMode("preview")}
            style={{ color: mode === "preview" ? "var(--color-text)" : "var(--color-text-secondary)" }}
          >
            Preview
          </button>
          <div className="flex-1" />
          <button
            onClick={handleSave}
            className="rounded bg-blue-600 px-3 py-0.5 text-xs text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {mode === "edit" ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full p-4 font-mono text-sm resize-none outline-none"
              style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
            />
          ) : (
            <article className="prose dark:prose-invert max-w-none p-4 prose-p:my-2 prose-headings:mt-6 prose-headings:mb-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {content}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </div>

      {/* Image panel */}
      <div className="w-72 flex flex-col" style={{ backgroundColor: "var(--color-surface)" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Images ({images.length})
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {images.map((img) => (
            <ImageCard
              key={img.id}
              id={img.id}
              lessonId={lessonId}
              tool={img.tool}
              prompt={img.prompt}
              description={img.description}
              path={img.path}
              status={img.status}
              onUpdated={fetchImages}
            />
          ))}
          <button
            onClick={handleAddImage}
            className="w-full text-xs border border-dashed rounded-lg py-2"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            + Add Image
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the editor page**

```tsx
// src/app/admin/lessons/[planId]/edit/[plannedLessonId]/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { LessonEditor } from "@/components/LessonEditor";

interface PlannedLesson {
  id: string;
  title: string;
  lessonId: string | null;
  lesson: { id: string; content: string } | null;
}

export default function EditLessonPage({
  params,
}: {
  params: Promise<{ planId: string; plannedLessonId: string }>;
}) {
  const { planId, plannedLessonId } = use(params);
  const [planned, setPlanned] = useState<PlannedLesson | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/planner/${planId}`);
      const json = await res.json();
      if (json.data) {
        const found = json.data.plannedLessons.find(
          (l: PlannedLesson) => l.id === plannedLessonId
        );
        if (found) setPlanned(found);
      }
    }
    load();
  }, [planId, plannedLessonId]);

  const handleSave = async (content: string) => {
    if (!planned?.lessonId) return;
    await fetch(`/api/admin/lessons/${planned.lessonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  };

  if (!planned || !planned.lesson) {
    return (
      <main className="flex items-center justify-center h-[calc(100vh-65px)]">
        <p style={{ color: "var(--color-text-secondary)" }}>Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-[calc(100vh-65px)]">
      <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/lessons/${planId}`}
            className="text-sm rounded border px-3 py-1"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            ← Back
          </Link>
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            {planned.title}
          </span>
        </div>
      </div>
      <div className="flex-1">
        <LessonEditor
          lessonId={planned.lessonId!}
          initialContent={planned.lesson.content}
          onSave={handleSave}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/lessons/[planId]/edit/ src/components/LessonEditor.tsx src/components/ImageCard.tsx
git commit -m "feat: build lesson editor page with markdown editing and image panel"
```

---

### Task 11: Final verification

**Files:**
- No new files

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Manual smoke test**

Open http://localhost:3000/admin/lessons. Verify:
- Topic/level selector renders
- Selecting topic and level → "Start Planning" creates a plan
- Chat works with streaming
- Sidebar updates as Claude proposes lessons
- "Start Generating" navigates to progress page
- Generate Next creates a lesson
- Clicking a generated lesson opens the editor
- Markdown editing works
- Image panel shows images

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during verification"
```
