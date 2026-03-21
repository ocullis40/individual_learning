import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TopicSidebar } from "@/components/TopicSidebar";
import { LessonContent } from "@/components/LessonContent";
import { ChatPanel } from "@/components/ChatPanel";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [lesson, allTopics] = await Promise.all([
    prisma.lesson.findUnique({
      where: { id },
      include: {
        topic: {
          include: {
            parentTopic: true,
          },
        },
      },
    }),
    prisma.topic.findMany({
      where: { parentTopicId: null },
      include: { childTopics: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!lesson) {
    notFound();
  }

  return (
    <main className="mr-[450px] max-w-6xl py-12 pl-16 pr-4">
      <div className="flex gap-8">
        <TopicSidebar topics={allTopics} currentTopicId={lesson.topicId} />

        <div className="flex-1 min-w-0">
          {/* Breadcrumbs */}
          <nav className="mb-6 text-sm text-gray-500">
            <Link href="/topics" className="hover:text-gray-700">
              Topics
            </Link>
            {lesson.topic.parentTopic && (
              <>
                <span className="mx-2">/</span>
                <Link
                  href={`/topics/${lesson.topic.parentTopic.id}`}
                  className="hover:text-gray-700"
                >
                  {lesson.topic.parentTopic.name}
                </Link>
              </>
            )}
            <span className="mx-2">/</span>
            <Link
              href={`/topics/${lesson.topic.id}`}
              className="hover:text-gray-700"
            >
              {lesson.topic.name}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{lesson.title}</span>
          </nav>

          <h1 className="text-3xl font-bold">{lesson.title}</h1>
          <div className="mt-2 flex gap-4 text-sm text-gray-500">
            <span>Level {lesson.difficultyLevel}</span>
            <span>Lesson {lesson.order}</span>
          </div>

          <div className="mt-8">
            <LessonContent content={lesson.content} />
          </div>
        </div>
      </div>

      <ChatPanel lessonId={id} />
    </main>
  );
}
