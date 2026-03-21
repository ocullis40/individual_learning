import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const topics = await prisma.topic.findMany({
      where: { parentTopicId: null },
      include: {
        _count: {
          select: {
            childTopics: true,
            lessons: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(topics);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch topics", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
