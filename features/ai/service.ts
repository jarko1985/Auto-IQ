import { ConflictError, NotFoundError } from "@/lib/errors";
import * as repo from "./repository";
import type { CreatePromptTemplateInput, CreatePromptVersionInput } from "./schemas";

export async function getActivePrompt(templateKey: string) {
  const version = await repo.getActiveVersion(templateKey);
  if (!version) {
    throw new NotFoundError(`Active prompt version for "${templateKey}"`);
  }
  return version;
}

export async function createTemplate(input: CreatePromptTemplateInput) {
  const existing = await repo.getTemplateByKey(input.key);
  if (existing) {
    throw new ConflictError(`Prompt template "${input.key}" already exists`);
  }
  return repo.createTemplate(input);
}

export async function createVersion(input: CreatePromptVersionInput) {
  return repo.createVersion(input);
}

export async function activateVersion(versionId: string) {
  try {
    return await repo.activateVersion(versionId);
  } catch {
    throw new NotFoundError("Prompt version");
  }
}
