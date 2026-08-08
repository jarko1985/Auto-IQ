"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { formatCurrency } from "@/lib/utils";

interface Job {
  id: string;
  description: string;
  mechanicMembershipId: string | null;
  hours: number;
  rateMinorUnits: number;
  totalMinorUnits: number;
}
interface Part {
  id: string;
  partName: string;
  sku: string | null;
  quantity: number;
  unitPriceMinorUnits: number;
  totalMinorUnits: number;
}
interface RepairOrderForEstimate {
  id: string;
  repairOrderNumber: string;
  status: string;
  customerName: string;
  vehicleLabel: string;
  confirmedDiagnosis: string | null;
  customerNotes: string | null;
  jobs: Job[];
  parts: Part[];
  laborSubtotalMinorUnits: number;
  partsSubtotalMinorUnits: number;
  vatMinorUnits: number;
  totalMinorUnits: number;
  currency: string;
}
interface Mechanic {
  membershipId: string;
  name: string;
}
interface Props {
  repairOrder: RepairOrderForEstimate;
  mechanics: Mechanic[];
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.375rem 0.5rem",
  border: "1px solid var(--border)",
  borderRadius: "0.375rem",
  fontSize: "0.8125rem",
  boxSizing: "border-box",
};
const cardStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  overflow: "hidden",
  marginBottom: "1.25rem",
  backgroundColor: "#fff",
};

export function EstimateBuilderView({ repairOrder, mechanics }: Props) {
  const router = useRouter();
  const [ro, setRo] = useState(repairOrder);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState(ro.customerNotes ?? "");
  const [jobDesc, setJobDesc] = useState("");
  const [jobHours, setJobHours] = useState("1");
  const [jobRate, setJobRate] = useState("150");
  const [partName, setPartName] = useState("");
  const [partQty, setPartQty] = useState("1");
  const [partPrice, setPartPrice] = useState("0");

  const editable = ["DIAGNOSIS", "ESTIMATE_DRAFT", "REJECTED"].includes(ro.status);

  async function api(path: string, method: string, body?: unknown) {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/garages/me/repair-orders/${ro.id}${path}`, {
        method,
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json()) as {
        data?: Record<string, unknown>;
        error?: { message?: string };
      };
      if (!res.ok || !json.data) {
        toast.error(json.error?.message ?? "Action failed.");
        return null;
      }
      const data = json.data;
      setRo({
        ...ro,
        status: data.status as string,
        jobs: data.jobs as Job[],
        parts: data.parts as Part[],
        laborSubtotalMinorUnits: data.laborSubtotalMinorUnits as number,
        partsSubtotalMinorUnits: data.partsSubtotalMinorUnits as number,
        vatMinorUnits: data.vatMinorUnits as number,
        totalMinorUnits: data.totalMinorUnits as number,
      });
      router.refresh();
      return data;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
        >
          Estimate Builder — #{ro.repairOrderNumber}
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#5b6472" }}>
          {ro.customerName} · {ro.vehicleLabel}
          {ro.confirmedDiagnosis && ` · ${ro.confirmedDiagnosis}`}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        <div>
          <div style={cardStyle}>
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border)",
                backgroundColor: "#f7fafd",
              }}
            >
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
                Labor Allocation
              </h3>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
              <thead>
                <tr style={{ textAlign: "start" }}>
                  {["Description", "Mechanic", "Hours", "Rate", "Subtotal", ""].map((h) => (
                    <th
                      key={h}
                      style={{ padding: "0.5rem 1rem", color: "#8a92a6", fontWeight: 600 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ro.jobs.map((j) => (
                  <tr key={j.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem 1rem", color: "#081a2f" }}>{j.description}</td>
                    <td style={{ padding: "0.5rem 1rem", color: "#5b6472" }}>
                      {mechanics.find((m) => m.membershipId === j.mechanicMembershipId)?.name ??
                        "—"}
                    </td>
                    <td style={{ padding: "0.5rem 1rem", color: "#5b6472" }}>{j.hours}</td>
                    <td style={{ padding: "0.5rem 1rem", color: "#5b6472" }}>
                      {formatCurrency(j.rateMinorUnits, ro.currency)}
                    </td>
                    <td style={{ padding: "0.5rem 1rem", fontWeight: 700, color: "#081a2f" }}>
                      {formatCurrency(j.totalMinorUnits, ro.currency)}
                    </td>
                    <td>
                      {editable && (
                        <button
                          type="button"
                          onClick={() =>
                            void api(`/jobs/${j.id}`, "DELETE").then(
                              (ok) => ok && toast.success("Labor item removed."),
                            )
                          }
                          style={{
                            border: "none",
                            background: "none",
                            color: "#dc2626",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {editable && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
                  gap: "0.5rem",
                  padding: "0.875rem 1.25rem",
                }}
              >
                <input
                  placeholder="Description"
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="number"
                  placeholder="Hours"
                  step="0.5"
                  value={jobHours}
                  onChange={(e) => setJobHours(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="number"
                  placeholder="Rate/hr"
                  value={jobRate}
                  onChange={(e) => setJobRate(e.target.value)}
                  style={inputStyle}
                />
                <div />
                <button
                  type="button"
                  disabled={busy || !jobDesc.trim()}
                  style={{
                    padding: "0.375rem 0.75rem",
                    backgroundColor: "#00b8d9",
                    color: "#fff",
                    border: "none",
                    borderRadius: "0.375rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  onClick={async () => {
                    const ok = await api("/jobs", "POST", {
                      description: jobDesc.trim(),
                      hours: Number(jobHours),
                      rateMinorUnits: Math.round(Number(jobRate) * 100),
                    });
                    if (ok) {
                      setJobDesc("");
                      setJobHours("1");
                      setJobRate("150");
                      toast.success("Labor item added.");
                    }
                  }}
                >
                  Add Labor Item
                </button>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border)",
                backgroundColor: "#f7fafd",
              }}
            >
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
                Parts &amp; Materials
              </h3>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
              <thead>
                <tr style={{ textAlign: "start" }}>
                  {["Part / SKU", "Qty", "Unit Price", "Subtotal", ""].map((h) => (
                    <th
                      key={h}
                      style={{ padding: "0.5rem 1rem", color: "#8a92a6", fontWeight: 600 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ro.parts.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem 1rem", color: "#081a2f" }}>
                      {p.partName}
                      {p.sku && (
                        <div style={{ fontSize: "0.6875rem", color: "#8a92a6" }}>SKU: {p.sku}</div>
                      )}
                    </td>
                    <td style={{ padding: "0.5rem 1rem", color: "#5b6472" }}>{p.quantity}</td>
                    <td style={{ padding: "0.5rem 1rem", color: "#5b6472" }}>
                      {formatCurrency(p.unitPriceMinorUnits, ro.currency)}
                    </td>
                    <td style={{ padding: "0.5rem 1rem", fontWeight: 700, color: "#081a2f" }}>
                      {formatCurrency(p.totalMinorUnits, ro.currency)}
                    </td>
                    <td>
                      {editable && (
                        <button
                          type="button"
                          onClick={() =>
                            void api(`/parts/${p.id}`, "DELETE").then(
                              (ok) => ok && toast.success("Part item removed."),
                            )
                          }
                          style={{
                            border: "none",
                            background: "none",
                            color: "#dc2626",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {editable && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr auto",
                  gap: "0.5rem",
                  padding: "0.875rem 1.25rem",
                }}
              >
                <input
                  placeholder="Part name"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={partQty}
                  onChange={(e) => setPartQty(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="number"
                  placeholder="Unit price"
                  value={partPrice}
                  onChange={(e) => setPartPrice(e.target.value)}
                  style={inputStyle}
                />
                <button
                  type="button"
                  disabled={busy || !partName.trim()}
                  style={{
                    padding: "0.375rem 0.75rem",
                    backgroundColor: "#00b8d9",
                    color: "#fff",
                    border: "none",
                    borderRadius: "0.375rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  onClick={async () => {
                    const ok = await api("/parts", "POST", {
                      partName: partName.trim(),
                      quantity: Number(partQty),
                      unitPriceMinorUnits: Math.round(Number(partPrice) * 100),
                    });
                    if (ok) {
                      setPartName("");
                      setPartQty("1");
                      setPartPrice("0");
                      toast.success("Part item added.");
                    }
                  }}
                >
                  Add Part Item
                </button>
              </div>
            )}
          </div>

          <div style={{ ...cardStyle, padding: "1.25rem" }}>
            <h3
              style={{
                fontSize: "0.9375rem",
                fontWeight: 700,
                color: "#081a2f",
                marginTop: 0,
                marginBottom: "0.75rem",
              }}
            >
              Additional Notes to Customer
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!editable}
              placeholder="Enter specific instructions or observations for the customer here…"
              style={{ ...inputStyle, minHeight: "6rem" }}
            />
          </div>
        </div>

        <div style={{ position: "sticky", top: "1.5rem" }}>
          <div
            style={{
              backgroundColor: "#081a2f",
              color: "#fff",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              marginBottom: "1.25rem",
            }}
          >
            <h3
              style={{
                fontSize: "0.9375rem",
                fontWeight: 700,
                color: "#00b8d9",
                marginTop: 0,
                marginBottom: "1.25rem",
              }}
            >
              Financial Summary
            </h3>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8125rem",
                opacity: 0.85,
                marginBottom: "0.625rem",
              }}
            >
              <span>Labor Subtotal</span>
              <span>{formatCurrency(ro.laborSubtotalMinorUnits, ro.currency)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8125rem",
                opacity: 0.85,
                marginBottom: "0.625rem",
              }}
            >
              <span>Parts Subtotal</span>
              <span>{formatCurrency(ro.partsSubtotalMinorUnits, ro.currency)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8125rem",
                opacity: 0.85,
                marginBottom: "1rem",
              }}
            >
              <span>VAT (5%)</span>
              <span>{formatCurrency(ro.vatMinorUnits, ro.currency)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                paddingTop: "1rem",
                borderTop: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <span style={{ fontSize: "0.9375rem", fontWeight: 700 }}>Grand Total</span>
              <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#00b8d9" }}>
                {formatCurrency(ro.totalMinorUnits, ro.currency)}
              </span>
            </div>
            {editable && (
              <button
                type="button"
                disabled={busy || (ro.jobs.length === 0 && ro.parts.length === 0)}
                style={{
                  width: "100%",
                  marginTop: "1.25rem",
                  padding: "0.75rem",
                  backgroundColor: "#00b8d9",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                onClick={() =>
                  void api("/send-estimate", "POST", {
                    customerNotes: notes.trim() || undefined,
                  }).then((ok) => ok && toast.success("Estimate sent to customer."))
                }
              >
                Send Estimate to Customer
              </button>
            )}
            {!editable && (
              <p style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "1rem" }}>
                This estimate has already been sent and can no longer be edited here.
              </p>
            )}
          </div>

          <div
            style={{
              borderRadius: "0.75rem",
              overflow: "hidden",
              border: "1px solid var(--border)",
              aspectRatio: "16/10",
              position: "relative",
            }}
          >
            <Image
              src="/images/repair-orders/estimate-builder-history-thumb.jpg"
              alt={ro.vehicleLabel}
              fill
              style={{ objectFit: "cover" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
