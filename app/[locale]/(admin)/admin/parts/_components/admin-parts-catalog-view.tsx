"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Plus, CheckCircle2, XCircle, Boxes } from "lucide-react";
import { createPartSchema, type CreatePartInput } from "@/features/catalog/schemas";
import { getPartImage } from "@/features/catalog/part-image";
import { InlineSpinner } from "@/components/ui/inline-spinner";

interface PartRow {
  id: string;
  name: string;
  manufacturerName: string;
  partNumber: string;
  origin: string;
  approvalState: string;
  categoryName: string;
  submittedByVendorName: string | null;
  inventoryCount: number;
  compatibilityCount: number;
}

interface Category {
  id: string;
  code: string;
  name: string;
}

interface Props {
  initialParts: PartRow[];
  categories: Category[];
}

const DEFAULT_STATE = { bg: "rgba(217,119,6,0.12)", color: "#d97706", label: "Pending Review" };
const STATE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  APPROVED: { bg: "rgba(22,163,74,0.12)", color: "#16a34a", label: "Approved" },
  PENDING_REVIEW: DEFAULT_STATE,
  REJECTED: { bg: "rgba(220,38,38,0.12)", color: "#dc2626", label: "Rejected" },
};

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
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#5b6472",
  marginBottom: "0.25rem",
};

export function AdminPartsCatalogView({ initialParts, categories }: Props) {
  const [parts, setParts] = useState(initialParts);
  const [approvalFilter, setApprovalFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePartInput>({
    resolver: zodResolver(createPartSchema),
    defaultValues: { origin: "AFTERMARKET", alternatePartNumbers: [] },
  });

  async function refetch() {
    setIsRefetching(true);
    try {
      const params = new URLSearchParams();
      if (approvalFilter) params.set("approvalState", approvalFilter);
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (query) params.set("query", query);
      params.set("limit", "50");

      const res = await fetch(`/api/v1/admin/parts?${params.toString()}`);
      if (res.ok) {
        const body = (await res.json()) as { data: (PartRow & { category: { name: string } })[] };
        setParts(
          body.data.map((p) => ({
            id: p.id,
            name: p.name,
            manufacturerName: p.manufacturerName,
            partNumber: p.partNumber,
            origin: p.origin,
            approvalState: p.approvalState,
            categoryName: p.category?.name ?? p.categoryName,
            submittedByVendorName: p.submittedByVendorName,
            inventoryCount: p.inventoryCount,
            compatibilityCount: p.compatibilityCount,
          })),
        );
      }
    } finally {
      setIsRefetching(false);
    }
  }

  useEffect(() => {
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvalFilter, categoryFilter]);

  async function onSubmit(data: CreatePartInput) {
    const res = await fetch("/api/v1/admin/parts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: { message?: string } };
      toast.error(body.error?.message ?? "Failed to create part.");
      return;
    }
    reset({ origin: "AFTERMARKET", alternatePartNumbers: [] });
    setShowForm(false);
    await refetch();
    toast.success("Part added.");
  }

  async function approve(id: string) {
    setActioningId(id);
    try {
      const res = await fetch(`/api/v1/admin/parts/${id}/approve`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        toast.error(body.error?.message ?? "Failed to approve part.");
        return;
      }
      await refetch();
      toast.success("Part approved.");
    } finally {
      setActioningId(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt("Reason for rejecting this part:");
    if (!reason) return;
    setActioningId(id);
    try {
      const res = await fetch(`/api/v1/admin/parts/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        toast.error(body.error?.message ?? "Failed to reject part.");
        return;
      }
      await refetch();
      toast.success("Part rejected.");
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div>
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
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            style={{ ...fieldStyle, width: "auto" }}
          >
            <option value="">All statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ ...fieldStyle, width: "auto" }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Search name, manufacturer, part #..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void refetch();
            }}
            style={{ ...fieldStyle, width: "260px" }}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#081a2f",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.8125rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={14} />
          Add Part
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            padding: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 1rem",
              marginBottom: "1rem",
            }}
          >
            <div>
              <label style={labelStyle}>Category *</label>
              <select style={fieldStyle} {...register("categoryId")}>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p style={{ fontSize: "0.75rem", color: "#dc2626" }}>{errors.categoryId.message}</p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Origin *</label>
              <select style={fieldStyle} {...register("origin")}>
                <option value="OEM">OEM</option>
                <option value="AFTERMARKET">Aftermarket</option>
              </select>
            </div>
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
              <label style={labelStyle}>Manufacturer *</label>
              <input
                style={fieldStyle}
                placeholder="e.g. Brembo"
                {...register("manufacturerName")}
              />
              {errors.manufacturerName && (
                <p style={{ fontSize: "0.75rem", color: "#dc2626" }}>
                  {errors.manufacturerName.message}
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Part Number *</label>
              <input style={fieldStyle} placeholder="e.g. BRM-9921-X" {...register("partNumber")} />
              {errors.partNumber && (
                <p style={{ fontSize: "0.75rem", color: "#dc2626" }}>{errors.partNumber.message}</p>
              )}
            </div>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Part Name *</label>
            <input
              style={fieldStyle}
              placeholder="e.g. Premium Ceramic Brake Pads (Front)"
              {...register("name")}
            />
            {errors.name && (
              <p style={{ fontSize: "0.75rem", color: "#dc2626" }}>{errors.name.message}</p>
            )}
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...fieldStyle, minHeight: "4rem" }}
              placeholder="Short description shown to customers and vendors"
              {...register("description")}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "0.5rem 1.25rem",
              backgroundColor: isSubmitting ? "#94a3b8" : "#00b8d9",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Saving..." : "Save Part"}
          </button>
        </form>
      )}

      {isRefetching && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <InlineSpinner color="#5b6472" size={12} />
          <span style={{ fontSize: "0.8125rem", color: "#5b6472" }}>Refreshing...</span>
        </div>
      )}
      {parts.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "#8a92a6" }}>No parts match these filters.</p>
      ) : (
        <div
          style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f7fafd", textAlign: "start" }}>
                {["Part", "Category", "Origin", "Status", "Submitted By", "Stock/Compat.", ""].map(
                  (h) => (
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
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => {
                const state = STATE_STYLES[p.approvalState] ?? DEFAULT_STATE;
                const photo = getPartImage({ partNumber: p.partNumber });
                return (
                  <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        <div
                          style={{
                            position: "relative",
                            width: "40px",
                            height: "40px",
                            flexShrink: 0,
                            borderRadius: "0.375rem",
                            backgroundColor: "#f7fafd",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                          }}
                        >
                          {photo ? (
                            <Image
                              src={photo}
                              alt={p.name}
                              fill
                              sizes="40px"
                              style={{ objectFit: "cover" }}
                            />
                          ) : (
                            <Boxes size={18} color="#8a92a6" />
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "#081a2f" }}>{p.name}</div>
                          <div style={{ color: "#8a92a6", fontSize: "0.75rem" }}>
                            {p.manufacturerName} · {p.partNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#5b6472" }}>{p.categoryName}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#5b6472" }}>{p.origin}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          display: "inline-block",
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
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#5b6472" }}>
                      {p.submittedByVendorName ?? "—"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#5b6472" }}>
                      {p.inventoryCount} SKU{p.inventoryCount === 1 ? "" : "s"} ·{" "}
                      {p.compatibilityCount} rule{p.compatibilityCount === 1 ? "" : "s"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        {p.approvalState === "PENDING_REVIEW" && (
                          <>
                            <button
                              type="button"
                              disabled={actioningId === p.id}
                              onClick={() => void approve(p.id)}
                              title="Approve"
                              style={{
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                color: "#16a34a",
                                display: "flex",
                              }}
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button
                              type="button"
                              disabled={actioningId === p.id}
                              onClick={() => void reject(p.id)}
                              title="Reject"
                              style={{
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                color: "#dc2626",
                                display: "flex",
                              }}
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                        <Link
                          href={`/admin/parts/${p.id}` as never}
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "#00b8d9",
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
