import { z } from "zod";

export const createPromptTemplateSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9_]*$/, "Key must be lowercase snake_case (e.g. diagnostic_reasoning)"),
  description: z.string().max(500).optional(),
});
export type CreatePromptTemplateInput = z.infer<typeof createPromptTemplateSchema>;

export const createPromptVersionSchema = z.object({
  templateId: z.string().uuid(),
  content: z.string().min(1),
});
export type CreatePromptVersionInput = z.infer<typeof createPromptVersionSchema>;
