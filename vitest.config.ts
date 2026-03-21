import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@/generated/prisma/client": path.resolve(__dirname, "./src/generated/prisma/client.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
