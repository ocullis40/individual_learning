# Lesson Planner Design Spec

## Overview

Replace the current admin lesson generation form with a chat-driven lesson planner. The planner lets you discuss a topic with Claude, build a structured lesson plan with image decisions, then step through generating each lesson with full editing control.

## Problem

The current admin page is fire-and-forget: you fill a form, the agent makes all decisions autonomously, and you get what you get. There's no way to plan lesson structure across a topic, no control over image choices, and no way to edit or replace images after generation. The DALL-E integration is broken because the tool requires a lessonId that doesn't exist yet during generation.

## User Flow

### Phase 1: Planning Chat

The admin page (`/admin/lessons`) becomes a chat interface with a plan sidebar.

1. User selects or creates a topic and education level
2. User chats with Claude about what lessons the topic should contain
3. Claude proposes lesson titles, outlines, and ordering — pushes back if the structure doesn't make sense (too many lessons, wrong granularity, missing foundational concepts)
4. Once lessons are agreed, Claude proposes image ideas for each lesson — specifying the tool (DALL-E, SVG, Mermaid) and a description/prompt
5. User approves, modifies, or rejects image suggestions
6. The plan builds up in a sidebar as the chat progresses
7. When all lessons have image plans, the "Start Generating" button enables

### Phase 2: Step-Through Generation

1. User clicks "Start Generating"
2. The first lesson is generated (content + images) using the plan as input
3. User sees the lesson in an editor view:
   - Left panel: raw markdown editor with Edit/Preview toggle
   - Right panel: image cards with regenerate, edit prompt, delete, and add buttons
4. User can edit the lesson text, tweak images, or add new ones
5. "Save & Next" saves the lesson and generates the next one
6. Progress sidebar shows which lessons are done, current, and pending
7. User can go back to any previously generated lesson to edit

### Phase 3: Ongoing Image Management

Images are independently replaceable at any time — during the step-through phase or later from the lesson page. Regenerating an image uses the same tool and prompt (or an edited prompt), replaces the file, and updates the markdown reference automatically.

## Planning Chat System Prompt

The planning chat Claude should:

- Be direct and critical — no "Great choice!" platitudes
- Push back on bad structure (too many/few lessons, wrong ordering, missing prerequisites)
- Suggest better alternatives when it sees them
- Propose specific image ideas with tool recommendations and reasoning
- Flag when an image idea won't add educational value
- Keep responses focused and concise

## Data Model

### New Models

**LessonPlan**
- `id` — UUID primary key
- `topicId` — FK to Topic
- `educationLevel` — enum: high_school, college, graduate
- `status` — enum: planning, generating, completed
- `chatHistory` — JSON array of chat messages (role + content)
- `createdAt`, `updatedAt`

**PlannedLesson**
- `id` — UUID primary key
- `planId` — FK to LessonPlan
- `title` — string
- `outline` — text (optional, from planning chat)
- `generationInstructions` — text (specific instructions for the content agent)
- `order` — integer
- `status` — enum: pending, generating, generated, error
- `lessonId` — FK to Lesson (nullable, set after generation)
- `createdAt`, `updatedAt`

**LessonImage**
- `id` — UUID primary key
- `lessonId` — FK to Lesson
- `tool` — enum: dalle, svg, mermaid
- `prompt` — text (the generation prompt)
- `description` — string (human-readable label)
- `path` — string (file path for DALL-E, raw content for SVG/Mermaid)
- `status` — enum: planned, generated, error
- `order` — integer (position in lesson)
- `createdAt`, `updatedAt`

### Changes to Existing Models

**Lesson** — no schema changes, but image references in markdown content will now point to LessonImage records rather than being standalone strings.

## Architecture

### API Routes

**Planning Chat**
- `POST /api/admin/planner` — Create a new lesson plan (topicId, educationLevel)
- `GET /api/admin/planner/[planId]` — Get plan with planned lessons and chat history
- `POST /api/admin/planner/[planId]/chat` — Send message, stream response, update plan state
- `PATCH /api/admin/planner/[planId]` — Update plan (e.g., finalize)

**Lesson Generation**
- `POST /api/admin/planner/[planId]/generate` — Generate the next pending lesson
- `PATCH /api/admin/planner/[planId]/lessons/[plannedLessonId]` — Update a planned lesson

**Image Management**
- `POST /api/lessons/[lessonId]/images` — Generate a new image for a lesson
- `PATCH /api/lessons/[lessonId]/images/[imageId]` — Regenerate or update an image
- `DELETE /api/lessons/[lessonId]/images/[imageId]` — Remove an image

### Planning Chat Flow

The planning chat uses streaming (same pattern as lesson chat) with a specialized system prompt. As the conversation progresses, Claude uses tool calls to update the plan state:

1. `addLesson` — adds a lesson to the plan sidebar
2. `updateLesson` — modifies a planned lesson
3. `removeLesson` — removes a planned lesson
4. `addImage` — adds an image plan to a lesson
5. `updateImage` — modifies an image plan
6. `removeImage` — removes an image plan

These are Claude tool_use calls within the streaming chat response — not user-facing API endpoints. The server-side chat handler intercepts these tool calls, executes them (mutating the plan in the database), and continues streaming the text response. The client polls or receives updates to refresh the sidebar. The sidebar reflects the current state of the plan at all times.

### Lesson Generation Flow

When generating a lesson from the plan:

1. Read the PlannedLesson (title, outline, generationInstructions) and its PlannedImages
2. Call the content agent with the plan context — title, outline, instructions, education level, existing lessons in the topic
3. Content agent generates text only (no autonomous image decisions)
4. Save the lesson to the database, link it to the PlannedLesson
5. For each PlannedImage, generate the image using the specified tool and prompt
6. Create LessonImage records, save files, update markdown with image references
7. Mark PlannedLesson status as generated

Key change from current flow: images are generated AFTER the lesson is saved, so we have a real lessonId. This fixes the DALL-E chicken-and-egg problem.

### Image Replacement Flow

1. User clicks "Regenerate" or "Edit Prompt" on an image card
2. If edit: show prompt editor, user modifies, submits
3. API generates new image with the (updated) prompt and tool
4. Old file is deleted from disk
5. LessonImage record is updated with new path
6. Lesson markdown is updated — old image reference swapped for new one
7. UI refreshes to show new image

## UI Components

### PlannerChat (client component)
- Chat message list with streaming
- Input textarea
- Sends to `/api/admin/planner/[planId]/chat`

### PlanSidebar (client component)
- Shows planned lessons with their image plans
- Updates in real time as chat progresses
- "Start Generating" button (enabled when all lessons have image plans)

### LessonEditor (client component)
- Split view: markdown editor (left) + image panel (right)
- Edit/Preview toggle for markdown
- Auto-saves on "Save & Next"

### ImageCard (client component)
- Shows image preview (or placeholder if pending)
- Tool badge (DALL-E / SVG / Mermaid)
- Prompt preview
- Regenerate, Edit Prompt, Delete buttons

### GenerationProgress (client component)
- List of all lessons in plan with status indicators
- Click to navigate to any generated lesson's editor
- "Generate Next" and "Back to Plan" buttons

## Pages

- `/admin/lessons` — Replaced: now shows topic/level selector, then PlannerChat + PlanSidebar
- `/admin/lessons/[planId]` — Generation progress view with step-through
- `/admin/lessons/[planId]/edit/[plannedLessonId]` — Lesson editor for a specific lesson

## Error Handling

- If lesson generation fails: mark PlannedLesson as error, show error message, allow retry
- If image generation fails: mark LessonImage as error, show error on card, allow retry with same or edited prompt
- If chat streaming fails: show error toast, allow resend
- Planning chat history is persisted in the database, so closing the tab doesn't lose progress

## Testing Strategy

- **Data/API logic**: TDD for plan CRUD, image CRUD, generation orchestration
- **UI components**: Manual review in browser
- **Integration**: Happy-path test for create plan → chat → generate lesson → manage images

## Out of Scope

- Collaborative editing (multi-user)
- Version history for lesson edits
- Drag-and-drop reordering of lessons or images
- Bulk image regeneration
- WYSIWYG markdown editor (raw markdown with preview toggle is sufficient)
