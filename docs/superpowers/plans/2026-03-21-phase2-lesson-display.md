# Phase 2: Basic Lesson Display — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the lesson display feature — Topic and Lesson database tables, seed data with nuclear energy content, API endpoints, and a web UI for browsing topics and reading lessons.

**Architecture:** Prisma 7 schema extension for Topic and Lesson models. Next.js App Router pages for topic browsing and lesson reading. Server-side data fetching. Markdown rendering for lesson content. Seed script generates nuclear energy content.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS, PostgreSQL, Prisma 7 (`@/generated/prisma/client`), Vitest, react-markdown

---

## File Structure

```
src/
├── app/
│   ├── topics/
│   │   ├── page.tsx                  # Topic listing page
│   │   └── [id]/
│   │       └── page.tsx              # Single topic with lesson list
│   ├── lessons/
│   │   └── [id]/
│   │       └── page.tsx              # Lesson display page
│   ├── layout.tsx                    # Updated with nav
│   └── page.tsx                      # Updated home page
├── components/
│   ├── TopicCard.tsx                 # Topic display card
│   ├── LessonCard.tsx               # Lesson list item
│   ├── LessonContent.tsx            # Markdown renderer for lesson
│   └── TopicSidebar.tsx             # Topic hierarchy navigation
├── lib/
│   └── prisma.ts                    # (existing)
prisma/
├── schema.prisma                    # Add Topic + Lesson models
├── seed.ts                          # Seed nuclear energy content
├── migrations/
│   └── YYYYMMDD_add_topics_lessons/ # New migration
tests/
├── lib/
│   └── prisma.test.ts               # (existing)
├── api/
│   ├── topics.test.ts               # Topic API tests
│   └── lessons.test.ts              # Lesson API tests
```

---

### Task 1: Add Topic and Lesson Models to Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Write failing test — Topic model exists**

Create `tests/models/schema.test.ts`:

```typescript
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Database schema", () => {
  const cleanupIds: { lessons: string[]; topics: string[] } = { lessons: [], topics: [] };

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { id: { in: cleanupIds.lessons } } });
    // Delete children first (order matters for FK constraints)
    await prisma.topic.deleteMany({ where: { id: { in: cleanupIds.topics } } });
  });

  it("can create and query a topic", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Test Topic", description: "A test topic" },
    });
    cleanupIds.topics.push(topic.id);
    expect(topic.id).toBeDefined();
    expect(topic.name).toBe("Test Topic");
  });

  it("can create a lesson linked to a topic", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Lesson Test Topic", description: "For lesson test" },
    });
    cleanupIds.topics.push(topic.id);
    const lesson = await prisma.lesson.create({
      data: {
        title: "Test Lesson",
        content: "# Hello\nThis is a test.",
        difficultyLevel: 1,
        order: 1,
        topicId: topic.id,
      },
    });
    cleanupIds.lessons.push(lesson.id);
    expect(lesson.id).toBeDefined();
    expect(lesson.topicId).toBe(topic.id);
  });

  it("supports self-referencing topic hierarchy", async () => {
    const parent = await prisma.topic.create({
      data: { name: "Parent Topic", description: "Parent" },
    });
    const child = await prisma.topic.create({
      data: { name: "Child Topic", description: "Child", parentTopicId: parent.id },
    });
    cleanupIds.topics.push(child.id, parent.id);
    const fetched = await prisma.topic.findUnique({
      where: { id: child.id },
      include: { parentTopic: true },
    });
    expect(fetched?.parentTopic?.id).toBe(parent.id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `prisma.topic` and `prisma.lesson` do not exist.

- [ ] **Step 3: Add Topic and Lesson models to Prisma schema**

Add to `prisma/schema.prisma` after the User model:

```prisma
model Topic {
  id            String   @id @default(cuid())
  name          String
  description   String
  parentTopicId String?  @map("parent_topic_id")
  parentTopic   Topic?   @relation("TopicHierarchy", fields: [parentTopicId], references: [id])
  childTopics   Topic[]  @relation("TopicHierarchy")
  lessons       Lesson[]
  createdAt     DateTime @default(now()) @map("created_at")

  @@map("topics")
}

model Lesson {
  id              String   @id @default(cuid())
  title           String
  content         String
  difficultyLevel Int      @map("difficulty_level")
  order           Int
  topicId         String   @map("topic_id")
  topic           Topic    @relation(fields: [topicId], references: [id])
  createdAt       DateTime @default(now()) @map("created_at")

  @@map("lessons")
}
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name add_topics_lessons
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass including the 3 new schema tests.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations tests/models/schema.test.ts
git commit -m "feat: add Topic and Lesson models with self-referencing hierarchy

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Create Seed Data with Nuclear Energy Content

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` — add prisma seed config

- [ ] **Step 1: Create seed script**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean existing data
  await prisma.lesson.deleteMany();
  await prisma.topic.deleteMany();

  // Create root topic
  const nuclearEnergy = await prisma.topic.create({
    data: {
      name: "Nuclear Energy",
      description: "An introduction to nuclear energy — how it works, its applications, and its role in the global energy landscape.",
    },
  });

  // Create subtopics
  const fission = await prisma.topic.create({
    data: {
      name: "Nuclear Fission",
      description: "The process of splitting heavy atomic nuclei to release energy.",
      parentTopicId: nuclearEnergy.id,
    },
  });

  const fusion = await prisma.topic.create({
    data: {
      name: "Nuclear Fusion",
      description: "The process of combining light atomic nuclei to release energy.",
      parentTopicId: nuclearEnergy.id,
    },
  });

  // Seed lessons
  await prisma.lesson.create({
    data: {
      title: "What is Nuclear Energy?",
      topicId: nuclearEnergy.id,
      difficultyLevel: 1,
      order: 1,
      content: `# What is Nuclear Energy?

Nuclear energy is the energy stored in the nucleus (core) of an atom. Atoms are the tiny particles that make up every object in the universe. The energy that holds the nucleus together is enormous — and when that energy is released, it can be harnessed to generate electricity.

## How Does It Work?

Nuclear energy is released through two processes:

- **Fission**: Splitting a heavy atom (like uranium-235) into smaller atoms. This is how all commercial nuclear power plants work today.
- **Fusion**: Combining two light atoms (like hydrogen isotopes) into a heavier atom. This is the process that powers the sun and is the focus of experimental reactors like ITER.

## Why Does It Matter?

Nuclear power generates about **10% of the world's electricity** and roughly **25% of all low-carbon electricity**. Unlike fossil fuels, nuclear plants produce virtually no greenhouse gas emissions during operation.

## Key Numbers

| Metric | Value |
|--------|-------|
| Global nuclear reactors | ~440 |
| Countries with nuclear power | 32 |
| Share of world electricity | ~10% |
| CO2 emissions during operation | Near zero |

## What You'll Learn

In this series, we'll cover:
1. How nuclear fission works (and why uranium is special)
2. How nuclear fusion works (and why it's so hard)
3. The history of nuclear power
4. Safety, waste, and public perception
5. The future of nuclear energy`,
    },
  });

  await prisma.lesson.create({
    data: {
      title: "How Nuclear Fission Works",
      topicId: fission.id,
      difficultyLevel: 1,
      order: 1,
      content: `# How Nuclear Fission Works

Nuclear fission is the process of splitting a heavy atomic nucleus into two or more lighter nuclei, releasing a large amount of energy in the process.

## The Chain Reaction

1. A **neutron** strikes a uranium-235 atom
2. The uranium nucleus becomes unstable and **splits** into two smaller atoms (fission products)
3. The split releases **2-3 additional neutrons** and a burst of energy
4. Those released neutrons strike other uranium atoms, causing more fissions
5. This self-sustaining process is called a **chain reaction**

## Why Uranium?

Not all atoms can undergo fission easily. Uranium-235 is **fissile**, meaning it can sustain a chain reaction with slow (thermal) neutrons. Natural uranium is only about **0.7% U-235** — the rest is U-238, which is not fissile. This is why uranium must be **enriched** (concentrated to 3-5% U-235) for use in most reactors.

## Energy Released

A single fission event releases about **200 MeV** (million electron volts) of energy. To put this in perspective:

- 1 kg of uranium fuel contains as much energy as **~2,700 tonnes of coal**
- A single uranium fuel pellet (the size of a pencil eraser) produces as much energy as **1 ton of coal** or **480 cubic meters of natural gas**

## Controlling the Reaction

In a nuclear reactor, the chain reaction must be carefully controlled:

- **Control rods** (made of boron or cadmium) absorb neutrons to slow or stop the reaction
- **Moderators** (water or graphite) slow neutrons down so they're more likely to cause fission
- **Coolant** (usually water) carries heat away from the reactor core to generate steam

The balance between neutron production and absorption is called **criticality**. A reactor at steady power is exactly critical — each fission causes exactly one more fission.`,
    },
  });

  await prisma.lesson.create({
    data: {
      title: "Nuclear Fusion: The Power of the Stars",
      topicId: fusion.id,
      difficultyLevel: 1,
      order: 1,
      content: `# Nuclear Fusion: The Power of the Stars

Nuclear fusion is the process that powers every star in the universe, including our Sun. It involves combining two light atomic nuclei to form a heavier nucleus, releasing enormous amounts of energy.

## How Fusion Works

1. Two hydrogen isotopes (**deuterium** and **tritium**) are heated to extreme temperatures (~150 million °C)
2. At these temperatures, atoms become **plasma** — a state where electrons are stripped from nuclei
3. The nuclei move fast enough to overcome their natural electrical repulsion
4. They **fuse** together, forming a helium nucleus, a neutron, and releasing **17.6 MeV** of energy

## Fusion vs. Fission

| Aspect | Fission | Fusion |
|--------|---------|--------|
| Process | Splitting heavy atoms | Combining light atoms |
| Fuel | Uranium, plutonium | Hydrogen isotopes |
| Waste | Long-lived radioactive waste | Minimal radioactive waste |
| Risk | Meltdown possible | No chain reaction risk |
| Status | Commercial since 1950s | Experimental |
| Energy per reaction | ~200 MeV | ~17.6 MeV |
| Energy per kg of fuel | Very high | Even higher |

## Why Is Fusion So Hard?

The fundamental challenge is **confinement**. To fuse, hydrogen plasma must be:

- Heated to **150 million degrees** (10x the core of the Sun)
- Held together long enough for fusion to occur
- Kept away from the reactor walls (plasma would melt any material)

Two main approaches are being pursued:

- **Magnetic confinement**: Using powerful magnetic fields to contain the plasma in a doughnut-shaped chamber called a **tokamak**. This is the approach used by ITER.
- **Inertial confinement**: Using powerful lasers to compress a tiny fuel pellet until fusion occurs. This is the approach used at the National Ignition Facility (NIF).

## The Promise of Fusion

If achieved, fusion energy would be transformative:

- **Virtually unlimited fuel** — deuterium can be extracted from seawater
- **No greenhouse gas emissions** during operation
- **Minimal long-lived radioactive waste**
- **No risk of meltdown** — the reaction stops if conditions aren't maintained
- Enough fuel in the ocean to power civilization for **billions of years**`,
    },
  });

  console.log("Seed data created successfully:");
  console.log(`  - 1 root topic: ${nuclearEnergy.name}`);
  console.log(`  - 2 subtopics: ${fission.name}, ${fusion.name}`);
  console.log(`  - 3 lessons seeded`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Add seed config to package.json**

Add to `package.json` at the root level (not inside scripts):

```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

Also install tsx as a dev dependency:

```bash
npm install tsx --save-dev
```

- [ ] **Step 3: Run the seed**

```bash
npx prisma db seed
```

Expected: Output showing 1 root topic, 2 subtopics, 3 lessons created.

- [ ] **Step 4: Verify data exists**

```bash
npx prisma studio
```

Check that topics and lessons tables have data. Or run:

```bash
psql -d individual_learning_dev -c "SELECT id, name FROM topics;"
psql -d individual_learning_dev -c "SELECT id, title, topic_id FROM lessons;"
```

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts package.json package-lock.json
git commit -m "feat: add seed script with nuclear energy lesson content

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Build Topic and Lesson API Routes

**Files:**
- Create: `src/app/api/topics/route.ts`
- Create: `src/app/api/topics/[id]/route.ts`
- Create: `src/app/api/lessons/[id]/route.ts`
- Create: `tests/api/topics.test.ts`
- Create: `tests/api/lessons.test.ts`

- [ ] **Step 1: Write failing tests for topic API**

Create `tests/api/topics.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Topics API logic", () => {
  let topicId: string;
  let childTopicId: string;
  let lessonId: string;

  beforeAll(async () => {
    const topic = await prisma.topic.create({
      data: { name: "API Test Topic", description: "For API testing" },
    });
    topicId = topic.id;

    const child = await prisma.topic.create({
      data: { name: "API Child Topic", description: "Child", parentTopicId: topic.id },
    });
    childTopicId = child.id;

    const lesson = await prisma.lesson.create({
      data: {
        title: "API Test Lesson",
        content: "# Test",
        difficultyLevel: 1,
        order: 1,
        topicId: topic.id,
      },
    });
    lessonId = lesson.id;
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { topicId } });
    await prisma.topic.deleteMany({ where: { parentTopicId: topicId } });
    await prisma.topic.delete({ where: { id: topicId } });
  });

  it("lists top-level topics (no parent)", async () => {
    const topics = await prisma.topic.findMany({
      where: { parentTopicId: null },
    });
    expect(topics.length).toBeGreaterThan(0);
    expect(topics.every((t) => t.parentTopicId === null)).toBe(true);
  });

  it("gets a topic with subtopics and lessons", async () => {
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        childTopics: true,
        lessons: { orderBy: { order: "asc" } },
      },
    });
    expect(topic).not.toBeNull();
    expect(topic!.childTopics.length).toBe(1);
    expect(topic!.lessons.length).toBe(1);
  });
});
```

- [ ] **Step 2: Write failing tests for lesson API**

Create `tests/api/lessons.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Lessons API logic", () => {
  let topicId: string;
  let lessonId: string;

  beforeAll(async () => {
    const topic = await prisma.topic.create({
      data: { name: "Lesson API Test", description: "For lesson testing" },
    });
    topicId = topic.id;

    const lesson = await prisma.lesson.create({
      data: {
        title: "Lesson API Test Lesson",
        content: "# Content\nSome markdown content.",
        difficultyLevel: 1,
        order: 1,
        topicId: topic.id,
      },
    });
    lessonId = lesson.id;
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { topicId } });
    await prisma.topic.delete({ where: { id: topicId } });
  });

  it("gets a lesson by ID with topic info", async () => {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { topic: true },
    });
    expect(lesson).not.toBeNull();
    expect(lesson!.title).toBe("Lesson API Test Lesson");
    expect(lesson!.topic.name).toBe("Lesson API Test");
  });

  it("returns null for non-existent lesson", async () => {
    const lesson = await prisma.lesson.findUnique({
      where: { id: "nonexistent-id" },
    });
    expect(lesson).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they pass** (these test the data layer, not HTTP)

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Create GET /api/topics route**

Create `src/app/api/topics/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const topics = await prisma.topic.findMany({
      where: { parentTopicId: null },
      include: {
        childTopics: true,
        _count: { select: { lessons: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(topics);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch topics", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Create GET /api/topics/[id] route**

Create `src/app/api/topics/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const topic = await prisma.topic.findUnique({
      where: { id },
      include: {
        childTopics: true,
        lessons: { orderBy: { order: "asc" } },
        parentTopic: true,
      },
    });

    if (!topic) {
      return NextResponse.json(
        { error: "Topic not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(topic);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch topic", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 6: Create GET /api/lessons/[id] route**

Create `src/app/api/lessons/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        topic: {
          include: { parentTopic: true },
        },
        // TODO: include quiz ID when Quiz model is added (Phase 3)
      },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(lesson);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch lesson", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/ tests/api/
git commit -m "feat: add API routes for topics and lessons

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Build Topic Listing Page

**Files:**
- Create: `src/app/topics/page.tsx`
- Create: `src/components/TopicCard.tsx`
- Modify: `src/app/page.tsx` — redirect or link to topics

- [ ] **Step 1: Create TopicCard component**

Create `src/components/TopicCard.tsx`:

```tsx
import Link from "next/link";

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
      <div className="rounded-lg border border-gray-200 p-6 hover:border-blue-500 hover:shadow-md transition-all">
        <h2 className="text-xl font-semibold">{name}</h2>
        <p className="mt-2 text-gray-600">{description}</p>
        <div className="mt-4 flex gap-4 text-sm text-gray-500">
          {childTopicCount > 0 && <span>{childTopicCount} subtopics</span>}
          <span>{lessonCount} lessons</span>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Create topic listing page**

Create `src/app/topics/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import { TopicCard } from "@/components/TopicCard";

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
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">Topics</h1>
      <p className="mt-2 text-gray-600">Choose a topic to start learning.</p>
      <div className="mt-8 grid gap-4">
        {topics.map((topic) => (
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
    </main>
  );
}
```

- [ ] **Step 3: Update home page to link to topics**

Replace `src/app/page.tsx`:

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Adaptive Learning Platform</h1>
      <p className="mt-4 text-lg text-gray-600">Learn at your own pace with personalized lessons.</p>
      <Link
        href="/topics"
        className="mt-8 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
      >
        Start Learning
      </Link>
    </main>
  );
}
```

- [ ] **Step 4: Verify build and test**

```bash
npm run build && npm test
```

Expected: Both pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/topics/ src/components/TopicCard.tsx
git commit -m "feat: add topic listing page with TopicCard component

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Build Topic Detail and Lesson Display Pages

**Files:**
- Create: `src/app/topics/[id]/page.tsx`
- Create: `src/app/lessons/[id]/page.tsx`
- Create: `src/components/LessonCard.tsx`
- Create: `src/components/LessonContent.tsx`
- Create: `src/components/TopicSidebar.tsx`

- [ ] **Step 1: Install dependencies for lesson rendering**

```bash
npm install react-markdown @tailwindcss/typography
```

- [ ] **Step 2: Create LessonCard component**

Create `src/components/LessonCard.tsx`:

```tsx
import Link from "next/link";

interface LessonCardProps {
  id: string;
  title: string;
  order: number;
  difficultyLevel: number;
}

export function LessonCard({ id, title, order, difficultyLevel }: LessonCardProps) {
  return (
    <Link href={`/lessons/${id}`} className="block">
      <div className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 hover:border-blue-500 hover:shadow-sm transition-all">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
          {order}
        </span>
        <div>
          <h3 className="font-medium">{title}</h3>
          <span className="text-sm text-gray-500">Level {difficultyLevel}</span>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Create TopicSidebar component**

Create `src/components/TopicSidebar.tsx`:

```tsx
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
```

- [ ] **Step 4: Create LessonContent component**

Create `src/components/LessonContent.tsx`:

```tsx
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
```

- [ ] **Step 5: Create topic detail page**

Create `src/app/topics/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TopicSidebar } from "@/components/TopicSidebar";
import { LessonCard } from "@/components/LessonCard";

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [topic, allTopics] = await Promise.all([
    prisma.topic.findUnique({
      where: { id },
      include: {
        childTopics: true,
        lessons: { orderBy: { order: "asc" } },
        parentTopic: true,
      },
    }),
    prisma.topic.findMany({
      where: { parentTopicId: null },
      include: { childTopics: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!topic) notFound();

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-12">
      <TopicSidebar topics={allTopics} currentTopicId={id} />
      <main className="flex-1">
        {topic.parentTopic && (
          <p className="text-sm text-gray-500">
            {topic.parentTopic.name} &rsaquo;
          </p>
        )}
        <h1 className="text-3xl font-bold">{topic.name}</h1>
        <p className="mt-2 text-gray-600">{topic.description}</p>

        {topic.childTopics.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Subtopics</h2>
            <div className="mt-4 grid gap-3">
              {topic.childTopics.map((child) => (
                <Link
                  key={child.id}
                  href={`/topics/${child.id}`}
                  className="block rounded-lg border border-gray-200 p-4 hover:border-blue-500 transition-colors"
                >
                  <h3 className="font-medium">{child.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{child.description}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {topic.lessons.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Lessons</h2>
            <div className="mt-4 grid gap-3">
              {topic.lessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  id={lesson.id}
                  title={lesson.title}
                  order={lesson.order}
                  difficultyLevel={lesson.difficultyLevel}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Create lesson display page**

Create `src/app/lessons/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LessonContent } from "@/components/LessonContent";
import { TopicSidebar } from "@/components/TopicSidebar";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [lesson, allTopics] = await Promise.all([
    prisma.lesson.findUnique({
      where: { id },
      include: {
        topic: { include: { parentTopic: true } },
      },
    }),
    prisma.topic.findMany({
      where: { parentTopicId: null },
      include: { childTopics: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!lesson) notFound();

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-12">
      <TopicSidebar topics={allTopics} currentTopicId={lesson.topicId} />
      <main className="flex-1">
        <nav className="text-sm text-gray-500">
          {lesson.topic.parentTopic && (
            <>
              <Link href={`/topics/${lesson.topic.parentTopic.id}`} className="hover:underline">
                {lesson.topic.parentTopic.name}
              </Link>
              {" \u203A "}
            </>
          )}
          <Link href={`/topics/${lesson.topic.id}`} className="hover:underline">
            {lesson.topic.name}
          </Link>
        </nav>
        <h1 className="mt-2 text-3xl font-bold">{lesson.title}</h1>
        <div className="mt-8">
          <LessonContent content={lesson.content} />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 7: Verify build and tests**

```bash
npm run build && npm test
```

Expected: Both pass.

- [ ] **Step 8: Commit**

```bash
git add src/app/topics/ src/app/lessons/ src/components/ package.json package-lock.json
git commit -m "feat: add topic detail and lesson display pages with sidebar navigation

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Update Layout with Navigation

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update root layout with a simple nav bar**

Update `src/app/layout.tsx` to include a header:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-xl font-bold">
              Adaptive Learning
            </Link>
            <nav className="flex gap-6">
              <Link href="/topics" className="text-gray-600 hover:text-gray-900">
                Topics
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Add typography plugin to Tailwind config**

If using Tailwind v4 with CSS-based config, add to `src/app/globals.css`:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

If using `tailwind.config.ts`, add to plugins array:

```typescript
plugins: [require("@tailwindcss/typography")],
```

Note: `@tailwindcss/typography` was already installed in Task 5.

- [ ] **Step 3: Verify build and tests**

```bash
npm run build && npm test
```

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css package.json package-lock.json
git commit -m "feat: add navigation header and typography plugin for lesson rendering

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

Verify in browser:
1. `http://localhost:3000` — Home page with "Start Learning" button
2. Click "Start Learning" — Topics page shows "Nuclear Energy"
3. Click "Nuclear Energy" — Topic detail shows subtopics (Fission, Fusion) and lesson
4. Click a lesson — Full markdown lesson content renders with sidebar navigation
5. Sidebar links work for navigating between topics

- [ ] **Step 5: Review commit history**

```bash
git log --oneline
```

Expected commits on `phase2-lesson-display` branch (newest first):
1. `feat: add navigation header and typography plugin`
2. `feat: add topic detail and lesson display pages with sidebar navigation`
3. `feat: add topic listing page with TopicCard component`
4. `feat: add API routes for topics and lessons`
5. `feat: add seed script with nuclear energy lesson content`
6. `feat: add Topic and Lesson models with self-referencing hierarchy`

Phase 2 is complete. The app now displays nuclear energy lessons with topic navigation.
