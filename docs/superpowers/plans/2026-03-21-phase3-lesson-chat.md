# Phase 3: Lesson Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, streaming chat panel to lesson pages so learners can ask questions about lesson content, powered by Claude via the Anthropic SDK.

**Architecture:** Prisma schema extension for ChatConversation and ChatMessage models. Next.js API route with streaming via ReadableStream. Client-side chat component as a bottom drawer. Anthropic SDK for Claude API calls.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS, PostgreSQL, Prisma 7 (`@/generated/prisma/client`), Anthropic SDK, Vitest

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── lessons/
│   │       └── [id]/
│   │           └── chat/
│   │               └── route.ts        # GET + POST chat API
│   └── lessons/
│       └── [id]/
│           └── page.tsx                # Updated to include ChatPanel
├── components/
│   └── ChatPanel.tsx                   # Client component — collapsible bottom drawer
├── lib/
│   ├── prisma.ts                       # (existing)
│   └── anthropic.ts                    # Anthropic client singleton
prisma/
├── schema.prisma                       # Add ChatConversation + ChatMessage models
├── migrations/
│   └── YYYYMMDD_add_chat/              # New migration
tests/
├── api/
│   └── chat.test.ts                    # Chat API data-layer tests
```

---

### Task 1: Add ChatConversation and ChatMessage Models

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `tests/models/chat-schema.test.ts`

- [ ] **Step 1: Write failing tests for chat models**

Create `tests/models/chat-schema.test.ts`:

```typescript
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Chat schema", () => {
  const cleanupConversationIds: string[] = [];
  const cleanupTopicIds: string[] = [];

  afterAll(async () => {
    for (const id of cleanupConversationIds) {
      await prisma.chatMessage.deleteMany({ where: { conversationId: id } });
      await prisma.chatConversation.delete({ where: { id } }).catch(() => {});
    }
    await prisma.lesson.deleteMany({ where: { topicId: { in: cleanupTopicIds } } });
    for (const id of cleanupTopicIds) {
      await prisma.topic.delete({ where: { id } }).catch(() => {});
    }
  });

  it("can create a conversation linked to a lesson", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Chat Test Topic", description: "test" },
    });
    cleanupTopicIds.push(topic.id);
    const lesson = await prisma.lesson.create({
      data: { title: "Chat Test Lesson", content: "test", difficultyLevel: 1, order: 1, topicId: topic.id },
    });
    const conversation = await prisma.chatConversation.create({
      data: { lessonId: lesson.id, userId: "dev-user" },
    });
    cleanupConversationIds.push(conversation.id);
    expect(conversation.id).toBeDefined();
    expect(conversation.lessonId).toBe(lesson.id);
  });

  it("can create messages in a conversation", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Chat Msg Topic", description: "test" },
    });
    cleanupTopicIds.push(topic.id);
    const lesson = await prisma.lesson.create({
      data: { title: "Chat Msg Lesson", content: "test", difficultyLevel: 1, order: 1, topicId: topic.id },
    });
    const conversation = await prisma.chatConversation.create({
      data: { lessonId: lesson.id, userId: "dev-user" },
    });
    cleanupConversationIds.push(conversation.id);

    const userMsg = await prisma.chatMessage.create({
      data: { conversationId: conversation.id, role: "user", content: "What is fission?" },
    });
    const assistantMsg = await prisma.chatMessage.create({
      data: { conversationId: conversation.id, role: "assistant", content: "Fission is..." },
    });

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
    });
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[1].role).toBe("assistant");
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

- [ ] **Step 3: Add models to prisma/schema.prisma**

Add after existing models:

```prisma
model ChatConversation {
  id        String        @id @default(cuid())
  userId    String        @map("user_id")
  lessonId  String        @map("lesson_id")
  lesson    Lesson        @relation(fields: [lessonId], references: [id])
  messages  ChatMessage[]
  createdAt DateTime      @default(now()) @map("created_at")
  updatedAt DateTime      @updatedAt @map("updated_at")

  @@unique([userId, lessonId])
  @@map("chat_conversations")
}

model ChatMessage {
  id             String           @id @default(cuid())
  conversationId String           @map("conversation_id")
  conversation   ChatConversation @relation(fields: [conversationId], references: [id])
  role           String
  content        String
  createdAt      DateTime         @default(now()) @map("created_at")

  @@map("chat_messages")
}
```

Also add the relation to the Lesson model:

```prisma
// Add to existing Lesson model:
conversations ChatConversation[]
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name add_chat
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm test
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations tests/models/chat-schema.test.ts
git commit -m "feat: add ChatConversation and ChatMessage models

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Set Up Anthropic Client and Chat API Route

**Files:**
- Create: `src/lib/anthropic.ts`
- Create: `src/app/api/lessons/[id]/chat/route.ts`
- Create: `tests/api/chat.test.ts`

- [ ] **Step 1: Install Anthropic SDK**

```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Create Anthropic client singleton**

Create `src/lib/anthropic.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

export const anthropic =
  globalForAnthropic.anthropic ?? new Anthropic();

if (process.env.NODE_ENV !== "production") {
  globalForAnthropic.anthropic = anthropic;
}
```

Note: Anthropic SDK reads ANTHROPIC_API_KEY from env automatically.

- [ ] **Step 3: Write data-layer tests for chat API**

Create `tests/api/chat.test.ts`:

```typescript
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Chat API data layer", () => {
  const cleanupConversationIds: string[] = [];
  let testLessonId: string;
  let testTopicId: string;

  afterAll(async () => {
    for (const id of cleanupConversationIds) {
      await prisma.chatMessage.deleteMany({ where: { conversationId: id } });
      await prisma.chatConversation.delete({ where: { id } }).catch(() => {});
    }
    await prisma.lesson.delete({ where: { id: testLessonId } }).catch(() => {});
    await prisma.topic.delete({ where: { id: testTopicId } }).catch(() => {});
  });

  it("creates a conversation if none exists for user+lesson", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Chat API Topic", description: "test" },
    });
    testTopicId = topic.id;
    const lesson = await prisma.lesson.create({
      data: { title: "Chat API Lesson", content: "test", difficultyLevel: 1, order: 1, topicId: topic.id },
    });
    testLessonId = lesson.id;

    const conversation = await prisma.chatConversation.upsert({
      where: { userId_lessonId: { userId: "dev-user", lessonId: lesson.id } },
      update: {},
      create: { userId: "dev-user", lessonId: lesson.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    cleanupConversationIds.push(conversation.id);

    expect(conversation.id).toBeDefined();
    expect(conversation.messages).toHaveLength(0);
  });

  it("returns existing conversation on second call", async () => {
    const conv1 = await prisma.chatConversation.upsert({
      where: { userId_lessonId: { userId: "dev-user", lessonId: testLessonId } },
      update: {},
      create: { userId: "dev-user", lessonId: testLessonId },
    });
    const conv2 = await prisma.chatConversation.upsert({
      where: { userId_lessonId: { userId: "dev-user", lessonId: testLessonId } },
      update: {},
      create: { userId: "dev-user", lessonId: testLessonId },
    });
    expect(conv1.id).toBe(conv2.id);
  });
});
```

- [ ] **Step 4: Create GET + POST /api/lessons/[id]/chat route**

Create `src/app/api/lessons/[id]/chat/route.ts`:

The GET handler should:
- Upsert a conversation for the hardcoded "dev-user" + lesson ID
- Return the conversation with all messages ordered by createdAt

The POST handler should:
- Parse `{ message }` from the request body
- Find the lesson (return 404 if not found)
- Upsert the conversation
- Save the user message to DB
- Build messages array for Claude (system prompt with lesson content + conversation history)
- Stream Claude's response using the Anthropic SDK
- After stream completes, save assistant message to DB
- Return streaming response

System prompt:
```
You are a knowledgeable tutor helping a student understand the following lesson content.
Answer questions clearly and concisely, referencing the lesson material when relevant.
If the student asks about something not covered in the lesson, you may provide additional
context but note that it goes beyond the current lesson.

LESSON CONTENT:
{lesson.content}
```

- [ ] **Step 5: Run tests and build**

```bash
npm test && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/anthropic.ts src/app/api/lessons/[id]/chat/ tests/api/chat.test.ts package.json package-lock.json
git commit -m "feat: add chat API route with Claude streaming and Anthropic client

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Build ChatPanel Client Component

**Files:**
- Create: `src/components/ChatPanel.tsx`
- Modify: `src/app/lessons/[id]/page.tsx` — add ChatPanel

- [ ] **Step 1: Create the ChatPanel component**

Create `src/components/ChatPanel.tsx` as a client component (`"use client"`) with:

- **State**: `isOpen` (drawer toggle), `messages` (chat history), `input` (current input), `isLoading` (streaming indicator)
- **Props**: `lessonId: string`
- **On mount**: Fetch GET `/api/lessons/{lessonId}/chat` to load existing messages
- **On send**: POST to `/api/lessons/{lessonId}/chat` with `{ message }`, read the streaming response token by token, append to the assistant message as it streams
- **Collapsed state**: Fixed bar at bottom — "Ask a question about this lesson..." with chat icon
- **Expanded state**: Drawer sliding up (~40vh), scrollable message history, input field, send button, close button
- **Auto-scroll**: Scroll to bottom on new messages

- [ ] **Step 2: Add ChatPanel to the lesson page**

Modify `src/app/lessons/[id]/page.tsx` to include `<ChatPanel lessonId={id} />` at the bottom, after the lesson content. Since ChatPanel is a client component and the page is a server component, this works as a client island.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Manual test**

```bash
npm run dev
```

Navigate to a lesson, expand the chat, ask a question. Verify:
- Streaming response appears
- Messages persist after closing and reopening the drawer
- Messages persist after navigating away and back

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel.tsx src/app/lessons/[id]/page.tsx
git commit -m "feat: add collapsible ChatPanel with streaming responses on lesson pages

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Manual smoke test**

Verify full flow:
1. Navigate to a lesson
2. Chat drawer collapsed at bottom
3. Click to expand
4. Ask a question about the lesson
5. Response streams in
6. Close drawer, reopen — messages still there
7. Navigate away, come back — messages persist
8. All other pages still work (topics, home)

- [ ] **Step 5: Review commit history**

```bash
git log --oneline phase3-lesson-chat --not main
```
