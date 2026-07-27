"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Package, Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getPartImage } from "@/features/catalog/part-image";
import { InlineSpinner } from "@/components/ui/inline-spinner";

interface PartResult {
  id: string;
  name: string;
  manufacturerName: string;
  partNumber: string;
  origin: string;
  categoryName: string;
  imageUrl: string | null;
  minPriceMinorUnits: number | null;
  maxPriceMinorUnits: number | null;
  currency: string;
  vendorCount: number;
}

interface Vehicle {
  id: string;
  label: string;
  makeName: string;
  modelName: string;
  year: number;
}

interface Props {
  initialResults: PartResult[];
  categories: { id: string; name: string }[];
  vehicles: Vehicle[];
}

const fieldStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: "0.8125rem",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  outline: "none",
};

export function MarketplaceView({ initialResults, categories, vehicles }: Props) {
  const [results, setResults] = useState(initialResults);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (categoryId) params.set("categoryId", categoryId);
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      if (vehicle) {
        params.set("makeName", vehicle.makeName);
        params.set("modelName", vehicle.modelName);
        params.set("year", String(vehicle.year));
      }
      params.set("limit", "24");

      const res = await fetch(`/api/v1/parts/search?${params.toString()}`);
      if (res.ok) {
        const body = (await res.json()) as { data: PartResult[] };
        setResults(body.data);
      } else {
        toast.error("Failed to search parts.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "0.625rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 260px" }}>
          <Search
            size={14}
            style={{ position: "absolute", insetInlineStart: "0.75rem", top: "0.625rem", color: "#8a92a6" }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void search()}
            placeholder="Search parts, manufacturer, part number..."
            style={{ ...fieldStyle, width: "100%", paddingInlineStart: "2rem", boxSizing: "border-box" }}
          />
        </div>
        {vehicles.length > 0 && (
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            style={fieldStyle}
          >
            <option value="">All vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                Compatible with {v.label}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => void search()}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.5rem 1.25rem",
            backgroundColor: loading ? "#94a3b8" : "#00b8d9",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.8125rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading && <InlineSpinner />} {loading ? "Searching..." : "Search"}
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {[{ id: "", name: "All" }, ...categories].map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setCategoryId(c.id);
              setTimeout(() => void search(), 0);
            }}
            style={{
              padding: "0.375rem 0.875rem",
              borderRadius: "9999px",
              border: "1px solid var(--border)",
              backgroundColor: categoryId === c.id ? "#081a2f" : "transparent",
              color: categoryId === c.id ? "#fff" : "#5b6472",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: "0.75rem",
            padding: "3rem 1.5rem",
            textAlign: "center",
          }}
        >
          <Search size={32} color="#8a92a6" style={{ margin: "0 auto 0.75rem" }} />
          <p style={{ fontSize: "0.875rem", color: "#5b6472" }}>
            No parts found. Try a different search or category.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "1rem",
          }}
        >
          {results.map((p) => {
            const photo = getPartImage({ partNumber: p.partNumber });
            return (
            <Link
              key={p.id}
              href={`/marketplace/${p.id}` as never}
              style={{
                display: "block",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                padding: "1rem",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "120px",
                  borderRadius: "0.5rem",
                  backgroundColor: "#f7fafd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "0.75rem",
                  overflow: "hidden",
                }}
              >
                {photo ? (
                  <Image
                    src={photo}
                    alt={p.name}
                    fill
                    sizes="240px"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <Package size={32} color="#8a92a6" />
                )}
              </div>
              <div
                style={{
                  fontSize: "0.6875rem",
                  color: "#00b8d9",
                  fontWeight: 700,
                  marginBottom: "0.25rem",
                }}
              >
                {p.manufacturerName}
              </div>
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#081a2f",
                  marginBottom: "0.25rem",
                }}
              >
                {p.name}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#8a92a6", marginBottom: "0.5rem" }}>
                {p.categoryName} · {p.origin === "OEM" ? "OEM" : "Aftermarket"}
              </div>
              <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#081a2f" }}>
                {p.minPriceMinorUnits !== null
                  ? p.minPriceMinorUnits === p.maxPriceMinorUnits
                    ? formatCurrency(p.minPriceMinorUnits, p.currency)
                    : `${formatCurrency(p.minPriceMinorUnits, p.currency)} – ${formatCurrency(p.maxPriceMinorUnits ?? p.minPriceMinorUnits, p.currency)}`
                  : "No offers"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#8a92a6" }}>
                {p.vendorCount} vendor{p.vendorCount === 1 ? "" : "s"}
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
