import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePagination } from "@/lib/pagination";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const where = { parentTopicId: null };

    const [topics, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        include: {
          _count: {
            select: {
              childTopics: true,
              lessons: true,
            },
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.topic.count({ where }),
    ]);

    return NextResponse.json({ data: topics, total, page, limit });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch topics", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
