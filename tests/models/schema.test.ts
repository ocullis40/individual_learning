import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Database schema", () => {
  const cleanupIds: { lessons: string[]; topics: string[] } = { lessons: [], topics: [] };

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { id: { in: cleanupIds.lessons } } });
    await prisma.topic.deleteMany({ where: { id: { in: cleanupIds.topics } } });
  });

  it("can create and query a topic", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Test Topic", description: "A test topic" },
    });
    cleanupIds.topics.push(topic.id);
    expect(topic.id).toBeDefined();
    expect(topic.name).toBe("Test Topic");
  });

  it("can create a lesson linked to a topic", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Lesson Test Topic", description: "For lesson test" },
    });
    cleanupIds.topics.push(topic.id);
    const lesson = await prisma.lesson.create({
      data: {
        title: "Test Lesson",
        content: "# Hello\nThis is a test.",
        difficultyLevel: 1,
        order: 1,
        topicId: topic.id,
      },
    });
    cleanupIds.lessons.push(lesson.id);
    expect(lesson.id).toBeDefined();
    expect(lesson.topicId).toBe(topic.id);
  });

  it("supports self-referencing topic hierarchy", async () => {
    const parent = await prisma.topic.create({
      data: { name: "Parent Topic", description: "Parent" },
    });
    const child = await prisma.topic.create({
      data: { name: "Child Topic", description: "Child", parentTopicId: parent.id },
    });
    cleanupIds.topics.push(child.id, parent.id);
    const fetched = await prisma.topic.findUnique({
      where: { id: child.id },
      include: { parentTopic: true },
    });
    expect(fetched?.parentTopic?.id).toBe(parent.id);
  });
});
