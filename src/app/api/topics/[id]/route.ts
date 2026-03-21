import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const topic = await prisma.topic.findUnique({
      where: { id },
      include: {
        parentTopic: true,
        childTopics: {
          orderBy: { name: "asc" },
        },
        lessons: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!topic) {
      return NextResponse.json(
        { error: "Topic not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(topic);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch topic", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
