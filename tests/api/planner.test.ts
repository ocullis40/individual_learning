import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Planner API - data layer", () => {
  let topicId: string;
  let planId: string;

  beforeAll(async () => {
    const topic = await prisma.topic.create({
      data: { name: "Planner Test Topic", description: "For API tests" },
    });
    topicId = topic.id;
  });

  afterAll(async () => {
    await prisma.plannedLesson.deleteMany({ where: { plan: { topicId } } });
    await prisma.lessonPlan.deleteMany({ where: { topicId } });
    await prisma.topic.delete({ where: { id: topicId } });
  });

  it("creates a lesson plan with correct defaults", async () => {
    const plan = await prisma.lessonPlan.create({
      data: {
        topicId,
        educationLevel: "college",
        status: "planning",
        chatHistory: [],
      },
      include: {
        topic: true,
        plannedLessons: { orderBy: { order: "asc" } },
      },
    });

    expect(plan.id).toBeDefined();
    expect(plan.status).toBe("planning");
    expect(plan.educationLevel).toBe("college");
    expect(plan.topicId).toBe(topicId);
    expect(plan.topic.name).toBe("Planner Test Topic");
    expect(plan.plannedLessons).toEqual([]);
    expect(plan.chatHistory).toEqual([]);

    planId = plan.id;
  });

  it("retrieves a plan with topic and planned lessons", async () => {
    const plan = await prisma.lessonPlan.findUnique({
      where: { id: planId },
      include: {
        topic: true,
        plannedLessons: {
          orderBy: { order: "asc" },
          include: { lesson: true },
        },
      },
    });

    expect(plan).toBeDefined();
    expect(plan!.id).toBe(planId);
    expect(plan!.topic).toBeDefined();
    expect(plan!.topic.id).toBe(topicId);
    expect(plan!.plannedLessons).toEqual([]);
  });

  it("updates plan status", async () => {
    const updated = await prisma.lessonPlan.update({
      where: { id: planId },
      data: { status: "generating" },
      include: {
        topic: true,
        plannedLessons: { orderBy: { order: "asc" } },
      },
    });

    expect(updated.status).toBe("generating");
    expect(updated.id).toBe(planId);
  });

  it("updates plan chatHistory", async () => {
    const chatHistory = [
      { role: "user", content: "Plan 3 lessons on fission" },
      { role: "assistant", content: "Here are 3 lessons..." },
    ];

    const updated = await prisma.lessonPlan.update({
      where: { id: planId },
      data: { chatHistory },
    });

    expect(updated.chatHistory).toEqual(chatHistory);
  });

  it("returns null for a non-existent plan", async () => {
    const plan = await prisma.lessonPlan.findUnique({
      where: { id: "nonexistent-plan-id" },
    });
    expect(plan).toBeNull();
  });
});
