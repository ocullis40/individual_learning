import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic, GRADING_MODEL } from "@/lib/anthropic";
import { MasteryLevel } from "@/generated/prisma/client";

const USER_ID = "dev-user";

function scoreToMasteryLevel(score: number): MasteryLevel {
  const pct = (score / 10) * 100;
  if (pct >= 80) return "proficient";
  if (pct >= 50) return "familiar";
  if (pct >= 20) return "learning";
  return "not_started";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: topicId } = await params;

  try {
    const { attemptId, answers } = await request.json();

    // Validate exactly 10 answers
    if (!Array.isArray(answers) || answers.length !== 10) {
      return NextResponse.json(
        { error: "Exactly 10 answers are required", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    // Look up QuizAttempt
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "Quiz attempt not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (attempt.status !== "in_progress") {
      return NextResponse.json(
        { error: "Quiz attempt already completed", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    // Extract reference answers from stored questions
    const questions = attempt.questions as Array<{
      question: string;
      referenceAnswer: string;
      lessonTitle: string;
    }>;

    // Build grading prompt
    const gradingData = questions.map((q, i) => ({
      questionIndex: i,
      question: q.question,
      referenceAnswer: q.referenceAnswer,
      studentAnswer: answers[i],
    }));

    const response = await anthropic.messages.create({
      model: GRADING_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Grade these short-answer responses. Compare each student answer against the reference answer. Be fair but accurate — accept answers that demonstrate understanding even if worded differently.

${JSON.stringify(gradingData, null, 2)}

Return JSON array: [{ "questionIndex": 0, "correct": true/false, "feedback": "brief explanation", "suggestedReview": "topic to review if wrong" }]

Return ONLY the JSON array, no other text.`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Failed to grade quiz", code: "GRADING_ERROR" },
        { status: 500 }
      );
    }

    const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse grading results", code: "PARSE_ERROR" },
        { status: 500 }
      );
    }

    const feedback = JSON.parse(jsonMatch[0]) as Array<{
      questionIndex: number;
      correct: boolean;
      feedback: string;
      suggestedReview: string;
    }>;

    const score = feedback.filter((f) => f.correct).length;
    const masteryLevel = scoreToMasteryLevel(score);

    // Upsert TopicMastery
    await prisma.topicMastery.upsert({
      where: {
        userId_topicId: { userId: USER_ID, topicId },
      },
      update: {
        masteryLevel,
        lastAssessedAt: new Date(),
      },
      create: {
        userId: USER_ID,
        topicId,
        masteryLevel,
        lastAssessedAt: new Date(),
      },
    });

    // Update QuizAttempt
    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: "completed",
        answers,
        score,
        feedback,
      },
    });

    return NextResponse.json({
      score,
      totalQuestions: 10,
      masteryLevel,
      feedback,
    });
  } catch (error) {
    console.error("Quiz grading error:", error);
    return NextResponse.json(
      { error: "Failed to grade quiz", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
