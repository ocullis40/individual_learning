import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Chat schema", () => {
  const cleanupConversationIds: string[] = [];
  const cleanupTopicIds: string[] = [];

  afterAll(async () => {
    for (const id of cleanupConversationIds) {
      await prisma.chatMessage.deleteMany({ where: { conversationId: id } });
      await prisma.chatConversation.delete({ where: { id } }).catch(() => {});
    }
    await prisma.lesson.deleteMany({ where: { topicId: { in: cleanupTopicIds } } });
    for (const id of cleanupTopicIds) {
      await prisma.topic.delete({ where: { id } }).catch(() => {});
    }
  });

  it("can create a conversation linked to a lesson", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Chat Test Topic", description: "test" },
    });
    cleanupTopicIds.push(topic.id);
    const lesson = await prisma.lesson.create({
      data: { title: "Chat Test Lesson", content: "test", difficultyLevel: 1, order: 1, topicId: topic.id },
    });
    const conversation = await prisma.chatConversation.create({
      data: { lessonId: lesson.id, userId: "dev-user" },
    });
    cleanupConversationIds.push(conversation.id);
    expect(conversation.id).toBeDefined();
    expect(conversation.lessonId).toBe(lesson.id);
  });

  it("can create messages in a conversation", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Chat Msg Topic", description: "test" },
    });
    cleanupTopicIds.push(topic.id);
    const lesson = await prisma.lesson.create({
      data: { title: "Chat Msg Lesson", content: "test", difficultyLevel: 1, order: 1, topicId: topic.id },
    });
    const conversation = await prisma.chatConversation.create({
      data: { lessonId: lesson.id, userId: "dev-user" },
    });
    cleanupConversationIds.push(conversation.id);

    await prisma.chatMessage.create({
      data: { conversationId: conversation.id, role: "user", content: "What is fission?" },
    });
    await prisma.chatMessage.create({
      data: { conversationId: conversation.id, role: "assistant", content: "Fission is..." },
    });

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
    });
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[1].role).toBe("assistant");
  });
});
