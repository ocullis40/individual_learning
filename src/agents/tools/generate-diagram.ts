import { anthropic, CONTENT_MODEL } from "@/lib/anthropic";

interface GenerateDiagramInput {
  concept: string;
  diagramType: "flowchart" | "sequence";
}

interface GenerateDiagramResult {
  diagram: string;
}

export const generateDiagram = {
  name: "generateDiagram",
  description:
    "Generate a Mermaid diagram for a concept, constrained to flowchart or sequence diagram types.",
  inputSchema: {
    type: "object" as const,
    properties: {
      concept: { type: "string", description: "The concept to diagram" },
      diagramType: {
        type: "string",
        enum: ["flowchart", "sequence"],
        description: "Type of diagram: flowchart or sequence",
      },
    },
    required: ["concept", "diagramType"],
  },
  execute: async (input: GenerateDiagramInput): Promise<GenerateDiagramResult> => {
    if (!["flowchart", "sequence"].includes(input.diagramType)) {
      throw new Error(`Invalid diagramType: "${input.diagramType}". Must be "flowchart" or "sequence".`);
    }

    const diagramInstruction =
      input.diagramType === "flowchart"
        ? "Create a Mermaid flowchart using `graph TD` syntax."
        : "Create a Mermaid sequence diagram using `sequenceDiagram` syntax.";

    const response = await anthropic.messages.create({
      model: CONTENT_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${diagramInstruction}

Concept: ${input.concept}

Rules:
- Use maximum 10-15 nodes
- Wrap any labels containing special characters in double quotes
- Output ONLY the Mermaid code, no explanation or markdown fences
- Do not use any other diagram type besides ${input.diagramType === "flowchart" ? "graph TD" : "sequenceDiagram"}`,
        },
      ],
    });

    let diagram = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n\n")
      .trim();

    // Strip markdown fences if Claude adds them despite instructions
    diagram = diagram.replace(/^```(?:mermaid)?\n?/, "").replace(/\n?```$/, "");

    return { diagram };
  },
};
