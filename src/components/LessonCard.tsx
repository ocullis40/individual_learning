import Link from "next/link";

interface LessonCardProps {
  id: string;
  title: string;
  order: number;
}

export function LessonCard({ id, title, order }: LessonCardProps) {
  return (
    <Link href={`/lessons/${id}`} className="block">
      <div className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 hover:border-blue-500 hover:shadow-sm transition-all">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
          {order}
        </span>
        <h3 className="font-medium">{title}</h3>
      </div>
    </Link>
  );
}
