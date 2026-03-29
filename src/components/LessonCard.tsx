import Link from "next/link";
import { Card } from "./Card";

interface LessonCardProps {
  id: string;
  title: string;
  order: number;
}

export function LessonCard({ id, title, order }: LessonCardProps) {
  return (
    <Link href={`/lessons/${id}`} className="block">
      <Card interactive className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium"
            style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 15%, transparent)", color: "var(--color-accent)" }}
          >
            {order}
          </span>
          <h3 className="font-medium" style={{ color: "var(--color-text)" }}>{title}</h3>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5" style={{ color: "var(--color-text-secondary)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </Card>
    </Link>
  );
}
