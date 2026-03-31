import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Admin API - data layer", () => {
  let parentTopicId: string;
  let childTopicId: string;
  let lessonId: string;
  let createdTopicId: string;

  beforeAll(async () => {
    const parent = await prisma.topic.create({
      data: { name: "Admin Test Parent", description: "Parent for admin tests" },
    });
    parentTopicId = parent.id;

    const child = await prisma.topic.create({
      data: {
        name: "Admin Test Child",
        description: "Child for admin tests",
        parentTopicId: parent.id,
      },
    });
    childTopicId = child.id;
  });

  afterAll(async () => {
    if (lessonId) {
      await prisma.lesson.deleteMany({ where: { id: lessonId } });
    }
    if (createdTopicId) {
      await prisma.topic.deleteMany({ where: { id: createdTopicId } });
    }
    await prisma.topic.deleteMany({
      where: { id: { in: [childTopicId, parentTopicId] } },
    });
  });

  describe("Lesson educationLevel field", () => {
    it("creates a lesson with educationLevel", async () => {
      const lesson = await prisma.lesson.create({
        data: {
          title: "Admin Test Lesson",
          content: "Test content",
          difficultyLevel: 1,
          order: 1,
          topicId: parentTopicId,
          educationLevel: "high_school",
        },
      });
      lessonId = lesson.id;

      expect(lesson.educationLevel).toBe("high_school");
    });

    it("requires educationLevel to be provided", async () => {
      await expect(
        prisma.lesson.create({
          data: {
            title: "Lesson Without Level",
            content: "No level",
            difficultyLevel: 1,
            order: 2,
            topicId: parentTopicId,
          } as any,
        })
      ).rejects.toThrow();
    });
  });

  describe("List ALL topics (admin)", () => {
    it("returns all topics including children, with parent info", async () => {
      const topics = await prisma.topic.findMany({
        include: {
          parentTopic: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
      });

      expect(topics.length).toBeGreaterThanOrEqual(2);

      // Should include both parent and child topics (flat list)
      const parent = topics.find((t) => t.id === parentTopicId);
      const child = topics.find((t) => t.id === childTopicId);

      expect(parent).toBeDefined();
      expect(parent!.parentTopic).toBeNull();

      expect(child).toBeDefined();
      expect(child!.parentTopic).toBeDefined();
      expect(child!.parentTopic!.id).toBe(parentTopicId);
      expect(child!.parentTopic!.name).toBe("Admin Test Parent");
    });
  });

  describe("Create topic", () => {
    it("creates a topic with name and description", async () => {
      const topic = await prisma.topic.create({
        data: {
          name: "Admin Created Topic",
          description: "Created via admin",
        },
      });
      createdTopicId = topic.id;

      expect(topic.name).toBe("Admin Created Topic");
      expect(topic.description).toBe("Created via admin");
      expect(topic.parentTopicId).toBeNull();
    });

    it("creates a child topic with parentTopicId", async () => {
      const child = await prisma.topic.create({
        data: {
          name: "Admin Created Child",
          description: "Child via admin",
          parentTopicId: parentTopicId,
        },
      });

      expect(child.parentTopicId).toBe(parentTopicId);

      // cleanup
      await prisma.topic.delete({ where: { id: child.id } });
    });
  });
});
