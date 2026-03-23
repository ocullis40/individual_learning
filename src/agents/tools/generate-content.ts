import { anthropic, CONTENT_MODEL } from "@/lib/anthropic";

interface GenerateContentInput {
  title: string;
  educationLevel: string;
  topicName: string;
  existingLessons?: string[];
  sectionGuidance?: string;
}

interface GenerateContentResult {
  content: string;
}

export const generateContent = {
  name: "generateContent",
  description:
    "Generate educational lesson content using Claude, with narrative storytelling style and structured headings.",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "The lesson title" },
      educationLevel: {
        type: "string",
        enum: ["high_school", "college", "graduate"],
        description: "Target education level",
      },
      topicName: { type: "string", description: "The topic this lesson belongs to" },
      existingLessons: {
        type: "array",
        items: { type: "string" },
        description: "Titles of existing lessons to avoid overlap",
      },
      sectionGuidance: {
        type: "string",
        description: "Optional guidance for section structure",
      },
    },
    required: ["title", "educationLevel", "topicName"],
  },
  execute: async (input: GenerateContentInput): Promise<GenerateContentResult> => {
    const existingContext = input.existingLessons?.length
      ? `\n\nExisting lessons on this topic (avoid overlapping content): ${input.existingLessons.join(", ")}`
      : "";

    const sectionContext = input.sectionGuidance
      ? `\n\nSection guidance: ${input.sectionGuidance}`
      : "";

    const systemPrompt = `You are an expert educational content writer. Create a lesson titled "${input.title}" for the topic "${input.topicName}" at the ${input.educationLevel} education level.

Requirements:
- Use ## headings for sections (never use # top-level headings)
- Write in a narrative storytelling style that engages the reader
- Aim for 1000-1500 words
- Include 3-5 sections
- Start with an engaging opening that hooks the reader
- Use clear explanations with real-world examples
- End with a summary or key takeaways section${existingContext}${sectionContext}`;

    const response = await anthropic.messages.create({
      model: CONTENT_MODEL,
      max_tokens: 8192,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Write the lesson content for "${input.title}".`,
        },
      ],
    });

    const content = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n\n");

    return { content };
  },
};
