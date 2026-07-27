import { db } from "@/lib/db";
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationEventType,
  Prisma,
  RoleName,
} from "@prisma/client";

export async function getUserContact(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, phone: true, name: true },
  });
}

export async function createNotification(data: {
  userId: string;
  eventType: NotificationEventType;
  category: NotificationCategory;
  title: string;
  body: string;
  data?: Prisma.InputJsonValue;
  dedupKey: string;
}) {
  return db.notification.create({ data });
}

export async function createDelivery(data: {
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  attempts: number;
  sentAt?: Date;
  lastError?: string;
}) {
  return db.notificationDelivery.create({ data });
}

const notificationListInclude = {
  deliveries: { select: { channel: true, status: true } },
} satisfies Prisma.NotificationInclude;

export async function listForUser(
  userId: string,
  input: { category?: NotificationCategory; unreadOnly: boolean; limit: number; offset: number },
) {
  const where: Prisma.NotificationWhereInput = {
    userId,
    ...(input.category && { category: input.category }),
    ...(input.unreadOnly && { readAt: null }),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: input.limit,
      skip: input.offset,
      include: notificationListInclude,
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);

  return { notifications, total, unreadCount };
}

export async function getForUser(id: string, userId: string) {
  return db.notification.findFirst({ where: { id, userId } });
}

export async function markRead(id: string) {
  return db.notification.update({ where: { id }, data: { readAt: new Date() } });
}

export async function markAllRead(userId: string) {
  return db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

// ── Preferences ────────────────────────────────────────────────────────────

export async function listPreferencesForUser(userId: string) {
  return db.notificationPreference.findMany({ where: { userId } });
}

export async function upsertPreference(
  userId: string,
  eventType: NotificationEventType,
  fields: { emailEnabled: boolean; smsEnabled: boolean; inAppEnabled: boolean },
) {
  return db.notificationPreference.upsert({
    where: { userId_eventType: { userId, eventType } },
    create: { userId, eventType, ...fields },
    update: fields,
  });
}

export async function getPreference(userId: string, eventType: NotificationEventType) {
  return db.notificationPreference.findUnique({
    where: { userId_eventType: { userId, eventType } },
  });
}

// ── Recipient resolution (org-side events: booking requested, estimate approved) ──

export async function listOrgRecipientUserIds(organizationId: string, roleNames: RoleName[]) {
  const memberships = await db.organizationMembership.findMany({
    where: { organizationId, roles: { some: { role: { name: { in: roleNames } } } } },
    select: { userId: true },
  });
  return memberships.map((m) => m.userId);
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export async function createAuditLog(data: {
  userId: string;
  action: "NOTIFICATION_PREFERENCES_UPDATED";
  metadata?: Prisma.InputJsonValue;
}) {
  return db.auditLog.create({
    data: {
      action: data.action,
      metadata: data.metadata,
      user: { connect: { id: data.userId } },
    },
  });
}
