"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, FileText, Loader2 } from "lucide-react";

interface QueueItem {
  id: string;
  businessName: string;
  tradeLicenseNumber: string;
  submittedAt: string | null;
  documentCount: number;
}

interface GarageDetail {
  id: string;
  businessName: string;
  tradeLicenseNumber: string;
  tradeLicenseExpiry: string;
  contactPersonName: string;
  contactPhone: string;
  contactEmail: string;
  addressLine1: string;
  emirate: string;
  authorizedSignatoryName: string | null;
  authorizedSignatoryEmiratesId: string | null;
  documents: { id: string; type: string; filename: string }[];
}

interface Props {
  initialGarages: QueueItem[];
}

const DOCUMENT_LABELS: Record<string, string> = {
  TRADE_LICENSE: "Trade License",
  VAT_CERTIFICATE: "VAT Certificate",
  EMIRATES_ID_FRONT: "Emirates ID (Front)",
  EMIRATES_ID_BACK: "Emirates ID (Back)",
  PASSPORT: "Passport",
  OTHER: "Other",
};

const EMIRATE_LABELS: Record<string, string> = {
  DUBAI: "Dubai",
  ABU_DHABI: "Abu Dhabi",
  SHARJAH: "Sharjah",
  AJMAN: "Ajman",
  UMM_AL_QUWAIN: "Umm Al Quwain",
  RAS_AL_KHAIMAH: "Ras Al Khaimah",
  FUJAIRAH: "Fujairah",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function GarageApprovalQueueView({ initialGarages }: Props) {
  const [garages, setGarages] = useState(initialGarages);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GarageDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/v1/admin/garages/${id}`);
      if (res.ok) {
        const body = (await res.json()) as { data: GarageDetail };
        setDetail(body.data);
      }
    } finally {
      setLoadingDetail(false);
    }
  }

  async function approve(id: string) {
    setActioningId(id);
    try {
      const res = await fetch(`/api/v1/admin/garages/${id}/approve`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        toast.error(body.error?.message ?? "Failed to approve garage.");
        return;
      }
      setGarages((prev) => prev.filter((g) => g.id !== id));
      setExpandedId(null);
      toast.success("Garage approved.");
    } finally {
      setActioningId(null);
    }
  }

  async function reject(id: string) {
    if (!rejectReason.trim()) {
      toast.error("A rejection reason is required.");
      return;
    }
    setActioningId(id);
    try {
      const res = await fetch(`/api/v1/admin/garages/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        toast.error(body.error?.message ?? "Failed to reject garage.");
        return;
      }
      setGarages((prev) => prev.filter((g) => g.id !== id));
      setExpandedId(null);
      setRejectingId(null);
      setRejectReason("");
      toast.success("Garage rejected.");
    } finally {
      setActioningId(null);
    }
  }

  if (garages.length === 0) {
    return (
      <p style={{ fontSize: "0.875rem", color: "#8a92a6" }}>
        No pending applications. All caught up.
      </p>
    );
  }

  return (
    <div>
      <div
        style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" }}
      >
        {garages.map((g, i) => {
          const expanded = expandedId === g.id;
          return (
            <div
              key={g.id}
              style={{ borderBottom: i < garages.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleExpand(g.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") toggleExpand(g.id);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem 1.25rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "start",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "2rem",
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#081a2f" }}>
                      {g.businessName}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#8a92a6" }}>
                      License {g.tradeLicenseNumber}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#5b6472" }}>
                    Submitted {formatDate(g.submittedAt)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      fontSize: "0.8125rem",
                      color: "#5b6472",
                    }}
                  >
                    <FileText size={14} />
                    {g.documentCount} document{g.documentCount === 1 ? "" : "s"}
                  </div>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}
                >
                  <button
                    type="button"
                    disabled={actioningId === g.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      void approve(g.id);
                    }}
                    style={{
                      padding: "0.375rem 0.875rem",
                      backgroundColor: "#16a34a",
                      color: "#fff",
                      border: "none",
                      borderRadius: "0.5rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: actioningId === g.id ? "not-allowed" : "pointer",
                      opacity: actioningId === g.id ? 0.6 : 1,
                    }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(g.id);
                      setRejectingId(g.id);
                    }}
                    style={{
                      padding: "0.375rem 0.875rem",
                      backgroundColor: "#fee2e2",
                      color: "#991b1b",
                      border: "none",
                      borderRadius: "0.5rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Reject
                  </button>
                  {expanded ? (
                    <ChevronUp size={18} color="#8a92a6" />
                  ) : (
                    <ChevronDown size={18} color="#8a92a6" />
                  )}
                </div>
              </div>

              {expanded && (
                <div style={{ padding: "0 1.25rem 1.25rem", borderTop: "1px solid var(--border)" }}>
                  {loadingDetail || !detail ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "1rem 0",
                        color: "#8a92a6",
                        fontSize: "0.8125rem",
                      }}
                    >
                      <Loader2 size={16} className="animate-spin" /> Loading details...
                    </div>
                  ) : (
                    <div style={{ paddingTop: "1rem" }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "0.75rem 2rem",
                          fontSize: "0.8125rem",
                          marginBottom: "1rem",
                        }}
                      >
                        <div>
                          <div style={{ color: "#8a92a6" }}>License Expiry</div>
                          <div style={{ color: "#081a2f", fontWeight: 600 }}>
                            {formatDate(detail.tradeLicenseExpiry)}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: "#8a92a6" }}>Contact Person</div>
                          <div style={{ color: "#081a2f", fontWeight: 600 }}>
                            {detail.contactPersonName}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: "#8a92a6" }}>Contact</div>
                          <div style={{ color: "#081a2f", fontWeight: 600 }}>
                            {detail.contactPhone} · {detail.contactEmail}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: "#8a92a6" }}>Location</div>
                          <div style={{ color: "#081a2f", fontWeight: 600 }}>
                            {EMIRATE_LABELS[detail.emirate] ?? detail.emirate} —{" "}
                            {detail.addressLine1}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: "#8a92a6" }}>Authorized Signatory</div>
                          <div style={{ color: "#081a2f", fontWeight: 600 }}>
                            {detail.authorizedSignatoryName ?? "—"} (
                            {detail.authorizedSignatoryEmiratesId ?? "—"})
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          color: "#8a92a6",
                          fontSize: "0.8125rem",
                          marginBottom: "0.375rem",
                        }}
                      >
                        Documents
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                          marginBottom: "1.25rem",
                        }}
                      >
                        {detail.documents.map((d) => (
                          <span
                            key={d.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.375rem",
                              padding: "0.25rem 0.625rem",
                              border: "1px solid var(--border)",
                              borderRadius: "0.5rem",
                              fontSize: "0.75rem",
                              color: "#081a2f",
                            }}
                          >
                            <FileText size={12} />
                            {DOCUMENT_LABELS[d.type] ?? d.type}
                          </span>
                        ))}
                      </div>

                      {rejectingId === g.id && (
                        <div style={{ marginBottom: "1rem" }}>
                          <label
                            style={{
                              display: "block",
                              fontSize: "0.8125rem",
                              fontWeight: 600,
                              color: "#081a2f",
                              marginBottom: "0.375rem",
                            }}
                          >
                            Rejection reason
                          </label>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Explain what's missing or incorrect..."
                            style={{
                              width: "100%",
                              minHeight: "4rem",
                              padding: "0.5rem 0.75rem",
                              border: "1px solid var(--border)",
                              borderRadius: "0.5rem",
                              fontSize: "0.8125rem",
                              boxSizing: "border-box",
                              marginBottom: "0.75rem",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => void reject(g.id)}
                            disabled={actioningId === g.id}
                            style={{
                              padding: "0.5rem 1rem",
                              backgroundColor: "#dc2626",
                              color: "#fff",
                              border: "none",
                              borderRadius: "0.5rem",
                              fontSize: "0.8125rem",
                              fontWeight: 600,
                              cursor: actioningId === g.id ? "not-allowed" : "pointer",
                              marginInlineEnd: "0.5rem",
                            }}
                          >
                            Confirm Rejection
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingId(null)}
                            style={{
                              padding: "0.5rem 1rem",
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
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
