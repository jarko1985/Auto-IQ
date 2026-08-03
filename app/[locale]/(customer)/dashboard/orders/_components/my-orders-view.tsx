"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { getPartImage } from "@/features/catalog/part-image";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface OrderRow {
  id: string;
  orderNumber: string;
  vendorName: string;
  status: string;
  itemCount: number;
  totalLabel: string;
  createdAt: string;
  representativePartNumber: string | null;
  representativeCategoryCode: string | null;
}

interface Props {
  initialOrders: OrderRow[];
}

const TABS = [
  { value: "", label: "All" },
  { value: "PENDING_CONFIRMATION", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PREPARING", label: "Preparing" },
  { value: "READY_FOR_PICKUP", label: "Ready for Pickup" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  PENDING_CONFIRMATION: { bg: "rgba(217,119,6,0.12)", color: "#d97706", label: "Pending" },
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

export function MyOrdersView({ initialOrders }: Props) {
  const [tab, setTab] = useState("");
  const isMobile = useIsMobile();
  const filtered = tab ? initialOrders.filter((o) => o.status === tab) : initialOrders;

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        {isMobile ? (
          <SearchableSelect
            options={TABS.filter((t) => t.value !== "").map((t) => ({ value: t.value, label: t.label }))}
            value={tab}
            onChange={setTab}
            placeholder="All"
            allLabel="All"
            searchPlaceholder="Search statuses..."
          />
        ) : (
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
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
        )}
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: "0.75rem",
            padding: "3rem 1.5rem",
            textAlign: "center",
          }}
        >
          <ShoppingBag size={32} color="#8a92a6" style={{ margin: "0 auto 0.75rem" }} />
          <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1rem" }}>
            No orders here yet.
          </p>
          <Link
            href={"/marketplace" as never}
            style={{
              display: "inline-block",
              padding: "0.5rem 1.25rem",
              backgroundColor: "#00b8d9",
              color: "#fff",
              borderRadius: "0.5rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Browse Marketplace
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map((o) => {
            const status = STATUS_STYLES[o.status] ?? DEFAULT_STATUS_STYLE;
            const imageSrc = getPartImage({
              partNumber: o.representativePartNumber,
              categoryCode: o.representativeCategoryCode,
            });
            return (
              <Link
                key={o.id}
                href={`/dashboard/orders/${o.id}` as never}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  padding: "1rem 1.25rem",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
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
                      <ShoppingBag size={18} color="#8a92a6" />
                    )}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#081a2f" }}>
                        #{o.orderNumber}
                      </span>
                      <span
                        style={{
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
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "#5b6472", marginTop: "0.25rem" }}>
                      {o.vendorName} · {o.itemCount} item{o.itemCount === 1 ? "" : "s"} · Ordered{" "}
                      {formatDate(o.createdAt)}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#081a2f" }}>
                  {o.totalLabel}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
