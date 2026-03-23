import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePagination } from "@/lib/pagination";

const USER_ID = "dev-user";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

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

    return NextResponse.json({ data, total, page, limit });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch mastery records", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
