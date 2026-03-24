import fs from "node:fs";
import path from "node:path";
import { openai } from "@/lib/openai";

interface GenerateImageInput {
  prompt: string;
  filename: string;
  lessonId: string;
}

interface GenerateImageResult {
  imagePath: string;
}

export const generateImage = {
  name: "generateImage",
  description:
    "Generate a realistic or artistic illustration using DALL-E. Use for scenes, photographs, or visuals that need photographic quality. NOT for diagrams or schematics.",
  inputSchema: {
    type: "object" as const,
    properties: {
      prompt: {
        type: "string",
        description: "The image generation prompt describing the desired illustration",
      },
      filename: {
        type: "string",
        description: "Filename for the saved image (without extension)",
      },
      lessonId: {
        type: "string",
        description: "The lesson ID to organize the image under",
      },
    },
    required: ["prompt", "filename", "lessonId"],
  },
  execute: async (input: GenerateImageInput): Promise<GenerateImageResult> => {
    if (/[/\\]|\.\./.test(input.lessonId) || /[/\\]|\.\./.test(input.filename)) {
      throw new Error("Invalid lessonId or filename: must not contain path separators or '..'");
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY is not set. Please add it to your environment variables to use image generation.",
      );
    }

    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: input.prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      });

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error("No image URL returned from DALL-E.");
      }

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`,
        );
      }

      const buffer = Buffer.from(await imageResponse.arrayBuffer());

      const dir = path.join(
        process.cwd(),
        "public/images/lessons",
        input.lessonId,
      );
      fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(dir, `${input.filename}.png`);
      fs.writeFileSync(filePath, buffer);

      const imagePath = `/images/lessons/${input.lessonId}/${input.filename}.png`;
      return { imagePath };
    } catch (error) {
      if (error instanceof Error && error.message.includes("OPENAI_API_KEY")) {
        throw error;
      }
      throw new Error(
        `Image generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
};
