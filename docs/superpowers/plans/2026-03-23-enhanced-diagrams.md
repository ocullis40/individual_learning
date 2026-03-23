# Enhanced Diagram Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SVG diagram and DALL-E image generation tools to the Content Agent. Agent chooses the best visual type for each concept. SVG renders inline, DALL-E images stored in public/ directory.

**Architecture:** Two new agent tools (generateSVGDiagram, generateImage), OpenAI client for DALL-E, updated LessonContent to render inline SVG, updated agent system prompt for tool selection.

**Tech Stack:** Next.js 16, TypeScript, Prisma 7, Anthropic SDK, OpenAI SDK (DALL-E 3), Vitest

---

## File Structure

```
src/
├── agents/
│   └── tools/
│       ├── generate-diagram.ts        # Existing Mermaid (unchanged)
│       ├── generate-svg.ts            # New: SVG generation via Claude
│       └── generate-image.ts          # New: DALL-E image generation
├── lib/
│   ├── openai.ts                      # OpenAI client singleton
│   └── anthropic.ts                   # Existing (unchanged)
├── components/
│   └── LessonContent.tsx              # Updated: render inline SVG
├── agents/
│   └── content-agent.ts              # Updated: new tools + system prompt
public/
└── images/
    └── lessons/                       # Generated images stored here
```

---

### Task 1: Set Up OpenAI Client and generateImage Tool

**Files:**
- Create: `src/lib/openai.ts`
- Create: `src/agents/tools/generate-image.ts`
- Modify: `.env` — add OPENAI_API_KEY placeholder
- Modify: `.env.example` — add OPENAI_API_KEY
- Create: `public/images/lessons/.gitkeep`

- [ ] **Step 1: Install OpenAI SDK**

```bash
npm install openai
```

- [ ] **Step 2: Create OpenAI client singleton**

```typescript
// src/lib/openai.ts
import OpenAI from "openai";

const globalForOpenAI = globalThis as unknown as {
  openai: OpenAI | undefined;
};

export const openai = globalForOpenAI.openai ?? new OpenAI();

if (process.env.NODE_ENV !== "production") {
  globalForOpenAI.openai = openai;
}
```

- [ ] **Step 3: Create generateImage tool**

```typescript
// src/agents/tools/generate-image.ts
export const generateImage = {
  name: "generateImage",
  description: "Generate a realistic or artistic illustration using DALL-E. Use for scenes, photographs, or visuals that need photographic quality. NOT for diagrams or schematics.",
  inputSchema: {
    type: "object",
    properties: {
      prompt: { type: "string", description: "Detailed description of the image to generate" },
      filename: { type: "string", description: "Filename for the image (no extension, e.g. 'reactor-control-room')" },
      lessonId: { type: "string", description: "The lesson ID this image belongs to" }
    },
    required: ["prompt", "filename", "lessonId"]
  },
  execute: async (input) => {
    // Check OPENAI_API_KEY exists, throw descriptive error if missing
    // Call DALL-E 3 via OpenAI SDK: model "dall-e-3", size "1024x1024", quality "standard"
    // Download the image from the returned temporary URL immediately (expires in ~1 hour)
    // Create directory: fs.mkdirSync(`public/images/lessons/${lessonId}`, { recursive: true })
    // Save to public/images/lessons/{lessonId}/{filename}.png
    // Handle download/network errors gracefully with descriptive error message
    // Return { imagePath: "/images/lessons/{lessonId}/{filename}.png" }
  }
};
```

- [ ] **Step 4: Add OPENAI_API_KEY to .env.example**

- [ ] **Step 5: Create public/images/lessons/.gitkeep and add generated images to .gitignore**

Add to .gitignore:
```
public/images/lessons/*
!public/images/lessons/.gitkeep
```

- [ ] **Step 6: Write tests in `tests/agents/generate-image.test.ts`**

TDD for file path construction. Happy-path mock for DALL-E call. Test graceful error when OPENAI_API_KEY missing.

- [ ] **Step 7: Verify build and tests**

- [ ] **Step 8: Do NOT commit — report status for code review**

---

### Task 2: Create generateSVGDiagram Tool

**Files:**
- Create: `src/agents/tools/generate-svg.ts`

- [ ] **Step 1: Create generateSVGDiagram tool**

```typescript
// src/agents/tools/generate-svg.ts
export const generateSVGDiagram = {
  name: "generateSVGDiagram",
  description: "Generate a technical SVG illustration using Claude. Use for cross-sections, schematics, structural diagrams, or scientific illustrations. NOT for process flows (use Mermaid) or photographic images (use generateImage).",
  inputSchema: {
    type: "object",
    properties: {
      concept: { type: "string", description: "The concept to illustrate" },
      style: { type: "string", enum: ["schematic", "cross-section", "labeled-diagram"], description: "Visual style" }
    },
    required: ["concept"]
  },
  execute: async (input) => {
    // Call Claude with CONTENT_MODEL, max_tokens 2048
    // Prompt: Generate educational SVG diagram
    // Constraints: max ~200 lines, solid colors, text labels, no gradients
    // Strip any markdown fences from output
    // Return { svg: "<svg>...</svg>" }
  }
};
```

- [ ] **Step 2: Write tests in `tests/agents/generate-svg.test.ts`**

Happy-path mock for Claude call. Test fence stripping. Validate output starts with `<svg` and ends with `</svg>`.

- [ ] **Step 3: Verify build and tests**

- [ ] **Step 4: Do NOT commit — report status for code review**

---

### Task 3: Update Content Agent and LessonContent

**Files:**
- Modify: `src/agents/content-agent.ts` — add new tools, update system prompt
- Modify: `src/components/LessonContent.tsx` — render inline SVG blocks
- Install: `rehype-raw` for HTML pass-through in react-markdown

- [ ] **Step 1: Install rehype-raw**

```bash
npm install rehype-raw
```

- [ ] **Step 2: Update LessonContent to render inline SVG**

Add `rehypePlugins={[rehypeRaw]}` to ReactMarkdown so inline SVG/HTML in lesson content renders correctly.

**Security note:** `rehype-raw` passes ALL raw HTML through, not just SVG. This is acceptable because lesson content is only generated by Claude (trusted source). If content ever comes from untrusted sources, add `rehype-sanitize` with an SVG-friendly schema.

**SVG click-to-enlarge:** Use a custom react-markdown component override for the `svg` element. Wrap rendered SVGs in the same clickable container + modal pattern used by MermaidDiagram:

```typescript
components={{
  svg({ ...props }) {
    // Wrap in a clickable div that opens a modal on click
    // Reuse the same modal overlay pattern from MermaidDiagram
    return <ClickableVisual svgProps={props} />;
  },
  // ... existing code override for mermaid
}}
```

Extract the modal logic from MermaidDiagram into a shared `ClickableVisual` component that both Mermaid and inline SVG can use.

- [ ] **Step 3: Update Content Agent — add new tools and update system prompt**

Add `generateSVGDiagram` and `generateImage` to the tools array. Increase `MAX_ITERATIONS` from 10 to 15 (agent now has more tools to call: search + content + up to 3 visuals + save = 6 minimum). Update the system prompt:

```
When creating visual content for a lesson, choose the appropriate tool:
- generateDiagram: For process flows, sequences, hierarchies, or decision trees (Mermaid)
- generateSVGDiagram: For technical schematics, cross-sections, structural diagrams, or scientific illustrations
- generateImage: For realistic scenes, photographs, or artistic illustrations that require photographic quality

Use up to 3 visuals per lesson total (across all types). Choose the type that best explains each concept.

When embedding visuals in the final lesson content before saving:
- Mermaid diagrams: embed as ```mermaid code fences
- SVG diagrams: embed the raw <svg>...</svg> HTML directly in the markdown
- DALL-E images: embed as ![description](/images/lessons/{lessonId}/filename.png) markdown image syntax
```

Change "Generate 1-2 Mermaid diagrams" to "Generate 1-3 visuals using the most appropriate tool for each concept."

Note: The existing Mermaid tool is named `generateDiagram` (not `generateMermaidDiagram`). Use the actual tool name in the prompt.

- [ ] **Step 4: Verify build and tests**

- [ ] **Step 5: Do NOT commit — report status for code review**

---

### Task 4: Final Verification

- [ ] **Step 1: Run tests, lint, build**

- [ ] **Step 2: Manual smoke test**

1. Go to /admin/lessons
2. Generate a lesson (e.g., "Inside a Nuclear Power Plant" for Nuclear Energy topic)
3. Verify the agent uses different visual tools:
   - Mermaid for process flows
   - SVG for technical diagrams
   - DALL-E for realistic illustrations
4. Verify all visuals render correctly on the lesson page
5. Verify SVG click-to-enlarge works
6. Verify DALL-E images display

- [ ] **Step 3: Commit and push**
