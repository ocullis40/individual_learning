import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Planner Schema", () => {
  const createdIds: { plans: string[]; topics: string[] } = { plans: [], topics: [] };

  afterAll(async () => {
    // Clean up in reverse dependency order
    await prisma.lessonImage.deleteMany({ where: { lesson: { topic: { id: { in: createdIds.topics } } } } });
    await prisma.plannedLesson.deleteMany({ where: { plan: { id: { in: createdIds.plans } } } });
    await prisma.lessonPlan.deleteMany({ where: { id: { in: createdIds.plans } } });
    await prisma.lesson.deleteMany({ where: { topicId: { in: createdIds.topics } } });
    await prisma.topic.deleteMany({ where: { id: { in: createdIds.topics } } });
  });

  it("creates a LessonPlan", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Test Topic", description: "For planner tests" },
    });
    createdIds.topics.push(topic.id);

    const plan = await prisma.lessonPlan.create({
      data: {
        topicId: topic.id,
        educationLevel: "college",
        status: "planning",
        chatHistory: [],
      },
    });
    createdIds.plans.push(plan.id);

    expect(plan.id).toBeDefined();
    expect(plan.status).toBe("planning");
    expect(plan.chatHistory).toEqual([]);
  });

  it("creates PlannedLessons linked to a plan", async () => {
    const plan = await prisma.lessonPlan.findFirst({ where: { id: { in: createdIds.plans } } });

    const planned = await prisma.plannedLesson.create({
      data: {
        planId: plan!.id,
        title: "Intro to Testing",
        outline: "Covers basics of TDD",
        generationInstructions: "Focus on practical examples",
        order: 1,
        status: "pending",
      },
    });

    expect(planned.title).toBe("Intro to Testing");
    expect(planned.status).toBe("pending");
    expect(planned.lessonId).toBeNull();
  });

  it("creates LessonImages linked to a lesson", async () => {
    const topic = await prisma.topic.findFirst({ where: { id: { in: createdIds.topics } } });

    const lesson = await prisma.lesson.create({
      data: {
        topicId: topic!.id,
        title: "Test Lesson",
        content: "# Test",
        difficultyLevel: 1,
        order: 1,
        educationLevel: "college",
      },
    });

    const image = await prisma.lessonImage.create({
      data: {
        lessonId: lesson.id,
        tool: "dalle",
        prompt: "A test image",
        description: "Test image description",
        path: "/images/lessons/test/test.png",
        status: "planned",
        order: 1,
      },
    });

    expect(image.tool).toBe("dalle");
    expect(image.status).toBe("planned");
  });
});
