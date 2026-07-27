import { db } from "@/lib/db";

export async function getTemplateByKey(key: string) {
  return db.promptTemplate.findUnique({ where: { key } });
}

export async function getActiveVersion(templateKey: string) {
  return db.promptVersion.findFirst({
    where: { status: "ACTIVE", template: { key: templateKey } },
    include: { template: true },
  });
}

export async function createTemplate(data: { key: string; description?: string }) {
  return db.promptTemplate.create({ data });
}

export async function createVersion(data: { templateId: string; content: string }) {
  const latest = await db.promptVersion.findFirst({
    where: { templateId: data.templateId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  return db.promptVersion.create({
    data: {
      templateId: data.templateId,
      content: data.content,
      version: (latest?.version ?? 0) + 1,
      status: "DRAFT",
    },
  });
}

/** Activates a version and archives any previously-active version for the same template — only one ACTIVE version per template at a time. */
export async function activateVersion(versionId: string) {
  return db.$transaction(async (tx) => {
    const version = await tx.promptVersion.findUniqueOrThrow({ where: { id: versionId } });

    await tx.promptVersion.updateMany({
      where: { templateId: version.templateId, status: "ACTIVE" },
      data: { status: "ARCHIVED" },
    });

    return tx.promptVersion.update({
      where: { id: versionId },
      data: { status: "ACTIVE", activatedAt: new Date() },
    });
  });
}
