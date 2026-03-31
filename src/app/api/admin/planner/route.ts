import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EDUCATION_LEVELS } from "@/lib/education-levels";

const validLevels = EDUCATION_LEVELS.map((l) => l.value);

export async function POST(request: Request) {
  try {
    const { topicId, educationLevel } = await request.json();

    if (!topicId || typeof topicId !== "string") {
      return NextResponse.json(
        { error: "topicId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (!educationLevel || !validLevels.includes(educationLevel)) {
      return NextResponse.json(
        {
          error: `educationLevel must be one of: ${validLevels.join(", ")}`,
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      return NextResponse.json(
        { error: "Topic not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const plan = await prisma.lessonPlan.create({
      data: {
        topicId,
        educationLevel,
        status: "planning",
        chatHistory: [],
      },
      include: {
        topic: true,
        plannedLessons: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json({ data: plan });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
