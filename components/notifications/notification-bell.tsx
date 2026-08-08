"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { Link } from "@/i18n/routing";
import { EVENT_VISUALS, formatRelativeTime } from "./notification-icon";
import type { NotificationListItem, NotificationListResponse } from "./types";

interface Props {
  /** Portal-relative path to the full Notification Center page, e.g. "/dashboard/notifications". */
  centerHref: string;
}

export function NotificationBell({ centerHref }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/notifications?limit=5");
      if (!res.ok) return;
      const json = (await res.json()) as NotificationListResponse;
      setItems(json.data);
      setUnreadCount(json.meta.unreadCount);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleMarkAllRead() {
    await fetch("/api/v1/notifications/read-all", { method: "POST" });
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
  }

  async function handleRowClick(notification: NotificationListItem) {
    if (notification.readAt) return;
    await fetch(`/api/v1/notifications/${notification.id}/read`, { method: "POST" });
    setItems((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        style={{
          width: "2.5rem",
          height: "2.5rem",
          borderRadius: "9999px",
          border: "none",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
        }}
      >
        <Bell size={20} color="#44474d" />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "0.375rem",
              insetInlineEnd: "0.375rem",
              minWidth: "1.125rem",
              height: "1.125rem",
              padding: "0 0.25rem",
              borderRadius: "9999px",
              backgroundColor: "#00b8d9",
              color: "#fff",
              fontSize: "0.625rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 0.5rem)",
            insetInlineEnd: 0,
            width: "24rem",
            maxWidth: "90vw",
            backgroundColor: "#fff",
            borderRadius: "0.75rem",
            boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
            border: "1px solid #e5e8eb",
            overflow: "hidden",
            zIndex: 50,
          }}
        >
          <div
            style={{
              padding: "1rem",
              borderBottom: "1px solid #e5e8eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#081a2f" }}>
              Notifications
            </h3>
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              style={{
                background: "none",
                border: "none",
                color: unreadCount === 0 ? "#9aa3af" : "#00b8d9",
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: unreadCount === 0 ? "default" : "pointer",
              }}
            >
              Mark all as read
            </button>
          </div>

          <div style={{ maxHeight: "26rem", overflowY: "auto" }}>
            {!loading && items.length === 0 && (
              <p style={{ padding: "2rem 1rem", textAlign: "center", color: "#75859f", margin: 0 }}>
                You&apos;re all caught up!
              </p>
            )}
            {items.map((n) => {
              const visual = EVENT_VISUALS[n.eventType];
              const Icon = visual.icon;
              const unread = !n.readAt;
              return (
                <div
                  key={n.id}
                  onClick={() => void handleRowClick(n)}
                  style={{
                    padding: "1rem",
                    display: "flex",
                    gap: "1rem",
                    cursor: "pointer",
                    opacity: unread ? 1 : 0.7,
                    borderBottom: "1px solid #f1f4f7",
                  }}
                >
                  <div
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "9999px",
                      backgroundColor: visual.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} color={visual.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.875rem",
                          fontWeight: 700,
                          color: "#081a2f",
                        }}
                      >
                        {n.title}
                      </p>
                      <span
                        style={{ fontSize: "0.625rem", color: "#75859f", whiteSpace: "nowrap" }}
                      >
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: "0.25rem 0 0",
                        fontSize: "0.8125rem",
                        color: "#44474d",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {n.body}
                    </p>
                  </div>
                  {unread && (
                    <div
                      style={{
                        width: "0.5rem",
                        height: "0.5rem",
                        borderRadius: "9999px",
                        backgroundColor: "#00b8d9",
                        flexShrink: 0,
                        marginTop: "0.25rem",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ padding: "0.625rem", borderTop: "1px solid #e5e8eb", textAlign: "center" }}>
            <Link
              href={centerHref as never}
              onClick={() => setOpen(false)}
              style={{
                color: "#00b8d9",
                fontSize: "0.875rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
