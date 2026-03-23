import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("@/lib/anthropic", () => ({
  anthropic: { messages: { create: mockCreate } },
  CONTENT_MODEL: "claude-sonnet-4-6",
}));

import { generateDiagram } from "@/agents/tools/generate-diagram";

describe("generateDiagram", () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  it("exports the correct tool shape", () => {
    expect(generateDiagram.name).toBe("generateDiagram");
    expect(generateDiagram.description).toBeDefined();
    expect(generateDiagram.inputSchema.type).toBe("object");
    expect(generateDiagram.inputSchema.required).toContain("concept");
    expect(generateDiagram.inputSchema.required).toContain("diagramType");
    expect(typeof generateDiagram.execute).toBe("function");
  });

  it("calls Claude with flowchart constraints", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "graph TD\n  A[Start] --> B[End]" }],
    });

    const result = await generateDiagram.execute({
      concept: "Water cycle",
      diagramType: "flowchart",
    });

    expect(result.diagram).toBe("graph TD\n  A[Start] --> B[End]");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
      }),
    );

    const userMsg = mockCreate.mock.calls[0][0].messages[0].content;
    expect(userMsg).toContain("graph TD");
    expect(userMsg).toContain("10-15 nodes");
  });

  it("calls Claude with sequence diagram constraints", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "sequenceDiagram\n  A->>B: Hello" }],
    });

    const result = await generateDiagram.execute({
      concept: "HTTP request",
      diagramType: "sequence",
    });

    expect(result.diagram).toBe("sequenceDiagram\n  A->>B: Hello");

    const userMsg = mockCreate.mock.calls[0][0].messages[0].content;
    expect(userMsg).toContain("sequenceDiagram");
  });
});
