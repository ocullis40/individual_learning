import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;

  const plan = await prisma.lessonPlan.findUnique({
    where: { id: planId },
    include: {
      topic: true,
      plannedLessons: {
        orderBy: { order: "asc" },
        include: { lesson: true },
      },
    },
  });

  if (!plan) {
    return NextResponse.json(
      { error: "Plan not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: plan });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  const body = await request.json();

  try {
    const plan = await prisma.lessonPlan.update({
      where: { id: planId },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.chatHistory ? { chatHistory: body.chatHistory } : {}),
      },
      include: {
        topic: true,
        plannedLessons: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json({ data: plan });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Plan not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
