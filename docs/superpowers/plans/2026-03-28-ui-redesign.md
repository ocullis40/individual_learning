# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Adaptive Learning Platform with a card-based modular design system, dark mode, client-side search, and consistent layouts across all pages.

**Architecture:** CSS custom properties define all visual tokens (colors, radius, spacing). A `.dark` class on `<html>` swaps token values for dark mode. Every content section is a card component. Sidebar is removed — navigation via breadcrumbs and a searchable topics page. Chat becomes an overlay drawer.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS 4, CSS custom properties

---

## File Structure

```
src/
  app/
    globals.css              — Modify: CSS custom properties, remove !important overrides
    layout.tsx               — Modify: header redesign, add ThemeToggle, max-w-5xl
    page.tsx                 — Modify: home page with search bar
    topics/
      page.tsx               — Modify: server/client split, search, card grid
      [id]/
        page.tsx             — Modify: remove sidebar, card-based layout
    lessons/
      [id]/
        page.tsx             — Modify: remove sidebar, remove mr-[450px], full width
    admin/
      lessons/
        page.tsx             — Modify: card-based form styling
  components/
    Card.tsx                 — Create: reusable card wrapper component
    SearchBar.tsx            — Create: search input component
    ThemeToggle.tsx          — Create: dark mode toggle component
    TopicSidebar.tsx         — Delete
    TopicCard.tsx            — Modify: card-based redesign
    LessonCard.tsx           — Modify: card-based redesign
    ChatPanel.tsx            — Modify: overlay drawer instead of reserved space
    QuizPanel.tsx            — Modify: wrap in card, use design tokens
    LessonContent.tsx        — Modify: add dark:prose-invert
    TopicListClient.tsx      — Create: client component for topic filtering
```

---

### Task 1: Design system foundation — CSS custom properties and globals

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace globals.css with design tokens**

Replace the entire `globals.css` with:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@custom-variant dark (&:is(.dark *));

:root {
  --color-accent: #2563eb;
  --color-bg: #f9fafb;
  --color-surface: #ffffff;
  --color-text: #111827;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;
  --radius: 8px;
}

html.dark {
  --color-accent: #3b82f6;
  --color-bg: #111827;
  --color-surface: #1f2937;
  --color-text: #f9fafb;
  --color-text-secondary: #9ca3af;
  --color-border: #374151;
}

html {
  background-color: var(--color-bg);
  color: var(--color-text);
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: Arial, Helvetica, sans-serif;
  min-height: 100vh;
}
```

- [ ] **Step 2: Verify the dev server renders without errors**

Run: `curl -s http://localhost:3000 | head -20`
Expected: HTML output without errors. Page background should be light gray (#f9fafb).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add CSS custom properties for design system with dark mode tokens"
```

---

### Task 2: Create Card component

**Files:**
- Create: `src/components/Card.tsx`

- [ ] **Step 1: Create the Card component**

```tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}

export function Card({ children, className = "", interactive = false }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 ${
        interactive ? "transition-shadow hover:shadow-md" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify file exists**

Run: `head -5 src/components/Card.tsx`
Expected: Shows the interface definition.

- [ ] **Step 3: Commit**

```bash
git add src/components/Card.tsx
git commit -m "feat: add reusable Card component with design tokens"
```

---

### Task 3: Create ThemeToggle component and wire into header

**Files:**
- Create: `src/components/ThemeToggle.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create ThemeToggle component**

```tsx
"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
    >
      {dark ? (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Update layout.tsx header**

Replace the entire `layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Adaptive Learning Platform",
  description: "Learn at your own pace with personalized lessons",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('theme') === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
        <header className="border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
              Adaptive Learning
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/topics" className="transition-colors hover:text-[var(--color-accent)]" style={{ color: "var(--color-text-secondary)" }}>
                Topics
              </Link>
              <Link href="/admin/lessons" className="transition-colors hover:text-[var(--color-accent)]" style={{ color: "var(--color-text-secondary)" }}>
                Admin
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
```

Note: The inline `<script>` in `<head>` prevents a flash of wrong theme on page load by setting the `.dark` class before React hydrates.

- [ ] **Step 3: Verify in browser**

Open http://localhost:3000. Verify:
- Header renders with light background
- Dark mode toggle button appears in top-right nav
- Clicking toggle switches to dark mode (dark background, light text)
- Refreshing page preserves the dark mode preference

- [ ] **Step 4: Commit**

```bash
git add src/components/ThemeToggle.tsx src/app/layout.tsx
git commit -m "feat: add ThemeToggle and redesign header with design tokens"
```

---

### Task 4: Create SearchBar component

**Files:**
- Create: `src/components/SearchBar.tsx`

- [ ] **Step 1: Create SearchBar component**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SearchBarProps {
  /** If provided, filters client-side instead of navigating */
  onSearch?: (query: string) => void;
  /** Initial value for the input */
  defaultValue?: string;
  /** Placeholder text */
  placeholder?: string;
}

export function SearchBar({
  onSearch,
  defaultValue = "",
  placeholder = "Search topics...",
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSearch) {
      router.push(`/topics?q=${encodeURIComponent(query)}`);
    }
  };

  const handleChange = (value: string) => {
    setQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[var(--radius)] border py-3 pl-10 pr-4 text-base outline-none transition-colors focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text)",
        }}
      />
    </form>
  );
}
```

- [ ] **Step 2: Verify file exists**

Run: `head -5 src/components/SearchBar.tsx`
Expected: Shows "use client" directive and imports.

- [ ] **Step 3: Commit**

```bash
git add src/components/SearchBar.tsx
git commit -m "feat: add SearchBar component with navigate and filter modes"
```

---

### Task 5: Redesign TopicCard component

**Files:**
- Modify: `src/components/TopicCard.tsx`

- [ ] **Step 1: Rewrite TopicCard as a proper card**

```tsx
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
```

- [ ] **Step 2: Verify by loading a topics page**

Open http://localhost:3000/topics. Topic cards should have borders, padding, and hover shadow.

- [ ] **Step 3: Commit**

```bash
git add src/components/TopicCard.tsx
git commit -m "feat: redesign TopicCard with card-based styling"
```

---

### Task 6: Redesign LessonCard component

**Files:**
- Modify: `src/components/LessonCard.tsx`

- [ ] **Step 1: Rewrite LessonCard as a card**

```tsx
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
```

- [ ] **Step 2: Verify on a topic detail page**

Open a topic with lessons. Lesson cards should show number badge, title, and chevron.

- [ ] **Step 3: Commit**

```bash
git add src/components/LessonCard.tsx
git commit -m "feat: redesign LessonCard with card styling and chevron"
```

---

### Task 7: Redesign Home Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Rewrite the home page**

```tsx
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
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:3000. Should show title, search bar, and "Browse All Topics" link. Typing in search and pressing Enter should navigate to `/topics?q=...`.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: redesign home page with search bar"
```

---

### Task 8: Redesign Topics List Page with search

**Files:**
- Create: `src/components/TopicListClient.tsx`
- Modify: `src/app/topics/page.tsx`

- [ ] **Step 1: Create the client component for topic filtering**

```tsx
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
        <p style={{ color: "var(--color-text-secondary)" }}>No topics found matching "{query}"</p>
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
```

- [ ] **Step 2: Rewrite the topics page as a server/client split**

```tsx
import { prisma } from "@/lib/prisma";
import { TopicListClient } from "@/components/TopicListClient";

export default async function TopicsPage() {
  const topics = await prisma.topic.findMany({
    where: { parentTopicId: null },
    include: {
      childTopics: true,
      _count: { select: { lessons: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold" style={{ color: "var(--color-text)" }}>Topics</h1>
      <p className="mt-2" style={{ color: "var(--color-text-secondary)" }}>Choose a topic to start learning.</p>
      <div className="mt-8">
        <TopicListClient topics={JSON.parse(JSON.stringify(topics))} />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify search works**

Open http://localhost:3000/topics. Type in search box — topics should filter in real-time. Navigate from home page search — should pre-fill the query.

- [ ] **Step 4: Commit**

```bash
git add src/components/TopicListClient.tsx src/app/topics/page.tsx
git commit -m "feat: redesign topics page with search and card grid"
```

---

### Task 9: Redesign Topic Detail Page — remove sidebar

**Files:**
- Modify: `src/app/topics/[id]/page.tsx`

- [ ] **Step 1: Rewrite topic detail page without sidebar**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { TopicCard } from "@/components/TopicCard";
import { LessonCard } from "@/components/LessonCard";
import { QuizPanel } from "@/components/QuizPanel";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const topic = await prisma.topic.findUnique({
    where: { id },
    include: {
      parentTopic: true,
      childTopics: {
        include: {
          _count: { select: { lessons: true } },
          childTopics: true,
        },
        orderBy: { name: "asc" },
      },
      lessons: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!topic) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        <Link href="/topics" className="transition-colors hover:text-[var(--color-accent)]">
          Topics
        </Link>
        {topic.parentTopic && (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/topics/${topic.parentTopic.id}`}
              className="transition-colors hover:text-[var(--color-accent)]"
            >
              {topic.parentTopic.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span style={{ color: "var(--color-text)" }}>{topic.name}</span>
      </nav>

      {/* Header card */}
      <Card>
        <h1 className="text-3xl font-bold" style={{ color: "var(--color-text)" }}>{topic.name}</h1>
        <p className="mt-2" style={{ color: "var(--color-text-secondary)" }}>{topic.description}</p>
      </Card>

      {/* Subtopics */}
      {topic.childTopics.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold" style={{ color: "var(--color-text)" }}>Subtopics</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {topic.childTopics.map((child) => (
              <TopicCard
                key={child.id}
                id={child.id}
                name={child.name}
                description=""
                lessonCount={child._count.lessons}
                childTopicCount={child.childTopics.length}
              />
            ))}
          </div>
        </section>
      )}

      {/* Lessons */}
      {topic.lessons.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold" style={{ color: "var(--color-text)" }}>Lessons</h2>
          <div className="space-y-3">
            {topic.lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                id={lesson.id}
                title={lesson.title}
                order={lesson.order}
              />
            ))}
          </div>
        </section>
      )}

      {/* Quiz */}
      <div className="mt-8">
        <QuizPanel topicId={id} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify in browser**

Open a topic page. Should show:
- Breadcrumbs at top
- Title/description in a card
- Subtopics as card grid (if any)
- Lessons as card list
- No sidebar
- No layout shift between different topics

- [ ] **Step 3: Commit**

```bash
git add src/app/topics/[id]/page.tsx
git commit -m "feat: redesign topic detail page — remove sidebar, card-based layout"
```

---

### Task 10: Redesign Lesson Page — remove sidebar, full width

**Files:**
- Modify: `src/app/lessons/[id]/page.tsx`

- [ ] **Step 1: Rewrite lesson page without sidebar and reserved chat space**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { LessonContent } from "@/components/LessonContent";
import { ChatPanel } from "@/components/ChatPanel";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      topic: {
        include: { parentTopic: true },
      },
    },
  });

  if (!lesson) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        <Link href="/topics" className="transition-colors hover:text-[var(--color-accent)]">
          Topics
        </Link>
        {lesson.topic.parentTopic && (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/topics/${lesson.topic.parentTopic.id}`}
              className="transition-colors hover:text-[var(--color-accent)]"
            >
              {lesson.topic.parentTopic.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <Link
          href={`/topics/${lesson.topic.id}`}
          className="transition-colors hover:text-[var(--color-accent)]"
        >
          {lesson.topic.name}
        </Link>
        <span className="mx-2">/</span>
        <span style={{ color: "var(--color-text)" }}>{lesson.title}</span>
      </nav>

      {/* Lesson content */}
      <Card>
        <h1 className="mb-6 text-3xl font-bold" style={{ color: "var(--color-text)" }}>{lesson.title}</h1>
        <LessonContent content={lesson.content.replace(/^#\s+.+\n+/, "")} />
      </Card>

      {/* Chat */}
      <ChatPanel lessonId={id} />
    </main>
  );
}
```

- [ ] **Step 2: Verify in browser**

Open a lesson page. Should show:
- Full-width content in a card (no 450px right margin)
- No sidebar
- Chat floating button in bottom-right
- Breadcrumbs with full path

- [ ] **Step 3: Commit**

```bash
git add src/app/lessons/[id]/page.tsx
git commit -m "feat: redesign lesson page — remove sidebar, full width content"
```

---

### Task 11: Update LessonContent for dark mode

**Files:**
- Modify: `src/components/LessonContent.tsx`

- [ ] **Step 1: Add dark:prose-invert to the prose wrapper**

In `LessonContent.tsx`, find the `<article>` tag with the `prose` class and add `dark:prose-invert`:

Change:
```tsx
className="prose max-w-none prose-p:my-2 prose-headings:mt-6 prose-headings:mb-2 prose-ul:my-2 prose-li:my-0.5"
```

To:
```tsx
className="prose dark:prose-invert max-w-none prose-p:my-2 prose-headings:mt-6 prose-headings:mb-2 prose-ul:my-2 prose-li:my-0.5"
```

- [ ] **Step 2: Update ClickableVisual modal colors for dark mode**

In the `ClickableVisual` component inside `LessonContent.tsx`, update the modal's hardcoded colors:

- Modal backdrop: `bg-black/30` → keep as-is (works in both modes)
- Modal content container: change `bg-white` to `bg-[var(--color-surface)]`
- Close button: change `bg-white` to `bg-[var(--color-surface)]` and `text-gray-500 hover:bg-gray-100 hover:text-gray-700` to `text-[var(--color-text-secondary)] hover:text-[var(--color-text)]`
- The clickable wrapper border: change `border-gray-200` to `border-[var(--color-border)]` and `hover:border-blue-300` to `hover:border-[var(--color-accent)]`

- [ ] **Step 3: Verify dark mode renders lesson content correctly**

Open a lesson in dark mode. Verify:
- Prose text is light on dark background
- Clicking a diagram/SVG opens modal with dark background (not white)
- Close button is visible in dark mode

- [ ] **Step 4: Commit**

```bash
git add src/components/LessonContent.tsx
git commit -m "feat: add dark mode support to LessonContent prose and modal"
```

---

### Task 12: Redesign ChatPanel as overlay drawer

**Files:**
- Modify: `src/components/ChatPanel.tsx`

- [ ] **Step 1: Update the expanded drawer to overlay instead of push**

In `ChatPanel.tsx`, find the expanded state container. Change its positioning from a fixed panel that reserves space to an overlay with backdrop. The key changes:

1. Add a backdrop overlay when chat is open:
```tsx
{isOpen && (
  <div
    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
    onClick={() => setIsOpen(false)}
  />
)}
```

2. Change the expanded drawer container to:
```tsx
<div
  className={`fixed right-0 top-0 bottom-0 z-50 flex w-[420px] flex-col border-l transition-transform duration-200 ease-in-out ${
    isOpen ? "translate-x-0" : "translate-x-full"
  }`}
  style={{
    backgroundColor: "var(--color-surface)",
    borderColor: "var(--color-border)",
  }}
>
```

3. Update all interior colors (header, messages, input) to use design tokens (`var(--color-text)`, `var(--color-border)`, `var(--color-surface)`, etc.)

4. Update the floating button to use design tokens:
```tsx
style={{
  backgroundColor: "var(--color-surface)",
  borderColor: "var(--color-border)",
  color: "var(--color-text)",
}}
```

5. Remove the `isFullHeight` toggle — the new drawer is always full height.

6. Specific color mappings to update throughout the component:
   - `bg-white` → `bg-[var(--color-surface)]`
   - `border-gray-200` / `border-gray-300` → `border-[var(--color-border)]`
   - `text-gray-700` / `text-gray-800` → `text-[var(--color-text)]` or `style={{ color: "var(--color-text)" }}`
   - `text-gray-400` / `text-gray-500` → `text-[var(--color-text-secondary)]`
   - `bg-gray-100` (assistant messages) → `bg-[color-mix(in_srgb,var(--color-border)_30%,var(--color-surface))]` or a simple `dark:bg-gray-700` override
   - `hover:bg-gray-100` → `hover:bg-[var(--color-border)]`
   - `shadow-lg` / `shadow-2xl` → keep as-is (shadows work in both modes)
   - Keep `bg-blue-600` for user messages and send button (accent color works in both modes)

Note: Read the existing ChatPanel.tsx carefully and make targeted changes to the styling while preserving all the chat logic (message sending, streaming, history). Do NOT rewrite the component — only change the styling and layout behavior.

- [ ] **Step 2: Verify in browser**

Open a lesson page. Verify:
- Floating button visible at bottom-right
- Clicking opens drawer sliding in from right with backdrop
- Clicking backdrop closes drawer
- Lesson content stays full width (no layout shift)
- Chat works in both light and dark mode

- [ ] **Step 3: Commit**

```bash
git add src/components/ChatPanel.tsx
git commit -m "feat: convert ChatPanel to overlay drawer with design tokens"
```

---

### Task 13: Update QuizPanel with card styling

**Files:**
- Modify: `src/components/QuizPanel.tsx`

- [ ] **Step 1: Wrap QuizPanel in a Card and update colors**

In `QuizPanel.tsx`:
1. Import Card: `import { Card } from "./Card";`
2. Wrap the outermost container in a `<Card>` component
3. Update hardcoded colors to use design tokens:
   - `text-gray-*` → `style={{ color: "var(--color-text)" }}` or `var(--color-text-secondary)`
   - `border-gray-*` → `style={{ borderColor: "var(--color-border)" }}`
   - `bg-white` → remove (Card handles it)
   - Keep accent colors (blue, green, red) as-is — they work in both modes
4. Update the quiz question card interior `border-gray-200` to use `var(--color-border)`

Specific color mappings across all states:
   - `text-gray-900` → `style={{ color: "var(--color-text)" }}`
   - `text-gray-500` / `text-gray-600` / `text-gray-700` → `style={{ color: "var(--color-text-secondary)" }}`
   - `text-gray-400` → `style={{ color: "var(--color-text-secondary)" }}`
   - `border-gray-200` / `border-gray-100` / `border-gray-300` → `style={{ borderColor: "var(--color-border)" }}`
   - `bg-gray-50` / `bg-gray-100` → `style={{ backgroundColor: "var(--color-bg)" }}`
   - `bg-white` → remove (Card handles surface color)
   - `rounded-lg border border-gray-200 p-6` on quiz containers → replace with `<Card>` wrapper
   - Keep green (`text-green-600`), red (`text-red-500`), yellow (`bg-yellow-50`), and blue accent colors as-is

Note: Preserve all quiz logic. Only update styling to use design tokens and wrap in Card.

- [ ] **Step 2: Verify quiz works in both modes**

Open a topic page with the quiz. Verify it looks correct in light and dark mode. Take a quiz to verify functionality is preserved.

- [ ] **Step 3: Commit**

```bash
git add src/components/QuizPanel.tsx
git commit -m "feat: update QuizPanel with card wrapper and design tokens"
```

---

### Task 14: Redesign Admin Page

**Files:**
- Modify: `src/app/admin/lessons/page.tsx`

- [ ] **Step 1: Update admin page to use card-based design**

In `admin/lessons/page.tsx`:
1. Import Card: `import { Card } from "@/components/Card";`
2. Change the outer `<main>` container to `className="mx-auto max-w-5xl px-4 py-12"`
3. Wrap the form in `<div className="mx-auto max-w-2xl"><Card>...</Card></div>`
4. Update all hardcoded colors to use design tokens:
   - Form labels: `style={{ color: "var(--color-text-secondary)" }}`
   - Form inputs: `style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}`
   - Heading: `style={{ color: "var(--color-text)" }}`
5. Success state: add `style={{ borderLeft: "4px solid #16a34a" }}` to the Card
6. Error state: add `style={{ borderLeft: "4px solid #dc2626" }}` to the Card
7. Loading state: wrap spinner and message in a Card

7. The "new topic" inline form: change `bg-blue-50 border-blue-200` to `bg-[color-mix(in_srgb,var(--color-accent)_10%,var(--color-surface))] border-[var(--color-accent)]` and `text-blue-800` to `style={{ color: "var(--color-accent)" }}`
8. Specific color mappings across all states:
   - `text-gray-700` / `text-gray-900` → `style={{ color: "var(--color-text)" }}`
   - `text-gray-500` / `text-gray-600` → `style={{ color: "var(--color-text-secondary)" }}`
   - `border-gray-300` / `border-gray-200` → `style={{ borderColor: "var(--color-border)" }}`
   - `bg-green-50 border-green-200 text-green-800` (success) → keep green colors but add Card with green left border
   - `bg-red-50 border-red-200 text-red-800` (error) → keep red colors but add Card with red left border
   - Loading spinner: keep `border-blue-600` (accent works in both modes)

Note: Preserve all form logic, state management, and API calls. Only update styling.

- [ ] **Step 2: Verify in browser**

Open http://localhost:3000/admin/lessons. Verify:
- Form renders in a centered card
- All inputs are styled correctly in light and dark mode
- Generate a lesson to test loading/success/error states

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/lessons/page.tsx
git commit -m "feat: redesign admin page with card-based layout and design tokens"
```

---

### Task 15: Delete TopicSidebar and clean up

**Files:**
- Delete: `src/components/TopicSidebar.tsx`

- [ ] **Step 1: Verify TopicSidebar is no longer imported anywhere**

Run: `grep -r "TopicSidebar" src/`
Expected: No results (all imports were removed in Tasks 9 and 10).

- [ ] **Step 2: Delete the file**

```bash
rm src/components/TopicSidebar.tsx
```

- [ ] **Step 3: Run the dev server to verify no build errors**

Run: `curl -s http://localhost:3000 | head -5`
Expected: Valid HTML, no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete unused TopicSidebar component"
```

---

### Task 16: Visual verification pass

**Files:**
- No files modified. Manual verification only.

- [ ] **Step 1: Verify all pages in light mode**

Visit each page and verify card-based styling:
- http://localhost:3000 (home — search bar, title)
- http://localhost:3000/topics (topic grid with search)
- http://localhost:3000/topics/{id} (topic detail — no sidebar, cards)
- http://localhost:3000/lessons/{id} (lesson — full width, chat overlay)
- http://localhost:3000/admin/lessons (admin — centered card form)

- [ ] **Step 2: Verify all pages in dark mode**

Toggle dark mode and visit every page again. Verify:
- All text is readable (light on dark)
- Cards have dark background with visible borders
- Lesson content prose is inverted
- Chat panel works in dark mode
- Admin form is usable in dark mode

- [ ] **Step 3: Verify responsive behavior**

Resize browser to ~375px width. Verify:
- Topic card grids collapse to single column
- Lesson content is readable
- Chat overlay doesn't break layout
- No horizontal scrolling

- [ ] **Step 4: Test search flow end-to-end**

1. Go to home page, type "nuclear" in search, press Enter
2. Should navigate to `/topics?q=nuclear` with filtered results
3. Clear search — all topics should appear
4. Type partial match — should filter in real-time

- [ ] **Step 5: Push branch**

```bash
git push -u origin ui-redesign
```
