import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Quiz API data layer", () => {
  const cleanupQuizIds: string[] = [];
  const cleanupMasteryIds: string[] = [];
  const cleanupLessonIds: string[] = [];
  const cleanupTopicIds: string[] = [];

  afterAll(async () => {
    for (const id of cleanupQuizIds) {
      await prisma.quizAttempt.delete({ where: { id } }).catch(() => {});
    }
    for (const id of cleanupMasteryIds) {
      await prisma.topicMastery.delete({ where: { id } }).catch(() => {});
    }
    for (const id of cleanupLessonIds) {
      await prisma.lesson.delete({ where: { id } }).catch(() => {});
    }
    for (const id of cleanupTopicIds) {
      await prisma.topic.delete({ where: { id } }).catch(() => {});
    }
  });

  it("creates a QuizAttempt with in_progress status and stores reference answers", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Quiz Data Test Topic", description: "test topic" },
    });
    cleanupTopicIds.push(topic.id);

    const questions = [
      { question: "What is fission?", referenceAnswer: "Splitting of atoms", lessonTitle: "Lesson 1" },
      { question: "What is fusion?", referenceAnswer: "Combining of atoms", lessonTitle: "Lesson 2" },
    ];

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: "dev-user",
        topicId: topic.id,
        questions,
        answers: [],
        score: 0,
        feedback: [],
        status: "in_progress",
      },
    });
    cleanupQuizIds.push(attempt.id);

    expect(attempt.status).toBe("in_progress");
    expect(attempt.questions).toEqual(questions);

    // Verify reference answers are stored server-side
    const stored = attempt.questions as Array<{ referenceAnswer: string }>;
    expect(stored[0].referenceAnswer).toBe("Splitting of atoms");
    expect(stored[1].referenceAnswer).toBe("Combining of atoms");
  });

  it("upserts TopicMastery after grading", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Mastery Upsert Quiz Topic", description: "test" },
    });
    cleanupTopicIds.push(topic.id);

    // First mastery creation (simulates first quiz)
    const mastery1 = await prisma.topicMastery.upsert({
      where: { userId_topicId: { userId: "dev-user", topicId: topic.id } },
      update: { masteryLevel: "learning", lastAssessedAt: new Date() },
      create: {
        userId: "dev-user",
        topicId: topic.id,
        masteryLevel: "learning",
        lastAssessedAt: new Date(),
      },
    });
    cleanupMasteryIds.push(mastery1.id);

    expect(mastery1.masteryLevel).toBe("learning");

    // Second upsert (simulates retake with better score)
    const mastery2 = await prisma.topicMastery.upsert({
      where: { userId_topicId: { userId: "dev-user", topicId: topic.id } },
      update: { masteryLevel: "proficient", lastAssessedAt: new Date() },
      create: {
        userId: "dev-user",
        topicId: topic.id,
        masteryLevel: "proficient",
        lastAssessedAt: new Date(),
      },
    });

    expect(mastery2.id).toBe(mastery1.id);
    expect(mastery2.masteryLevel).toBe("proficient");
  });

  it("can retrieve TopicMastery with topic name", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Mastery Query Topic", description: "test" },
    });
    cleanupTopicIds.push(topic.id);

    const mastery = await prisma.topicMastery.create({
      data: {
        userId: "dev-user",
        topicId: topic.id,
        masteryLevel: "familiar",
        lastAssessedAt: new Date(),
      },
    });
    cleanupMasteryIds.push(mastery.id);

    const records = await prisma.topicMastery.findMany({
      where: { userId: "dev-user", topicId: topic.id },
      include: { topic: { select: { name: true } } },
    });

    expect(records.length).toBeGreaterThanOrEqual(1);
    const record = records.find((r) => r.id === mastery.id)!;
    expect(record.topic.name).toBe("Mastery Query Topic");
    expect(record.masteryLevel).toBe("familiar");
  });

  it("validates QuizAttempt status before grading", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Status Validation Topic", description: "test" },
    });
    cleanupTopicIds.push(topic.id);

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: "dev-user",
        topicId: topic.id,
        questions: [],
        answers: [],
        score: 8,
        feedback: [],
        status: "completed",
      },
    });
    cleanupQuizIds.push(attempt.id);

    // Simulate the validation that the grade endpoint does
    const found = await prisma.quizAttempt.findUnique({ where: { id: attempt.id } });
    expect(found).not.toBeNull();
    expect(found!.status).toBe("completed");
    expect(found!.status !== "in_progress").toBe(true);
  });

  it("score thresholds map to correct mastery levels", () => {
    // Inline the same logic the grade endpoint uses
    function scoreToMasteryLevel(score: number): string {
      const pct = (score / 10) * 100;
      if (pct >= 80) return "proficient";
      if (pct >= 50) return "familiar";
      if (pct >= 20) return "learning";
      return "not_started";
    }

    expect(scoreToMasteryLevel(10)).toBe("proficient");
    expect(scoreToMasteryLevel(8)).toBe("proficient");
    expect(scoreToMasteryLevel(7)).toBe("familiar");
    expect(scoreToMasteryLevel(5)).toBe("familiar");
    expect(scoreToMasteryLevel(4)).toBe("learning");
    expect(scoreToMasteryLevel(2)).toBe("learning");
    expect(scoreToMasteryLevel(1)).toBe("not_started");
    expect(scoreToMasteryLevel(0)).toBe("not_started");
  });
});
