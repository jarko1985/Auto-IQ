"use client";

import { useState } from "react";
import Image from "next/image";
import { Phone } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { formatCurrency } from "@/lib/utils";
import { RateGarageForm } from "@/components/garages/rate-garage-form";

interface LineItem {
  id: string;
  description?: string;
  partName?: string;
  totalMinorUnits: number;
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
  garageName: string;
  garagePhone: string;
  vehicleLabel: string;
  plateNumber: string | null;
  aiSuggestedDiagnosis: string | null;
  confirmedDiagnosis: string | null;
  rejectionReason: string | null;
  jobs: LineItem[];
  parts: LineItem[];
  subtotalMinorUnits: number;
  vatMinorUnits: number;
  totalMinorUnits: number;
  currency: string;
  outcomeNotes: string | null;
  customerVerifiedOutcomeAt: string | null;
  warrantyDurationMonths: number | null;
  warrantyCoverageItems: string[];
  statusHistory: StatusHistoryEntry[];
  alreadyReviewed: boolean;
}
interface Props {
  repairOrder: RepairOrderDetail;
}

const STATUS_LABELS: Record<string, string> = {
  CREATED: "Checked In",
  INSPECTION: "Inspection Started",
  DIAGNOSIS: "Diagnosis Recorded",
  ESTIMATE_DRAFT: "Preparing Estimate",
  AWAITING_APPROVAL: "Estimate Sent",
  APPROVED: "Estimate Approved",
  REJECTED: "Estimate Declined",
  IN_REPAIR: "In Repair",
  QUALITY_CHECK: "Quality Check",
  COMPLETED: "Repair Completed",
  INVOICED: "Invoiced",
  CANCELLED: "Cancelled",
};

export function MyRepairOrderDetailView({ repairOrder }: Props) {
  const router = useRouter();
  const [ro, setRo] = useState(repairOrder);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  async function payInvoice() {
    setCheckingOut(true);
    try {
      const res = await fetch(`/api/v1/repair-orders/${ro.id}/invoice`);
      const json = (await res.json()) as {
        data?: { id: string; status: string };
        error?: { message?: string };
      };
      if (!res.ok || !json.data) {
        toast.error(json.error?.message ?? "Invoice not available yet.");
        return;
      }
      router.push(
        (json.data.status === "PAID"
          ? `/dashboard/invoices/${json.data.id}`
          : `/dashboard/checkout/${json.data.id}`) as never,
      );
    } finally {
      setCheckingOut(false);
    }
  }

  async function post(path: string, body?: unknown) {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/repair-orders/${ro.id}${path}`, {
        method: "POST",
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json()) as {
        data?: Record<string, unknown>;
        error?: { message?: string };
      };
      if (!res.ok || !json.data) {
        toast.error(json.error?.message ?? "Action failed.");
        return false;
      }
      setRo({
        ...ro,
        status: json.data.status as string,
        rejectionReason: json.data.rejectionReason as string | null,
        customerVerifiedOutcomeAt: json.data.customerVerifiedOutcomeAt as string | null,
      });
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          gap: "1rem",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            className="text-fluid-page-title break-words"
            style={{ fontWeight: 700, color: "#081a2f", margin: 0 }}
          >
            Repair Order #{ro.repairOrderNumber}
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "#5b6472", marginTop: "0.25rem" }}>
            {ro.garageName}
          </p>
        </div>
        <span
          style={{
            padding: "0.375rem 0.875rem",
            borderRadius: "9999px",
            fontSize: "0.75rem",
            fontWeight: 700,
            backgroundColor: "rgba(217,119,6,0.12)",
            color: "#d97706",
          }}
        >
          {STATUS_LABELS[ro.status] ?? ro.status}
        </span>
      </div>

      <div style={{ maxWidth: "56rem" }}>
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            padding: "1.5rem",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <div
              style={{
                width: "12rem",
                height: "8rem",
                borderRadius: "0.625rem",
                overflow: "hidden",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <Image
                src="/images/repair-orders/ro-detail-customer-vehicle-thumb.jpg"
                alt={ro.vehicleLabel}
                fill
                style={{ objectFit: "cover" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  color: "#081a2f",
                  margin: "0 0 0.375rem",
                }}
              >
                {ro.vehicleLabel}
              </h2>
              {ro.plateNumber && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "0.125rem 0.5rem",
                    backgroundColor: "#f7fafd",
                    borderRadius: "0.25rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  {ro.plateNumber}
                </span>
              )}
              {ro.aiSuggestedDiagnosis && (
                <div
                  style={{
                    marginTop: "0.875rem",
                    padding: "0.75rem",
                    border: "1px solid rgba(0,184,217,0.2)",
                    backgroundColor: "rgba(0,184,217,0.05)",
                    borderRadius: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      color: "#00b8d9",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    AI Diagnosis
                  </div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#081a2f" }}>
                    {ro.aiSuggestedDiagnosis}
                  </div>
                </div>
              )}
              {ro.confirmedDiagnosis && (
                <p style={{ fontSize: "0.8125rem", color: "#081a2f", marginTop: "0.625rem" }}>
                  <strong>Confirmed:</strong> {ro.confirmedDiagnosis}
                </p>
              )}
            </div>
          </div>
        </div>

        {(ro.jobs.length > 0 || ro.parts.length > 0) && (
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              overflow: "hidden",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
                Service Estimate
              </h3>
            </div>
            <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", minWidth: "360px", borderCollapse: "collapse", fontSize: "0.8125rem" }}
            >
              <tbody>
                {ro.jobs.map((j) => (
                  <tr key={j.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="break-words" style={{ padding: "0.625rem 1.25rem", color: "#081a2f" }}>
                      {j.description}
                    </td>
                    <td
                      style={{
                        padding: "0.625rem 1.25rem",
                        textAlign: "end",
                        fontWeight: 600,
                        color: "#081a2f",
                      }}
                    >
                      {formatCurrency(j.totalMinorUnits, ro.currency)}
                    </td>
                  </tr>
                ))}
                {ro.parts.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="break-words" style={{ padding: "0.625rem 1.25rem", color: "#081a2f" }}>
                      {p.partName}
                    </td>
                    <td
                      style={{
                        padding: "0.625rem 1.25rem",
                        textAlign: "end",
                        fontWeight: 600,
                        color: "#081a2f",
                      }}
                    >
                      {formatCurrency(p.totalMinorUnits, ro.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div style={{ padding: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
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
                  <span>{formatCurrency(ro.subtotalMinorUnits, ro.currency)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.8125rem",
                    color: "#5b6472",
                    marginBottom: "0.75rem",
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
                    fontSize: "1.125rem",
                    color: "#00b8d9",
                    paddingTop: "0.5rem",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <span>Total</span>
                  <span>{formatCurrency(ro.totalMinorUnits, ro.currency)}</span>
                </div>
                {ro.status === "AWAITING_APPROVAL" && !rejecting && (
                  <div style={{ display: "flex", gap: "0.625rem", marginTop: "1rem" }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setRejecting(true)}
                      style={{
                        flex: 1,
                        padding: "0.625rem",
                        borderRadius: "0.5rem",
                        border: "1px solid var(--border)",
                        background: "none",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        if (await post("/approve-estimate")) toast.success("Estimate approved.");
                      }}
                      style={{
                        flex: 1,
                        padding: "0.625rem",
                        borderRadius: "0.5rem",
                        border: "none",
                        backgroundColor: "#00b8d9",
                        color: "#fff",
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Approve
                    </button>
                  </div>
                )}
                {ro.status === "AWAITING_APPROVAL" && rejecting && (
                  <div style={{ marginTop: "1rem" }}>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Why are you rejecting this estimate?"
                      style={{
                        width: "100%",
                        minHeight: "4rem",
                        padding: "0.5rem 0.75rem",
                        border: "1px solid var(--border)",
                        borderRadius: "0.5rem",
                        fontSize: "0.8125rem",
                        boxSizing: "border-box",
                        marginBottom: "0.625rem",
                      }}
                    />
                    <button
                      type="button"
                      disabled={busy || !reason.trim()}
                      onClick={async () => {
                        const ok = await post("/reject-estimate", { reason: reason.trim() });
                        if (ok) {
                          setRejecting(false);
                          toast.success("Estimate rejected.");
                        }
                      }}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "0.5rem",
                        border: "none",
                        backgroundColor: "#dc2626",
                        color: "#fff",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Confirm Rejection
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {ro.status === "REJECTED" && ro.rejectionReason && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              borderRadius: "0.5rem",
              padding: "1rem",
              marginBottom: "1.25rem",
              fontSize: "0.8125rem",
              color: "#991b1b",
            }}
          >
            You declined this estimate: "{ro.rejectionReason}". The garage may follow up with a
            revised estimate.
          </div>
        )}

        {ro.status === "INVOICED" && (
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#081a2f",
                  margin: "0 0 0.25rem",
                }}
              >
                Invoice
              </h3>
              <p style={{ fontSize: "0.8125rem", color: "#5b6472", margin: 0 }}>
                {formatCurrency(ro.totalMinorUnits, ro.currency)} due for this repair.
              </p>
            </div>
            <button
              type="button"
              disabled={checkingOut}
              onClick={() => void payInvoice()}
              style={{
                padding: "0.625rem 1.25rem",
                borderRadius: "0.5rem",
                border: "none",
                backgroundColor: "#00b8d9",
                color: "#fff",
                fontSize: "0.8125rem",
                fontWeight: 700,
                cursor: checkingOut ? "not-allowed" : "pointer",
              }}
            >
              {checkingOut ? "Loading…" : "View Invoice / Pay Now"}
            </button>
          </div>
        )}

        {(ro.status === "COMPLETED" || ro.status === "INVOICED") && (
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
                fontSize: "1rem",
                fontWeight: 700,
                color: "#081a2f",
                marginTop: 0,
                marginBottom: "0.625rem",
              }}
            >
              Verified Outcome
            </h3>
            {ro.outcomeNotes && (
              <p style={{ fontSize: "0.8125rem", color: "#5b6472", marginBottom: "0.875rem" }}>
                {ro.outcomeNotes}
              </p>
            )}
            {ro.warrantyDurationMonths && (
              <p style={{ fontSize: "0.8125rem", color: "#081a2f", marginBottom: "0.875rem" }}>
                <strong>Warranty:</strong> {ro.warrantyDurationMonths} months
                {ro.warrantyCoverageItems.length > 0 &&
                  ` — covers ${ro.warrantyCoverageItems.join(", ")}`}
              </p>
            )}
            {ro.customerVerifiedOutcomeAt ? (
              <p style={{ fontSize: "0.8125rem", color: "#16a34a", fontWeight: 600 }}>
                ✓ You verified this repair outcome on{" "}
                {new Date(ro.customerVerifiedOutcomeAt).toLocaleDateString("en-AE", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (await post("/verify-outcome")) toast.success("Repair outcome verified.");
                }}
                style={{
                  padding: "0.625rem 1.25rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  backgroundColor: "#16a34a",
                  color: "#fff",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Confirm Repair Outcome
              </button>
            )}
          </div>
        )}

        {ro.customerVerifiedOutcomeAt && (
          <RateGarageForm repairOrderId={ro.id} alreadyReviewed={ro.alreadyReviewed} />
        )}

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
              fontSize: "1rem",
              fontWeight: 700,
              color: "#081a2f",
              marginTop: 0,
              marginBottom: "0.875rem",
            }}
          >
            Repair Status Timeline
          </h3>
          {ro.statusHistory.map((h) => (
            <div
              key={h.id}
              style={{
                padding: "0.5rem 0",
                fontSize: "0.8125rem",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, color: "#081a2f" }}>
                  {STATUS_LABELS[h.toStatus] ?? h.toStatus}
                </span>
                <span style={{ color: "#8a92a6" }}>
                  {new Date(h.createdAt).toLocaleDateString("en-AE", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {h.note && <div style={{ color: "#8a92a6", marginTop: "0.125rem" }}>{h.note}</div>}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8125rem",
            color: "#5b6472",
          }}
        >
          <Phone size={14} /> Need help? Call {ro.garageName} at {ro.garagePhone}
        </div>
      </div>
    </div>
  );
}
