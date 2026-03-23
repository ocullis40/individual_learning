# Enhanced Diagram Generation — Design Spec

## Purpose

Expand the Content Agent's visual capabilities from Mermaid-only to three diagram tools: Mermaid (flowcharts/sequences), SVG (technical illustrations), and DALL-E (realistic images). The agent decides which tool to use based on the concept being illustrated.

## Three Diagram Tools

### 1. generateMermaidDiagram (existing)
- **Use for:** Process flows, sequences, hierarchies, decision trees
- **Examples:** Chain reaction flow, fuel cycle stages, reactor control sequence
- **Rendering:** Inline via Mermaid.js (client-side)
- **Cost:** Free (Claude generates the code)

### 2. generateSVGDiagram (new)
- **Use for:** Technical schematics, cross-sections, structural layouts, atom models
- **Examples:** Reactor cross-section, atom splitting visualization, containment structure layers
- **Rendering:** Inline via dangerouslySetInnerHTML (same as Mermaid SVG output)
- **Cost:** Free (Claude generates the SVG code)
- **Constraints:** Max ~200 lines of SVG. Simple, clean, educational style. Use text labels. Solid colors, no gradients.

### 3. generateImage (new)
- **Use for:** Realistic scenes, photographs, artistic illustrations
- **Examples:** Inside a nuclear power plant control room, aerial view of a reactor facility, fusion plasma in a tokamak
- **Rendering:** Standard `<img>` tag pointing to file in `public/images/lessons/`
- **Cost:** ~$0.04-0.08 per image (DALL-E API)
- **Storage:** Saved to `public/images/lessons/{lessonId}/{filename}.png`

## Agent Tool Selection

The Content Agent's system prompt guides tool choice:

```
When creating visual content for a lesson, choose the appropriate tool:
- generateMermaidDiagram: For process flows, sequences, hierarchies, or decision trees
- generateSVGDiagram: For technical schematics, cross-sections, structural diagrams, or scientific illustrations
- generateImage: For realistic scenes, photographs, or artistic illustrations that require photographic quality

Use up to 3 visuals per lesson total (across all types). Choose the type that best explains each concept.
```

## Data Model Changes

None — images are stored as files and referenced in lesson markdown content via standard markdown image syntax: `![description](/images/lessons/{lessonId}/filename.png)`

SVG diagrams are embedded directly in the markdown as HTML.

## API Integration

### DALL-E (OpenAI API)
- Model: `dall-e-3`
- Size: `1024x1024`
- Quality: `standard`
- Requires `OPENAI_API_KEY` in `.env`

## File Structure

```
src/
├── agents/
│   └── tools/
│       ├── generate-diagram.ts        # Existing Mermaid tool
│       ├── generate-svg.ts            # New SVG tool
│       └── generate-image.ts          # New DALL-E tool
├── lib/
│   └── openai.ts                      # OpenAI client singleton
├── components/
│   └── LessonContent.tsx              # Updated: render inline SVG blocks
public/
└── images/
    └── lessons/                       # DALL-E generated images stored here
```

## LessonContent Rendering Updates

Currently handles Mermaid code blocks. Need to also handle:

1. **SVG blocks:** When lesson content contains `<svg>...</svg>` HTML, render it inline (react-markdown passes through HTML by default with rehype-raw plugin)
2. **Images:** Standard markdown `![alt](/images/...)` — react-markdown handles this natively

## Cost Estimate

Per lesson generation with all three visual types:
- Content generation: ~$0.04
- Mermaid diagram: free
- SVG diagram: free
- DALL-E image: ~$0.04-0.08
- Agent loop overhead: ~$0.03-0.05
- **Total: ~$0.15-0.20 per lesson** (up from ~$0.10-0.15 without DALL-E)

## Constraints

- Max 3 visuals per lesson total (across all types)
- SVG: max ~200 lines, simple educational style, solid colors
- DALL-E: 1024x1024, standard quality
- Images saved to public/images/lessons/ (gitignored for generated content)

## Out of Scope
- Cloud storage for images
- Image editing/regeneration
- Video or animation generation
- Interactive diagrams
