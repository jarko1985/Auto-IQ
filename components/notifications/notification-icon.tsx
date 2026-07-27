import {
  ShieldCheck,
  Brain,
  Clock,
  Calendar,
  Receipt,
  CheckCircle2,
  Wrench,
  CircleCheckBig,
  Wallet,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import type { NotificationEventType } from "@prisma/client";

/** The two Stitch mockups (bell-dropdown vs. notification-center) disagreed
 * on icon/color per event — standardized here on the notification-center
 * palette (more differentiated, semantic by urgency: amber = awaiting
 * action, emerald = positive/approved, cyan = AI/informational, navy =
 * account, red = failure) and reused across both surfaces for consistency. */
export const EVENT_VISUALS: Record<
  NotificationEventType,
  { icon: LucideIcon; bg: string; color: string }
> = {
  EMAIL_VERIFICATION: { icon: ShieldCheck, bg: "rgba(8,26,47,0.1)", color: "#081a2f" },
  DIAGNOSTIC_COMPLETE: { icon: Brain, bg: "rgba(0,184,217,0.1)", color: "#00b8d9" },
  BOOKING_REQUESTED: { icon: Clock, bg: "rgba(255,176,32,0.1)", color: "#b8790a" },
  BOOKING_ACCEPTED: { icon: Calendar, bg: "rgba(255,176,32,0.1)", color: "#b8790a" },
  ESTIMATE_READY: { icon: Receipt, bg: "rgba(255,176,32,0.1)", color: "#b8790a" },
  ESTIMATE_APPROVED: { icon: CheckCircle2, bg: "rgba(16,185,129,0.1)", color: "#059669" },
  REPAIR_STATUS_CHANGED: { icon: Wrench, bg: "rgba(255,176,32,0.1)", color: "#b8790a" },
  REPAIR_COMPLETED: { icon: CircleCheckBig, bg: "rgba(0,184,217,0.1)", color: "#00b8d9" },
  PAYMENT_COMPLETE: { icon: Wallet, bg: "rgba(16,185,129,0.1)", color: "#059669" },
  PAYMENT_FAILED: { icon: AlertCircle, bg: "rgba(186,26,26,0.1)", color: "#ba1a1a" },
};

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  return date.toLocaleDateString("en-AE", { month: "short", day: "numeric" });
}
