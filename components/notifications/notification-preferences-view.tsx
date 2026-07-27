"use client";

import { useEffect, useState } from "react";
import { Info, Lock, Check } from "lucide-react";
import type { NotificationCategory, NotificationEventType } from "@prisma/client";

interface PreferenceRow {
  eventType: NotificationEventType;
  category: NotificationCategory;
  label: string;
  locked: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
}

const CATEGORY_ORDER: { key: NotificationCategory; label: string }[] = [
  { key: "DIAGNOSTICS", label: "Diagnostics" },
  { key: "BOOKINGS", label: "Bookings" },
  { key: "REPAIR_ORDERS", label: "Repair Orders" },
  { key: "PAYMENTS", label: "Payments" },
  { key: "ACCOUNT", label: "Account" },
];

type Channel = "emailEnabled" | "smsEnabled" | "inAppEnabled";

function Toggle({
  active,
  locked,
  onToggle,
}: {
  active: boolean;
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={locked ? undefined : onToggle}
      disabled={locked}
      aria-pressed={active}
      style={{
        width: "2.75rem",
        height: "1.5rem",
        borderRadius: "9999px",
        border: "none",
        position: "relative",
        cursor: locked ? "not-allowed" : "pointer",
        backgroundColor: locked ? "#e5e8eb" : active ? "#00b8d9" : "#c4c6cd",
        opacity: locked ? 0.7 : 1,
        transition: "background-color 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "0.1875rem",
          left: active ? "1.375rem" : "0.1875rem",
          width: "1.125rem",
          height: "1.125rem",
          borderRadius: "9999px",
          backgroundColor: "#fff",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

export function NotificationPreferencesView() {
  const [rows, setRows] = useState<PreferenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/v1/notifications/preferences");
      if (res.ok) {
        const json = (await res.json()) as { data: PreferenceRow[] };
        setRows(json.data);
      }
      setLoading(false);
    })();
  }, []);

  function toggle(eventType: NotificationEventType, channel: Channel) {
    setRows((prev) =>
      prev.map((r) => (r.eventType === eventType ? { ...r, [channel]: !r[channel] } : r)),
    );
  }

  async function handleSave() {
    setSaving("saving");
    const preferences = rows
      .filter((r) => !r.locked)
      .map((r) => ({
        eventType: r.eventType,
        emailEnabled: r.emailEnabled,
        smsEnabled: r.smsEnabled,
        inAppEnabled: r.inAppEnabled,
      }));
    await fetch("/api/v1/notifications/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences }),
    });
    setSaving("saved");
    setTimeout(() => setSaving("idle"), 2000);
  }

  if (loading) return null;

  return (
    <div style={{ margin: "0 auto", padding: "2rem 1.5rem 6rem" }}>
      <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#081a2f" }}>
        Notification Preferences
      </h1>
      <p style={{ color: "#75859f", margin: "0 0 1rem" }}>
        Choose how you&apos;d like to be notified about activity on your account
      </p>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          backgroundColor: "rgba(0,184,217,0.08)",
          border: "1px solid rgba(0,184,217,0.2)",
          borderRadius: "0.5rem",
          padding: "0.625rem 1rem",
          marginBottom: "2rem",
        }}
      >
        <Info size={16} color="#0090ab" />
        <span style={{ fontSize: "0.8125rem", color: "#0090ab" }}>
          SMS notifications require a verified phone number.
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto auto",
          columnGap: "2rem",
          padding: "0 1.5rem",
          marginBottom: "0.5rem",
          fontSize: "0.6875rem",
          fontWeight: 700,
          color: "#75859f",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        <div>Category</div>
        <div style={{ width: "2.75rem", textAlign: "center" }}>Email</div>
        <div style={{ width: "2.75rem", textAlign: "center" }}>SMS</div>
        <div style={{ width: "2.75rem", textAlign: "center" }}>In-App</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {CATEGORY_ORDER.map(({ key, label }) => {
          const categoryRows = rows.filter((r) => r.category === key);
          if (categoryRows.length === 0) return null;
          return (
            <section
              key={key}
              style={{
                backgroundColor: "#fff",
                borderRadius: "0.75rem",
                border: "1px solid #e5e8eb",
                overflow: "hidden",
                boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  padding: "1rem 1.5rem",
                  backgroundColor: "#f1f4f7",
                  borderBottom: "1px solid #e5e8eb",
                }}
              >
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#081a2f" }}>
                  {label}
                </h4>
              </div>
              <div>
                {categoryRows.map((row, i) => (
                  <div
                    key={row.eventType}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto auto",
                      columnGap: "2rem",
                      alignItems: "center",
                      padding: "1.125rem 1.5rem",
                      borderTop: i > 0 ? "1px solid #eef1f4" : "none",
                      backgroundColor: row.locked ? "rgba(241,244,247,0.4)" : "transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.875rem",
                        color: "#181c1e",
                      }}
                    >
                      {row.label}
                      {row.locked && <Lock size={14} color="#75859f" />}
                    </div>
                    <div style={{ width: "2.75rem", display: "flex", justifyContent: "center" }}>
                      <Toggle
                        active={row.emailEnabled}
                        locked={row.locked}
                        onToggle={() => toggle(row.eventType, "emailEnabled")}
                      />
                    </div>
                    <div style={{ width: "2.75rem", display: "flex", justifyContent: "center" }}>
                      <Toggle
                        active={row.smsEnabled}
                        locked={row.locked}
                        onToggle={() => toggle(row.eventType, "smsEnabled")}
                      />
                    </div>
                    <div style={{ width: "2.75rem", display: "flex", justifyContent: "center" }}>
                      <Toggle
                        active={row.inAppEnabled}
                        locked={row.locked}
                        onToggle={() => toggle(row.eventType, "inAppEnabled")}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div style={{ position: "fixed", bottom: "2rem", insetInlineEnd: "2rem" }}>
        <button
          onClick={handleSave}
          disabled={saving === "saving"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            backgroundColor: saving === "saved" ? "#081a2f" : "#00b8d9",
            color: "#fff",
            border: "none",
            borderRadius: "9999px",
            padding: "0.75rem 1.75rem",
            fontSize: "0.875rem",
            fontWeight: 700,
            cursor: saving === "saving" ? "default" : "pointer",
            boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
          }}
        >
          {saving === "saved" && <Check size={16} />}
          {saving === "saving" ? "Saving..." : saving === "saved" ? "Saved" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
