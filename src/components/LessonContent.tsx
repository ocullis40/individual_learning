"use client";

import { useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";

function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: "neutral" });
    mermaid.render(idRef.current, code).then(({ svg }) => setSvg(svg));
  }, [code]);

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="cursor-pointer rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-300 hover:shadow-md"
        title="Click to enlarge"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative rounded-2xl bg-white p-12 shadow-2xl"
            style={{ minWidth: "60vw", minHeight: "40vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 z-10 rounded-full bg-white p-2 text-gray-500 shadow hover:bg-gray-100 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div
              className="flex items-center justify-center [&_svg]:h-auto [&_svg]:max-h-[70vh] [&_svg]:w-auto [&_svg]:min-w-[50vw]"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>
      )}
    </>
  );
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
