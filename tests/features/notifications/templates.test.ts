import { describe, it, expect } from "vitest";
import {
  renderNotificationContent,
  type NotificationEventPayload,
} from "@/features/notifications/templates";
import { EVENT_METADATA } from "@/features/notifications/defaults";

const SAMPLE_PAYLOADS: NotificationEventPayload[] = [
  {
    eventType: "EMAIL_VERIFICATION",
    data: { token: "tok123", verificationUrl: "https://example.com/verify?token=tok123" },
  },
  {
    eventType: "DIAGNOSTIC_COMPLETE",
    data: { vehicleLabel: "Toyota Land Cruiser", sessionId: "s1" },
  },
  {
    eventType: "BOOKING_REQUESTED",
    data: {
      garageName: "Al Rashidi Auto",
      bookingNumber: "BKG-0001",
      scheduledStart: "2026-08-01T10:00:00Z",
    },
  },
  {
    eventType: "BOOKING_ACCEPTED",
    data: {
      garageName: "Al Rashidi Auto",
      bookingNumber: "BKG-0001",
      scheduledStart: "2026-08-01T10:00:00Z",
    },
  },
  {
    eventType: "ESTIMATE_READY",
    data: { repairOrderNumber: "RO-0001", totalMinorUnits: 152250, currency: "AED" },
  },
  { eventType: "ESTIMATE_APPROVED", data: { repairOrderNumber: "RO-0001", customerName: "Ahmed" } },
  {
    eventType: "PAYMENT_COMPLETE",
    data: { invoiceNumber: "INV-0001", amountMinorUnits: 152250, currency: "AED" },
  },
  {
    eventType: "PAYMENT_FAILED",
    data: {
      invoiceNumber: "INV-0001",
      amountMinorUnits: 152250,
      currency: "AED",
      reason: "card_declined",
    },
  },
  {
    eventType: "REPAIR_STATUS_CHANGED",
    data: { repairOrderNumber: "RO-0001", status: "IN_REPAIR" },
  },
  {
    eventType: "REPAIR_COMPLETED",
    data: { repairOrderNumber: "RO-0001", vehicleLabel: "Nissan Patrol" },
  },
];

describe("renderNotificationContent", () => {
  it.each(SAMPLE_PAYLOADS)("renders non-empty en content for $eventType", (payload) => {
    const content = renderNotificationContent(payload, "en");
    expect(content.title.length).toBeGreaterThan(0);
    expect(content.body.length).toBeGreaterThan(0);
    expect(content.emailSubject.length).toBeGreaterThan(0);
    expect(content.emailBody.length).toBeGreaterThan(0);
    expect(content.smsBody.length).toBeGreaterThan(0);
    expect(content.category).toBe(EVENT_METADATA[payload.eventType].category);
  });

  it.each(SAMPLE_PAYLOADS)("renders non-empty ar content for $eventType", (payload) => {
    const content = renderNotificationContent(payload, "ar");
    expect(content.title.length).toBeGreaterThan(0);
    expect(content.body.length).toBeGreaterThan(0);
  });

  it("renders distinct en vs ar copy", () => {
    const payload: NotificationEventPayload = {
      eventType: "REPAIR_COMPLETED",
      data: { repairOrderNumber: "RO-0001", vehicleLabel: "Nissan Patrol" },
    };
    const en = renderNotificationContent(payload, "en");
    const ar = renderNotificationContent(payload, "ar");
    expect(en.title).not.toBe(ar.title);
    expect(en.body).not.toBe(ar.body);
  });

  it("formats money with the correct currency in the ready/complete/failed events", () => {
    const content = renderNotificationContent(
      {
        eventType: "PAYMENT_COMPLETE",
        data: { invoiceNumber: "INV-1", amountMinorUnits: 100000, currency: "AED" },
      },
      "en",
    );
    expect(content.body).toContain("1,000.00");
  });
});

describe("EVENT_METADATA", () => {
  it("covers every NotificationEventType with a category and channel defaults", () => {
    const eventTypes = Object.keys(EVENT_METADATA);
    expect(eventTypes).toHaveLength(10);
    for (const key of eventTypes) {
      const meta = EVENT_METADATA[key as keyof typeof EVENT_METADATA];
      expect(meta.category).toBeTruthy();
      expect(typeof meta.defaults.emailEnabled).toBe("boolean");
      expect(typeof meta.defaults.smsEnabled).toBe("boolean");
      expect(typeof meta.defaults.inAppEnabled).toBe("boolean");
    }
  });

  it("locks EMAIL_VERIFICATION and only EMAIL_VERIFICATION", () => {
    expect(EVENT_METADATA.EMAIL_VERIFICATION.locked).toBe(true);
    const others = Object.entries(EVENT_METADATA).filter(([key]) => key !== "EMAIL_VERIFICATION");
    for (const [, meta] of others) {
      expect(meta.locked).toBe(false);
    }
  });
});
