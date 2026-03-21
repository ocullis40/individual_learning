import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  anthropic,
  CHAT_MODEL,
  MAX_LESSON_CHARS,
  MAX_HISTORY_MESSAGES,
} from "@/lib/anthropic";

const USER_ID = "dev-user";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: lessonId } = await params;

  try {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const conversation = await prisma.chatConversation.upsert({
      where: { userId_lessonId: { userId: USER_ID, lessonId } },
      update: {},
      create: { userId: USER_ID, lessonId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json(conversation);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch conversation", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: lessonId } = await params;

  try {
    const { message } = await request.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const conversation = await prisma.chatConversation.upsert({
      where: { userId_lessonId: { userId: USER_ID, lessonId } },
      update: {},
      create: { userId: USER_ID, lessonId },
    });

    // Save user message immediately
    await prisma.chatMessage.create({
      data: { conversationId: conversation.id, role: "user", content: message },
    });

    // Get last N messages for Claude context (take most recent, then reverse to chronological)
    const historyMessages = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: MAX_HISTORY_MESSAGES,
    });
    historyMessages.reverse();

    // Truncate lesson content if needed
    let lessonContent = lesson.content;
    if (lessonContent.length > MAX_LESSON_CHARS) {
      lessonContent =
        lessonContent.slice(0, MAX_LESSON_CHARS) +
        "\n\n[Note: Lesson content was truncated due to length.]";
    }

    const systemPrompt = `You are a knowledgeable tutor helping a student understand the following lesson content.
Answer questions clearly and concisely, referencing the lesson material when relevant.
If the student asks about something not covered in the lesson, you may provide additional
context but note that it goes beyond the current lesson.

LESSON CONTENT:
${lessonContent}`;

    const stream = anthropic.messages.stream({
      model: CHAT_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: historyMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const readableStream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        stream.on("text", (text) => {
          fullResponse += text;
          controller.enqueue(new TextEncoder().encode(text));
        });
        stream.on("end", async () => {
          await prisma.chatMessage.create({
            data: {
              conversationId: conversation.id,
              role: "assistant",
              content: fullResponse,
            },
          });
          controller.close();
        });
        stream.on("error", (error) => {
          controller.error(error);
        });
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to process chat message", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
