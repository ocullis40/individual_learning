import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { LessonContent } from "@/components/LessonContent";
import { ChatPanel } from "@/components/ChatPanel";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      topic: {
        include: { parentTopic: true },
      },
    },
  });

  if (!lesson) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        <Link href="/topics" className="transition-colors hover:text-[var(--color-accent)]">
          Topics
        </Link>
        {lesson.topic.parentTopic && (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/topics/${lesson.topic.parentTopic.id}`}
              className="transition-colors hover:text-[var(--color-accent)]"
            >
              {lesson.topic.parentTopic.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <Link
          href={`/topics/${lesson.topic.id}`}
          className="transition-colors hover:text-[var(--color-accent)]"
        >
          {lesson.topic.name}
        </Link>
        <span className="mx-2">/</span>
        <span style={{ color: "var(--color-text)" }}>{lesson.title}</span>
      </nav>

      {/* Lesson content */}
      <Card>
        <h1 className="mb-6 text-3xl font-bold" style={{ color: "var(--color-text)" }}>{lesson.title}</h1>
        <LessonContent content={lesson.content.replace(/^#\s+.+\n+/, "")} />
      </Card>

      {/* Chat */}
      <ChatPanel lessonId={id} />
    </main>
  );
}
