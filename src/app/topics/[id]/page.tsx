import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TopicSidebar } from "@/components/TopicSidebar";
import { TopicCard } from "@/components/TopicCard";
import { LessonCard } from "@/components/LessonCard";
import { QuizPanel } from "@/components/QuizPanel";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [topic, allTopics] = await Promise.all([
    prisma.topic.findUnique({
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
    }),
    prisma.topic.findMany({
      where: { parentTopicId: null },
      include: { childTopics: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!topic) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex gap-8">
        <TopicSidebar topics={allTopics} currentTopicId={id} />

        <div className="flex-1 min-w-0">
          {/* Breadcrumbs */}
          <nav className="mb-6 text-sm text-gray-500">
            <Link href="/topics" className="hover:text-gray-700">
              Topics
            </Link>
            {topic.parentTopic && (
              <>
                <span className="mx-2">/</span>
                <Link
                  href={`/topics/${topic.parentTopic.id}`}
                  className="hover:text-gray-700"
                >
                  {topic.parentTopic.name}
                </Link>
              </>
            )}
            <span className="mx-2">/</span>
            <span className="text-gray-900">{topic.name}</span>
          </nav>

          <h1 className="text-3xl font-bold">{topic.name}</h1>
          <p className="mt-2 text-gray-600">{topic.description}</p>

          {/* Subtopics */}
          {topic.childTopics.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold">Subtopics</h2>
              <div className="mt-4 grid gap-4">
                {topic.childTopics.map((child) => (
                  <TopicCard
                    key={child.id}
                    id={child.id}
                    name={child.name}
                    description={""}
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
              <h2 className="text-xl font-semibold">Lessons</h2>
              <div className="mt-4 space-y-3">
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
          <QuizPanel topicId={id} />
        </div>
      </div>
    </main>
  );
}
