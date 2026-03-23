import { prisma } from "@/lib/prisma";

interface SaveLessonInput {
  topicId: string;
  title: string;
  content: string;
  educationLevel: string;
}

interface SaveLessonResult {
  id: string;
  title: string;
}

export const saveLesson = {
  name: "saveLesson",
  description:
    "Save a new lesson to the database with auto-calculated order and default difficulty.",
  inputSchema: {
    type: "object" as const,
    properties: {
      topicId: { type: "string", description: "The topic ID to attach the lesson to" },
      title: { type: "string", description: "The lesson title" },
      content: { type: "string", description: "The lesson content in markdown" },
      educationLevel: {
        type: "string",
        description: "Target education level",
      },
    },
    required: ["topicId", "title", "content", "educationLevel"],
  },
  execute: async (input: SaveLessonInput): Promise<SaveLessonResult> => {
    const lesson = await prisma.$transaction(async (tx) => {
      const existingCount = await tx.lesson.count({
        where: { topicId: input.topicId },
      });

      return tx.lesson.create({
        data: {
          topicId: input.topicId,
          title: input.title,
          content: input.content,
          educationLevel: input.educationLevel,
          difficultyLevel: 1,
          order: existingCount + 1,
        },
        select: {
          id: true,
          title: true,
        },
      });
    });

    return { id: lesson.id, title: lesson.title };
  },
};
