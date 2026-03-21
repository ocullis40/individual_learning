import Link from "next/link";

interface SidebarTopic {
  id: string;
  name: string;
  childTopics: { id: string; name: string }[];
}

interface TopicSidebarProps {
  topics: SidebarTopic[];
  currentTopicId?: string;
}

export function TopicSidebar({ topics, currentTopicId }: TopicSidebarProps) {
  return (
    <nav className="w-64 shrink-0">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Topics</h2>
      <ul className="mt-3 space-y-1">
        {topics.map((topic) => (
          <li key={topic.id}>
            <Link
              href={`/topics/${topic.id}`}
              className={`block rounded px-3 py-2 text-sm ${
                topic.id === currentTopicId
                  ? "bg-blue-50 font-medium text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {topic.name}
            </Link>
            {topic.childTopics.length > 0 && (
              <ul className="ml-4 mt-1 space-y-1">
                {topic.childTopics.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/topics/${child.id}`}
                      className={`block rounded px-3 py-1.5 text-sm ${
                        child.id === currentTopicId
                          ? "bg-blue-50 font-medium text-blue-700"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
