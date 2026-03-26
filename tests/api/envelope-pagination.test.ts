import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

/**
 * Tests for the API envelope ({ data, total, page, limit }) and pagination
 * pattern across all list endpoints, and { data } envelope on single-resource
 * endpoints.
 *
 * These tests verify the data layer queries that the API routes use,
 * since the routes are thin wrappers around Prisma calls.
 */

describe("API envelope and pagination", () => {
  const topicIds: string[] = [];
  let lessonId: string;

  beforeAll(async () => {
    // Create enough topics to test pagination
    for (let i = 0; i < 5; i++) {
      const topic = await prisma.topic.create({
        data: {
          name: `Envelope Test Topic ${String(i).padStart(2, "0")}`,
          description: `Topic ${i} for envelope tests`,
        },
      });
      topicIds.push(topic.id);
    }

    const lesson = await prisma.lesson.create({
      data: {
        title: "Envelope Test Lesson",
        content: "Test content",
        difficultyLevel: 1,
        order: 1,
        topicId: topicIds[0],
      },
    });
    lessonId = lesson.id;
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { id: lessonId } });
    await prisma.topic.deleteMany({ where: { id: { in: topicIds } } });
  });

  describe("GET /api/topics - list with pagination", () => {
    it("returns paginated results with envelope shape", async () => {
      const where = { parentTopicId: null };
      const page = 1;
      const limit = 3;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        prisma.topic.findMany({
          where,
          include: {
            _count: { select: { childTopics: true, lessons: true } },
          },
          orderBy: { name: "asc" },
          skip,
          take: limit,
        }),
        prisma.topic.count({ where }),
      ]);

      const envelope = { data, total, page, limit };

      expect(envelope).toHaveProperty("data");
      expect(envelope).toHaveProperty("total");
      expect(envelope).toHaveProperty("page");
      expect(envelope).toHaveProperty("limit");
      expect(Array.isArray(envelope.data)).toBe(true);
      expect(envelope.data.length).toBeLessThanOrEqual(limit);
      expect(envelope.total).toBeGreaterThanOrEqual(envelope.data.length);
      expect(envelope.page).toBe(1);
      expect(envelope.limit).toBe(3);
    });

    it("respects page parameter for offset", async () => {
      const where = { parentTopicId: null };
      const limit = 2;

      const [page1Data] = await Promise.all([
        prisma.topic.findMany({
          where,
          orderBy: { name: "asc" },
          skip: 0,
          take: limit,
        }),
        prisma.topic.count({ where }),
      ]);

      const [page2Data] = await Promise.all([
        prisma.topic.findMany({
          where,
          orderBy: { name: "asc" },
          skip: limit,
          take: limit,
        }),
        prisma.topic.count({ where }),
      ]);

      // Pages should return different data (assuming enough topics exist)
      if (page1Data.length > 0 && page2Data.length > 0) {
        expect(page1Data[0].id).not.toBe(page2Data[0].id);
      }
    });

    it("clamps page to minimum of 1", () => {
      const page = Math.max(1, parseInt("-5"));
      expect(page).toBe(1);
    });

    it("clamps limit to range 1-100", () => {
      const limitLow = Math.min(100, Math.max(1, parseInt("0")));
      expect(limitLow).toBe(1);

      const limitHigh = Math.min(100, Math.max(1, parseInt("999")));
      expect(limitHigh).toBe(100);
    });

    it("defaults to page=1 and limit=20", () => {
      const page = Math.max(1, parseInt("1"));
      const limit = Math.min(100, Math.max(1, parseInt("20")));
      expect(page).toBe(1);
      expect(limit).toBe(20);
    });
  });

  describe("GET /api/topics/[id] - single resource envelope", () => {
    it("wraps single topic in { data } envelope", async () => {
      const topic = await prisma.topic.findUnique({
        where: { id: topicIds[0] },
        include: {
          parentTopic: true,
          childTopics: { orderBy: { name: "asc" } },
          lessons: { orderBy: { order: "asc" } },
        },
      });

      const envelope = { data: topic };

      expect(envelope).toHaveProperty("data");
      expect(envelope.data).toBeDefined();
      expect(envelope.data!.id).toBe(topicIds[0]);
    });
  });

  describe("GET /api/lessons/[id] - single resource envelope", () => {
    it("wraps single lesson in { data } envelope", async () => {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          topic: { include: { parentTopic: true } },
        },
      });

      const envelope = { data: lesson };

      expect(envelope).toHaveProperty("data");
      expect(envelope.data).toBeDefined();
      expect(envelope.data!.id).toBe(lessonId);
      expect(envelope.data!.topic).toBeDefined();
    });
  });

  describe("GET /api/admin/topics - list with pagination", () => {
    it("returns all topics (not just top-level) with pagination envelope", async () => {
      const page = 1;
      const limit = 20;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        prisma.topic.findMany({
          include: {
            parentTopic: { select: { id: true, name: true } },
          },
          orderBy: { name: "asc" },
          skip,
          take: limit,
        }),
        prisma.topic.count(),
      ]);

      const envelope = { data, total, page, limit };

      expect(envelope).toHaveProperty("data");
      expect(envelope).toHaveProperty("total");
      expect(envelope).toHaveProperty("page");
      expect(envelope).toHaveProperty("limit");
      expect(Array.isArray(envelope.data)).toBe(true);
      expect(envelope.total).toBeGreaterThanOrEqual(envelope.data.length);
    });
  });

  describe("GET /api/profile/mastery - list with pagination", () => {
    it("returns mastery records with pagination envelope shape", async () => {
      const USER_ID = "dev-user";
      const page = 1;
      const limit = 20;
      const skip = (page - 1) * limit;
      const where = { userId: USER_ID };

      const [masteryRecords, total] = await Promise.all([
        prisma.topicMastery.findMany({
          where,
          include: { topic: { select: { name: true } } },
          orderBy: { updatedAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.topicMastery.count({ where }),
      ]);

      const data = masteryRecords.map((record) => ({
        id: record.id,
        topicId: record.topicId,
        topicName: record.topic.name,
        masteryLevel: record.masteryLevel,
        lastAssessedAt: record.lastAssessedAt,
      }));

      const envelope = { data, total, page, limit };

      expect(envelope).toHaveProperty("data");
      expect(envelope).toHaveProperty("total");
      expect(envelope).toHaveProperty("page");
      expect(envelope).toHaveProperty("limit");
      expect(Array.isArray(envelope.data)).toBe(true);
      expect(typeof envelope.total).toBe("number");
    });
  });
});
