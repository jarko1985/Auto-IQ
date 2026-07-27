"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Boxes, Plus, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getPartImage } from "@/features/catalog/part-image";

interface InventoryRow {
  id: string;
  partName: string;
  manufacturerName: string;
  partNumber: string;
  categoryName: string;
  locationId: string;
  locationName: string;
  priceMinorUnits: number;
  currency: string;
  qtyAvailable: number;
  qtyReserved: number;
  qtyDamaged: number;
  reorderThreshold: number;
  stockStatus: string;
  isActive: boolean;
}

interface Props {
  initialItems: InventoryRow[];
  locations: { id: string; name: string }[];
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  IN_STOCK: { bg: "rgba(22,163,74,0.12)", color: "#16a34a", label: "In Stock" },
  LOW_STOCK: { bg: "rgba(217,119,6,0.12)", color: "#d97706", label: "Low Stock" },
  OUT_OF_STOCK: { bg: "rgba(220,38,38,0.12)", color: "#dc2626", label: "Out of Stock" },
};
const DEFAULT_STATUS_STYLE = STATUS_STYLES.IN_STOCK!;

const fieldStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: "0.8125rem",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  outline: "none",
};

export function VendorInventoryView({ initialItems, locations }: Props) {
  const [items, setItems] = useState(initialItems);
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState<"RESTOCK" | "ADJUSTMENT" | "DAMAGE">("RESTOCK");
  const [adjustReason, setAdjustReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filtered = items.filter((i) => {
    if (locationFilter && i.locationId !== locationFilter) return false;
    if (statusFilter && i.stockStatus !== statusFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      if (
        !i.partName.toLowerCase().includes(q) &&
        !i.partNumber.toLowerCase().includes(q) &&
        !i.manufacturerName.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const totalSkus = items.length;
  const lowStockCount = items.filter(
    (i) => i.stockStatus === "LOW_STOCK" || i.stockStatus === "OUT_OF_STOCK",
  ).length;
  const totalValueMinor = items.reduce((sum, i) => sum + i.priceMinorUnits * i.qtyAvailable, 0);

  async function submitAdjustment(itemId: string) {
    const quantity = Number(adjustQty);
    if (!quantity || quantity <= 0) {
      toast.error("Enter a quantity greater than zero.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/vendors/me/inventory/${itemId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeType: adjustType,
          quantity: adjustType === "ADJUSTMENT" ? quantity : Math.abs(quantity),
          reason: adjustReason || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        toast.error(body.error?.message ?? "Failed to adjust stock.");
        return;
      }
      const body = (await res.json()) as {
        data: { qtyAvailable: number; qtyReserved: number; qtyDamaged: number };
      };
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                qtyAvailable: body.data.qtyAvailable,
                qtyReserved: body.data.qtyReserved,
                qtyDamaged: body.data.qtyDamaged,
                stockStatus:
                  body.data.qtyAvailable <= 0
                    ? "OUT_OF_STOCK"
                    : body.data.qtyAvailable <= i.reorderThreshold
                      ? "LOW_STOCK"
                      : "IN_STOCK",
              }
            : i,
        ),
      );
      setAdjustingId(null);
      setAdjustQty("");
      setAdjustReason("");
      const successMessages: Record<typeof adjustType, string> = {
        RESTOCK: "Stock restocked.",
        ADJUSTMENT: "Stock adjustment saved.",
        DAMAGE: "Damage recorded.",
      };
      toast.success(successMessages[adjustType]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            padding: "1.125rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.375rem",
            }}
          >
            <Boxes size={16} color="#00b8d9" />
            <span style={{ fontSize: "0.8125rem", color: "#5b6472", fontWeight: 600 }}>
              Total SKUs
            </span>
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
            {totalSkus}
          </p>
        </div>
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            padding: "1.125rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.375rem",
            }}
          >
            <AlertTriangle size={16} color="#d97706" />
            <span style={{ fontSize: "0.8125rem", color: "#5b6472", fontWeight: 600 }}>
              Low/Out of Stock
            </span>
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
            {lowStockCount}
          </p>
        </div>
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            padding: "1.125rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.375rem",
            }}
          >
            <Wallet size={16} color="#00b8d9" />
            <span style={{ fontSize: "0.8125rem", color: "#5b6472", fontWeight: 600 }}>
              Total Stock Value
            </span>
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
            {formatCurrency(totalValueMinor)}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            style={fieldStyle}
          >
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={fieldStyle}
          >
            <option value="">All stock statuses</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
          <input
            placeholder="Search parts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ ...fieldStyle, width: "220px" }}
          />
        </div>
        <Link
          href={"/vendor/inventory/new" as never}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#081a2f",
            color: "#fff",
            borderRadius: "0.5rem",
            fontSize: "0.8125rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <Plus size={14} />
          Add Item
        </Link>
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "#8a92a6" }}>
          No inventory items match these filters.
        </p>
      ) : (
        <div
          style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f7fafd", textAlign: "start" }}>
                {[
                  "Part Details",
                  "Location",
                  "Qty (Avail/Reserved/Damaged)",
                  "Price",
                  "Threshold",
                  "Status",
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
              {filtered.map((i) => {
                const status = STATUS_STYLES[i.stockStatus] ?? DEFAULT_STATUS_STYLE;
                const adjusting = adjustingId === i.id;
                return (
                  <Fragment key={i.id}>
                    <tr style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
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
                            {(() => {
                              const imageSrc = getPartImage({ partNumber: i.partNumber });
                              return imageSrc ? (
                                <Image
                                  src={imageSrc}
                                  alt={i.partName}
                                  fill
                                  style={{ objectFit: "cover" }}
                                />
                              ) : (
                                <Boxes size={18} color="#8a92a6" />
                              );
                            })()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "#081a2f" }}>{i.partName}</div>
                            <div style={{ color: "#8a92a6", fontSize: "0.75rem" }}>
                              {i.manufacturerName} · {i.partNumber} · {i.categoryName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#5b6472" }}>
                        {i.locationName}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#5b6472" }}>
                        {i.qtyAvailable} / {i.qtyReserved} / {i.qtyDamaged}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#5b6472" }}>
                        {formatCurrency(i.priceMinorUnits, i.currency)}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#5b6472" }}>
                        {i.reorderThreshold}
                      </td>
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
                      <td style={{ padding: "0.75rem 1rem", textAlign: "end" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustingId(adjusting ? null : i.id);
                          }}
                          style={{
                            border: "1px solid var(--border)",
                            background: "none",
                            borderRadius: "0.5rem",
                            padding: "0.375rem 0.75rem",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            color: "#081a2f",
                          }}
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                    {adjusting && (
                      <tr
                        style={{ borderTop: "1px solid var(--border)", backgroundColor: "#f7fafd" }}
                      >
                        <td colSpan={7} style={{ padding: "1rem" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: "0.75rem",
                              alignItems: "flex-end",
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              <label
                                style={{
                                  display: "block",
                                  fontSize: "0.75rem",
                                  marginBottom: "0.25rem",
                                }}
                              >
                                Type
                              </label>
                              <select
                                value={adjustType}
                                onChange={(e) => setAdjustType(e.target.value as typeof adjustType)}
                                style={fieldStyle}
                              >
                                <option value="RESTOCK">Restock</option>
                                <option value="ADJUSTMENT">Correction (+/-)</option>
                                <option value="DAMAGE">Mark Damaged</option>
                              </select>
                            </div>
                            <div>
                              <label
                                style={{
                                  display: "block",
                                  fontSize: "0.75rem",
                                  marginBottom: "0.25rem",
                                }}
                              >
                                Quantity
                              </label>
                              <input
                                type="number"
                                value={adjustQty}
                                onChange={(e) => setAdjustQty(e.target.value)}
                                style={{ ...fieldStyle, width: "100px" }}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: "200px" }}>
                              <label
                                style={{
                                  display: "block",
                                  fontSize: "0.75rem",
                                  marginBottom: "0.25rem",
                                }}
                              >
                                Reason
                              </label>
                              <input
                                value={adjustReason}
                                onChange={(e) => setAdjustReason(e.target.value)}
                                placeholder="Optional note"
                                style={{ ...fieldStyle, width: "100%", boxSizing: "border-box" }}
                              />
                            </div>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => void submitAdjustment(i.id)}
                              style={{
                                padding: "0.5rem 1.25rem",
                                backgroundColor: submitting ? "#94a3b8" : "#00b8d9",
                                color: "#fff",
                                border: "none",
                                borderRadius: "0.5rem",
                                fontSize: "0.8125rem",
                                fontWeight: 600,
                                cursor: submitting ? "not-allowed" : "pointer",
                              }}
                            >
                              {submitting ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
