import { Prisma } from "@prisma/client";
import type { NotificationChannel, NotificationEventType } from "@prisma/client";
import { getEmailProvider } from "@/lib/email";
import { getSmsProvider } from "@/lib/sms";
import { logger } from "@/lib/observability/logger";
import { NotFoundError } from "@/lib/errors";
import { EVENT_METADATA } from "./defaults";
import {
  renderNotificationContent,
  type NotificationEventPayload,
  type NotificationLocale,
} from "./templates";
import type { ListNotificationsInput, UpdatePreferencesInput } from "./schemas";
import * as repo from "./repository";

const MAX_DELIVERY_ATTEMPTS = 2;

/** User.locale (set from the Settings page — see features/account/) is the
 * per-user language preference background triggers (a webhook, a status
 * change) can read even with no active request/URL-segment locale in hand.
 * Falls back to "en" for any stored value outside the supported set. */
function resolveLocale(userLocale: string | null | undefined): NotificationLocale {
  return userLocale === "ar" ? "ar" : "en";
}

function resolveChannels(
  eventType: NotificationEventType,
  pref: { emailEnabled: boolean; smsEnabled: boolean; inAppEnabled: boolean } | null,
) {
  const meta = EVENT_METADATA[eventType];
  if (meta.locked) return meta.defaults;
  return {
    emailEnabled: pref?.emailEnabled ?? meta.defaults.emailEnabled,
    smsEnabled: pref?.smsEnabled ?? meta.defaults.smsEnabled,
    inAppEnabled: pref?.inAppEnabled ?? meta.defaults.inAppEnabled,
  };
}

async function deliverChannel(
  notificationId: string,
  channel: NotificationChannel,
  enabled: boolean,
  send: (() => Promise<void>) | null,
) {
  if (!enabled || !send) {
    await repo.createDelivery({ notificationId, channel, status: "SKIPPED", attempts: 0 });
    return;
  }

  if (channel === "IN_APP") {
    // The Notification row itself is the in-app delivery — nothing external to send.
    await repo.createDelivery({
      notificationId,
      channel,
      status: "SENT",
      attempts: 1,
      sentAt: new Date(),
    });
    return;
  }

  let lastError: string | undefined;
  for (let attempt = 1; attempt <= MAX_DELIVERY_ATTEMPTS; attempt++) {
    try {
      await send();
      await repo.createDelivery({
        notificationId,
        channel,
        status: "SENT",
        attempts: attempt,
        sentAt: new Date(),
      });
      return;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
      logger.error(
        { err, channel, notificationId, attempt },
        "notification_delivery_attempt_failed",
      );
    }
  }
  await repo.createDelivery({
    notificationId,
    channel,
    status: "FAILED",
    attempts: MAX_DELIVERY_ATTEMPTS,
    lastError,
  });
}

/** Core dispatch engine — every notifyX() wrapper below resolves its
 * recipient(s) and a natural dedupKey, then calls this. Handles preference
 * gating, deduplication (P2002 on the (userId, eventType, dedupKey) unique
 * constraint = already dispatched, a no-op), per-channel retries, and
 * delivery-status persistence. Never throws for a downstream channel
 * failure — only a genuine dedup hit or a real DB error short-circuits. */
async function dispatch(userId: string, payload: NotificationEventPayload, dedupKey: string) {
  const user = await repo.getUserContact(userId);
  if (!user) return; // recipient no longer exists

  const locale = resolveLocale(user.locale);
  const content = renderNotificationContent(payload, locale);
  const pref = await repo.getPreference(userId, payload.eventType);
  const channels = resolveChannels(payload.eventType, pref);

  let notification;
  try {
    notification = await repo.createNotification({
      userId,
      eventType: payload.eventType,
      category: content.category,
      title: content.title,
      body: content.body,
      data: payload.data as Prisma.InputJsonValue,
      dedupKey,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.info({ userId, eventType: payload.eventType, dedupKey }, "notification_dedup_hit");
      return;
    }
    throw err;
  }

  const sendEmail =
    payload.eventType === "EMAIL_VERIFICATION"
      ? async () => {
          await getEmailProvider().sendEmailVerification(user.email, payload.data.token);
        }
      : async () => {
          await getEmailProvider().sendNotification(user.email, {
            subject: content.emailSubject,
            body: content.emailBody,
          });
        };

  const sendSms = user.phone
    ? async () => {
        await getSmsProvider().sendMessage(user.phone!, content.smsBody);
      }
    : null;

  await Promise.all([
    deliverChannel(notification.id, "IN_APP", channels.inAppEnabled, async () => {}),
    deliverChannel(notification.id, "EMAIL", channels.emailEnabled, sendEmail),
    deliverChannel(notification.id, "SMS", channels.smsEnabled, sendSms),
  ]);

  return notification;
}

function safeDispatch(userId: string, payload: NotificationEventPayload, dedupKey: string) {
  return dispatch(userId, payload, dedupKey).catch((err: unknown) =>
    logger.error({ err, userId, eventType: payload.eventType }, "notification_dispatch_failed"),
  );
}

// ── Per-event triggers — called from each domain's real trigger point ─────────

export function notifyEmailVerification(userId: string, token: string, verificationUrl: string) {
  return safeDispatch(
    userId,
    { eventType: "EMAIL_VERIFICATION", data: { token, verificationUrl } },
    "initial",
  );
}

export function notifyDiagnosticComplete(userId: string, sessionId: string, vehicleLabel: string) {
  return safeDispatch(
    userId,
    { eventType: "DIAGNOSTIC_COMPLETE", data: { vehicleLabel, sessionId } },
    sessionId,
  );
}

export async function notifyBookingRequested(
  garageOrganizationId: string,
  bookingId: string,
  data: { garageName: string; bookingNumber: string; scheduledStart: string },
) {
  const recipientIds = await repo.listOrgRecipientUserIds(garageOrganizationId, [
    "GARAGE_OWNER",
    "GARAGE_MANAGER",
  ]);
  await Promise.all(
    recipientIds.map((userId) =>
      safeDispatch(userId, { eventType: "BOOKING_REQUESTED", data }, bookingId),
    ),
  );
}

export function notifyBookingAccepted(
  customerId: string,
  bookingId: string,
  data: { garageName: string; bookingNumber: string; scheduledStart: string },
) {
  return safeDispatch(customerId, { eventType: "BOOKING_ACCEPTED", data }, bookingId);
}

export function notifyEstimateReady(
  customerId: string,
  repairOrderId: string,
  data: { repairOrderNumber: string; totalMinorUnits: number; currency: string },
) {
  return safeDispatch(customerId, { eventType: "ESTIMATE_READY", data }, `${repairOrderId}:sent`);
}

export async function notifyEstimateApproved(
  garageOrganizationId: string,
  repairOrderId: string,
  data: { repairOrderNumber: string; customerName: string },
) {
  const recipientIds = await repo.listOrgRecipientUserIds(garageOrganizationId, [
    "GARAGE_OWNER",
    "GARAGE_MANAGER",
  ]);
  await Promise.all(
    recipientIds.map((userId) =>
      safeDispatch(userId, { eventType: "ESTIMATE_APPROVED", data }, `${repairOrderId}:approved`),
    ),
  );
}

export function notifyPaymentComplete(
  customerId: string,
  invoiceId: string,
  data: { invoiceNumber: string; amountMinorUnits: number; currency: string },
) {
  return safeDispatch(customerId, { eventType: "PAYMENT_COMPLETE", data }, invoiceId);
}

export function notifyPaymentFailed(
  customerId: string,
  invoiceId: string,
  data: { invoiceNumber: string; amountMinorUnits: number; currency: string; reason?: string },
) {
  // Distinct dedupKey from PAYMENT_COMPLETE (different eventType) and unique
  // per attempt so a second declined try still notifies the customer.
  return safeDispatch(
    customerId,
    { eventType: "PAYMENT_FAILED", data },
    `${invoiceId}:${Date.now()}`,
  );
}

export function notifyRepairStatusChanged(
  customerId: string,
  repairOrderId: string,
  data: { repairOrderNumber: string; status: string },
) {
  return safeDispatch(
    customerId,
    { eventType: "REPAIR_STATUS_CHANGED", data },
    `${repairOrderId}:${data.status}`,
  );
}

export function notifyRepairCompleted(
  customerId: string,
  repairOrderId: string,
  data: { repairOrderNumber: string; vehicleLabel: string },
) {
  return safeDispatch(customerId, { eventType: "REPAIR_COMPLETED", data }, repairOrderId);
}

// ── Reads (customer-facing API, any authenticated user reads their own) ───────

export async function listMyNotifications(userId: string, input: ListNotificationsInput) {
  return repo.listForUser(userId, input);
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await repo.getForUser(notificationId, userId);
  if (!notification) throw new NotFoundError("Notification");
  if (notification.readAt) return notification;
  return repo.markRead(notificationId);
}

export async function markAllNotificationsRead(userId: string) {
  await repo.markAllRead(userId);
}

// ── Preferences ────────────────────────────────────────────────────────────

export async function getMyPreferences(userId: string) {
  const stored = await repo.listPreferencesForUser(userId);
  const byEvent = new Map(stored.map((p) => [p.eventType, p]));

  return (Object.keys(EVENT_METADATA) as NotificationEventType[]).map((eventType) => {
    const meta = EVENT_METADATA[eventType];
    const row = byEvent.get(eventType);
    return {
      eventType,
      category: meta.category,
      label: meta.label,
      locked: meta.locked,
      emailEnabled: meta.locked
        ? meta.defaults.emailEnabled
        : (row?.emailEnabled ?? meta.defaults.emailEnabled),
      smsEnabled: meta.locked
        ? meta.defaults.smsEnabled
        : (row?.smsEnabled ?? meta.defaults.smsEnabled),
      inAppEnabled: meta.locked
        ? meta.defaults.inAppEnabled
        : (row?.inAppEnabled ?? meta.defaults.inAppEnabled),
    };
  });
}

export async function updateMyPreferences(userId: string, input: UpdatePreferencesInput) {
  // EMAIL_VERIFICATION never reaches here — excluded from updatePreferencesSchema's
  // eventType enum entirely, so this is enforced before validation even succeeds.
  await Promise.all(
    input.preferences.map((p) =>
      repo.upsertPreference(userId, p.eventType, {
        emailEnabled: p.emailEnabled,
        smsEnabled: p.smsEnabled,
        inAppEnabled: p.inAppEnabled,
      }),
    ),
  );

  await repo.createAuditLog({
    userId,
    action: "NOTIFICATION_PREFERENCES_UPDATED",
    metadata: { eventTypes: input.preferences.map((p) => p.eventType) },
  });

  return getMyPreferences(userId);
}
