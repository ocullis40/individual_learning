import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Topics data layer", () => {
  let parentTopicId: string;
  let childTopicId: string;
  let lessonId: string;

  beforeAll(async () => {
    const parent = await prisma.topic.create({
      data: { name: "API Test Parent Topic", description: "A top-level topic for API tests" },
    });
    parentTopicId = parent.id;

    const child = await prisma.topic.create({
      data: {
        name: "API Test Child Topic",
        description: "A child topic for API tests",
        parentTopicId: parent.id,
      },
    });
    childTopicId = child.id;

    const lesson = await prisma.lesson.create({
      data: {
        title: "API Test Lesson",
        content: "Test lesson content",
        difficultyLevel: 1,
        order: 1,
        topicId: parent.id,
        educationLevel: "college",
      },
    });
    lessonId = lesson.id;
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { id: lessonId } });
    await prisma.topic.deleteMany({ where: { id: { in: [childTopicId, parentTopicId] } } });
  });

  it("lists top-level topics (parentTopicId is null)", async () => {
    const topics = await prisma.topic.findMany({
      where: { parentTopicId: null },
      include: {
        _count: {
          select: { childTopics: true, lessons: true },
        },
      },
      orderBy: { name: "asc" },
    });

    expect(topics.length).toBeGreaterThan(0);
    topics.forEach((topic) => {
      expect(topic.parentTopicId).toBeNull();
      expect(topic._count).toBeDefined();
      expect(typeof topic._count.childTopics).toBe("number");
      expect(typeof topic._count.lessons).toBe("number");
    });

    const testTopic = topics.find((t) => t.id === parentTopicId);
    expect(testTopic).toBeDefined();
    expect(testTopic!._count.childTopics).toBe(1);
    expect(testTopic!._count.lessons).toBe(1);
  });

  it("gets a topic with childTopics and lessons", async () => {
    const topic = await prisma.topic.findUnique({
      where: { id: parentTopicId },
      include: {
        parentTopic: true,
        childTopics: { orderBy: { name: "asc" } },
        lessons: { orderBy: { order: "asc" } },
      },
    });

    expect(topic).toBeDefined();
    expect(topic!.name).toBe("API Test Parent Topic");
    expect(topic!.parentTopic).toBeNull();
    expect(topic!.childTopics).toHaveLength(1);
    expect(topic!.childTopics[0].id).toBe(childTopicId);
    expect(topic!.lessons).toHaveLength(1);
    expect(topic!.lessons[0].id).toBe(lessonId);
  });

  it("returns null for a non-existent topic", async () => {
    const topic = await prisma.topic.findUnique({
      where: { id: "nonexistent-id" },
    });
    expect(topic).toBeNull();
  });
});
