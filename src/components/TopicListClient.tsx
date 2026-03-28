"use client";

import { useSearchParams } from "next/navigation";
import { useState, useMemo, Suspense } from "react";
import { TopicCard } from "@/components/TopicCard";
import { SearchBar } from "@/components/SearchBar";

interface Topic {
  id: string;
  name: string;
  description: string;
  _count: { lessons: number };
  childTopics: unknown[];
}

function TopicListInner({ topics }: { topics: Topic[] }) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);

  const filtered = useMemo(() => {
    if (!query.trim()) return topics;
    const lower = query.toLowerCase();
    return topics.filter(
      (t) =>
        t.name.toLowerCase().includes(lower) ||
        t.description.toLowerCase().includes(lower)
    );
  }, [topics, query]);

  return (
    <>
      <div className="mb-8">
        <SearchBar onSearch={setQuery} defaultValue={initialQuery} />
      </div>
      {filtered.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)" }}>No topics found matching &ldquo;{query}&rdquo;</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((topic) => (
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
      )}
    </>
  );
}

export function TopicListClient({ topics }: { topics: Topic[] }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TopicListInner topics={topics} />
    </Suspense>
  );
}
