import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("@/lib/anthropic", () => ({
  anthropic: { messages: { create: mockCreate } },
  CONTENT_MODEL: "claude-sonnet-4-6",
}));

import { generateContent } from "@/agents/tools/generate-content";

describe("generateContent", () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  it("exports the correct tool shape", () => {
    expect(generateContent.name).toBe("generateContent");
    expect(generateContent.description).toBeDefined();
    expect(generateContent.inputSchema.type).toBe("object");
    expect(generateContent.inputSchema.required).toContain("title");
    expect(generateContent.inputSchema.required).toContain("educationLevel");
    expect(generateContent.inputSchema.required).toContain("topicName");
    expect(typeof generateContent.execute).toBe("function");
  });

  it("calls Claude with correct parameters and returns content", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "## Section 1\nGenerated content here." }],
    });

    const result = await generateContent.execute({
      title: "Test Lesson",
      educationLevel: "high school",
      topicName: "Mathematics",
    });

    expect(result.content).toBe("## Section 1\nGenerated content here.");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: expect.arrayContaining([
          expect.objectContaining({
            type: "text",
            cache_control: { type: "ephemeral" },
          }),
        ]),
      }),
    );

    const systemText = mockCreate.mock.calls[0][0].system[0].text;
    expect(systemText).toContain("## headings");
    expect(systemText).toContain("narrative storytelling");
    expect(systemText).toContain("1000-1500 words");
    expect(systemText).toContain("3-5 sections");
    expect(systemText).toContain("engaging opening");
  });

  it("includes existing lessons context when provided", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "## New Content" }],
    });

    await generateContent.execute({
      title: "Advanced Lesson",
      educationLevel: "undergraduate",
      topicName: "Physics",
      existingLessons: ["Intro to Physics", "Newton's Laws"],
    });

    const systemText = mockCreate.mock.calls[0][0].system[0].text;
    expect(systemText).toContain("Intro to Physics");
    expect(systemText).toContain("Newton's Laws");
  });
});
