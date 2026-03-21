import { prisma } from "./prisma";

/**
 * Checks if setting newParentId as the parent of topicId would create a cycle.
 * Walks up the parent chain from newParentId — if we encounter topicId, it's a cycle.
 */
export async function wouldCreateCycle(
  topicId: string,
  newParentId: string | null
): Promise<boolean> {
  if (!newParentId) return false;

  let currentId: string | null = newParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === topicId) return true;
    if (visited.has(currentId)) return true; // already a cycle in the data
    visited.add(currentId);

    const topic = await prisma.topic.findUnique({
      where: { id: currentId },
      select: { parentTopicId: true },
    });
    currentId = topic?.parentTopicId ?? null;
  }

  return false;
}
