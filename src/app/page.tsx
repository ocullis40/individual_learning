import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-24">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-4xl font-bold" style={{ color: "var(--color-text)" }}>
          Adaptive Learning
        </h1>
        <p className="mt-3 text-lg" style={{ color: "var(--color-text-secondary)" }}>
          Learn at your own pace with personalized lessons
        </p>
        <div className="mt-8">
          <SearchBar placeholder="Search for a topic..." />
        </div>
        <Link
          href="/topics"
          className="mt-4 inline-block text-sm transition-colors hover:underline"
          style={{ color: "var(--color-accent)" }}
        >
          Browse All Topics
        </Link>
      </div>
    </main>
  );
}
