import Anthropic from "@anthropic-ai/sdk";

export const CHAT_MODEL = "claude-sonnet-4-6";
export const GRADING_MODEL = "claude-haiku-4-5-20251001";
export const MAX_LESSON_CHARS = 16000;
export const MAX_HISTORY_MESSAGES = 10;

const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

export const anthropic =
  globalForAnthropic.anthropic ?? new Anthropic();

if (process.env.NODE_ENV !== "production") {
  globalForAnthropic.anthropic = anthropic;
}
