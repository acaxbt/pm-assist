import { z } from "zod";

const schema = z.object({
  NEXTAUTH_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(1),

  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  ALLOWED_EMAIL_DOMAINS: z.string().default("detik.com"),

  DATABASE_URL: z.string().url(),

  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_MODEL_DEFAULT: z.string().default("google/gemini-3-flash-preview"),
  OPENROUTER_MODEL_PREMIUM: z.string().default("anthropic/claude-sonnet-4.6"),
  OPENROUTER_SITE_URL: z.string().url().optional(),
  OPENROUTER_SITE_NAME: z.string().optional(),

  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  PLANE_BASE_URL: z.string().url().default("https://api.plane.so"),
  PLANE_WORKSPACE_SLUG: z.string().optional(),
  PLANE_API_TOKEN: z.string().optional(),
});

export const env = schema.parse(process.env);

export const allowedEmailDomains = env.ALLOWED_EMAIL_DOMAINS
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);
