"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { formatCurrency } from "@/lib/utils";
import { getPartImage } from "@/features/catalog/part-image";

interface OrderItem {
  id: string;
  partNameSnapshot: string;
  quantity: number;
  unitPriceMinorUnits: number;
  totalMinorUnits: number;
  partNumber: string | null;
  categoryCode: string | null;
}

interface StatusHistoryEntry {
  id: string;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  subtotalMinorUnits: number;
  vatMinorUnits: number;
  totalMinorUnits: number;
  createdAt: string;
  cancelledReason: string | null;
  customerName: string;
  customerEmail: string;
  contactPhone: string | null;
  deliveryAddressLine1: string | null;
  deliveryEmirate: string | null;
  locationName: string;
  items: OrderItem[];
  statusHistory: StatusHistoryEntry[];
}

interface Props {
  order: OrderDetail;
}

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
const TIMELINE_STEPS = [
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "COMPLETED",
];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VendorOrderDetailView({ order }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [busy, setBusy] = useState(false);

  async function callAction(path: string, body?: object) {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/vendors/me/orders/${order.id}/${path}`, {
        method: "POST",
        ...(body && {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      });
      if (!res.ok) {
        const responseBody = (await res.json()) as { error?: { message?: string } };
        toast.error(responseBody.error?.message ?? "Action failed.");
        return false;
      }
      const responseBody = (await res.json()) as { data: { status: string } };
      setStatus(responseBody.data.status);
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function confirmOrder() {
    if (await callAction("confirm")) toast.success("Availability confirmed.");
  }

  async function markPrepared() {
    if (await callAction("prepare")) toast.success("Order marked as prepared.");
  }

  async function markReady() {
    if (await callAction("ready")) toast.success("Order marked ready for pickup.");
  }

  async function completeOrder() {
    if (await callAction("complete")) toast.success("Order completed.");
  }

  async function cancel() {
    const reason = window.prompt("Reason for cancelling this order:");
    if (!reason) return;
    if (await callAction("cancel", { reason })) toast.success("Order cancelled.");
  }

  const state = STATUS_STYLES[status] ?? DEFAULT_STATUS_STYLE;
  const canCancel = ["PENDING_CONFIRMATION", "CONFIRMED", "PREPARING"].includes(status);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
              #{order.orderNumber}
            </h1>
            <span
              style={{
                padding: "0.1875rem 0.625rem",
                borderRadius: "9999px",
                fontSize: "0.6875rem",
                fontWeight: 700,
                backgroundColor: state.bg,
                color: state.color,
              }}
            >
              {state.label}
            </span>
          </div>
          <p style={{ fontSize: "0.8125rem", color: "#5b6472", marginTop: "0.25rem" }}>
            Placed {formatDateTime(order.createdAt)} · Fulfilled from {order.locationName}
          </p>
          {status === "CANCELLED" && order.cancelledReason && (
            <p style={{ fontSize: "0.8125rem", color: "#dc2626", marginTop: "0.375rem" }}>
              Cancelled: {order.cancelledReason}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {status === "PENDING_CONFIRMATION" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmOrder()}
              style={primaryBtn}
            >
              Confirm Availability
            </button>
          )}
          {status === "CONFIRMED" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void markPrepared()}
              style={primaryBtn}
            >
              Mark Prepared
            </button>
          )}
          {status === "PREPARING" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void markReady()}
              style={primaryBtn}
            >
              Mark Ready for Pickup
            </button>
          )}
          {status === "READY_FOR_PICKUP" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void completeOrder()}
              style={primaryBtn}
            >
              Complete Order
            </button>
          )}
          {canCancel && (
            <button type="button" disabled={busy} onClick={() => void cancel()} style={dangerBtn}>
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      {status !== "CANCELLED" && (
        <div
          style={{
            display: "flex",
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            padding: "1.25rem",
            marginBottom: "1.5rem",
            gap: "0.5rem",
          }}
        >
          {TIMELINE_STEPS.map((step, i) => {
            const currentIndex = TIMELINE_STEPS.indexOf(status);
            const reached = currentIndex >= i;
            return (
              <div key={step} style={{ flex: 1, textAlign: "center" }}>
                <div
                  style={{
                    height: "6px",
                    borderRadius: "3px",
                    backgroundColor: reached ? "#00b8d9" : "var(--border)",
                    marginBottom: "0.5rem",
                  }}
                />
                <span
                  style={{
                    fontSize: "0.6875rem",
                    color: reached ? "#081a2f" : "#8a92a6",
                    fontWeight: reached ? 600 : 400,
                  }}
                >
                  {STATUS_STYLES[step]?.label ?? step}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Items */}
        <div
          style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.25rem" }}
        >
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: "#081a2f",
              marginTop: 0,
              marginBottom: "1rem",
            }}
          >
            Order Items
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ textAlign: "start" }}>
                {["Product", "Qty", "Unit Price", "Total"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.5rem 0",
                      color: "#8a92a6",
                      fontWeight: 600,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => {
                const imageSrc = getPartImage({
                  partNumber: item.partNumber,
                  categoryCode: item.categoryCode,
                });
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.625rem 0", color: "#081a2f", fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
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
                              alt={item.partNameSnapshot}
                              fill
                              style={{ objectFit: "cover" }}
                            />
                          ) : (
                            <Package size={16} color="#8a92a6" />
                          )}
                        </div>
                        <span>{item.partNameSnapshot}</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.625rem 0", color: "#5b6472" }}>{item.quantity}</td>
                    <td style={{ padding: "0.625rem 0", color: "#5b6472" }}>
                      {formatCurrency(item.unitPriceMinorUnits, order.currency)}
                    </td>
                    <td style={{ padding: "0.625rem 0", color: "#081a2f", fontWeight: 600 }}>
                      {formatCurrency(item.totalMinorUnits, order.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: "1rem", fontSize: "0.8125rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.25rem 0",
                color: "#5b6472",
              }}
            >
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotalMinorUnits, order.currency)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.25rem 0",
                color: "#5b6472",
              }}
            >
              <span>VAT (5%)</span>
              <span>{formatCurrency(order.vatMinorUnits, order.currency)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.5rem 0 0",
                marginTop: "0.375rem",
                borderTop: "1px solid var(--border)",
                fontWeight: 700,
                color: "#081a2f",
              }}
            >
              <span>Total Due</span>
              <span>{formatCurrency(order.totalMinorUnits, order.currency)}</span>
            </div>
          </div>
        </div>

        {/* Customer + history */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              padding: "1.25rem",
            }}
          >
            <h2
              style={{
                fontSize: "0.9375rem",
                fontWeight: 700,
                color: "#081a2f",
                marginTop: 0,
                marginBottom: "0.75rem",
              }}
            >
              Customer
            </h2>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "#081a2f",
                fontWeight: 600,
                margin: "0 0 0.25rem",
              }}
            >
              {order.customerName}
            </p>
            <p style={{ fontSize: "0.8125rem", color: "#5b6472", margin: "0 0 0.25rem" }}>
              {order.customerEmail}
            </p>
            {order.contactPhone && (
              <p style={{ fontSize: "0.8125rem", color: "#5b6472", margin: "0 0 0.25rem" }}>
                {order.contactPhone}
              </p>
            )}
            {order.deliveryAddressLine1 && (
              <p style={{ fontSize: "0.8125rem", color: "#5b6472", margin: 0 }}>
                {order.deliveryAddressLine1}
                {order.deliveryEmirate ? `, ${order.deliveryEmirate.replaceAll("_", " ")}` : ""}
              </p>
            )}
          </div>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              padding: "1.25rem",
            }}
          >
            <h2
              style={{
                fontSize: "0.9375rem",
                fontWeight: 700,
                color: "#081a2f",
                marginTop: 0,
                marginBottom: "0.75rem",
              }}
            >
              History
            </h2>
            {order.statusHistory.map((h) => (
              <div key={h.id} style={{ marginBottom: "0.625rem" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#081a2f" }}>
                  {STATUS_STYLES[h.toStatus]?.label ?? h.toStatus}
                </div>
                <div style={{ fontSize: "0.6875rem", color: "#8a92a6" }}>
                  {formatDateTime(h.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: "0.5rem 1rem",
  backgroundColor: "#00b8d9",
  color: "#fff",
  border: "none",
  borderRadius: "0.5rem",
  fontSize: "0.8125rem",
  fontWeight: 600,
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  padding: "0.5rem 1rem",
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  border: "none",
  borderRadius: "0.5rem",
  fontSize: "0.8125rem",
  fontWeight: 600,
  cursor: "pointer",
};
