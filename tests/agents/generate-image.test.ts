import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

const { mockImagesGenerate } = vi.hoisted(() => ({
  mockImagesGenerate: vi.fn(),
}));

vi.mock("@/lib/openai", () => ({
  openai: { images: { generate: mockImagesGenerate } },
}));

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    default: {
      ...actual,
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
    },
  };
});

import { generateImage } from "@/agents/tools/generate-image";

describe("generateImage", () => {
  const originalEnv = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    mockImagesGenerate.mockClear();
    vi.mocked(fs.mkdirSync).mockClear();
    vi.mocked(fs.writeFileSync).mockClear();
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.OPENAI_API_KEY = originalEnv;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
    vi.restoreAllMocks();
  });

  it("exports the correct tool shape", () => {
    expect(generateImage.name).toBe("generateImage");
    expect(generateImage.description).toBeDefined();
    expect(generateImage.inputSchema.type).toBe("object");
    expect(generateImage.inputSchema.required).toContain("prompt");
    expect(generateImage.inputSchema.required).toContain("filename");
    expect(generateImage.inputSchema.required).toContain("lessonId");
    expect(typeof generateImage.execute).toBe("function");
  });

  it("returns correct imagePath format", async () => {
    const fakeImageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mockImagesGenerate.mockResolvedValueOnce({
      data: [{ url: "https://example.com/image.png" }],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeImageBytes.buffer),
      }),
    );

    const result = await generateImage.execute({
      prompt: "A test image",
      filename: "test-image",
      lessonId: "lesson-123",
    });

    expect(result.imagePath).toBe(
      "/images/lessons/lesson-123/test-image.png",
    );
  });

  it("throws descriptive error when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(
      generateImage.execute({
        prompt: "A test image",
        filename: "test-image",
        lessonId: "lesson-123",
      }),
    ).rejects.toThrow("OPENAI_API_KEY is not set");
  });

  it("calls DALL-E 3 with correct parameters", async () => {
    const fakeImageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mockImagesGenerate.mockResolvedValueOnce({
      data: [{ url: "https://example.com/image.png" }],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeImageBytes.buffer),
      }),
    );

    await generateImage.execute({
      prompt: "A beautiful sunset",
      filename: "sunset",
      lessonId: "lesson-456",
    });

    expect(mockImagesGenerate).toHaveBeenCalledWith({
      model: "dall-e-3",
      prompt: "A beautiful sunset",
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });
  });

  it("creates directory recursively and saves file", async () => {
    const fakeImageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mockImagesGenerate.mockResolvedValueOnce({
      data: [{ url: "https://example.com/image.png" }],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeImageBytes.buffer),
      }),
    );

    await generateImage.execute({
      prompt: "Test",
      filename: "myfile",
      lessonId: "lesson-789",
    });

    const expectedDir = path.join(
      process.cwd(),
      "public/images/lessons",
      "lesson-789",
    );
    expect(fs.mkdirSync).toHaveBeenCalledWith(expectedDir, {
      recursive: true,
    });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(expectedDir, "myfile.png"),
      expect.any(Buffer),
    );
  });

  it("throws when image download fails", async () => {
    mockImagesGenerate.mockResolvedValueOnce({
      data: [{ url: "https://example.com/image.png" }],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      }),
    );

    await expect(
      generateImage.execute({
        prompt: "Test",
        filename: "test",
        lessonId: "lesson-1",
      }),
    ).rejects.toThrow("Failed to download image");
  });
});
