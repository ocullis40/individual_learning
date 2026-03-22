"use client";

import { useState } from "react";

type QuizState = "idle" | "loading" | "taking" | "submitting" | "results" | "error";

interface Question {
  question: string;
  lessonTitle: string;
}

interface FeedbackItem {
  questionIndex: number;
  correct: boolean;
  feedback: string;
  suggestedReview?: string;
}

interface QuizResults {
  score: number;
  totalQuestions: number;
  masteryLevel: string;
  feedback: FeedbackItem[];
}

export function QuizPanel({ topicId }: { topicId: string }) {
  const [state, setState] = useState<QuizState>("idle");
  const [attemptId, setAttemptId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [results, setResults] = useState<QuizResults | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const reset = () => {
    setState("idle");
    setAttemptId("");
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setCurrentAnswer("");
    setResults(null);
    setErrorMessage("");
  };

  const handleStartQuiz = async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/topics/${topicId}/quiz/generate`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to generate quiz questions.");
      }
      const data = await res.json();
      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setAnswers([]);
      setCurrentIndex(0);
      setCurrentAnswer("");
      setState("taking");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setState("error");
    }
  };

  const handleNext = () => {
    const updatedAnswers = [...answers, currentAnswer.trim()];
    setAnswers(updatedAnswers);
    setCurrentAnswer("");

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      submitQuiz(updatedAnswers);
    }
  };

  const submitQuiz = async (finalAnswers: string[]) => {
    setState("submitting");
    try {
      const res = await fetch(`/api/topics/${topicId}/quiz/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, answers: finalAnswers }),
      });
      if (!res.ok) {
        throw new Error("Failed to grade quiz.");
      }
      const data: QuizResults = await res.json();
      setResults(data);
      setState("results");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong while grading."
      );
      setState("error");
    }
  };

  // Spinner component
  const Spinner = () => (
    <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
  );

  if (state === "idle") {
    return (
      <section className="mt-8">
        <button
          onClick={handleStartQuiz}
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Take Quiz
        </button>
      </section>
    );
  }

  if (state === "loading") {
    return (
      <section className="mt-8">
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-6">
          <Spinner />
          <span className="text-sm text-gray-600">Generating questions...</span>
        </div>
      </section>
    );
  }

  if (state === "taking") {
    const question = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;

    return (
      <section className="mt-8">
        <div className="rounded-lg border border-gray-200 p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <div className="h-2 flex-1 mx-4 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${((currentIndex + 1) / questions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-1">
            From: {question.lessonTitle}
          </p>
          <p className="text-base font-medium text-gray-900 mb-4">
            {question.question}
          </p>

          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Type your answer..."
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleNext}
              disabled={!currentAnswer.trim()}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLastQuestion ? "Submit Quiz" : "Next"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (state === "submitting") {
    return (
      <section className="mt-8">
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-6">
          <Spinner />
          <span className="text-sm text-gray-600">Grading your answers...</span>
        </div>
      </section>
    );
  }

  if (state === "results" && results) {
    return (
      <section className="mt-8">
        <div className="rounded-lg border border-gray-200 p-6">
          <div className="mb-6 text-center">
            <p className="text-2xl font-bold text-gray-900">
              You scored {results.score}/{results.totalQuestions}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Mastery level: <span className="font-medium">{results.masteryLevel}</span>
            </p>
          </div>

          <div className="space-y-4">
            {results.feedback.map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 text-lg leading-none ${item.correct ? "text-green-600" : "text-red-500"}`}>
                    {item.correct ? "\u2713" : "\u2717"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {questions[item.questionIndex]?.question}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      <span className="font-medium">Your answer:</span>{" "}
                      {answers[item.questionIndex]}
                    </p>
                    <p className="mt-1 text-sm text-gray-700">{item.feedback}</p>
                    {item.suggestedReview && (
                      <p className="mt-2 rounded bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                        Suggested review: {item.suggestedReview}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={reset}
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Error state
  return (
    <section className="mt-8">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{errorMessage}</p>
        <button
          onClick={reset}
          className="mt-3 rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    </section>
  );
}
