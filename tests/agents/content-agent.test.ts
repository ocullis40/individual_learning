import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockSearchExecute, mockContentExecute, mockDiagramExecute, mockSVGDiagramExecute, mockImageExecute, mockSaveExecute } =
  vi.hoisted(() => ({
    mockCreate: vi.fn(),
    mockSearchExecute: vi.fn(),
    mockContentExecute: vi.fn(),
    mockDiagramExecute: vi.fn(),
    mockSVGDiagramExecute: vi.fn(),
    mockImageExecute: vi.fn(),
    mockSaveExecute: vi.fn(),
  }));

vi.mock("@/lib/anthropic", () => ({
  anthropic: { messages: { create: mockCreate } },
  CONTENT_MODEL: "claude-sonnet-4-6",
}));

vi.mock("@/agents/tools/search-lessons", () => ({
  searchExistingLessons: {
    name: "searchExistingLessons",
    description: "Search for existing lessons",
    inputSchema: {
      type: "object" as const,
      properties: { topicId: { type: "string" } },
      required: ["topicId"],
    },
    execute: mockSearchExecute,
  },
}));

vi.mock("@/agents/tools/generate-content", () => ({
  generateContent: {
    name: "generateContent",
    description: "Generate educational content",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        educationLevel: { type: "string" },
        topicName: { type: "string" },
      },
      required: ["title", "educationLevel", "topicName"],
    },
    execute: mockContentExecute,
  },
}));

vi.mock("@/agents/tools/generate-diagram", () => ({
  generateDiagram: {
    name: "generateDiagram",
    description: "Generate a Mermaid diagram",
    inputSchema: {
      type: "object" as const,
      properties: {
        concept: { type: "string" },
        diagramType: { type: "string" },
      },
      required: ["concept", "diagramType"],
    },
    execute: mockDiagramExecute,
  },
}));

vi.mock("@/agents/tools/generate-svg", () => ({
  generateSVGDiagram: {
    name: "generateSVGDiagram",
    description: "Generate a technical SVG diagram",
    inputSchema: {
      type: "object" as const,
      properties: {
        concept: { type: "string" },
        style: { type: "string" },
      },
      required: ["concept"],
    },
    execute: mockSVGDiagramExecute,
  },
}));

vi.mock("@/agents/tools/generate-image", () => ({
  generateImage: {
    name: "generateImage",
    description: "Generate a realistic image using DALL-E",
    inputSchema: {
      type: "object" as const,
      properties: {
        prompt: { type: "string" },
        filename: { type: "string" },
        lessonId: { type: "string" },
      },
      required: ["prompt", "filename", "lessonId"],
    },
    execute: mockImageExecute,
  },
}));

vi.mock("@/agents/tools/save-lesson", () => ({
  saveLesson: {
    name: "saveLesson",
    description: "Save a lesson",
    inputSchema: {
      type: "object" as const,
      properties: {
        topicId: { type: "string" },
        title: { type: "string" },
        content: { type: "string" },
        educationLevel: { type: "string" },
      },
      required: ["topicId", "title", "content", "educationLevel"],
    },
    execute: mockSaveExecute,
  },
}));

import { runContentAgent } from "@/agents/content-agent";

const goal = {
  topicId: "topic-123",
  title: "Introduction to Algorithms",
  educationLevel: "college",
};

describe("runContentAgent", () => {
  beforeEach(() => {
    mockCreate.mockClear();
    mockSearchExecute.mockClear();
    mockContentExecute.mockClear();
    mockDiagramExecute.mockClear();
    mockSVGDiagramExecute.mockClear();
    mockImageExecute.mockClear();
    mockSaveExecute.mockClear();
  });

  it("executes a tool_use response and sends result back", async () => {
    mockSearchExecute.mockResolvedValueOnce({
      lessons: [{ title: "Existing Lesson", topicName: "Algorithms" }],
    });

    // First call: Claude wants to use searchExistingLessons
    mockCreate.mockResolvedValueOnce({
      stop_reason: "tool_use",
      content: [
        {
          type: "tool_use",
          id: "toolu_01",
          name: "searchExistingLessons",
          input: { topicId: "topic-123" },
        },
      ],
    });

    // Second call: Claude is done
    mockCreate.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Done searching." }],
    });

    const result = await runContentAgent(goal);

    // Verify tool was executed
    expect(mockSearchExecute).toHaveBeenCalledWith({ topicId: "topic-123" });

    // Verify result was sent back to Claude with tool_use_id
    // messages array is shared by reference; at call time it had 3 entries:
    // [0] user initial, [1] assistant tool_use, [2] user tool_result
    const secondCall = mockCreate.mock.calls[1][0];
    const userMessage = secondCall.messages[2];
    expect(userMessage.role).toBe("user");
    expect(userMessage.content).toEqual([
      expect.objectContaining({
        type: "tool_result",
        tool_use_id: "toolu_01",
        content: JSON.stringify({
          lessons: [{ title: "Existing Lesson", topicName: "Algorithms" }],
        }),
      }),
    ]);

    // Verify step was recorded
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].tool).toBe("searchExistingLessons");
    expect(result.steps[0].input).toEqual({ topicId: "topic-123" });
  });

  it("returns success on end_turn with correct AgentResult shape", async () => {
    mockSaveExecute.mockResolvedValueOnce({
      id: "lesson-456",
      title: "Introduction to Algorithms",
    });

    // First call: Claude saves a lesson
    mockCreate.mockResolvedValueOnce({
      stop_reason: "tool_use",
      content: [
        {
          type: "tool_use",
          id: "toolu_02",
          name: "saveLesson",
          input: {
            topicId: "topic-123",
            title: "Introduction to Algorithms",
            content: "## Lesson content\n\n```mermaid\ngraph TD\nA-->B\n```",
            educationLevel: "college",
          },
        },
      ],
    });

    // Second call: Claude wraps up
    mockCreate.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [
        { type: "text", text: "Lesson created successfully with diagrams." },
      ],
    });

    const result = await runContentAgent(goal);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Lesson created successfully with diagrams.");
    expect(result.lessonId).toBe("lesson-456");
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].tool).toBe("saveLesson");
    expect(result.steps[0].output).toEqual({
      id: "lesson-456",
      title: "Introduction to Algorithms",
    });
  });

  it("returns failure when max iterations exceeded", async () => {
    // Claude always requests a tool, never ends
    mockSearchExecute.mockResolvedValue({ lessons: [] });

    for (let i = 0; i < 15; i++) {
      mockCreate.mockResolvedValueOnce({
        stop_reason: "tool_use",
        content: [
          {
            type: "tool_use",
            id: `toolu_loop_${i}`,
            name: "searchExistingLessons",
            input: { topicId: "topic-123" },
          },
        ],
      });
    }

    const result = await runContentAgent(goal);

    expect(result.success).toBe(false);
    expect(result.message).toContain("maximum iterations");
    expect(result.steps).toHaveLength(15);
  });

  it("sets is_error true when tool execution throws", async () => {
    mockSearchExecute.mockRejectedValueOnce(new Error("Database connection failed"));

    // First call: Claude wants to search
    mockCreate.mockResolvedValueOnce({
      stop_reason: "tool_use",
      content: [
        {
          type: "tool_use",
          id: "toolu_err",
          name: "searchExistingLessons",
          input: { topicId: "topic-123" },
        },
      ],
    });

    // Second call: Claude ends after seeing the error
    mockCreate.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Search failed, proceeding anyway." }],
    });

    const result = await runContentAgent(goal);

    // Verify is_error was sent in tool_result
    // messages[2] is the user tool_result (index 0=user, 1=assistant, 2=tool_result)
    const secondCall = mockCreate.mock.calls[1][0];
    const userMessage = secondCall.messages[2];
    expect(userMessage.content).toEqual([
      expect.objectContaining({
        type: "tool_result",
        tool_use_id: "toolu_err",
        content: "Database connection failed",
        is_error: true,
      }),
    ]);

    // Verify step recorded the error
    expect(result.steps[0].output).toEqual({ error: "Database connection failed" });
    // No saveLesson step occurred, so agent reports failure
    expect(result.success).toBe(false);
    expect(result.message).toBe("Agent completed without saving a lesson.");
  });

  it("passes system prompt with mermaid embedding instructions", async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Done." }],
    });

    await runContentAgent(goal);

    const firstCall = mockCreate.mock.calls[0][0];
    expect(firstCall.system).toContain("mermaid");
    expect(firstCall.system).toContain("embed");
    expect(firstCall.system).toContain(goal.topicId);
    expect(firstCall.system).toContain(goal.title);
    expect(firstCall.system).toContain(goal.educationLevel);
  });

  it("sends tools array mapped from tool objects", async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Done." }],
    });

    await runContentAgent(goal);

    const firstCall = mockCreate.mock.calls[0][0];
    expect(firstCall.tools).toHaveLength(6);
    expect(firstCall.tools.map((t: { name: string }) => t.name)).toEqual([
      "searchExistingLessons",
      "generateContent",
      "generateDiagram",
      "generateSVGDiagram",
      "generateImage",
      "saveLesson",
    ]);
    for (const tool of firstCall.tools) {
      expect(tool).toHaveProperty("name");
      expect(tool).toHaveProperty("description");
      expect(tool).toHaveProperty("input_schema");
    }
  });
});
