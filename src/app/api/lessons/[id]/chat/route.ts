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

Rules:
- Answer directly and concisely. Do not repeat or rephrase the student's question.
- Do not say things like "The lesson covers..." or "As mentioned in the lesson..." — just answer.
- If the question goes beyond the lesson, answer it naturally without pointing out that it's not in the lesson.
- Use the lesson content as context for your answers but do not reference it explicitly.

LESSON CONTENT:
${lessonContent}`;

    const response = await anthropic.messages.create({
      model: CHAT_MODEL,
      max_tokens: 1024,
      stream: true,
      system: systemPrompt,
      messages: historyMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();
    let fullResponse = "";
    const conversationId = conversation.id;

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of response) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              const text = event.delta.text;
              fullResponse += text;
              controller.enqueue(encoder.encode(text));
            }
          }
          // Save assistant message after stream completes
          await prisma.chatMessage.create({
            data: {
              conversationId,
              role: "assistant",
              content: fullResponse,
            },
          });
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
