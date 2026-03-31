import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Chat API data layer", () => {
  const cleanupConversationIds: string[] = [];
  let testLessonId: string;
  let testTopicId: string;

  afterAll(async () => {
    for (const id of cleanupConversationIds) {
      await prisma.chatMessage.deleteMany({ where: { conversationId: id } });
      await prisma.chatConversation.delete({ where: { id } }).catch(() => {});
    }
    await prisma.lesson.delete({ where: { id: testLessonId } }).catch(() => {});
    await prisma.topic.delete({ where: { id: testTopicId } }).catch(() => {});
  });

  it("creates a conversation if none exists for user+lesson", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Chat API Topic", description: "test" },
    });
    testTopicId = topic.id;
    const lesson = await prisma.lesson.create({
      data: { title: "Chat API Lesson", content: "test", difficultyLevel: 1, order: 1, topicId: topic.id, educationLevel: "college" },
    });
    testLessonId = lesson.id;

    const conversation = await prisma.chatConversation.upsert({
      where: { userId_lessonId: { userId: "dev-user", lessonId: lesson.id } },
      update: {},
      create: { userId: "dev-user", lessonId: lesson.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    cleanupConversationIds.push(conversation.id);
    expect(conversation.id).toBeDefined();
    expect(conversation.messages).toHaveLength(0);
  });

  it("returns existing conversation on second call", async () => {
    const conv1 = await prisma.chatConversation.upsert({
      where: { userId_lessonId: { userId: "dev-user", lessonId: testLessonId } },
      update: {},
      create: { userId: "dev-user", lessonId: testLessonId },
    });
    const conv2 = await prisma.chatConversation.upsert({
      where: { userId_lessonId: { userId: "dev-user", lessonId: testLessonId } },
      update: {},
      create: { userId: "dev-user", lessonId: testLessonId },
    });
    expect(conv1.id).toBe(conv2.id);
  });
});
