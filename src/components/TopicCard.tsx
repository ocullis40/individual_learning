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
      <div className="py-3 hover:text-blue-600 transition-colors">
        <h2 className="text-lg font-medium">{name}</h2>
        {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
        <div className="mt-1 flex gap-4 text-sm text-gray-400">
          {childTopicCount > 0 && <span>{childTopicCount} subtopics</span>}
          <span>{lessonCount} lessons</span>
        </div>
      </div>
    </Link>
  );
}
