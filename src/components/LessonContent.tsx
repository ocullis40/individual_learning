import ReactMarkdown from "react-markdown";

interface LessonContentProps {
  content: string;
}

export function LessonContent({ content }: LessonContentProps) {
  return (
    <article className="prose prose-lg max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </article>
  );
}
