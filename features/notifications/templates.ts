import type { NotificationCategory, NotificationEventType } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import { EVENT_METADATA } from "./defaults";

export type NotificationLocale = "en" | "ar";

export type NotificationEventPayload =
  | { eventType: "EMAIL_VERIFICATION"; data: { token: string; verificationUrl: string } }
  | { eventType: "DIAGNOSTIC_COMPLETE"; data: { vehicleLabel: string; sessionId: string } }
  | {
      eventType: "BOOKING_REQUESTED";
      data: { garageName: string; bookingNumber: string; scheduledStart: string };
    }
  | {
      eventType: "BOOKING_ACCEPTED";
      data: { garageName: string; bookingNumber: string; scheduledStart: string };
    }
  | {
      eventType: "ESTIMATE_READY";
      data: { repairOrderNumber: string; totalMinorUnits: number; currency: string };
    }
  | { eventType: "ESTIMATE_APPROVED"; data: { repairOrderNumber: string; customerName: string } }
  | {
      eventType: "PAYMENT_COMPLETE";
      data: { invoiceNumber: string; amountMinorUnits: number; currency: string };
    }
  | {
      eventType: "PAYMENT_FAILED";
      data: { invoiceNumber: string; amountMinorUnits: number; currency: string; reason?: string };
    }
  | { eventType: "REPAIR_STATUS_CHANGED"; data: { repairOrderNumber: string; status: string } }
  | { eventType: "REPAIR_COMPLETED"; data: { repairOrderNumber: string; vehicleLabel: string } };

export interface NotificationContent {
  category: NotificationCategory;
  title: string;
  body: string;
  emailSubject: string;
  emailBody: string;
  smsBody: string;
}

function repairStatusLabel(status: string, locale: NotificationLocale): string {
  const labels: Record<string, { en: string; ar: string }> = {
    INSPECTION: { en: "Inspection started", ar: "بدأ الفحص" },
    DIAGNOSIS: { en: "Diagnosis recorded", ar: "تم تسجيل التشخيص" },
    IN_REPAIR: { en: "Repair in progress", ar: "الإصلاح قيد التنفيذ" },
    QUALITY_CHECK: { en: "Quality check signed off", ar: "تم اعتماد فحص الجودة" },
    REJECTED: { en: "Estimate rejected", ar: "تم رفض التقدير" },
    CANCELLED: { en: "Repair order cancelled", ar: "تم إلغاء أمر الإصلاح" },
    INVOICED: { en: "Invoice issued", ar: "تم إصدار الفاتورة" },
  };
  return labels[status]?.[locale] ?? status;
}

/** Localization readiness: every event renders in `en`/`ar`. There is no
 * per-user stored locale preference yet (User has no `locale` column), so
 * callers currently always pass "en" — see resolveLocale() in service.ts. */
export function renderNotificationContent(
  payload: NotificationEventPayload,
  locale: NotificationLocale,
): NotificationContent {
  const category = EVENT_METADATA[payload.eventType].category;

  switch (payload.eventType) {
    case "EMAIL_VERIFICATION": {
      const { verificationUrl } = payload.data;
      return {
        category,
        title: locale === "ar" ? "تحقق من بريدك الإلكتروني" : "Verify your email",
        body:
          locale === "ar"
            ? "الرجاء تأكيد بريدك الإلكتروني لإكمال إعداد حسابك."
            : "Please confirm your email address to finish setting up your account.",
        emailSubject:
          locale === "ar" ? "تحقق من بريدك الإلكتروني - AutoIQ" : "Verify your email — AutoIQ",
        emailBody:
          locale === "ar"
            ? `الرجاء تأكيد بريدك الإلكتروني عبر هذا الرابط: ${verificationUrl}`
            : `Please confirm your email address: ${verificationUrl}`,
        smsBody:
          locale === "ar"
            ? `AutoIQ: تحقق من بريدك الإلكتروني عبر ${verificationUrl}`
            : `AutoIQ: verify your email at ${verificationUrl}`,
      };
    }
    case "DIAGNOSTIC_COMPLETE": {
      const { vehicleLabel } = payload.data;
      const bodyEn = `Your ${vehicleLabel}'s diagnostic report is ready for review.`;
      const bodyAr = `تقرير التشخيص لسيارتك ${vehicleLabel} جاهز للمراجعة.`;
      return {
        category,
        title: locale === "ar" ? "اكتمل التشخيص" : "Diagnostic Complete",
        body: locale === "ar" ? bodyAr : bodyEn,
        emailSubject: locale === "ar" ? "تقرير التشخيص جاهز" : "Your diagnostic report is ready",
        emailBody: locale === "ar" ? bodyAr : bodyEn,
        smsBody: locale === "ar" ? bodyAr : bodyEn,
      };
    }
    case "BOOKING_REQUESTED": {
      const { garageName, bookingNumber } = payload.data;
      const bodyEn = `Your booking request ${bookingNumber} has been sent to ${garageName}.`;
      const bodyAr = `تم إرسال طلب الحجز ${bookingNumber} إلى ${garageName}.`;
      return {
        category,
        title: locale === "ar" ? "تم إرسال طلب الحجز" : "Booking Requested",
        body: locale === "ar" ? bodyAr : bodyEn,
        emailSubject: locale === "ar" ? "تم إرسال طلب الحجز" : "Your booking request was sent",
        emailBody: locale === "ar" ? bodyAr : bodyEn,
        smsBody: locale === "ar" ? bodyAr : bodyEn,
      };
    }
    case "BOOKING_ACCEPTED": {
      const { garageName, bookingNumber, scheduledStart } = payload.data;
      const when = new Date(scheduledStart).toLocaleString(locale === "ar" ? "ar-AE" : "en-AE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Dubai",
      });
      const bodyEn = `${garageName} confirmed your appointment ${bookingNumber} for ${when}.`;
      const bodyAr = `أكد ${garageName} موعدك ${bookingNumber} في ${when}.`;
      return {
        category,
        title: locale === "ar" ? "تم قبول الحجز" : "Booking Accepted",
        body: locale === "ar" ? bodyAr : bodyEn,
        emailSubject: locale === "ar" ? "تم تأكيد حجزك" : "Your booking was accepted",
        emailBody: locale === "ar" ? bodyAr : bodyEn,
        smsBody: locale === "ar" ? bodyAr : bodyEn,
      };
    }
    case "ESTIMATE_READY": {
      const { repairOrderNumber, totalMinorUnits, currency } = payload.data;
      const amount = formatCurrency(totalMinorUnits, currency, locale === "ar" ? "ar-AE" : "en-AE");
      const bodyEn = `Review your repair estimate for ${repairOrderNumber} — total ${amount}.`;
      const bodyAr = `راجع تقدير الإصلاح الخاص بـ ${repairOrderNumber} — الإجمالي ${amount}.`;
      return {
        category,
        title: locale === "ar" ? "التقدير جاهز" : "Estimate Ready",
        body: locale === "ar" ? bodyAr : bodyEn,
        emailSubject: locale === "ar" ? "تقدير الإصلاح جاهز" : "Your repair estimate is ready",
        emailBody: locale === "ar" ? bodyAr : bodyEn,
        smsBody: locale === "ar" ? bodyAr : bodyEn,
      };
    }
    case "ESTIMATE_APPROVED": {
      const { repairOrderNumber, customerName } = payload.data;
      const bodyEn = `${customerName} approved the estimate for ${repairOrderNumber}.`;
      const bodyAr = `وافق ${customerName} على تقدير ${repairOrderNumber}.`;
      return {
        category,
        title: locale === "ar" ? "تمت الموافقة على التقدير" : "Estimate Approved",
        body: locale === "ar" ? bodyAr : bodyEn,
        emailSubject: locale === "ar" ? "تمت الموافقة على التقدير" : "Estimate approved",
        emailBody: locale === "ar" ? bodyAr : bodyEn,
        smsBody: locale === "ar" ? bodyAr : bodyEn,
      };
    }
    case "PAYMENT_COMPLETE": {
      const { invoiceNumber, amountMinorUnits, currency } = payload.data;
      const amount = formatCurrency(
        amountMinorUnits,
        currency,
        locale === "ar" ? "ar-AE" : "en-AE",
      );
      const bodyEn = `${amount} payment received for ${invoiceNumber}.`;
      const bodyAr = `تم استلام دفعة بقيمة ${amount} مقابل ${invoiceNumber}.`;
      return {
        category,
        title: locale === "ar" ? "تم الدفع بنجاح" : "Payment Successful",
        body: locale === "ar" ? bodyAr : bodyEn,
        emailSubject: locale === "ar" ? "تم استلام الدفعة" : "Payment received",
        emailBody: locale === "ar" ? bodyAr : bodyEn,
        smsBody: locale === "ar" ? bodyAr : bodyEn,
      };
    }
    case "PAYMENT_FAILED": {
      const { invoiceNumber, amountMinorUnits, currency } = payload.data;
      const amount = formatCurrency(
        amountMinorUnits,
        currency,
        locale === "ar" ? "ar-AE" : "en-AE",
      );
      const bodyEn = `Your ${amount} payment for ${invoiceNumber} did not go through.`;
      const bodyAr = `لم تنجح عملية الدفع بقيمة ${amount} مقابل ${invoiceNumber}.`;
      return {
        category,
        title: locale === "ar" ? "فشل الدفع" : "Payment Failed",
        body: locale === "ar" ? bodyAr : bodyEn,
        emailSubject: locale === "ar" ? "فشلت عملية الدفع" : "Your payment failed",
        emailBody: locale === "ar" ? bodyAr : bodyEn,
        smsBody: locale === "ar" ? bodyAr : bodyEn,
      };
    }
    case "REPAIR_STATUS_CHANGED": {
      const { repairOrderNumber, status } = payload.data;
      const statusLabel = repairStatusLabel(status, locale);
      const bodyEn = `${repairOrderNumber}: ${statusLabel}.`;
      const bodyAr = `${repairOrderNumber}: ${statusLabel}.`;
      return {
        category,
        title: locale === "ar" ? "تحديث حالة الإصلاح" : "Repair Status Changed",
        body: locale === "ar" ? bodyAr : bodyEn,
        emailSubject: locale === "ar" ? "تحديث حالة أمر الإصلاح" : "Repair order status update",
        emailBody: locale === "ar" ? bodyAr : bodyEn,
        smsBody: locale === "ar" ? bodyAr : bodyEn,
      };
    }
    case "REPAIR_COMPLETED": {
      const { repairOrderNumber, vehicleLabel } = payload.data;
      const bodyEn = `Repair work for your ${vehicleLabel} (${repairOrderNumber}) is finished and ready for pickup.`;
      const bodyAr = `اكتمل إصلاح سيارتك ${vehicleLabel} (${repairOrderNumber}) وهي جاهزة للاستلام.`;
      return {
        category,
        title: locale === "ar" ? "اكتمل الإصلاح" : "Repair Completed",
        body: locale === "ar" ? bodyAr : bodyEn,
        emailSubject: locale === "ar" ? "اكتمل إصلاح سيارتك" : "Your repair is complete",
        emailBody: locale === "ar" ? bodyAr : bodyEn,
        smsBody: locale === "ar" ? bodyAr : bodyEn,
      };
    }
  }
}

export function eventTypeLabel(eventType: NotificationEventType): string {
  return EVENT_METADATA[eventType].label;
}
