import Link from "next/link";
import { Card } from "./Card";

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
      <Card interactive>
        <h3 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>{name}</h3>
        {description && (
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>{description}</p>
        )}
        <div className="mt-3 flex gap-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {childTopicCount > 0 && <span>{childTopicCount} subtopics</span>}
          <span>{lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}</span>
        </div>
      </Card>
    </Link>
  );
}
