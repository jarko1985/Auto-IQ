"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { InlineSpinner } from "@/components/ui/inline-spinner";

interface PartOption {
  id: string;
  name: string;
  manufacturerName: string;
  partNumber: string;
  categoryName: string;
}

interface Props {
  locations: { id: string; name: string }[];
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: "0.8125rem",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: "var(--foreground)",
  marginBottom: "0.25rem",
};

export function AddInventoryItemForm({ locations }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PartOption[]>([]);
  const [selectedPart, setSelectedPart] = useState<PartOption | null>(null);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [price, setPrice] = useState("");
  const [qtyAvailable, setQtyAvailable] = useState("0");
  const [qtyDamaged, setQtyDamaged] = useState("0");
  const [reorderThreshold, setReorderThreshold] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (selectedPart || query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const handle = setTimeout(() => {
      fetch(`/api/v1/vendors/me/parts?query=${encodeURIComponent(query)}`)
        .then((res) => (res.ok ? res.json() : { data: [] }))
        .then((body: { data: PartOption[] }) => setResults(body.data))
        .catch(() => setResults([]))
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query, selectedPart]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedPart) {
      toast.error("Search for and select a catalog part first.");
      return;
    }
    if (!locationId) {
      toast.error("Select a storage location.");
      return;
    }
    const priceMinorUnits = Math.round(Number(price) * 100);
    if (!priceMinorUnits || priceMinorUnits < 0) {
      toast.error("Enter a valid unit price.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/vendors/me/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId: selectedPart.id,
          locationId,
          priceMinorUnits,
          qtyAvailable: Number(qtyAvailable) || 0,
          qtyDamaged: Number(qtyDamaged) || 0,
          reorderThreshold: Number(reorderThreshold) || 0,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        toast.error(body.error?.message ?? "Failed to add inventory item.");
        return;
      }
      toast.success("Inventory item added.");
      router.push("/vendor/inventory" as never);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.25rem" }}
    >
      <div style={{ marginBottom: "1rem" }}>
        <label style={labelStyle}>Part Name or Number *</label>
        {selectedPart ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.625rem 0.875rem",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              backgroundColor: "#f7fafd",
            }}
          >
            <div>
              <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#081a2f" }}>
                {selectedPart.name}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#8a92a6" }}>
                {selectedPart.manufacturerName} · {selectedPart.partNumber} ·{" "}
                {selectedPart.categoryName}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPart(null);
                setQuery("");
              }}
              style={{
                border: "none",
                background: "none",
                color: "#00b8d9",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Change
            </button>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            {isSearching ? (
              <div style={{ position: "absolute", insetInlineStart: "0.75rem", top: "0.625rem" }}>
                <InlineSpinner color="#8a92a6" size={14} />
              </div>
            ) : (
              <Search
                size={14}
                style={{ position: "absolute", insetInlineStart: "0.75rem", top: "0.625rem", color: "#8a92a6" }}
              />
            )}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. NGK-7092 or Iridium Spark Plugs"
              style={{ ...fieldStyle, paddingInlineStart: "2rem" }}
            />
            {results.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  zIndex: 10,
                  top: "100%",
                  insetInlineStart: 0,
                  insetInlineEnd: 0,
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  backgroundColor: "var(--card, #fff)",
                  marginTop: "0.25rem",
                  maxHeight: "220px",
                  overflowY: "auto",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              >
                {results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSelectedPart(r);
                      setResults([]);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "start",
                      padding: "0.5rem 0.75rem",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#081a2f" }}>
                      {r.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#8a92a6" }}>
                      {r.manufacturerName} · {r.partNumber} · {r.categoryName}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <p style={{ fontSize: "0.75rem", color: "#8a92a6", marginTop: "0.375rem" }}>
              Can&apos;t find it? An admin manages the canonical catalog — contact support to have a
              new part added.
            </p>
          </div>
        )}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={labelStyle}>Storage Location *</label>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          style={fieldStyle}
        >
          {locations.length === 0 && <option value="">No locations — add one first</option>}
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 1rem",
          marginBottom: "1rem",
        }}
      >
        <div>
          <label style={labelStyle}>Price (AED) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={fieldStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Initial Quantity</label>
          <input
            type="number"
            min="0"
            value={qtyAvailable}
            onChange={(e) => setQtyAvailable(e.target.value)}
            style={fieldStyle}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <label style={labelStyle}>Reorder Threshold</label>
          <input
            type="number"
            min="0"
            value={reorderThreshold}
            onChange={(e) => setReorderThreshold(e.target.value)}
            style={fieldStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Damaged/Defective Units</label>
          <input
            type="number"
            min="0"
            value={qtyDamaged}
            onChange={(e) => setQtyDamaged(e.target.value)}
            style={fieldStyle}
          />
          <p style={{ fontSize: "0.6875rem", color: "#8a92a6", marginTop: "0.25rem" }}>
            Tracked separately in a quarantine sub-inventory.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          type="submit"
          disabled={submitting}
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
          {submitting ? "Saving..." : "Save Item"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/vendor/inventory" as never)}
          style={{
            padding: "0.5rem 1.25rem",
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            fontSize: "0.8125rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
