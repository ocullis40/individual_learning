"use client";

import { useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";

function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState("");
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: "neutral" });
    mermaid.render(idRef.current, code).then(({ svg }) => setSvg(svg));
  }, [code]);

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}

interface LessonContentProps {
  content: string;
}

export function LessonContent({ content }: LessonContentProps) {
  return (
    <article className="prose max-w-none prose-p:my-2 prose-headings:mt-6 prose-headings:mb-2 prose-ul:my-2 prose-li:my-0.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-mermaid/.exec(className || "");
            if (match) {
              return <MermaidDiagram code={String(children).trim()} />;
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
