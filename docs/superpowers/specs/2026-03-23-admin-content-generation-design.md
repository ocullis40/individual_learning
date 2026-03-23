# Admin Content Generation — Design Spec

## Purpose

Add an admin screen where content creators can generate new lessons by entering a topic and selecting a learner education level. Claude generates the lesson content in narrative style with Mermaid diagrams. Lessons persist to the database. If a lesson on the same topic already exists, the admin is prompted to archive the old version.

## Admin Screen

A simple page at `/admin/lessons` with:

1. **Topic selector** — choose an existing topic or create a new one (with optional parent topic)
2. **Lesson title** — what to call the lesson
3. **Education level** — dropdown: High School, College, Graduate
4. **Generate button** — calls Claude to create the lesson content

After generation:
- Preview the generated content (rendered markdown)
- If a lesson with the same title exists under that topic, show a warning: "A lesson with this title already exists. Archive the old version and replace?"
- Save / Save & Archive buttons
- The lesson is saved to the database and immediately available to learners

## Data Model Changes

### LessonArchive (new)
- id, original_lesson_id, title, content, difficulty_level, order, topic_id, archived_at

This stores the old version when a lesson is replaced. The original lesson record gets updated with the new content.

### Lesson (modify)
- Add: `educationLevel String? @map("education_level")` — stores what level the content was generated for

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/admin/lessons/generate` | Generate lesson content via Claude (returns preview, not saved yet) |
| POST | `/api/admin/lessons/save` | Save generated lesson to database |
| GET | `/api/admin/topics` | List all topics (flat list for the dropdown) |
| POST | `/api/admin/topics` | Create a new topic |

### POST /api/admin/lessons/generate

Request:
```json
{
  "topicId": "...",
  "title": "Nuclear Waste Management",
  "educationLevel": "college"
}
```

Response:
```json
{
  "content": "# Nuclear Waste Management\n\n...",
  "existingLesson": null | { "id": "...", "title": "...", "createdAt": "..." }
}
```

The `existingLesson` field is populated if a lesson with the same title already exists under that topic, so the UI can prompt for archiving.

### POST /api/admin/lessons/save

Request:
```json
{
  "topicId": "...",
  "title": "Nuclear Waste Management",
  "content": "...",
  "educationLevel": "college",
  "order": 2,
  "difficultyLevel": 1,
  "archiveExisting": true | false
}
```

If `archiveExisting` is true and a lesson with the same title exists, the old lesson is copied to LessonArchive and the existing record is updated with the new content.

## Content Generation Prompt

```
Generate a lesson on "{title}" for a student at the {educationLevel} education level.

Write in a narrative, storytelling style — like a well-written magazine article or documentary narration.
Use flowing prose, not bullet-point lists. Open with a compelling hook.

Include:
- 1000-1500 words of substantive educational content
- Markdown formatting: headings, bold, tables where appropriate
- Up to 2 Mermaid diagrams where they help explain concepts (use ```mermaid code blocks)

The lesson is part of the topic: {topic.name}
{topic.description}
```

## UI Design

### `/admin/lessons` page
- Clean form layout
- Topic dropdown (with "Create new topic" option)
- Title text input
- Education level dropdown (High School, College, Graduate)
- "Generate Lesson" button
- After generation: rendered preview of the markdown content
- Warning banner if existing lesson found
- "Save" or "Save & Archive Previous" buttons

## Cost Estimate

- Generating one lesson: ~$0.04 (Sonnet, ~200 token prompt + ~4000 token output)
- This is an admin action, not per-learner, so cost is negligible

## Out of Scope
- Role-based auth (admin vs learner) — deferred
- Bulk lesson generation
- Lesson editing after save (just regenerate)
- Version history beyond single archive
