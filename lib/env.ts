import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_PRIMARY_PROVIDER: z.enum(["openai", "anthropic"]).default("openai"),
  AI_PRIMARY_MODEL: z.string().default("gpt-4o"),
  AI_FALLBACK_PROVIDER: z.enum(["openai", "anthropic"]).default("anthropic"),
  AI_FALLBACK_MODEL: z.string().default("claude-sonnet-5"),
  AI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  AI_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
  PAYMENT_PROVIDER: z.enum(["stripe"]).default("stripe"),
  PAYMENT_SECRET_KEY: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_PAYMENT_PUBLIC_KEY: z.string().optional(),
  MAPS_PROVIDER: z.enum(["google"]).default("google"),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["console", "gmail"]).default("console"),
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

const parseResult = serverEnvSchema.safeParse(process.env);

if (!parseResult.success) {
  const errors = parseResult.error.flatten().fieldErrors;
  const message = Object.entries(errors)
    .map(([key, val]) => `  ${key}: ${val?.join(", ")}`)
    .join("\n");

  throw new Error(
    `\n❌ Invalid environment variables:\n${message}\n\nSee .env.example for required variables.\n`,
  );
}

export const env = parseResult.data;
