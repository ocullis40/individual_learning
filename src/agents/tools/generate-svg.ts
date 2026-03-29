import { anthropic, CONTENT_MODEL } from "@/lib/anthropic";

interface GenerateSVGDiagramInput {
  concept: string;
  style?: "schematic" | "cross-section" | "labeled-diagram";
}

interface GenerateSVGDiagramResult {
  svg: string;
}

export const generateSVGDiagram = {
  name: "generateSVGDiagram",
  description:
    "Generate a technical SVG illustration using Claude. Use for cross-sections, schematics, structural diagrams, or scientific illustrations. NOT for process flows (use generateDiagram) or photographic images (use generateImage).",
  inputSchema: {
    type: "object" as const,
    properties: {
      concept: {
        type: "string",
        description: "The concept to illustrate",
      },
      style: {
        type: "string",
        enum: ["schematic", "cross-section", "labeled-diagram"],
        description: "Visual style of the diagram",
      },
    },
    required: ["concept"],
  },
  execute: async (
    input: GenerateSVGDiagramInput,
  ): Promise<GenerateSVGDiagramResult> => {
    const styleInstruction = input.style
      ? `\nVisual style: ${input.style}`
      : "";

    const response = await anthropic.messages.create({
      model: CONTENT_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Generate an educational SVG diagram for the following concept.

Concept: ${input.concept}${styleInstruction}

Rules:
- Output ONLY the SVG code, no explanation or markdown
- Maximum ~200 lines of SVG
- Use a LANDSCAPE or SQUARE viewBox (width >= height). NEVER make the height greater than the width. Aim for a viewBox like "0 0 800 400" or "0 0 600 500" — wide and compact.
- Simple, clean, educational style
- Use text labels to annotate important parts
- Solid colors only, no gradients
- Include a viewBox attribute on the root <svg> element
- Use readable font sizes (12px or larger)`,
        },
      ],
    });

    let svg = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n\n")
      .trim();

    // Strip markdown fences if Claude adds them despite instructions
    svg = svg.replace(/^```(?:svg|xml)?\n?/, "").replace(/\n?```$/, "");

    // Strip optional XML declaration
    svg = svg.replace(/^<\?xml[^?]*\?>\s*/, "");

    if (!svg.startsWith("<svg") || !svg.endsWith("</svg>")) {
      throw new Error("Generated output is not valid SVG");
    }

    return { svg };
  },
};
