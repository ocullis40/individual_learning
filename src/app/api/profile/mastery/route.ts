import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const USER_ID = "dev-user";

export async function GET() {
  try {
    const masteryRecords = await prisma.topicMastery.findMany({
      where: { userId: USER_ID },
      include: { topic: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(
      masteryRecords.map((record) => ({
        id: record.id,
        topicId: record.topicId,
        topicName: record.topic.name,
        masteryLevel: record.masteryLevel,
        lastAssessedAt: record.lastAssessedAt,
      }))
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch mastery records", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
