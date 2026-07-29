"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { formatCurrency } from "@/lib/utils";
import { SelectChevron } from "@/components/forms/field-styles";

interface LineItem {
  id: string;
  description?: string;
  partName?: string;
  totalMinorUnits: number;
}
interface RepairOrderForInvoice {
  id: string;
  repairOrderNumber: string;
  status: string;
  customerName: string;
  vehicleLabel: string;
  jobs: LineItem[];
  parts: LineItem[];
  laborSubtotalMinorUnits: number;
  partsSubtotalMinorUnits: number;
  vatMinorUnits: number;
  totalMinorUnits: number;
  currency: string;
  warrantyDurationMonths: number | null;
  warrantyCoverageItems: string[];
  warrantyTerms: string | null;
  outcomeNotes: string | null;
  customerVerifiedOutcomeAt: string | null;
  invoicedAt: string | null;
}
interface Props {
  repairOrder: RepairOrderForInvoice;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: "0.8125rem",
  boxSizing: "border-box",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle,
  paddingInlineEnd: "1.75rem",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

export function InvoiceCompletionView({ repairOrder }: Props) {
  const router = useRouter();
  const [ro, setRo] = useState(repairOrder);
  const [busy, setBusy] = useState(false);
  const [warrantyDuration, setWarrantyDuration] = useState(
    ro.warrantyDurationMonths?.toString() ?? "6",
  );
  const [coverageInput, setCoverageInput] = useState(ro.warrantyCoverageItems.join(", "));
  const [warrantyTerms, setWarrantyTerms] = useState(
    ro.warrantyTerms ??
      "Standard parts and labor warranty covers defects in materials or workmanship under normal driving conditions.",
  );
  const [outcomeNotes, setOutcomeNotes] = useState(ro.outcomeNotes ?? "");

  const editable = ro.status === "COMPLETED";

  async function finalize() {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/garages/me/repair-orders/${ro.id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warrantyDurationMonths: warrantyDuration ? Number(warrantyDuration) : undefined,
          warrantyCoverageItems: coverageInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          warrantyTerms: warrantyTerms.trim() || undefined,
          outcomeNotes: outcomeNotes.trim(),
        }),
      });
      const json = (await res.json()) as {
        data?: Record<string, unknown>;
        error?: { message?: string };
      };
      if (!res.ok || !json.data) {
        toast.error(json.error?.message ?? "Failed to finalize invoice.");
        return;
      }
      setRo({
        ...ro,
        status: json.data.status as string,
        invoicedAt: json.data.invoicedAt as string,
      });
      router.refresh();
      toast.success("Repair order invoiced and closed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "1.5rem",
          backgroundColor: "#fff",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          padding: "1.25rem 1.5rem",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              marginBottom: "0.25rem",
            }}
          >
            <span
              style={{
                padding: "0.1875rem 0.625rem",
                borderRadius: "9999px",
                fontSize: "0.6875rem",
                fontWeight: 700,
                backgroundColor:
                  ro.status === "INVOICED" ? "rgba(22,163,74,0.12)" : "rgba(0,184,217,0.12)",
                color: ro.status === "INVOICED" ? "#16a34a" : "#00b8d9",
              }}
            >
              {ro.status === "INVOICED" ? "Invoiced" : "Ready to Close"}
            </span>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
              {ro.customerName}
            </h1>
          </div>
          <p style={{ fontSize: "0.8125rem", color: "#5b6472" }}>
            {ro.vehicleLabel} · Repair Order #{ro.repairOrderNumber}
          </p>
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]"
        style={{ alignItems: "start" }}
      >
        <div>
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              overflow: "hidden",
              marginBottom: "1.25rem",
            }}
          >
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
                Final Invoice
              </h3>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: "420px",
                  borderCollapse: "collapse",
                  fontSize: "0.8125rem",
                }}
              >
                <thead>
                  <tr style={{ textAlign: "start", backgroundColor: "#f7fafd" }}>
                    {["Description", "Category", "Amount"].map((h) => (
                      <th
                        key={h}
                        style={{ padding: "0.5rem 1.25rem", color: "#8a92a6", fontWeight: 600 }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ro.jobs.map((j) => (
                    <tr key={j.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.625rem 1.25rem", color: "#081a2f" }}>
                        {j.description}
                      </td>
                      <td style={{ padding: "0.625rem 1.25rem" }}>
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "0.25rem",
                            backgroundColor: "rgba(0,184,217,0.12)",
                            color: "#00b8d9",
                          }}
                        >
                          Labor
                        </span>
                      </td>
                      <td
                        style={{ padding: "0.625rem 1.25rem", color: "#081a2f", fontWeight: 600 }}
                      >
                        {formatCurrency(j.totalMinorUnits, ro.currency)}
                      </td>
                    </tr>
                  ))}
                  {ro.parts.map((p) => (
                    <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.625rem 1.25rem", color: "#081a2f" }}>
                        {p.partName}
                      </td>
                      <td style={{ padding: "0.625rem 1.25rem" }}>
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "0.25rem",
                            backgroundColor: "rgba(8,26,47,0.08)",
                            color: "#081a2f",
                          }}
                        >
                          Parts
                        </span>
                      </td>
                      <td
                        style={{ padding: "0.625rem 1.25rem", color: "#081a2f", fontWeight: 600 }}
                      >
                        {formatCurrency(p.totalMinorUnits, ro.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              style={{
                padding: "1.25rem",
                backgroundColor: "#f7fafd",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <div style={{ width: "16rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.8125rem",
                    color: "#5b6472",
                    marginBottom: "0.375rem",
                  }}
                >
                  <span>Subtotal</span>
                  <span>
                    {formatCurrency(
                      ro.laborSubtotalMinorUnits + ro.partsSubtotalMinorUnits,
                      ro.currency,
                    )}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.8125rem",
                    color: "#5b6472",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span>VAT (5%)</span>
                  <span>{formatCurrency(ro.vatMinorUnits, ro.currency)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 800,
                    fontSize: "1rem",
                    color: "#081a2f",
                    paddingTop: "0.5rem",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <span>Total</span>
                  <span>{formatCurrency(ro.totalMinorUnits, ro.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              padding: "1.5rem",
            }}
          >
            <h3
              style={{
                fontSize: "0.9375rem",
                fontWeight: 700,
                color: "#081a2f",
                marginTop: 0,
                marginBottom: "0.75rem",
              }}
            >
              Verified Outcome
            </h3>
            {editable ? (
              <textarea
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                placeholder="Describe the work performed and how the outcome was verified…"
                style={{ ...inputStyle, minHeight: "5rem", marginBottom: "1rem" }}
              />
            ) : (
              <p style={{ fontSize: "0.8125rem", color: "#5b6472", marginBottom: "1rem" }}>
                {ro.outcomeNotes}
              </p>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: "1rem",
                borderTop: "1px solid var(--border)",
                fontSize: "0.8125rem",
              }}
            >
              <div>
                <div
                  style={{ color: "#8a92a6", textTransform: "uppercase", fontSize: "0.6875rem" }}
                >
                  Customer Confirmation
                </div>
                <div style={{ color: "#081a2f", fontWeight: 600 }}>
                  {ro.customerVerifiedOutcomeAt
                    ? "Verified via Digital Portal"
                    : "Awaiting customer verification"}
                </div>
              </div>
              {ro.customerVerifiedOutcomeAt && (
                <div style={{ textAlign: "end" }}>
                  <div
                    style={{ color: "#8a92a6", textTransform: "uppercase", fontSize: "0.6875rem" }}
                  >
                    Timestamp
                  </div>
                  <div style={{ color: "#081a2f" }}>
                    {new Date(ro.customerVerifiedOutcomeAt).toLocaleString("en-AE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              marginBottom: "1.25rem",
            }}
          >
            <h3
              style={{
                fontSize: "0.9375rem",
                fontWeight: 700,
                color: "#081a2f",
                marginTop: 0,
                marginBottom: "1rem",
              }}
            >
              Warranty Detail
            </h3>
            <div style={{ marginBottom: "0.875rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#8a92a6", marginBottom: "0.25rem" }}>
                Duration (months)
              </div>
              {editable ? (
                <div style={{ position: "relative" }}>
                  <select
                    value={warrantyDuration}
                    onChange={(e) => setWarrantyDuration(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                    <option value="24">24 Months</option>
                  </select>
                  <SelectChevron size={14} insetInlineEnd="0.625rem" />
                </div>
              ) : (
                <p style={{ fontSize: "0.8125rem", color: "#081a2f", fontWeight: 600 }}>
                  {ro.warrantyDurationMonths} Months
                </p>
              )}
            </div>
            <div style={{ marginBottom: "0.875rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#8a92a6", marginBottom: "0.25rem" }}>
                Covers (comma separated)
              </div>
              {editable ? (
                <input
                  value={coverageInput}
                  onChange={(e) => setCoverageInput(e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                  {ro.warrantyCoverageItems.map((c) => (
                    <span
                      key={c}
                      style={{
                        fontSize: "0.75rem",
                        padding: "0.125rem 0.5rem",
                        backgroundColor: "#f7fafd",
                        borderRadius: "0.375rem",
                        color: "#5b6472",
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#8a92a6", marginBottom: "0.25rem" }}>
                Warranty Terms
              </div>
              {editable ? (
                <textarea
                  value={warrantyTerms}
                  onChange={(e) => setWarrantyTerms(e.target.value)}
                  style={{ ...inputStyle, minHeight: "6rem" }}
                />
              ) : (
                <p style={{ fontSize: "0.75rem", color: "#5b6472" }}>{ro.warrantyTerms}</p>
              )}
            </div>
          </div>

          <div
            style={{
              borderRadius: "0.75rem",
              overflow: "hidden",
              border: "1px solid var(--border)",
              position: "relative",
              aspectRatio: "1/1",
              marginBottom: "1.25rem",
            }}
          >
            <Image
              src="/images/repair-orders/invoice-completion-vehicle.jpg"
              alt="Technician"
              fill
              style={{ objectFit: "cover" }}
            />
          </div>

          {editable ? (
            <button
              type="button"
              disabled={busy || !outcomeNotes.trim()}
              style={{
                width: "100%",
                padding: "0.875rem",
                backgroundColor: "#00b8d9",
                color: "#fff",
                border: "none",
                borderRadius: "0.625rem",
                fontSize: "0.875rem",
                fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer",
              }}
              onClick={() => void finalize()}
            >
              Complete Repair Order &amp; Close
            </button>
          ) : (
            <p
              style={{
                fontSize: "0.8125rem",
                color: "#16a34a",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              Invoiced {ro.invoicedAt && new Date(ro.invoicedAt).toLocaleDateString("en-AE")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
