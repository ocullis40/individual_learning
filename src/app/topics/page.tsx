import { prisma } from "@/lib/prisma";
import { TopicListClient } from "@/components/TopicListClient";

export default async function TopicsPage() {
  const topics = await prisma.topic.findMany({
    where: { parentTopicId: null },
    include: {
      childTopics: true,
      _count: { select: { lessons: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold" style={{ color: "var(--color-text)" }}>Topics</h1>
      <p className="mt-2" style={{ color: "var(--color-text-secondary)" }}>Choose a topic to start learning.</p>
      <div className="mt-8">
        <TopicListClient topics={JSON.parse(JSON.stringify(topics))} />
      </div>
    </main>
  );
}
