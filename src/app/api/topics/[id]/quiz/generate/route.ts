import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic, CHAT_MODEL, MAX_LESSON_CHARS } from "@/lib/anthropic";

const USER_ID = "dev-user";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const topic = await prisma.topic.findUnique({
      where: { id },
      include: {
        lessons: { orderBy: { order: "asc" } },
        childTopics: {
          include: {
            lessons: { orderBy: { order: "asc" } },
          },
        },
      },
    });

    if (!topic) {
      return NextResponse.json(
        { error: "Topic not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Collect all lessons (topic + child topics)
    const allLessons = [
      ...topic.lessons,
      ...topic.childTopics.flatMap((ct) => ct.lessons),
    ];

    // Concatenate lesson content, respecting MAX_LESSON_CHARS per lesson
    const lessonContent = allLessons
      .map((lesson) => {
        const content =
          lesson.content.length > MAX_LESSON_CHARS
            ? lesson.content.slice(0, MAX_LESSON_CHARS) +
              "\n[Truncated due to length.]"
            : lesson.content;
        return `## ${lesson.title}\n${content}`;
      })
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: CHAT_MODEL,
      max_tokens: 4096,
      system: [
        {
          type: "text" as const,
          text: "You are an expert quiz generator for an educational platform. Generate questions that test comprehension of the provided lesson content.",
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text" as const,
              text: lessonContent,
              cache_control: { type: "ephemeral" as const },
            },
            {
              type: "text" as const,
              text: `Generate 10 short-answer questions based on the lesson content above. Return as JSON array: [{ "question": "...", "referenceAnswer": "...", "lessonTitle": "..." }]

Return ONLY the JSON array, no other text.`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Failed to generate quiz", code: "GENERATION_ERROR" },
        { status: 500 }
      );
    }

    // Parse the JSON from Claude's response
    const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse quiz questions", code: "PARSE_ERROR" },
        { status: 500 }
      );
    }

    const questions = JSON.parse(jsonMatch[0]) as Array<{
      question: string;
      referenceAnswer: string;
      lessonTitle: string;
    }>;

    // Create QuizAttempt with full questions (including referenceAnswers) stored server-side
    const quizAttempt = await prisma.quizAttempt.create({
      data: {
        userId: USER_ID,
        topicId: id,
        questions: questions,
        answers: [],
        score: 0,
        feedback: [],
        status: "in_progress",
      },
    });

    // Return to client WITHOUT referenceAnswers
    return NextResponse.json({
      attemptId: quizAttempt.id,
      questions: questions.map(({ question, lessonTitle }) => ({
        question,
        lessonTitle,
      })),
    });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
