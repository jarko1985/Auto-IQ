"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { getPartImage } from "@/features/catalog/part-image";

interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  itemCount: number;
  totalLabel: string;
  status: string;
  locationName: string;
  createdAt: string;
  representativePartNumber: string | null;
  representativeCategoryCode: string | null;
}

interface Props {
  initialOrders: OrderRow[];
}

const TABS = [
  { value: "", label: "All Orders" },
  { value: "PENDING_CONFIRMATION", label: "Pending Confirmation" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PREPARING", label: "Preparing" },
  { value: "READY_FOR_PICKUP", label: "Ready for Pickup" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  PENDING_CONFIRMATION: {
    bg: "rgba(217,119,6,0.12)",
    color: "#d97706",
    label: "Pending Confirmation",
  },
  CONFIRMED: { bg: "rgba(0,184,217,0.12)", color: "#00b8d9", label: "Confirmed" },
  PREPARING: { bg: "rgba(8,26,47,0.08)", color: "#081a2f", label: "Preparing" },
  READY_FOR_PICKUP: { bg: "rgba(22,163,74,0.12)", color: "#16a34a", label: "Ready for Pickup" },
  COMPLETED: { bg: "rgba(22,163,74,0.12)", color: "#16a34a", label: "Completed" },
  CANCELLED: { bg: "rgba(220,38,38,0.12)", color: "#dc2626", label: "Cancelled" },
};
const DEFAULT_STATUS_STYLE = STATUS_STYLES.PENDING_CONFIRMATION!;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function VendorOrdersView({ initialOrders }: Props) {
  const [orders, setOrders] = useState(initialOrders);
  const [tab, setTab] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const filtered = tab ? orders.filter((o) => o.status === tab) : orders;

  async function confirmOrder(id: string) {
    setConfirmingId(id);
    try {
      const res = await fetch(`/api/v1/vendors/me/orders/${id}/confirm`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        toast.error(body.error?.message ?? "Failed to confirm order.");
        return;
      }
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "CONFIRMED" } : o)));
      toast.success("Order confirmed.");
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            style={{
              padding: "0.375rem 0.875rem",
              borderRadius: "9999px",
              border: "1px solid var(--border)",
              backgroundColor: tab === t.value ? "#081a2f" : "transparent",
              color: tab === t.value ? "#fff" : "#5b6472",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "#8a92a6" }}>No orders in this view.</p>
      ) : (
        <div
          style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f7fafd", textAlign: "start" }}>
                {[
                  "Order ID",
                  "Customer",
                  "Items",
                  "Total",
                  "Fulfillment",
                  "Status",
                  "Date",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.625rem 1rem",
                      fontWeight: 600,
                      color: "#5b6472",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const status = STATUS_STYLES[o.status] ?? DEFAULT_STATUS_STYLE;
                const imageSrc = getPartImage({
                  partNumber: o.representativePartNumber,
                  categoryCode: o.representativeCategoryCode,
                });
                return (
                  <tr key={o.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "0.5rem",
                            backgroundColor: "#f7fafd",
                            border: "1px solid var(--border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            flexShrink: 0,
                            position: "relative",
                          }}
                        >
                          {imageSrc ? (
                            <Image
                              src={imageSrc}
                              alt={`Order #${o.orderNumber}`}
                              fill
                              style={{ objectFit: "cover" }}
                            />
                          ) : (
                            <Package size={14} color="#8a92a6" />
                          )}
                        </div>
                        <span style={{ fontWeight: 600, color: "#081a2f" }}>#{o.orderNumber}</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#5b6472" }}>{o.customerName}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#5b6472" }}>{o.itemCount}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#081a2f", fontWeight: 600 }}>
                      {o.totalLabel}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#5b6472" }}>{o.locationName}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.1875rem 0.625rem",
                          borderRadius: "9999px",
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          backgroundColor: status.bg,
                          color: status.color,
                        }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#5b6472", whiteSpace: "nowrap" }}>
                      {formatDate(o.createdAt)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        {o.status === "PENDING_CONFIRMATION" && (
                          <button
                            type="button"
                            disabled={confirmingId === o.id}
                            onClick={() => void confirmOrder(o.id)}
                            style={{
                              padding: "0.3125rem 0.75rem",
                              backgroundColor: "#16a34a",
                              color: "#fff",
                              border: "none",
                              borderRadius: "0.5rem",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: confirmingId === o.id ? "not-allowed" : "pointer",
                            }}
                          >
                            Confirm
                          </button>
                        )}
                        <Link
                          href={`/vendor/orders/${o.id}` as never}
                          style={{
                            padding: "0.3125rem 0.75rem",
                            border: "1px solid var(--border)",
                            borderRadius: "0.5rem",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "#081a2f",
                            textDecoration: "none",
                          }}
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
