import Link from "next/link";

interface LessonCardProps {
  id: string;
  title: string;
  order: number;
}

export function LessonCard({ id, title, order }: LessonCardProps) {
  return (
    <Link href={`/lessons/${id}`} className="block">
      <div className="flex items-center gap-3 py-2 hover:text-blue-600 transition-colors">
        <span className="text-sm text-gray-400">{order}.</span>
        <h3 className="font-medium">{title}</h3>
      </div>
    </Link>
  );
}
