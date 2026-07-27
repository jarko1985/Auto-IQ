"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCheck } from "lucide-react";
import { Link } from "@/i18n/routing";
import { EVENT_VISUALS, formatRelativeTime } from "./notification-icon";
import type { NotificationListItem, NotificationListResponse } from "./types";
import type { NotificationCategory } from "@prisma/client";

interface Props {
  preferencesHref: string;
}

const TABS: { key: "ALL" | "UNREAD" | NotificationCategory; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "UNREAD", label: "Unread" },
  { key: "DIAGNOSTICS", label: "Diagnostics" },
  { key: "BOOKINGS", label: "Bookings" },
  { key: "REPAIR_ORDERS", label: "Repair Orders" },
  { key: "PAYMENTS", label: "Payments" },
];

function groupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.floor((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This Week";
  return "Older";
}

export function NotificationCenterView({ preferencesHref }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("ALL");
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (activeTab: (typeof TABS)[number]["key"]) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (activeTab === "UNREAD") params.set("unreadOnly", "true");
      else if (activeTab !== "ALL") params.set("category", activeTab);

      const res = await fetch(`/api/v1/notifications?${params.toString()}`);
      if (!res.ok) return;
      const json = (await res.json()) as NotificationListResponse;
      setItems(json.data);
      setUnreadCount(json.meta.unreadCount);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  async function handleMarkAllRead() {
    await fetch("/api/v1/notifications/read-all", { method: "POST" });
    void load(tab);
  }

  async function handleRowClick(notification: NotificationListItem) {
    if (notification.readAt) return;
    await fetch(`/api/v1/notifications/${notification.id}/read`, { method: "POST" });
    setItems((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  const groups = new Map<string, NotificationListItem[]>();
  for (const item of items) {
    const label = groupLabel(item.createdAt);
    const list = groups.get(label) ?? [];
    list.push(item);
    groups.set(label, list);
  }
  const groupOrder = ["Today", "Yesterday", "This Week", "Older"].filter((g) => groups.has(g));

  return (
    <div style={{ margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#081a2f" }}>
            Notifications
          </h1>
          <Link
            href={preferencesHref as never}
            style={{ fontSize: "0.8125rem", color: "#00b8d9", textDecoration: "none" }}
          >
            Notification preferences
          </Link>
        </div>
        <button
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            background: "none",
            border: "none",
            color: unreadCount === 0 ? "#9aa3af" : "#00b8d9",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: unreadCount === 0 ? "default" : "pointer",
            padding: "0.5rem 0.75rem",
          }}
        >
          <CheckCheck size={16} />
          Mark all as read
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          borderBottom: "1px solid #e5e8eb",
          marginBottom: "1.5rem",
          overflowX: "auto",
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background: "none",
                border: "none",
                borderBottom: active ? "2px solid #00b8d9" : "2px solid transparent",
                color: active ? "#00b8d9" : "#75859f",
                fontWeight: active ? 700 : 500,
                fontSize: "0.875rem",
                padding: "0 0 0.625rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              {t.label}
              {t.key === "UNREAD" && unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: "#00b8d9",
                    color: "#fff",
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    borderRadius: "9999px",
                    padding: "0.0625rem 0.375rem",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!loading && items.length === 0 && (
        <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <h3 style={{ color: "#081a2f", fontSize: "1.125rem", marginBottom: "0.5rem" }}>
            You&apos;re all caught up!
          </h3>
          <p style={{ color: "#75859f", maxWidth: "24rem", margin: "0 auto" }}>
            There are no notifications here. We&apos;ll let you know when something important
            happens.
          </p>
        </div>
      )}

      {groupOrder.map((label) => (
        <section key={label} style={{ marginBottom: "2rem" }}>
          <h3
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              color: "#75859f",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.75rem",
              marginInlineStart: "0.5rem",
            }}
          >
            {label}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {groups.get(label)!.map((n) => {
              const visual = EVENT_VISUALS[n.eventType];
              const Icon = visual.icon;
              const unread = !n.readAt;
              return (
                <div
                  key={n.id}
                  onClick={() => void handleRowClick(n)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    cursor: "pointer",
                    backgroundColor: unread ? "#fff" : "rgba(255,255,255,0.5)",
                    border: unread ? "1px solid #e5e8eb" : "1px solid #eef1f4",
                    borderInlineStart: unread ? "4px solid #00b8d9" : "1px solid #eef1f4",
                    boxShadow: unread ? "0 2px 8px rgba(0,0,0,0.04)" : "none",
                  }}
                >
                  <div
                    style={{
                      width: "3rem",
                      height: "3rem",
                      borderRadius: "9999px",
                      backgroundColor: visual.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} color={visual.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "0.875rem",
                        fontWeight: unread ? 700 : 500,
                        color: unread ? "#081a2f" : "#44474d",
                      }}
                    >
                      {n.title}
                    </h4>
                    <p
                      style={{
                        margin: "0.25rem 0 0",
                        fontSize: "0.8125rem",
                        color: "#75859f",
                      }}
                    >
                      {n.body}
                    </p>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#9aa3af", flexShrink: 0 }}>
                    {formatRelativeTime(n.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
