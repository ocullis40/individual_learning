import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { TopicCard } from "@/components/TopicCard";
import { LessonCard } from "@/components/LessonCard";
import { QuizPanel } from "@/components/QuizPanel";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const topic = await prisma.topic.findUnique({
    where: { id },
    include: {
      parentTopic: true,
      childTopics: {
        include: {
          _count: { select: { lessons: true } },
          childTopics: true,
        },
        orderBy: { name: "asc" },
      },
      lessons: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!topic) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        <Link href="/topics" className="transition-colors hover:text-[var(--color-accent)]">
          Topics
        </Link>
        {topic.parentTopic && (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/topics/${topic.parentTopic.id}`}
              className="transition-colors hover:text-[var(--color-accent)]"
            >
              {topic.parentTopic.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span style={{ color: "var(--color-text)" }}>{topic.name}</span>
      </nav>

      {/* Header card */}
      <Card>
        <h1 className="text-3xl font-bold" style={{ color: "var(--color-text)" }}>{topic.name}</h1>
        <p className="mt-2" style={{ color: "var(--color-text-secondary)" }}>{topic.description}</p>
      </Card>

      {/* Subtopics */}
      {topic.childTopics.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold" style={{ color: "var(--color-text)" }}>Subtopics</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {topic.childTopics.map((child) => (
              <TopicCard
                key={child.id}
                id={child.id}
                name={child.name}
                description=""
                lessonCount={child._count.lessons}
                childTopicCount={child.childTopics.length}
              />
            ))}
          </div>
        </section>
      )}

      {/* Lessons */}
      {topic.lessons.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold" style={{ color: "var(--color-text)" }}>Lessons</h2>
          <div className="space-y-3">
            {topic.lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                id={lesson.id}
                title={lesson.title}
                order={lesson.order}
              />
            ))}
          </div>
        </section>
      )}

      {/* Quiz */}
      <div className="mt-8">
        <QuizPanel topicId={id} />
      </div>
    </main>
  );
}
