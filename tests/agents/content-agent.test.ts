import { describe, it, expect, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { searchExistingLessons } from "@/agents/tools/search-lessons";
import { saveLesson } from "@/agents/tools/save-lesson";

// Track IDs for cleanup
const createdTopicIds: string[] = [];
const createdLessonIds: string[] = [];

afterAll(async () => {
  if (createdLessonIds.length) {
    await prisma.lesson.deleteMany({ where: { id: { in: createdLessonIds } } });
  }
  if (createdTopicIds.length) {
    await prisma.topic.deleteMany({ where: { id: { in: createdTopicIds } } });
  }
});

describe("searchExistingLessons", () => {
  it("exports the correct tool shape", () => {
    expect(searchExistingLessons.name).toBe("searchExistingLessons");
    expect(searchExistingLessons.description).toBeDefined();
    expect(searchExistingLessons.inputSchema).toBeDefined();
    expect(searchExistingLessons.inputSchema.type).toBe("object");
    expect(searchExistingLessons.inputSchema.required).toContain("topicId");
    expect(typeof searchExistingLessons.execute).toBe("function");
  });

  it("returns lessons for a topic and its child topics", async () => {
    const parent = await prisma.topic.create({
      data: { name: "CA Test Parent", description: "Parent topic" },
    });
    createdTopicIds.push(parent.id);

    const child = await prisma.topic.create({
      data: {
        name: "CA Test Child",
        description: "Child topic",
        parentTopicId: parent.id,
      },
    });
    createdTopicIds.unshift(child.id);

    const parentLesson = await prisma.lesson.create({
      data: {
        title: "Parent Lesson",
        content: "Content for parent",
        difficultyLevel: 1,
        order: 1,
        topicId: parent.id,
      },
    });
    createdLessonIds.push(parentLesson.id);

    const childLesson = await prisma.lesson.create({
      data: {
        title: "Child Lesson",
        content: "Content for child",
        difficultyLevel: 1,
        order: 1,
        topicId: child.id,
      },
    });
    createdLessonIds.push(childLesson.id);

    const result = await searchExistingLessons.execute({ topicId: parent.id });

    expect(result.lessons).toHaveLength(2);
    const titles = result.lessons.map((l) => l.title);
    expect(titles).toContain("Parent Lesson");
    expect(titles).toContain("Child Lesson");

    const childResult = result.lessons.find((l) => l.title === "Child Lesson");
    expect(childResult?.topicName).toBe("CA Test Child");
  });

  it("returns empty array when no lessons exist", async () => {
    const topic = await prisma.topic.create({
      data: { name: "CA Empty Topic", description: "No lessons" },
    });
    createdTopicIds.push(topic.id);

    const result = await searchExistingLessons.execute({ topicId: topic.id });

    expect(result.lessons).toEqual([]);
  });
});

describe("saveLesson", () => {
  it("exports the correct tool shape", () => {
    expect(saveLesson.name).toBe("saveLesson");
    expect(saveLesson.description).toBeDefined();
    expect(saveLesson.inputSchema).toBeDefined();
    expect(saveLesson.inputSchema.type).toBe("object");
    expect(saveLesson.inputSchema.required).toContain("topicId");
    expect(saveLesson.inputSchema.required).toContain("title");
    expect(saveLesson.inputSchema.required).toContain("content");
    expect(saveLesson.inputSchema.required).toContain("educationLevel");
    expect(typeof saveLesson.execute).toBe("function");
  });

  it("saves a lesson with auto-calculated order and default difficulty", async () => {
    const topic = await prisma.topic.create({
      data: { name: "CA Save Topic", description: "For saving lessons" },
    });
    createdTopicIds.push(topic.id);

    const result = await saveLesson.execute({
      topicId: topic.id,
      title: "First Saved Lesson",
      content: "## Introduction\nSome content.",
      educationLevel: "high school",
    });

    createdLessonIds.push(result.id);

    expect(result.id).toBeDefined();
    expect(result.title).toBe("First Saved Lesson");

    const lesson = await prisma.lesson.findUnique({ where: { id: result.id } });
    expect(lesson).toBeDefined();
    expect(lesson!.order).toBe(1);
    expect(lesson!.difficultyLevel).toBe(1);
    expect(lesson!.educationLevel).toBe("high school");
  });

  it("auto-increments order for subsequent lessons", async () => {
    const topic = await prisma.topic.create({
      data: { name: "CA Order Topic", description: "For order testing" },
    });
    createdTopicIds.push(topic.id);

    const first = await saveLesson.execute({
      topicId: topic.id,
      title: "Order Lesson 1",
      content: "Content 1",
      educationLevel: "undergraduate",
    });
    createdLessonIds.push(first.id);

    const second = await saveLesson.execute({
      topicId: topic.id,
      title: "Order Lesson 2",
      content: "Content 2",
      educationLevel: "undergraduate",
    });
    createdLessonIds.push(second.id);

    const firstDb = await prisma.lesson.findUnique({ where: { id: first.id } });
    const secondDb = await prisma.lesson.findUnique({ where: { id: second.id } });

    expect(firstDb!.order).toBe(1);
    expect(secondDb!.order).toBe(2);
  });
});

