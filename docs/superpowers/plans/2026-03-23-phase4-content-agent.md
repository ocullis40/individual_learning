# Phase 4: Content Agent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-step Content Agent from scratch that autonomously generates lessons using tools. The agent receives a goal, decides what tools to call, and produces a complete lesson with narrative content and Mermaid diagrams. First real agent architecture in the application.

**Architecture:** Agent orchestration loop in src/agents/content-agent.ts. Four tools as separate modules. API route to invoke the agent. Admin UI page to trigger and monitor. Uses Anthropic tool_use API for Claude to call tools.

**Tech Stack:** Next.js 16, TypeScript, Prisma 7 (`@/generated/prisma/client`), Anthropic SDK (tool_use), Vitest

---

## File Structure

```
src/
├── agents/
│   ├── content-agent.ts              # Agent orchestration loop
│   └── tools/
│       ├── search-lessons.ts         # searchExistingLessons tool
│       ├── generate-content.ts       # generateContent tool
│       ├── generate-diagram.ts       # generateDiagram tool
│       └── save-lesson.ts            # saveLesson tool
├── app/
│   ├── admin/
│   │   └── lessons/
│   │       └── page.tsx              # Admin UI
│   └── api/
│       └── admin/
│           ├── agent/
│           │   └── route.ts          # POST: invoke content agent
│           └── topics/
│               └── route.ts          # GET+POST: topic management
prisma/
├── schema.prisma                     # Add educationLevel to Lesson
tests/
├── agents/
│   └── content-agent.test.ts         # Agent tool tests
├── api/
│   └── admin.test.ts                 # Admin API data-layer tests
```

---

### Task 1: Add educationLevel to Lesson Model and Create Topic Admin Route

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/app/api/admin/topics/route.ts`
- Create: `tests/api/admin.test.ts`

- [ ] **Step 1: Write failing tests (TDD)**

Tests for:
- Lesson model accepts educationLevel (nullable string)
- List all topics (flat list, not just top-level)
- Create a new topic with name, description, optional parentTopicId

- [ ] **Step 2: Run tests — verify they fail**

- [ ] **Step 3: Add educationLevel to Lesson model**

```prisma
educationLevel String? @map("education_level")
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name add_education_level
```

- [ ] **Step 5: Create GET+POST /api/admin/topics**

GET: Return ALL topics (not just top-level) with parent topic info, ordered by name. Error envelope.
POST: Create topic with name, description, optional parentTopicId. Error envelope.

- [ ] **Step 6: Run tests — verify they pass**

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/app/api/admin/topics/ tests/api/admin.test.ts
git commit -m "feat: add educationLevel to Lesson model and admin topics API

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Build Agent Tools

**Files:**
- Modify: `src/lib/anthropic.ts` — add CONTENT_MODEL constant
- Create: `src/agents/tools/search-lessons.ts`
- Create: `src/agents/tools/generate-content.ts`
- Create: `src/agents/tools/generate-diagram.ts`
- Create: `src/agents/tools/save-lesson.ts`
- Create: `tests/agents/content-agent.test.ts`

- [ ] **Step 1: Add CONTENT_MODEL to anthropic.ts**

```typescript
export const CONTENT_MODEL = "claude-sonnet-4-6";
```

- [ ] **Step 2: Write tests for each tool (TDD)**

Tests for:
- searchExistingLessons returns lesson titles for a topic
- saveLesson creates a lesson with auto-calculated order and default difficultyLevel 1

Note: generateContent and generateDiagram call Claude API — test these as happy-path integration tests only (mock the Claude call or skip in CI).

- [ ] **Step 3: Create searchExistingLessons tool**

```typescript
// src/agents/tools/search-lessons.ts
export const searchExistingLessons = {
  name: "searchExistingLessons",
  description: "Search for existing lessons under a topic to avoid duplication",
  inputSchema: {
    type: "object",
    properties: {
      topicId: { type: "string", description: "The topic ID to search under" }
    },
    required: ["topicId"]
  },
  execute: async (input: { topicId: string }) => {
    // Query DB for lessons under this topic and child topics
    // Return array of { title, topicName }
  }
};
```

- [ ] **Step 4: Create generateContent tool**

```typescript
// src/agents/tools/generate-content.ts
export const generateContent = {
  name: "generateContent",
  description: "Generate lesson content in narrative style for a given topic and education level",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      educationLevel: { type: "string", enum: ["high_school", "college", "graduate"] },
      topicName: { type: "string" },
      existingLessons: { type: "array", items: { type: "string" } },
      sectionGuidance: { type: "string", description: "Optional guidance on what sections to include" }
    },
    required: ["title", "educationLevel", "topicName"]
  },
  execute: async (input) => {
    // Call Claude with CONTENT_MODEL, max_tokens 8192
    // System prompt enforces: ## headings, narrative style, 1000-1500 words, 3-5 sections
    // Use cache_control on system prompt
    // Return markdown string
  }
};
```

- [ ] **Step 5: Create generateDiagram tool**

```typescript
// src/agents/tools/generate-diagram.ts
export const generateDiagram = {
  name: "generateDiagram",
  description: "Generate a Mermaid diagram for a concept. Max 2 per lesson.",
  inputSchema: {
    type: "object",
    properties: {
      concept: { type: "string", description: "The concept to diagram" },
      diagramType: { type: "string", enum: ["flowchart", "sequence"] }
    },
    required: ["concept", "diagramType"]
  },
  execute: async (input) => {
    // Call Claude to generate Mermaid code
    // Constrain to graph TD or sequenceDiagram only
    // Max 10-15 nodes, quotes around special chars
    // Return mermaid code string
  }
};
```

- [ ] **Step 6: Create saveLesson tool**

```typescript
// src/agents/tools/save-lesson.ts
export const saveLesson = {
  name: "saveLesson",
  description: "Save a completed lesson to the database",
  inputSchema: {
    type: "object",
    properties: {
      topicId: { type: "string" },
      title: { type: "string" },
      content: { type: "string", description: "Full markdown content including mermaid diagrams" },
      educationLevel: { type: "string" }
    },
    required: ["topicId", "title", "content", "educationLevel"]
  },
  execute: async (input) => {
    // Auto-calculate order: count existing lessons for topic + 1
    // Default difficultyLevel to 1
    // Save to database via Prisma
    // Return { id, title }
  }
};
```

- [ ] **Step 7: Run tests — verify they pass**

- [ ] **Step 8: Commit**

```bash
git add src/lib/anthropic.ts src/agents/ tests/agents/
git commit -m "feat: build Content Agent tools — search, generate, diagram, save

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Build Agent Orchestration Loop

**Files:**
- Create: `src/agents/content-agent.ts`

- [ ] **Step 1: Build the agent loop**

```typescript
// src/agents/content-agent.ts
import { anthropic, CONTENT_MODEL } from "@/lib/anthropic";
import { searchExistingLessons } from "./tools/search-lessons";
import { generateContent } from "./tools/generate-content";
import { generateDiagram } from "./tools/generate-diagram";
import { saveLesson } from "./tools/save-lesson";

interface AgentGoal {
  topicId: string;
  title: string;
  educationLevel: string;
}

interface AgentStep {
  tool: string;
  input: any;
  output: any;
}

interface AgentResult {
  success: boolean;
  message: string;
  lessonId?: string;
  steps: AgentStep[];
}

const tools = [searchExistingLessons, generateContent, generateDiagram, saveLesson];
const MAX_ITERATIONS = 10;

export async function runContentAgent(goal: AgentGoal): Promise<AgentResult> {
  const steps: AgentStep[] = [];
  const messages: any[] = [];

  const systemPrompt = `You are a Content Agent that creates educational lessons.

Your goal is to create a high-quality lesson with these parameters:
- Title: ${goal.title}
- Education Level: ${goal.educationLevel}
- Topic ID: ${goal.topicId}

Follow this process:
1. First, search for existing lessons to understand what's already covered
2. Generate the lesson content in narrative style
3. Generate 1-2 Mermaid diagrams where they help explain concepts
4. Compose the final lesson by embedding the mermaid diagrams into the content at appropriate locations using \`\`\`mermaid code fences
5. Save the final composed lesson to the database — the content field must include the full markdown with any mermaid diagrams already embedded

You have tools available. Use them to accomplish your goal. When you are done, respond with a summary of what you created.`;

  messages.push({
    role: "user",
    content: `Create a lesson titled "${goal.title}" at the ${goal.educationLevel} education level.`
  });

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: CONTENT_MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema
      })),
      messages,
    });

    // Add assistant response to messages
    messages.push({ role: "assistant", content: response.content });

    // Check if agent wants to use a tool
    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (block: any) => block.type === "tool_use"
      );

      const toolResults = [];
      for (const toolUse of toolUseBlocks) {
        const tool = tools.find(t => t.name === toolUse.name);
        if (!tool) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            is_error: true,
            content: JSON.stringify({ error: `Unknown tool: ${toolUse.name}` })
          });
          continue;
        }

        try {
          const result = await tool.execute(toolUse.input);
          steps.push({ tool: toolUse.name, input: toolUse.input, output: result });
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(result)
          });
        } catch (error: any) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            is_error: true,
            content: JSON.stringify({ error: error.message })
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    } else {
      // Agent is done — extract final text
      const textBlock = response.content.find((b: any) => b.type === "text");
      return {
        success: true,
        message: textBlock?.text || "Lesson created",
        lessonId: steps.find(s => s.tool === "saveLesson")?.output?.id,
        steps,
      };
    }
  }

  return { success: false, message: "Max iterations reached", steps };
}
```

- [ ] **Step 2: Write a basic test for the agent loop**

Add to `tests/agents/content-agent.test.ts`:
- Test that the agent loop handles tool_use responses correctly (mock `anthropic.messages.create` to return a scripted sequence: first a tool_use response, then an end_turn response)
- Test that max iterations is respected (mock to always return tool_use)
- These are unit tests with mocked Claude responses — no real API calls

- [ ] **Step 3: Verify build and tests**

```bash
npm run build && npm test
```

- [ ] **Step 4: Commit**

```bash
git add src/agents/content-agent.ts tests/agents/content-agent.test.ts
git commit -m "feat: build Content Agent orchestration loop with tool calling

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Build Agent API Route and Admin UI

**Files:**
- Create: `src/app/api/admin/agent/route.ts`
- Create: `src/app/admin/lessons/page.tsx`
- Modify: `src/app/layout.tsx` — add Admin link

- [ ] **Step 1: Create POST /api/admin/agent**

- Receive { topicId, title, educationLevel }
- Validate inputs (400 if missing)
- Invoke runContentAgent(goal)
- Return the AgentResult as JSON
- Error envelope for failures

- [ ] **Step 2: Create admin page**

Client component at /admin/lessons with:
- Topic dropdown (fetched from GET /api/admin/topics, returns ALL topics)
- "Create new topic" option with name + description + parent topic fields
- Lesson title text input
- Education level dropdown (High School, College, Graduate)
- "Generate Lesson" button
- While running: show a loading state with "Agent is working..."
- On success: show agent summary, link to the new lesson, list of steps taken
- On error: show error message with "Try Again" button

- [ ] **Step 3: Add Admin link to layout.tsx navigation**

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/agent/ src/app/admin/ src/app/layout.tsx
git commit -m "feat: add admin page and API route for Content Agent

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Run tests, lint, build**

```bash
npm test && npm run lint && npm run build
```

- [ ] **Step 2: Manual smoke test**

1. Navigate to /admin/lessons
2. Select "Nuclear Energy" topic (or create a new subtopic)
3. Enter title "Nuclear Safety and Accidents"
4. Select "College" education level
5. Click Generate — agent runs, shows steps
6. On success — click link to view the new lesson
7. Lesson renders with narrative content and Mermaid diagrams
8. Chat works on the new lesson
9. Quiz available on the topic page

- [ ] **Step 3: Commit and push**
