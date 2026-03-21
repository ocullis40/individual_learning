import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Prisma client", () => {
  it("connects to the database", async () => {
    const result = await prisma.$queryRaw<[{ result: number }]>`SELECT 1 as result`;
    expect(result[0].result).toBe(1);
  });

  it("can query the users table", async () => {
    const users = await prisma.user.findMany();
    expect(Array.isArray(users)).toBe(true);
  });
});
