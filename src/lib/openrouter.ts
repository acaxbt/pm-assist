import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "@/lib/env";

/**
 * OpenRouter client (OpenAI-compatible API).
 * Docs: https://openrouter.ai/docs
 */
export const openrouter = createOpenAICompatible({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: env.OPENROUTER_API_KEY,
  headers: {
    // Optional but recommended for OpenRouter app ranking
    ...(env.OPENROUTER_SITE_URL ? { "HTTP-Referer": env.OPENROUTER_SITE_URL } : {}),
    ...(env.OPENROUTER_SITE_NAME ? { "X-Title": env.OPENROUTER_SITE_NAME } : {}),
  },
});

export const MODELS = {
  default: env.OPENROUTER_MODEL_DEFAULT,
  premium: env.OPENROUTER_MODEL_PREMIUM,
} as const;
