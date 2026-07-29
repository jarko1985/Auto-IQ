"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { formatCurrency } from "@/lib/utils";
import { SelectChevron } from "@/components/forms/field-styles";

interface Job {
  id: string;
  description: string;
  mechanicMembershipId: string | null;
  hours: number;
  rateMinorUnits: number;
  totalMinorUnits: number;
  status: string;
}
interface Part {
  id: string;
  partName: string;
  sku: string | null;
  quantity: number;
  unitPriceMinorUnits: number;
  totalMinorUnits: number;
}
interface QualityCheck {
  id: string;
  label: string;
  isChecked: boolean;
}
interface StatusHistoryEntry {
  id: string;
  toStatus: string;
  note: string | null;
  createdAt: string;
}
interface RepairOrderDetail {
  id: string;
  repairOrderNumber: string;
  status: string;
  serviceType: string;
  customerName: string;
  vehicleLabel: string;
  plateNumber: string | null;
  inspectionNotes: string | null;
  odometerReadingKm: number | null;
  aiSuggestedDiagnosis: string | null;
  aiConfidence: number | null;
  confirmedDiagnosis: string | null;
  garageSummary: string | null;
  diagnosticResultDegraded: boolean;
  leadMechanic: { membershipId: string; name: string; bio: string | null } | null;
  jobs: Job[];
  parts: Part[];
  qualityChecks: QualityCheck[];
  statusHistory: StatusHistoryEntry[];
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
  repairOrder: RepairOrderDetail;
  mechanics: Mechanic[];
}

const STEPS = [
  { key: "INSPECTION", label: "Inspection" },
  { key: "DIAGNOSIS", label: "Diagnosis" },
  { key: "AWAITING_APPROVAL", label: "Estimate Sent" },
  { key: "APPROVED", label: "Approved" },
  { key: "IN_REPAIR", label: "In Repair" },
  { key: "QUALITY_CHECK", label: "Quality Check" },
  { key: "COMPLETED", label: "Completed" },
];
const STEP_ORDER = ["CREATED", ...STEPS.map((s) => s.key), "INVOICED"];

const STATUS_LABELS: Record<string, string> = {
  CREATED: "New",
  INSPECTION: "Inspection",
  DIAGNOSIS: "Diagnosis",
  ESTIMATE_DRAFT: "Estimate Draft",
  AWAITING_APPROVAL: "Awaiting Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  IN_REPAIR: "In Repair",
  QUALITY_CHECK: "Quality Check",
  COMPLETED: "Completed",
  INVOICED: "Invoiced",
  CANCELLED: "Cancelled",
};

function mapApiRepairOrder(data: Record<string, unknown>): RepairOrderDetail {
  const vehicle = data.vehicle as {
    year: number;
    makeName: string;
    modelName: string;
    plateNumber: string | null;
  };
  const customer = data.customer as { name: string | null; email: string };
  const leadMechanic = data.leadMechanic as {
    id: string;
    user: { name: string | null; email: string };
    mechanicProfile: { bio: string | null } | null;
  } | null;
  return {
    id: data.id as string,
    repairOrderNumber: data.repairOrderNumber as string,
    status: data.status as string,
    serviceType: data.serviceType as string,
    customerName: customer.name ?? customer.email,
    vehicleLabel: `${vehicle.year} ${vehicle.makeName} ${vehicle.modelName}`,
    plateNumber: vehicle.plateNumber,
    inspectionNotes: data.inspectionNotes as string | null,
    odometerReadingKm: data.odometerReadingKm as number | null,
    aiSuggestedDiagnosis: data.aiSuggestedDiagnosis as string | null,
    aiConfidence: data.aiConfidence as number | null,
    confirmedDiagnosis: data.confirmedDiagnosis as string | null,
    garageSummary: data.garageSummary as string | null,
    diagnosticResultDegraded: Boolean(data.diagnosticResultDegraded),
    leadMechanic: leadMechanic
      ? {
          membershipId: leadMechanic.id,
          name: leadMechanic.user.name ?? leadMechanic.user.email,
          bio: leadMechanic.mechanicProfile?.bio ?? null,
        }
      : null,
    jobs: (data.jobs as Job[]) ?? [],
    parts: (data.parts as Part[]) ?? [],
    qualityChecks: (data.qualityChecks as QualityCheck[]) ?? [],
    statusHistory: (data.statusHistory as StatusHistoryEntry[]) ?? [],
    laborSubtotalMinorUnits: data.laborSubtotalMinorUnits as number,
    partsSubtotalMinorUnits: data.partsSubtotalMinorUnits as number,
    vatMinorUnits: data.vatMinorUnits as number,
    totalMinorUnits: data.totalMinorUnits as number,
    currency: data.currency as string,
  };
}

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  padding: "1.25rem",
  marginBottom: "1.25rem",
  backgroundColor: "#fff",
};
const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#8a92a6",
  marginBottom: "0.25rem",
};
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
const primaryBtn: React.CSSProperties = {
  padding: "0.625rem 1.125rem",
  backgroundColor: "#00b8d9",
  color: "#fff",
  border: "none",
  borderRadius: "0.5rem",
  fontSize: "0.8125rem",
  fontWeight: 600,
  cursor: "pointer",
};
const secondaryBtn: React.CSSProperties = {
  padding: "0.625rem 1.125rem",
  backgroundColor: "transparent",
  color: "#5b6472",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: "0.8125rem",
  fontWeight: 600,
  cursor: "pointer",
};

export function GarageRepairOrderDetailView({ repairOrder, mechanics }: Props) {
  const router = useRouter();
  const [ro, setRo] = useState(repairOrder);
  const [busy, setBusy] = useState(false);

  const [inspectionNotes, setInspectionNotes] = useState(ro.inspectionNotes ?? "");
  const [odometer, setOdometer] = useState(ro.odometerReadingKm?.toString() ?? "");
  const [confirmedDiagnosis, setConfirmedDiagnosis] = useState(ro.confirmedDiagnosis ?? "");
  const [jobDesc, setJobDesc] = useState("");
  const [jobHours, setJobHours] = useState("1");
  const [jobRate, setJobRate] = useState("150");
  const [jobMechanic, setJobMechanic] = useState("");
  const [partName, setPartName] = useState("");
  const [partSku, setPartSku] = useState("");
  const [partQty, setPartQty] = useState("1");
  const [partPrice, setPartPrice] = useState("0");
  const [qcLabel, setQcLabel] = useState("");
  const [reassignMechanic, setReassignMechanic] = useState("");
  const [cancelReason, setCancelReason] = useState<string | null>(null);

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
      const updated = mapApiRepairOrder(json.data);
      setRo(updated);
      router.refresh();
      return updated;
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = STATUS_LABELS[ro.status] ?? ro.status;
  const currentStepIdx = STEP_ORDER.indexOf(ro.status);
  const estimateEditable = ["DIAGNOSIS", "ESTIMATE_DRAFT", "REJECTED"].includes(ro.status);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <span
              style={{
                padding: "0.1875rem 0.625rem",
                borderRadius: "9999px",
                fontSize: "0.6875rem",
                fontWeight: 700,
                backgroundColor: "rgba(0,184,217,0.12)",
                color: "#00b8d9",
              }}
            >
              {statusLabel}
            </span>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
              #{ro.repairOrderNumber}
            </h1>
          </div>
          <p style={{ fontSize: "0.8125rem", color: "#5b6472", marginTop: "0.375rem" }}>
            <strong style={{ color: "#081a2f" }}>{ro.customerName}</strong> · {ro.vehicleLabel}
            {ro.plateNumber && ` (Plate ${ro.plateNumber})`}
          </p>
        </div>
        <div
          style={{
            width: "2.75rem",
            height: "2.75rem",
            borderRadius: "9999px",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <Image
            src="/images/repair-orders/ro-detail-vehicle-land-cruiser.jpg"
            alt="Garage technician"
            width={44}
            height={44}
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
          />
        </div>
      </div>

      {/* Stepper */}
      {!["CANCELLED", "REJECTED"].includes(ro.status) && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.75rem", overflowX: "auto" }}>
          {STEPS.map((s) => {
            const stepIdx = STEP_ORDER.indexOf(s.key);
            const done = currentStepIdx > stepIdx || ro.status === "INVOICED";
            const active = currentStepIdx === stepIdx;
            return (
              <div
                key={s.key}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.25rem",
                  minWidth: "5rem",
                }}
              >
                <div
                  style={{
                    width: active ? "0.875rem" : "0.625rem",
                    height: active ? "0.875rem" : "0.625rem",
                    borderRadius: "9999px",
                    backgroundColor: done || active ? "#00b8d9" : "#e2e8f0",
                  }}
                />
                <span
                  style={{
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: active ? "#081a2f" : done ? "#00b8d9" : "#8a92a6",
                  }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div
        className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]"
        style={{ alignItems: "start" }}
      >
        {/* Left column */}
        <div>
          <div style={cardStyle}>
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "#081a2f",
                marginTop: 0,
                marginBottom: "0.875rem",
              }}
            >
              Initial Inspection
            </h3>
            {["CREATED", "INSPECTION"].includes(ro.status) ? (
              <>
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={labelStyle}>Observation Findings</div>
                  <textarea
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    style={{ ...inputStyle, minHeight: "5rem" }}
                  />
                </div>
                <div style={{ marginBottom: "0.875rem" }}>
                  <div style={labelStyle}>Odometer Reading (KM)</div>
                  <input
                    type="number"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <button
                  type="button"
                  disabled={busy || !inspectionNotes.trim() || !odometer}
                  style={primaryBtn}
                  onClick={async () => {
                    const ok = await api("/inspection", "PUT", {
                      inspectionNotes: inspectionNotes.trim(),
                      odometerReadingKm: Number(odometer),
                    });
                    if (ok) toast.success("Inspection saved.");
                  }}
                >
                  Save Inspection
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: "0.8125rem", color: "#081a2f" }}>{ro.inspectionNotes}</p>
                <p style={{ fontSize: "0.75rem", color: "#8a92a6" }}>
                  Odometer: {ro.odometerReadingKm} KM
                </p>
              </>
            )}
          </div>

          <div style={cardStyle}>
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "#081a2f",
                marginTop: 0,
                marginBottom: "0.875rem",
              }}
            >
              Diagnosis
            </h3>
            {ro.aiSuggestedDiagnosis && (
              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: "rgba(0,184,217,0.06)",
                  border: "1px solid rgba(0,184,217,0.2)",
                  borderRadius: "0.5rem",
                  marginBottom: "0.875rem",
                }}
              >
                <div style={{ fontSize: "0.6875rem", color: "#00b8d9", fontWeight: 700 }}>
                  AI SUGGESTED {ro.aiConfidence != null && `· ${ro.aiConfidence}% CONFIDENCE`}
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#081a2f" }}>
                  {ro.aiSuggestedDiagnosis}
                </div>
              </div>
            )}
            {ro.garageSummary && !ro.diagnosticResultDegraded && (
              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: "#f1f4f7",
                  borderRadius: "0.5rem",
                  marginBottom: "0.875rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.6875rem",
                    color: "#5b6472",
                    fontWeight: 700,
                    marginBottom: "0.25rem",
                  }}
                >
                  AI TECHNICAL BRIEF
                </div>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "#081a2f",
                    margin: 0,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {ro.garageSummary}
                </p>
              </div>
            )}
            {["INSPECTION", "DIAGNOSIS"].includes(ro.status) ? (
              <>
                <div style={labelStyle}>Confirmed Diagnosis</div>
                <input
                  value={confirmedDiagnosis}
                  onChange={(e) => setConfirmedDiagnosis(e.target.value)}
                  style={{ ...inputStyle, marginBottom: "0.875rem" }}
                  disabled={ro.status !== "INSPECTION" && ro.status !== "DIAGNOSIS"}
                />
                <button
                  type="button"
                  disabled={busy || !confirmedDiagnosis.trim()}
                  style={primaryBtn}
                  onClick={async () => {
                    const ok = await api("/diagnosis", "PUT", {
                      confirmedDiagnosis: confirmedDiagnosis.trim(),
                    });
                    if (ok) toast.success("Diagnosis saved.");
                  }}
                >
                  Save Diagnosis
                </button>
              </>
            ) : (
              <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "#081a2f" }}>
                {ro.confirmedDiagnosis}
              </p>
            )}
          </div>

          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.875rem",
              }}
            >
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
                Jobs &amp; Labor
              </h3>
              {ro.status === "IN_REPAIR" && (
                <a
                  href={`/garage/repair-orders/${ro.id}/estimate` as never}
                  style={{
                    fontSize: "0.75rem",
                    color: "#00b8d9",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  View Estimate
                </a>
              )}
            </div>
            {ro.jobs.length === 0 ? (
              <p style={{ fontSize: "0.8125rem", color: "#8a92a6" }}>No jobs yet.</p>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.8125rem",
                  marginBottom: "0.875rem",
                }}
              >
                <thead>
                  <tr style={{ textAlign: "start" }}>
                    {["Description", "Hours", "Total", "Status"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "0.375rem 0",
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
                  {ro.jobs.map((j) => (
                    <tr key={j.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.5rem 0", color: "#081a2f" }}>{j.description}</td>
                      <td style={{ padding: "0.5rem 0", color: "#5b6472" }}>{j.hours}</td>
                      <td style={{ padding: "0.5rem 0", color: "#081a2f", fontWeight: 600 }}>
                        {formatCurrency(j.totalMinorUnits, ro.currency)}
                      </td>
                      <td style={{ padding: "0.5rem 0" }}>
                        {ro.status === "IN_REPAIR" ? (
                          <div style={{ position: "relative", display: "inline-block" }}>
                            <select
                              value={j.status}
                              onChange={async (e) => {
                                const ok = await api(`/jobs/${j.id}/status`, "PUT", {
                                  status: e.target.value,
                                });
                                if (ok) toast.success("Job status updated.");
                              }}
                              style={{
                                fontSize: "0.75rem",
                                paddingBlock: "0.25rem",
                                paddingInlineStart: "0.375rem",
                                paddingInlineEnd: "1.25rem",
                                borderRadius: "0.375rem",
                                border: "1px solid var(--border)",
                                appearance: "none",
                                WebkitAppearance: "none",
                                MozAppearance: "none",
                              }}
                            >
                              <option value="PENDING">Pending</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="DONE">Done</option>
                            </select>
                            <SelectChevron size={12} insetInlineEnd="0.375rem" />
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.6875rem", color: "#8a92a6" }}>
                            {j.status}
                          </span>
                        )}
                        {estimateEditable && (
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await api(`/jobs/${j.id}`, "DELETE");
                              if (ok) toast.success("Job removed.");
                            }}
                            style={{
                              marginInlineStart: "0.5rem",
                              border: "none",
                              background: "none",
                              color: "#dc2626",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {estimateEditable && (
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                <input
                  placeholder="Description"
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  style={inputStyle}
                />
                <div style={{ position: "relative" }}>
                  <select
                    value={jobMechanic}
                    onChange={(e) => setJobMechanic(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">Mechanic</option>
                    {mechanics.map((m) => (
                      <option key={m.membershipId} value={m.membershipId}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <SelectChevron size={14} insetInlineEnd="0.625rem" />
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Hours"
                  value={jobHours}
                  onChange={(e) => setJobHours(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Rate/hr"
                  value={jobRate}
                  onChange={(e) => setJobRate(e.target.value)}
                  style={inputStyle}
                />
                <button
                  type="button"
                  disabled={busy || !jobDesc.trim()}
                  style={{ ...primaryBtn, padding: "0.5rem 0.75rem" }}
                  onClick={async () => {
                    const ok = await api("/jobs", "POST", {
                      description: jobDesc.trim(),
                      mechanicMembershipId: jobMechanic || undefined,
                      hours: Number(jobHours),
                      rateMinorUnits: Math.round(Number(jobRate) * 100),
                    });
                    if (ok) {
                      setJobDesc("");
                      setJobHours("1");
                      setJobRate("150");
                      setJobMechanic("");
                      toast.success("Job added.");
                    }
                  }}
                >
                  Add
                </button>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "#081a2f",
                marginTop: 0,
                marginBottom: "0.875rem",
              }}
            >
              Parts Used
            </h3>
            {ro.parts.length === 0 ? (
              <p style={{ fontSize: "0.8125rem", color: "#8a92a6" }}>No parts yet.</p>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.8125rem",
                  marginBottom: "0.875rem",
                }}
              >
                <thead>
                  <tr style={{ textAlign: "start" }}>
                    {["Part", "Qty", "Unit Price", "Total"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "0.375rem 0",
                          color: "#8a92a6",
                          fontWeight: 600,
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ro.parts.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.5rem 0", color: "#081a2f" }}>{p.partName}</td>
                      <td style={{ padding: "0.5rem 0", color: "#5b6472" }}>{p.quantity}</td>
                      <td style={{ padding: "0.5rem 0", color: "#5b6472" }}>
                        {formatCurrency(p.unitPriceMinorUnits, ro.currency)}
                      </td>
                      <td style={{ padding: "0.5rem 0", color: "#081a2f", fontWeight: 600 }}>
                        {formatCurrency(p.totalMinorUnits, ro.currency)}
                      </td>
                      <td>
                        {estimateEditable && (
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await api(`/parts/${p.id}`, "DELETE");
                              if (ok) toast.success("Part removed.");
                            }}
                            style={{
                              border: "none",
                              background: "none",
                              color: "#dc2626",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={3}
                      style={{ padding: "0.5rem 0", textAlign: "end", color: "#5b6472" }}
                    >
                      Total Parts Cost:
                    </td>
                    <td style={{ padding: "0.5rem 0", fontWeight: 700, color: "#081a2f" }}>
                      {formatCurrency(ro.partsSubtotalMinorUnits, ro.currency)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
            {estimateEditable && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                <input
                  placeholder="Part name"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  style={inputStyle}
                />
                <input
                  placeholder="SKU (optional)"
                  value={partSku}
                  onChange={(e) => setPartSku(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Qty"
                  value={partQty}
                  onChange={(e) => setPartQty(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Unit price"
                  value={partPrice}
                  onChange={(e) => setPartPrice(e.target.value)}
                  style={inputStyle}
                />
                <button
                  type="button"
                  disabled={busy || !partName.trim()}
                  style={{ ...primaryBtn, padding: "0.5rem 0.75rem" }}
                  onClick={async () => {
                    const ok = await api("/parts", "POST", {
                      partName: partName.trim(),
                      sku: partSku.trim() || undefined,
                      quantity: Number(partQty),
                      unitPriceMinorUnits: Math.round(Number(partPrice) * 100),
                    });
                    if (ok) {
                      setPartName("");
                      setPartSku("");
                      setPartQty("1");
                      setPartPrice("0");
                      toast.success("Part added.");
                    }
                  }}
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {(ro.status === "IN_REPAIR" || ro.status === "QUALITY_CHECK") && (
            <div style={cardStyle}>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#081a2f",
                  marginTop: 0,
                  marginBottom: "0.875rem",
                }}
              >
                Quality Check
              </h3>
              {ro.qualityChecks.length === 0 ? (
                <p style={{ fontSize: "0.8125rem", color: "#8a92a6", marginBottom: "0.75rem" }}>
                  No checklist items yet.
                </p>
              ) : (
                <div style={{ marginBottom: "0.875rem" }}>
                  {ro.qualityChecks.map((q) => (
                    <label
                      key={q.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.625rem",
                        padding: "0.5rem 0.75rem",
                        backgroundColor: "#f7fafd",
                        borderRadius: "0.5rem",
                        marginBottom: "0.375rem",
                        cursor: "pointer",
                        fontSize: "0.8125rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={q.isChecked}
                        onChange={async (e) => {
                          const checked = e.target.checked;
                          const ok = await api(`/quality-checks/${q.id}`, "PUT", {
                            isChecked: checked,
                          });
                          if (ok)
                            toast.success(
                              checked ? "Checklist item checked." : "Checklist item unchecked.",
                            );
                        }}
                      />
                      {q.label}
                    </label>
                  ))}
                </div>
              )}
              {ro.status === "IN_REPAIR" && (
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.875rem" }}>
                  <input
                    placeholder="Checklist item"
                    value={qcLabel}
                    onChange={(e) => setQcLabel(e.target.value)}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    disabled={busy || !qcLabel.trim()}
                    style={{ ...secondaryBtn, whiteSpace: "nowrap" }}
                    onClick={async () => {
                      const ok = await api("/quality-checks", "POST", { label: qcLabel.trim() });
                      if (ok) {
                        setQcLabel("");
                        toast.success("Checklist item added.");
                      }
                    }}
                  >
                    Add Item
                  </button>
                </div>
              )}
              {ro.status === "IN_REPAIR" && (
                <button
                  type="button"
                  disabled={
                    busy ||
                    ro.qualityChecks.length === 0 ||
                    ro.qualityChecks.some((q) => !q.isChecked)
                  }
                  style={primaryBtn}
                  onClick={async () => {
                    const ok = await api("/send-for-quality-check", "POST");
                    if (ok) toast.success("Sent for quality check.");
                  }}
                >
                  Sign Off &amp; Send for Quality Check
                </button>
              )}
              {ro.status === "QUALITY_CHECK" && (
                <button
                  type="button"
                  disabled={busy}
                  style={primaryBtn}
                  onClick={async () => {
                    const ok = await api("/complete", "POST");
                    if (ok) toast.success("Repair order completed.");
                  }}
                >
                  Complete Repair Order
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div>
          <div style={cardStyle}>
            <h3
              style={{
                fontSize: "0.75rem",
                color: "#8a92a6",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                marginTop: 0,
                marginBottom: "0.875rem",
              }}
            >
              Lead Mechanic
            </h3>
            {ro.leadMechanic ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    width: "3.5rem",
                    height: "3.5rem",
                    borderRadius: "9999px",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <Image
                    src="/images/repair-orders/ro-detail-mechanic-avatar.jpg"
                    alt={ro.leadMechanic.name}
                    width={56}
                    height={56}
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#081a2f" }}>
                    {ro.leadMechanic.name}
                  </div>
                  {ro.leadMechanic.bio && (
                    <div style={{ fontSize: "0.75rem", color: "#8a92a6" }}>
                      {ro.leadMechanic.bio}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: "0.8125rem", color: "#8a92a6", marginBottom: "0.875rem" }}>
                No mechanic assigned yet.
              </p>
            )}
            {!["COMPLETED", "INVOICED", "CANCELLED"].includes(ro.status) && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <select
                    value={reassignMechanic}
                    onChange={(e) => setReassignMechanic(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">Select mechanic…</option>
                    {mechanics.map((m) => (
                      <option key={m.membershipId} value={m.membershipId}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <SelectChevron size={14} insetInlineEnd="0.625rem" />
                </div>
                <button
                  type="button"
                  disabled={busy || !reassignMechanic}
                  style={{ ...secondaryBtn, whiteSpace: "nowrap" }}
                  onClick={async () => {
                    const wasAssigned = ro.leadMechanic !== null;
                    const ok = await api("/mechanic", "PUT", { membershipId: reassignMechanic });
                    if (ok)
                      toast.success(wasAssigned ? "Mechanic reassigned." : "Mechanic assigned.");
                  }}
                >
                  {ro.leadMechanic ? "Reassign" : "Assign"}
                </button>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <h3
              style={{
                fontSize: "0.75rem",
                color: "#8a92a6",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                marginTop: 0,
                marginBottom: "0.875rem",
              }}
            >
              Actions
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {["DIAGNOSIS", "ESTIMATE_DRAFT", "REJECTED"].includes(ro.status) && (
                <a
                  href={`/garage/repair-orders/${ro.id}/estimate` as never}
                  style={{ ...primaryBtn, textAlign: "center", textDecoration: "none" }}
                >
                  Open Estimate Builder
                </a>
              )}
              {ro.status === "APPROVED" && (
                <button
                  type="button"
                  disabled={busy}
                  style={primaryBtn}
                  onClick={async () => {
                    const ok = await api("/start-repair", "POST");
                    if (ok) toast.success("Repair started.");
                  }}
                >
                  Start Repair
                </button>
              )}
              {(ro.status === "COMPLETED" || ro.status === "INVOICED") && (
                <a
                  href={`/garage/repair-orders/${ro.id}/invoice` as never}
                  style={{ ...primaryBtn, textAlign: "center", textDecoration: "none" }}
                >
                  {ro.status === "COMPLETED" ? "Finalize Invoice" : "View Invoice"}
                </a>
              )}
              {[
                "CREATED",
                "INSPECTION",
                "DIAGNOSIS",
                "ESTIMATE_DRAFT",
                "AWAITING_APPROVAL",
                "REJECTED",
                "APPROVED",
              ].includes(ro.status) && (
                <>
                  {cancelReason === null ? (
                    <button type="button" style={secondaryBtn} onClick={() => setCancelReason("")}>
                      Cancel Repair Order
                    </button>
                  ) : (
                    <div>
                      <textarea
                        placeholder="Cancellation reason"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        style={{ ...inputStyle, minHeight: "3rem", marginBottom: "0.5rem" }}
                      />
                      <button
                        type="button"
                        disabled={busy || !cancelReason.trim()}
                        style={{ ...secondaryBtn, color: "#dc2626", borderColor: "#dc2626" }}
                        onClick={async () => {
                          const ok = await api("/cancel", "POST", { reason: cancelReason.trim() });
                          if (ok) toast.success("Repair order cancelled.");
                        }}
                      >
                        Confirm Cancellation
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div style={cardStyle}>
            <h3
              style={{
                fontSize: "0.75rem",
                color: "#8a92a6",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                marginTop: 0,
                marginBottom: "0.875rem",
              }}
            >
              Status History
            </h3>
            {ro.statusHistory
              .slice()
              .reverse()
              .map((h) => (
                <div
                  key={h.id}
                  style={{
                    padding: "0.5rem 0",
                    fontSize: "0.8125rem",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#081a2f" }}>
                    {STATUS_LABELS[h.toStatus] ?? h.toStatus}
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "#8a92a6" }}>
                    {new Date(h.createdAt).toLocaleString("en-AE", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {h.note ? ` · ${h.note}` : ""}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
