# Content Agent — Design Spec

## Purpose

Build a Content Agent from scratch — a multi-step autonomous agent that generates lessons for the learning platform. The agent receives a goal (topic, title, education level), decides what tools to use and in what order, and produces a complete lesson with narrative content and Mermaid diagrams. This is the first real agent in the application and a learning exercise in agent architecture.

## Why Build From Scratch

The goal is to understand how agents work at a fundamental level — the orchestration loop, tool calling, decision making, and error handling. No SDK abstraction. Every piece is visible and understood.

## How The Agent Works

### The Agent Loop

```
1. Send goal + available tools to Claude
2. Claude responds with either:
   a. A tool call → execute the tool, send result back to Claude, go to 1
   b. A final text response → agent is done
3. Repeat until Claude says done or max iterations reached
```

### Agent Goal

The agent receives:
- `topicId` — which topic the lesson belongs to
- `title` — the lesson title
- `educationLevel` — "high_school", "college", or "graduate"

### Available Tools

**1. searchExistingLessons**
- Input: `{ topicId: string }`
- Action: Query database for all lessons under this topic (and child topics)
- Returns: Array of `{ title, topicName }` — so the agent knows what already exists and can avoid duplication

**2. generateContent**
- Input: `{ title: string, educationLevel: string, topicName: string, existingLessons: string[], sectionGuidance?: string }`
- Action: Call Claude to generate lesson content in narrative style
- Returns: Markdown string (1000-1500 words)
- Rules: Use `##` headings (not `#`), narrative style, 3-5 sections, engaging opening

**3. generateDiagram**
- Input: `{ concept: string, diagramType: "flowchart" | "sequence" }`
- Action: Call Claude to generate a Mermaid diagram for the given concept
- Returns: Mermaid code string (graph TD or sequenceDiagram only)
- Rules: Max 10-15 nodes, wrap special characters in quotes

**4. saveLesson**
- Input: `{ topicId: string, title: string, content: string, educationLevel: string }`
- Action: Auto-calculate order (count existing lessons + 1), set difficultyLevel to 1, save to database
- Returns: `{ id, title }` of saved lesson

### Expected Agent Behavior

A typical run looks like:

```
Agent receives: "Create a lesson on Nuclear Waste Management for college level under Nuclear Energy topic"

Step 1: Agent calls searchExistingLessons({ topicId })
  → Gets back: ["What is Nuclear Energy?", "How Nuclear Fission Works", "Nuclear Fusion"]
  → Agent now knows what exists and can avoid overlap

Step 2: Agent calls generateContent({
    title: "Nuclear Waste Management",
    educationLevel: "college",
    topicName: "Nuclear Energy",
    existingLessons: ["What is Nuclear Energy?", "How Nuclear Fission Works", "Nuclear Fusion"]
  })
  → Gets back: markdown lesson content

Step 3: Agent calls generateDiagram({ concept: "nuclear fuel cycle and waste classification", diagramType: "flowchart" })
  → Gets back: mermaid code

Step 4: Agent calls generateDiagram({ concept: "spent fuel storage timeline", diagramType: "flowchart" })
  → Gets back: mermaid code

Step 5: Agent inserts diagrams into the content at appropriate locations

Step 6: Agent calls saveLesson({ topicId, title, content, educationLevel })
  → Lesson saved

Step 7: Agent responds with summary: "Created lesson 'Nuclear Waste Management' with 2 diagrams, saved as lesson #4 under Nuclear Energy"
```

The agent decides how many diagrams to create (0-2), where to place them, and whether additional steps are needed. It's not a fixed script.

## Architecture

### Files

```
src/
├── agents/
│   ├── content-agent.ts         # The agent orchestration loop
│   └── tools/
│       ├── search-lessons.ts    # searchExistingLessons tool
│       ├── generate-content.ts  # generateContent tool
│       ├── generate-diagram.ts  # generateDiagram tool
│       └── save-lesson.ts       # saveLesson tool
├── app/
│   ├── admin/
│   │   └── lessons/
│   │       └── page.tsx         # Admin UI that invokes the agent
│   └── api/
│       └── admin/
│           ├── agent/
│           │   └── route.ts     # POST: invoke the content agent
│           └── topics/
│               └── route.ts     # GET+POST: topic management
```

### Agent Orchestration (content-agent.ts)

```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: object;
  execute: (input: any) => Promise<any>;
}

interface AgentResult {
  success: boolean;
  message: string;
  lessonId?: string;
  steps: { tool: string; input: any; output: any }[];
}

async function runContentAgent(goal: {
  topicId: string;
  title: string;
  educationLevel: string;
}): Promise<AgentResult> {
  const tools = [searchExistingLessons, generateContent, generateDiagram, saveLesson];
  const messages = [];
  const steps = [];
  const MAX_ITERATIONS = 10;

  // Initial system prompt + goal
  const systemPrompt = `You are a Content Agent that creates educational lessons...`;
  messages.push({ role: "user", content: `Create a lesson: ${goal.title}...` });

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: CONTENT_MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      tools: tools.map(t => ({ name: t.name, description: t.description, input_schema: t.inputSchema })),
      messages,
    });

    // Process response - check for tool calls or final text
    if (response.stop_reason === "tool_use") {
      // Execute tool, add result to messages, continue loop
    } else {
      // Agent is done
      return { success: true, message: response.content[0].text, steps };
    }
  }

  return { success: false, message: "Max iterations reached", steps };
}
```

### API Route (POST /api/admin/agent)

- Receives `{ topicId, title, educationLevel }`
- Invokes `runContentAgent(goal)`
- Returns the agent result (success/failure, steps taken, lesson ID)
- Not streaming — the agent runs to completion and returns the full result

### Admin UI

- Same form as before: topic dropdown, title, education level
- "Generate Lesson" button invokes POST /api/admin/agent
- While running: show a log of agent steps as they complete (polling or streaming)
- On success: show link to the new lesson
- On error: show what went wrong and which step failed

## Data Model Changes

### Lesson (modify)
- Add: `educationLevel String? @map("education_level")`

No LessonArchive — archiving is out of scope.

## Cost Estimate

Each agent run makes multiple Claude calls:
- 1 searchExistingLessons (no Claude call, just DB query)
- 1 generateContent (~$0.04)
- 1-2 generateDiagram (~$0.01 each)
- 1 saveLesson (no Claude call, just DB write)
- Agent loop overhead (~3-5 Claude calls for tool routing at ~$0.01 each)
- **Total: ~$0.10-0.15 per lesson generation**

## Constraints

- Max 10 agent iterations (prevent runaway loops)
- Max 2 diagrams per lesson
- Only flowchart (graph TD) and sequenceDiagram Mermaid types
- Content must use `##` headings, not `#`
- Narrative style, 1000-1500 words

## Out of Scope
- Streaming agent steps to the UI (use polling for now)
- Agent memory across runs
- Lesson archiving/versioning
- Agent SDK integration
- Multi-agent coordination
