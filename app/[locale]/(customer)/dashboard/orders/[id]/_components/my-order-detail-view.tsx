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
  vendorName: string;
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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MyOrderDetailView({ order }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [busy, setBusy] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  async function payNow() {
    setCheckingOut(true);
    try {
      const res = await fetch(`/api/v1/orders/${order.id}/checkout`, { method: "POST" });
      const json = (await res.json()) as { data?: { id: string }; error?: { message?: string } };
      if (!res.ok || !json.data) {
        toast.error(json.error?.message ?? "Unable to start checkout.");
        return;
      }
      router.push(`/dashboard/checkout/${json.data.id}` as never);
    } finally {
      setCheckingOut(false);
    }
  }

  async function cancel() {
    const reason = window.prompt("Why are you cancelling this order?");
    if (!reason) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        toast.error(body.error?.message ?? "Failed to cancel order.");
        return;
      }
      setStatus("CANCELLED");
      toast.success("Order cancelled.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const state = STATUS_STYLES[status] ?? DEFAULT_STATUS_STYLE;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          gap: "1rem",
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
            {order.vendorName} · {order.locationName} · Ordered {formatDateTime(order.createdAt)}
          </p>
          {status === "CANCELLED" && order.cancelledReason && (
            <p style={{ fontSize: "0.8125rem", color: "#dc2626", marginTop: "0.375rem" }}>
              Cancelled: {order.cancelledReason}
            </p>
          )}
        </div>
        {status !== "CANCELLED" && status !== "COMPLETED" && (
          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button
              type="button"
              disabled={checkingOut}
              onClick={() => void payNow()}
              style={{
                padding: "0.5rem 1.125rem",
                backgroundColor: "#00b8d9",
                color: "#fff",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                fontWeight: 700,
                cursor: checkingOut ? "not-allowed" : "pointer",
              }}
            >
              {checkingOut ? "Loading…" : "Pay Now"}
            </button>
            {status === "PENDING_CONFIRMATION" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void cancel()}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#fee2e2",
                  color: "#991b1b",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                Cancel Order
              </button>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          padding: "1.25rem",
          marginBottom: "1.25rem",
        }}
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
          Items
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
            <span>Total</span>
            <span>{formatCurrency(order.totalMinorUnits, order.currency)}</span>
          </div>
        </div>
      </div>

      <div
        style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.25rem" }}
      >
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "#081a2f",
            marginTop: 0,
            marginBottom: "0.75rem",
          }}
        >
          Status History
        </h2>
        {order.statusHistory.map((h) => (
          <div
            key={h.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "0.375rem 0",
              fontSize: "0.8125rem",
            }}
          >
            <span style={{ color: "#081a2f", fontWeight: 600 }}>
              {STATUS_STYLES[h.toStatus]?.label ?? h.toStatus}
            </span>
            <span style={{ color: "#8a92a6" }}>{formatDateTime(h.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
