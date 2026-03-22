import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Assessment schema", () => {
  const cleanupTopicIds: string[] = [];
  const cleanupMasteryIds: string[] = [];
  const cleanupQuizIds: string[] = [];

  afterAll(async () => {
    for (const id of cleanupQuizIds) {
      await prisma.quizAttempt.delete({ where: { id } }).catch(() => {});
    }
    for (const id of cleanupMasteryIds) {
      await prisma.topicMastery.delete({ where: { id } }).catch(() => {});
    }
    for (const id of cleanupTopicIds) {
      await prisma.topic.delete({ where: { id } }).catch(() => {});
    }
  });

  it("can create a TopicMastery record linked to user and topic", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Mastery Test Topic", description: "test" },
    });
    cleanupTopicIds.push(topic.id);

    const mastery = await prisma.topicMastery.create({
      data: {
        userId: "dev-user",
        topicId: topic.id,
        masteryLevel: "not_started",
      },
    });
    cleanupMasteryIds.push(mastery.id);

    expect(mastery.id).toBeDefined();
    expect(mastery.userId).toBe("dev-user");
    expect(mastery.topicId).toBe(topic.id);
    expect(mastery.masteryLevel).toBe("not_started");
    expect(mastery.lastAssessedAt).toBeNull();
    expect(mastery.createdAt).toBeInstanceOf(Date);
    expect(mastery.updatedAt).toBeInstanceOf(Date);
  });

  it("can upsert TopicMastery (unique constraint on userId+topicId)", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Upsert Mastery Topic", description: "test" },
    });
    cleanupTopicIds.push(topic.id);

    const first = await prisma.topicMastery.create({
      data: {
        userId: "dev-user",
        topicId: topic.id,
        masteryLevel: "learning",
      },
    });
    cleanupMasteryIds.push(first.id);

    const upserted = await prisma.topicMastery.upsert({
      where: {
        userId_topicId: {
          userId: "dev-user",
          topicId: topic.id,
        },
      },
      update: { masteryLevel: "proficient", lastAssessedAt: new Date() },
      create: {
        userId: "dev-user",
        topicId: topic.id,
        masteryLevel: "proficient",
      },
    });

    expect(upserted.id).toBe(first.id);
    expect(upserted.masteryLevel).toBe("proficient");
    expect(upserted.lastAssessedAt).toBeInstanceOf(Date);
  });

  it("can create a QuizAttempt with JSON fields and status", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Quiz Test Topic", description: "test" },
    });
    cleanupTopicIds.push(topic.id);

    const questions = [
      { id: 1, text: "What is 2+2?", options: ["3", "4", "5"] },
    ];
    const answers = [{ questionId: 1, selected: "4" }];
    const feedback = [{ questionId: 1, correct: true, explanation: "Basic addition" }];

    const quiz = await prisma.quizAttempt.create({
      data: {
        userId: "dev-user",
        topicId: topic.id,
        questions,
        answers,
        score: 100,
        feedback,
      },
    });
    cleanupQuizIds.push(quiz.id);

    expect(quiz.id).toBeDefined();
    expect(quiz.userId).toBe("dev-user");
    expect(quiz.topicId).toBe(topic.id);
    expect(quiz.questions).toEqual(questions);
    expect(quiz.answers).toEqual(answers);
    expect(quiz.score).toBe(100);
    expect(quiz.feedback).toEqual(feedback);
    expect(quiz.status).toBe("in_progress");
    expect(quiz.createdAt).toBeInstanceOf(Date);
  });
});
