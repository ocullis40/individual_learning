import { prisma } from "@/lib/prisma";
import { TopicCard } from "@/components/TopicCard";

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
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">Topics</h1>
      <p className="mt-2 text-gray-600">Choose a topic to start learning.</p>
      <div className="mt-8 grid gap-4">
        {topics.map((topic) => (
          <TopicCard
            key={topic.id}
            id={topic.id}
            name={topic.name}
            description={topic.description}
            lessonCount={topic._count.lessons}
            childTopicCount={topic.childTopics.length}
          />
        ))}
      </div>
    </main>
  );
}
