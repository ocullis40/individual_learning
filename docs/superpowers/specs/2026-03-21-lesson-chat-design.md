# Lesson Chat — Design Spec

## Purpose

Add a collapsible chat panel to lesson pages that lets the learner ask follow-up questions about the current lesson content. Conversations are persisted per lesson per user and can be recalled on return visits.

## How It Works

1. User reads a lesson
2. A chat button/bar appears at the bottom of the page
3. User clicks to expand a chat drawer
4. User types a question — Claude receives the lesson content as context and responds
5. Responses stream in real-time
6. Conversation is saved to the database, tied to the lesson and user
7. On return visits, previous conversation is loaded

## Tech Stack

| Component | Choice |
|-----------|--------|
| AI Model | Claude Sonnet (via Anthropic SDK) |
| Streaming | Next.js API route with streaming response |
| Persistence | PostgreSQL via Prisma (ChatConversation + ChatMessage tables) |
| UI | Client component with collapsible bottom drawer |

## Data Model

### ChatConversation
- id, user_id (FK, hardcoded dev user for now), lesson_id (FK), created_at, updated_at

### ChatMessage
- id, conversation_id (FK), role (enum: user, assistant), content (text), created_at

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/lessons/[id]/chat` | Get or create conversation for this lesson, return all messages |
| POST | `/api/lessons/[id]/chat` | Send a message, stream Claude's response, save both to DB |

### POST /api/lessons/[id]/chat

Request:
```json
{ "message": "What is a chain reaction?" }
```

Response: Server-sent events (streaming). After stream completes, both the user message and assistant response are saved to the database.

### System Prompt

```
You are a knowledgeable tutor helping a student understand the following lesson content.
Answer questions clearly and concisely, referencing the lesson material when relevant.
If the student asks about something not covered in the lesson, you may provide additional
context but note that it goes beyond the current lesson.

LESSON CONTENT:
{lesson.content}
```

## UI Design

- **Collapsed state**: A bar at the bottom of the lesson page showing "Ask a question about this lesson..." with a chat icon
- **Expanded state**: A drawer sliding up from the bottom (~40% of viewport height), containing:
  - Message history (scrollable)
  - Input field with send button
  - Close/minimize button
- **Streaming**: Assistant messages appear token-by-token as they stream in

## Auth

Hardcoded dev user (same as Phase 1-2). Conversation is tied to a fixed user ID.

## Key Decisions

- Conversations are per-lesson, not per-topic — each lesson has its own chat thread
- One conversation per user per lesson (GET returns existing or creates new)
- Streaming via ReadableStream in Next.js API route
- Chat is a client component (needs useState, useEffect for interactivity)
- Lesson page remains a server component; chat panel is a client island

## Out of Scope

- Learner profile context in prompts (Phase 4)
- Multi-turn prompt optimization (token management)
- Chat across lessons or topics
- Voice input
