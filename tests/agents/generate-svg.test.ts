import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("@/lib/anthropic", () => ({
  anthropic: { messages: { create: mockCreate } },
  CONTENT_MODEL: "claude-sonnet-4-6",
}));

import { generateSVGDiagram } from "@/agents/tools/generate-svg";

const VALID_SVG = `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="380" height="280" fill="#f0f0f0" />
  <text x="200" y="150" text-anchor="middle" font-size="16">Test Diagram</text>
</svg>`;

function mockClaudeResponse(text: string) {
  mockCreate.mockResolvedValueOnce({
    content: [{ type: "text", text }],
  });
}

describe("generateSVGDiagram", () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  it("exports the correct tool shape", () => {
    expect(generateSVGDiagram.name).toBe("generateSVGDiagram");
    expect(generateSVGDiagram.description).toBeDefined();
    expect(generateSVGDiagram.inputSchema.type).toBe("object");
    expect(generateSVGDiagram.inputSchema.required).toContain("concept");
    expect(typeof generateSVGDiagram.execute).toBe("function");
  });

  it("calls Claude with CONTENT_MODEL and max_tokens 2048", async () => {
    mockClaudeResponse(VALID_SVG);

    await generateSVGDiagram.execute({ concept: "Cell structure" });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
      }),
    );
  });

  it("returns { svg } on valid SVG response", async () => {
    mockClaudeResponse(VALID_SVG);

    const result = await generateSVGDiagram.execute({
      concept: "Cell structure",
    });

    expect(result.svg).toBe(VALID_SVG);
  });

  it("strips ```svg markdown fences", async () => {
    mockClaudeResponse("```svg\n" + VALID_SVG + "\n```");

    const result = await generateSVGDiagram.execute({
      concept: "Electric circuit",
    });

    expect(result.svg).toBe(VALID_SVG);
  });

  it("strips ```xml markdown fences", async () => {
    mockClaudeResponse("```xml\n" + VALID_SVG + "\n```");

    const result = await generateSVGDiagram.execute({
      concept: "Electric circuit",
    });

    expect(result.svg).toBe(VALID_SVG);
  });

  it("strips plain ``` markdown fences", async () => {
    mockClaudeResponse("```\n" + VALID_SVG + "\n```");

    const result = await generateSVGDiagram.execute({
      concept: "Electric circuit",
    });

    expect(result.svg).toBe(VALID_SVG);
  });

  it("throws error when output is not valid SVG", async () => {
    mockClaudeResponse("Here is a diagram of a cell...");

    await expect(
      generateSVGDiagram.execute({ concept: "Cell structure" }),
    ).rejects.toThrow("Generated output is not valid SVG");
  });

  it("throws error when SVG is missing closing tag", async () => {
    mockClaudeResponse('<svg viewBox="0 0 400 300"><rect /></div>');

    await expect(
      generateSVGDiagram.execute({ concept: "Cell structure" }),
    ).rejects.toThrow("Generated output is not valid SVG");
  });

  it("includes style in prompt when provided", async () => {
    mockClaudeResponse(VALID_SVG);

    await generateSVGDiagram.execute({
      concept: "Engine internals",
      style: "cross-section",
    });

    const userMsg = mockCreate.mock.calls[0][0].messages[0].content;
    expect(userMsg).toContain("cross-section");
  });

  it("includes schematic style in prompt", async () => {
    mockClaudeResponse(VALID_SVG);

    await generateSVGDiagram.execute({
      concept: "Circuit board",
      style: "schematic",
    });

    const userMsg = mockCreate.mock.calls[0][0].messages[0].content;
    expect(userMsg).toContain("schematic");
  });

  it("includes labeled-diagram style in prompt", async () => {
    mockClaudeResponse(VALID_SVG);

    await generateSVGDiagram.execute({
      concept: "Human heart",
      style: "labeled-diagram",
    });

    const userMsg = mockCreate.mock.calls[0][0].messages[0].content;
    expect(userMsg).toContain("labeled-diagram");
  });

  it("does not include style line when style is omitted", async () => {
    mockClaudeResponse(VALID_SVG);

    await generateSVGDiagram.execute({ concept: "Water molecule" });

    const userMsg = mockCreate.mock.calls[0][0].messages[0].content;
    expect(userMsg).not.toContain("Visual style:");
  });

  it("prompt includes SVG constraints", async () => {
    mockClaudeResponse(VALID_SVG);

    await generateSVGDiagram.execute({ concept: "Atom" });

    const userMsg = mockCreate.mock.calls[0][0].messages[0].content;
    expect(userMsg).toContain("200 lines");
    expect(userMsg).toContain("Solid colors only");
    expect(userMsg).toContain("no gradients");
    expect(userMsg).toContain("text labels");
    expect(userMsg).toContain("viewBox");
  });
});
