import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { wouldCreateCycle } from "@/lib/topics";

describe("wouldCreateCycle", () => {
  const cleanupIds: string[] = [];

  afterAll(async () => {
    // Delete in reverse order (children first)
    for (const id of cleanupIds.reverse()) {
      await prisma.topic.delete({ where: { id } }).catch(() => {});
    }
  });

  it("returns false when setting parent to null", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Cycle Test Root", description: "test" },
    });
    cleanupIds.push(topic.id);

    expect(await wouldCreateCycle(topic.id, null)).toBe(false);
  });

  it("returns false for a valid parent-child relationship", async () => {
    const parent = await prisma.topic.create({
      data: { name: "Valid Parent", description: "test" },
    });
    const child = await prisma.topic.create({
      data: { name: "Valid Child", description: "test", parentTopicId: parent.id },
    });
    cleanupIds.push(child.id, parent.id);

    // Setting child's parent to parent is fine (already the case)
    expect(await wouldCreateCycle(child.id, parent.id)).toBe(false);
  });

  it("detects a direct cycle (A -> B -> A)", async () => {
    const a = await prisma.topic.create({
      data: { name: "Cycle A", description: "test" },
    });
    const b = await prisma.topic.create({
      data: { name: "Cycle B", description: "test", parentTopicId: a.id },
    });
    cleanupIds.push(b.id, a.id);

    // Trying to make A's parent be B would create A -> B -> A
    expect(await wouldCreateCycle(a.id, b.id)).toBe(true);
  });

  it("detects an indirect cycle (A -> B -> C -> A)", async () => {
    const a = await prisma.topic.create({
      data: { name: "Indirect A", description: "test" },
    });
    const b = await prisma.topic.create({
      data: { name: "Indirect B", description: "test", parentTopicId: a.id },
    });
    const c = await prisma.topic.create({
      data: { name: "Indirect C", description: "test", parentTopicId: b.id },
    });
    cleanupIds.push(c.id, b.id, a.id);

    // Trying to make A's parent be C would create A -> C -> B -> A
    expect(await wouldCreateCycle(a.id, c.id)).toBe(true);
  });

  it("returns true when trying to set a topic as its own parent", async () => {
    const topic = await prisma.topic.create({
      data: { name: "Self Parent", description: "test" },
    });
    cleanupIds.push(topic.id);

    expect(await wouldCreateCycle(topic.id, topic.id)).toBe(true);
  });
});
