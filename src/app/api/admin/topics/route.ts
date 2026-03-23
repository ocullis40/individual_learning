import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const topics = await prisma.topic.findMany({
      include: {
        parentTopic: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: topics });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch topics", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, parentTopicId } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Description is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (parentTopicId) {
      const parent = await prisma.topic.findUnique({
        where: { id: parentTopicId },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Parent topic not found", code: "NOT_FOUND" },
          { status: 404 }
        );
      }
    }

    const topic = await prisma.topic.create({
      data: {
        name: name.trim(),
        description,
        ...(parentTopicId ? { parentTopicId } : {}),
      },
      include: {
        parentTopic: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: topic }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create topic", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
