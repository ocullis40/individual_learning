import { prisma } from "@/lib/prisma";

interface SearchLessonsInput {
  topicId: string;
}

interface SearchLessonsResult {
  lessons: { title: string; topicName: string }[];
}

export const searchExistingLessons = {
  name: "searchExistingLessons",
  description:
    "Search for existing lessons under a topic and its child topics to avoid duplicates.",
  inputSchema: {
    type: "object" as const,
    properties: {
      topicId: { type: "string", description: "The topic ID to search under" },
    },
    required: ["topicId"],
  },
  execute: async (input: SearchLessonsInput): Promise<SearchLessonsResult> => {
    const lessons = await prisma.lesson.findMany({
      where: {
        OR: [
          { topicId: input.topicId },
          { topic: { parentTopicId: input.topicId } },
        ],
      },
      select: {
        title: true,
        topic: { select: { name: true } },
      },
      orderBy: { order: "asc" },
    });

    return {
      lessons: lessons.map((l) => ({
        title: l.title,
        topicName: l.topic.name,
      })),
    };
  },
};
