"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getPartImage } from "@/features/catalog/part-image";

interface PartInfo {
  id: string;
  name: string;
  manufacturerName: string;
  partNumber: string;
  alternatePartNumbers: string[];
  origin: string;
  description: string | null;
  categoryName: string;
  compatibilityCount: number;
}

interface Offer {
  inventoryItemId: string;
  vendorName: string;
  locationName: string;
  emirate: string;
  priceMinorUnits: number;
  currency: string;
  qtyAvailable: number;
  stockStatus: string;
}

interface Props {
  part: PartInfo;
  offers: Offer[];
}

const STOCK_LABELS: Record<string, string> = {
  IN_STOCK: "In Stock",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock",
};

export function PartOffersView({ part, offers }: Props) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(offers.map((o) => [o.inventoryItemId, 1])),
  );
  const [reservingId, setReservingId] = useState<string | null>(null);

  const bestPrice = offers.length > 0 ? Math.min(...offers.map((o) => o.priceMinorUnits)) : null;
  const photo = getPartImage({ partNumber: part.partNumber });

  async function reserve(offer: Offer) {
    setReservingId(offer.inventoryItemId);
    try {
      const quantity = quantities[offer.inventoryItemId] ?? 1;
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ inventoryItemId: offer.inventoryItemId, quantity }] }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        toast.error(body.error?.message ?? "Failed to reserve this item.");
        return;
      }
      const body = (await res.json()) as { data: { id: string; orderNumber: string } };
      toast.success(`Order #${body.data.orderNumber} placed — the vendor will confirm shortly.`);
      setTimeout(() => router.push(`/dashboard/orders/${body.data.id}` as never), 1200);
    } finally {
      setReservingId(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div
          style={{
            position: "relative",
            width: "160px",
            height: "160px",
            borderRadius: "0.75rem",
            backgroundColor: "#f7fafd",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {photo ? (
            <Image src={photo} alt={part.name} fill sizes="160px" style={{ objectFit: "cover" }} />
          ) : (
            <Package size={48} color="#8a92a6" />
          )}
        </div>
        <div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#00b8d9",
              fontWeight: 700,
              marginBottom: "0.25rem",
            }}
          >
            {part.manufacturerName}
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#081a2f",
              margin: "0 0 0.375rem",
            }}
          >
            {part.name}
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "#5b6472", marginBottom: "0.5rem" }}>
            {part.partNumber}
            {part.alternatePartNumbers.length > 0 &&
              ` · Also: ${part.alternatePartNumbers.join(", ")}`}
          </p>
          <p style={{ fontSize: "0.8125rem", color: "#5b6472", marginBottom: "0.5rem" }}>
            {part.categoryName} · {part.origin === "OEM" ? "OEM" : "Aftermarket"}
            {part.compatibilityCount > 0 &&
              ` · ${part.compatibilityCount} compatible configuration${part.compatibilityCount === 1 ? "" : "s"}`}
          </p>
          {part.description && (
            <p style={{ fontSize: "0.8125rem", color: "#081a2f", maxWidth: "500px" }}>
              {part.description}
            </p>
          )}
          {bestPrice !== null && (
            <p style={{ fontSize: "1rem", fontWeight: 700, color: "#081a2f", marginTop: "0.5rem" }}>
              From {formatCurrency(bestPrice, offers[0]?.currency ?? "AED")}
            </p>
          )}
        </div>
      </div>

      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.75rem" }}>
        Vendor Offers ({offers.length})
      </h2>

      {offers.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "#8a92a6" }}>
          No vendors currently stock this part.
        </p>
      ) : (
        <div
          style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f7fafd", textAlign: "start" }}>
                {["Vendor", "Location", "Price", "Stock", "Qty", ""].map((h) => (
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
              {offers.map((o) => (
                <tr key={o.inventoryItemId} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#081a2f" }}>
                    {o.vendorName}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#5b6472" }}>
                    {o.locationName}, {o.emirate.replaceAll("_", " ")}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#081a2f", fontWeight: 700 }}>
                    {formatCurrency(o.priceMinorUnits, o.currency)}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      color: o.stockStatus === "LOW_STOCK" ? "#d97706" : "#16a34a",
                    }}
                  >
                    {STOCK_LABELS[o.stockStatus] ?? o.stockStatus}
                    {o.stockStatus === "LOW_STOCK" ? `: ${o.qtyAvailable} left` : ""}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <input
                      type="number"
                      min={1}
                      max={o.qtyAvailable}
                      value={quantities[o.inventoryItemId] ?? 1}
                      onChange={(e) =>
                        setQuantities((prev) => ({
                          ...prev,
                          [o.inventoryItemId]: Math.max(1, Number(e.target.value) || 1),
                        }))
                      }
                      style={{
                        width: "60px",
                        padding: "0.375rem 0.5rem",
                        border: "1px solid var(--border)",
                        borderRadius: "0.375rem",
                        fontSize: "0.8125rem",
                      }}
                    />
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <button
                      type="button"
                      disabled={reservingId === o.inventoryItemId}
                      onClick={() => void reserve(o)}
                      style={{
                        padding: "0.4375rem 1rem",
                        backgroundColor: reservingId === o.inventoryItemId ? "#94a3b8" : "#00b8d9",
                        color: "#fff",
                        border: "none",
                        borderRadius: "0.5rem",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: reservingId === o.inventoryItemId ? "not-allowed" : "pointer",
                      }}
                    >
                      Reserve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
