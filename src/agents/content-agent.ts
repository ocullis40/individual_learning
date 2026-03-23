import { anthropic, CONTENT_MODEL } from "@/lib/anthropic";
import { searchExistingLessons } from "./tools/search-lessons";
import { generateContent } from "./tools/generate-content";
import { generateDiagram } from "./tools/generate-diagram";
import { saveLesson } from "./tools/save-lesson";

interface AgentGoal {
  topicId: string;
  title: string;
  educationLevel: string;
}

interface AgentStep {
  tool: string;
  input: unknown;
  output: unknown;
}

interface AgentResult {
  success: boolean;
  message: string;
  lessonId?: string;
  steps: AgentStep[];
}

const tools = [searchExistingLessons, generateContent, generateDiagram, saveLesson];
const MAX_ITERATIONS = 10;

const toolMap = new Map(tools.map((t) => [t.name, t]));

export async function runContentAgent(goal: AgentGoal): Promise<AgentResult> {
  const steps: AgentStep[] = [];

  const systemPrompt = `You are a content creation agent for an adaptive learning platform. Your goal is to create a high-quality lesson.

Topic ID: ${goal.topicId}
Lesson Title: ${goal.title}
Education Level: ${goal.educationLevel}

Follow these steps in order:
1. Search existing lessons under this topic to understand what already exists and avoid duplication.
2. Generate the lesson content in a narrative storytelling style with structured headings.
3. Generate 1-2 Mermaid diagrams (flowchart or sequence) that illustrate key concepts from the lesson.
4. Compose the final lesson content by embedding the Mermaid diagrams within the markdown content using mermaid code fences (\`\`\`mermaid ... \`\`\`). The diagrams should be placed at relevant points in the content.
5. Save the final lesson. The content field MUST include the full markdown with embedded mermaid code fences.

Important: You must embed the mermaid diagrams directly into the lesson content before saving. Do not save content without diagrams.`;

  const messages: Array<{ role: string; content: unknown }> = [
    {
      role: "user",
      content: `Create a lesson titled "${goal.title}" for topic ${goal.topicId} at the ${goal.educationLevel} education level. Follow the system instructions step by step.`,
    },
  ];

  const anthropicTools = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: CONTENT_MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      tools: anthropicTools,
      messages: messages as Parameters<typeof anthropic.messages.create>[0]["messages"],
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (block: { type: string }) => block.type === "tool_use"
      );

      const toolResults: Array<{
        type: "tool_result";
        tool_use_id: string;
        content: string;
        is_error?: boolean;
      }> = [];

      for (const block of toolUseBlocks) {
        const toolUseBlock = block as {
          type: "tool_use";
          id: string;
          name: string;
          input: Record<string, unknown>;
        };
        const tool = toolMap.get(toolUseBlock.name);

        if (!tool) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUseBlock.id,
            content: `Unknown tool: ${toolUseBlock.name}`,
            is_error: true,
          });
          steps.push({
            tool: toolUseBlock.name,
            input: toolUseBlock.input,
            output: { error: `Unknown tool: ${toolUseBlock.name}` },
          });
          continue;
        }

        try {
          const result = await tool.execute(toolUseBlock.input as never);
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUseBlock.id,
            content: JSON.stringify(result),
          });
          steps.push({
            tool: toolUseBlock.name,
            input: toolUseBlock.input,
            output: result,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUseBlock.id,
            content: errorMessage,
            is_error: true,
          });
          steps.push({
            tool: toolUseBlock.name,
            input: toolUseBlock.input,
            output: { error: errorMessage },
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    } else if (response.stop_reason === "end_turn") {
      const text = response.content
        .filter((block: { type: string }) => block.type === "text")
        .map((block: { type: "text"; text: string }) => block.text)
        .join("\n\n");

      const saveLessonStep = steps.find(
        (s) => s.tool === "saveLesson" && (s.output as { id?: string })?.id
      );

      if (!saveLessonStep) {
        return {
          success: false,
          message: "Agent completed without saving a lesson.",
          steps,
        };
      }

      return {
        success: true,
        message: text || "Lesson created successfully.",
        lessonId: (saveLessonStep.output as { id: string }).id,
        steps,
      };
    }
  }

  return {
    success: false,
    message: `Agent exceeded maximum iterations (${MAX_ITERATIONS}).`,
    steps,
  };
}
