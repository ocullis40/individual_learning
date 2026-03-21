import Link from "next/link";

interface TopicCardProps {
  id: string;
  name: string;
  description: string;
  lessonCount: number;
  childTopicCount: number;
}

export function TopicCard({ id, name, description, lessonCount, childTopicCount }: TopicCardProps) {
  return (
    <Link href={`/topics/${id}`} className="block">
      <div className="rounded-lg border border-gray-200 p-6 hover:border-blue-500 hover:shadow-md transition-all">
        <h2 className="text-xl font-semibold">{name}</h2>
        <p className="mt-2 text-gray-600">{description}</p>
        <div className="mt-4 flex gap-4 text-sm text-gray-500">
          {childTopicCount > 0 && <span>{childTopicCount} subtopics</span>}
          <span>{lessonCount} lessons</span>
        </div>
      </div>
    </Link>
  );
}
