"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Package, Search, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getPartImage } from "@/features/catalog/part-image";
import { SelectChevron } from "@/components/forms/field-styles";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { LiveResultsDropdown, type LiveResultItem } from "@/components/search/live-results-dropdown";

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

const DEBOUNCE_MS = 300;
const DROPDOWN_LIMIT = 6;

const fieldStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: "0.8125rem",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...fieldStyle,
  paddingInlineEnd: "1.75rem",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

export function MarketplaceView({ initialResults, categories, vehicles }: Props) {
  const [results, setResults] = useState(initialResults);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const isMobile = useIsMobile();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRunRef = useRef(true);

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

  // Elastic search: every filter change re-runs the search automatically
  // (debounced for the free-text query, immediate for category/vehicle
  // pickers) — no manual "Search" trigger needed anywhere in this view.
  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void search(), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, categoryId, vehicleId]);

  function clearFilters() {
    setQuery("");
    setCategoryId("");
    setVehicleId("");
  }

  const hasActiveFilters = query !== "" || categoryId !== "" || vehicleId !== "";

  const dropdownItems: LiveResultItem[] = results.slice(0, DROPDOWN_LIMIT).map((p) => ({
    id: p.id,
    href: `/marketplace/${p.id}`,
    title: p.name,
    subtitle: `${p.manufacturerName} · ${p.categoryName}`,
    imageUrl: getPartImage({ partNumber: p.partNumber }),
    meta:
      p.minPriceMinorUnits !== null ? formatCurrency(p.minPriceMinorUnits, p.currency) : undefined,
  }));
  const showDropdown = inputFocused && query.trim().length >= 2;

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
            style={{
              position: "absolute",
              insetInlineStart: "0.75rem",
              top: "0.625rem",
              color: "#8a92a6",
            }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
              setInputFocused(true);
            }}
            onBlur={() => {
              blurTimeoutRef.current = setTimeout(() => setInputFocused(false), 150);
            }}
            placeholder="Search parts, manufacturer, part number..."
            style={{
              ...fieldStyle,
              width: "100%",
              paddingInlineStart: "2rem",
              paddingInlineEnd: query ? "2rem" : "0.75rem",
              boxSizing: "border-box",
            }}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              style={{
                position: "absolute",
                insetInlineEnd: "0.625rem",
                top: "0.5rem",
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "#8a92a6",
                display: "flex",
              }}
            >
              <X size={14} />
            </button>
          )}
          {showDropdown && (
            <LiveResultsDropdown
              items={dropdownItems}
              loading={loading}
              query={query}
              onSelect={() => setInputFocused(false)}
              fallbackIcon={<Package size={16} color="#8a92a6" />}
            />
          )}
        </div>
        {vehicles.length > 0 && (
          <div style={{ position: "relative" }}>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              style={selectStyle}
            >
              <option value="">All vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  Compatible with {v.label}
                </option>
              ))}
            </select>
            <SelectChevron size={14} insetInlineEnd="0.625rem" />
          </div>
        )}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.5rem 1rem",
              backgroundColor: "transparent",
              color: "#5b6472",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <X size={14} /> Clear Filters
          </button>
        )}
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        {isMobile ? (
          <SearchableSelect
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={categoryId}
            onChange={setCategoryId}
            placeholder="All Categories"
            allLabel="All Categories"
            searchPlaceholder="Search categories..."
          />
        ) : (
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
            {[{ id: "", name: "All" }, ...categories].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
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
        )}
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
