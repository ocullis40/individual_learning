import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// TODO: include quiz ID when Quiz model is added (Phase 3)

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        topic: {
          include: {
            parentTopic: true,
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: lesson });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch lesson", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
