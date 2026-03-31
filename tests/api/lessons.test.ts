import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Lessons data layer", () => {
  let topicId: string;
  let parentTopicId: string;
  let lessonId: string;

  beforeAll(async () => {
    const parentTopic = await prisma.topic.create({
      data: { name: "Lesson Test Parent", description: "Parent for lesson tests" },
    });
    parentTopicId = parentTopic.id;

    const topic = await prisma.topic.create({
      data: {
        name: "Lesson Test Topic",
        description: "Topic for lesson tests",
        parentTopicId: parentTopic.id,
      },
    });
    topicId = topic.id;

    const lesson = await prisma.lesson.create({
      data: {
        title: "Lesson Test Lesson",
        content: "# Test\nSome content here.",
        difficultyLevel: 2,
        order: 1,
        topicId: topic.id,
        educationLevel: "college",
      },
    });
    lessonId = lesson.id;
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { id: lessonId } });
    await prisma.topic.deleteMany({ where: { id: { in: [topicId, parentTopicId] } } });
  });

  it("gets a lesson by ID with topic info including parentTopic", async () => {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        topic: {
          include: { parentTopic: true },
        },
      },
    });

    expect(lesson).toBeDefined();
    expect(lesson!.title).toBe("Lesson Test Lesson");
    expect(lesson!.difficultyLevel).toBe(2);
    expect(lesson!.topic).toBeDefined();
    expect(lesson!.topic.id).toBe(topicId);
    expect(lesson!.topic.parentTopic).toBeDefined();
    expect(lesson!.topic.parentTopic!.id).toBe(parentTopicId);
  });

  it("returns null for a non-existent lesson", async () => {
    const lesson = await prisma.lesson.findUnique({
      where: { id: "nonexistent-lesson-id" },
    });
    expect(lesson).toBeNull();
  });
});
