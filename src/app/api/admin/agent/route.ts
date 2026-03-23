import { NextResponse } from "next/server";
import { runContentAgent } from "@/agents/content-agent";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topicId, title, educationLevel } = body;

    if (!topicId || typeof topicId !== "string") {
      return NextResponse.json(
        { error: "topicId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "title is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (
      !educationLevel ||
      !["high_school", "college", "graduate"].includes(educationLevel)
    ) {
      return NextResponse.json(
        {
          error:
            "educationLevel is required and must be one of: high_school, college, graduate",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const result = await runContentAgent({
      topicId,
      title: title.trim(),
      educationLevel,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
