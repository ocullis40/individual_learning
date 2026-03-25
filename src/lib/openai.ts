import OpenAI from "openai";

const globalForOpenAI = globalThis as unknown as {
  openai: OpenAI | undefined;
};

// Lazy-initialize so builds succeed without OPENAI_API_KEY in the environment.
// The key is only required at runtime when generateImage is actually called.
export function getOpenAI(): OpenAI {
  if (!globalForOpenAI.openai) {
    globalForOpenAI.openai = new OpenAI();
  }
  return globalForOpenAI.openai;
}

// Keep named export for backward compatibility (lazy via getter)
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    return Reflect.get(getOpenAI(), prop, receiver);
  },
});
