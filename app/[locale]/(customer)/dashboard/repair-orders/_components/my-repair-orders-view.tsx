"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/routing";
import { formatCurrency } from "@/lib/utils";
import { ClipboardList } from "lucide-react";

interface RepairOrderRow {
  id: string;
  repairOrderNumber: string;
  status: string;
  garageName: string;
  vehicleLabel: string;
  plateNumber: string | null;
  confirmedDiagnosis: string | null;
  totalMinorUnits: number;
  currency: string;
}
interface Props {
  initialRepairOrders: RepairOrderRow[];
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  CREATED: { bg: "rgba(8,26,47,0.08)", color: "#081a2f", label: "Checked In" },
  INSPECTION: { bg: "rgba(0,184,217,0.12)", color: "#00b8d9", label: "In Inspection" },
  DIAGNOSIS: { bg: "rgba(0,184,217,0.12)", color: "#00b8d9", label: "Diagnosing" },
  ESTIMATE_DRAFT: { bg: "rgba(217,119,6,0.12)", color: "#d97706", label: "Preparing Estimate" },
  AWAITING_APPROVAL: { bg: "rgba(217,119,6,0.12)", color: "#d97706", label: "Awaiting Your Approval" },
  APPROVED: { bg: "rgba(22,163,74,0.12)", color: "#16a34a", label: "Approved" },
  REJECTED: { bg: "rgba(220,38,38,0.12)", color: "#dc2626", label: "Estimate Declined" },
  IN_REPAIR: { bg: "rgba(0,184,217,0.12)", color: "#00b8d9", label: "In Repair" },
  QUALITY_CHECK: { bg: "rgba(0,184,217,0.12)", color: "#00b8d9", label: "Quality Check" },
  COMPLETED: { bg: "rgba(22,163,74,0.12)", color: "#16a34a", label: "Completed" },
  INVOICED: { bg: "rgba(22,163,74,0.12)", color: "#16a34a", label: "Invoiced" },
  CANCELLED: { bg: "rgba(220,38,38,0.12)", color: "#dc2626", label: "Cancelled" },
};
const DEFAULT_STATUS_STYLE = STATUS_STYLES.CREATED!;

const CARD_IMAGES: Record<string, string> = {
  AWAITING_APPROVAL: "/images/repair-orders/my-repair-orders-card-ro1042.jpg",
  IN_REPAIR: "/images/repair-orders/my-repair-orders-card-ro9902.jpg",
  QUALITY_CHECK: "/images/repair-orders/my-repair-orders-card-ro9902.jpg",
  COMPLETED: "/images/repair-orders/my-repair-orders-card-ro8821.jpg",
  INVOICED: "/images/repair-orders/my-repair-orders-card-ro8821.jpg",
};
const DEFAULT_CARD_IMAGE = "/images/repair-orders/my-repair-orders-card-ro1042.jpg";

const TABS = [
  { value: "all", label: "All Orders", statuses: null },
  {
    value: "active",
    label: "Active",
    statuses: ["CREATED", "INSPECTION", "DIAGNOSIS", "ESTIMATE_DRAFT", "APPROVED", "IN_REPAIR", "QUALITY_CHECK"],
  },
  { value: "approval", label: "Awaiting Approval", statuses: ["AWAITING_APPROVAL"] },
  { value: "completed", label: "Completed", statuses: ["COMPLETED", "INVOICED"] },
  { value: "cancelled", label: "Cancelled", statuses: ["CANCELLED", "REJECTED"] },
] as const;

export function MyRepairOrdersView({ initialRepairOrders }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("all");

  const activeTab = TABS.find((t) => t.value === tab) ?? TABS[0];
  const filtered = initialRepairOrders.filter((ro) =>
    activeTab.statuses ? (activeTab.statuses as readonly string[]).includes(ro.status) : true,
  );

  return (
    <div>
      <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1.5rem" }}>
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            style={{
              padding: "0.375rem 0.875rem",
              borderRadius: "9999px",
              border: "1px solid var(--border)",
              backgroundColor: tab === t.value ? "#081a2f" : "transparent",
              color: tab === t.value ? "#fff" : "#5b6472",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: "0.75rem",
            padding: "3rem 1.5rem",
            textAlign: "center",
          }}
        >
          <ClipboardList size={32} color="#8a92a6" style={{ margin: "0 auto 0.75rem" }} />
          <p style={{ fontSize: "0.875rem", color: "#5b6472" }}>
            No repair orders found in this category.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filtered.map((ro) => {
            const status = STATUS_STYLES[ro.status] ?? DEFAULT_STATUS_STYLE;
            const image = CARD_IMAGES[ro.status] ?? DEFAULT_CARD_IMAGE;
            return (
              <div
                key={ro.id}
                style={{
                  display: "flex",
                  gap: "1.25rem",
                  border: "1px solid var(--border)",
                  borderRadius: "0.875rem",
                  padding: "1.25rem",
                  backgroundColor: "#fff",
                }}
              >
                <div style={{ width: "10rem", height: "7rem", borderRadius: "0.625rem", overflow: "hidden", flexShrink: 0, position: "relative" }}>
                  <Image src={image} alt={ro.vehicleLabel} fill style={{ objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1rem", fontWeight: 700, color: "#081a2f" }}>#{ro.repairOrderNumber}</span>
                        <span
                          style={{
                            padding: "0.1875rem 0.625rem",
                            borderRadius: "9999px",
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            backgroundColor: status.bg,
                            color: status.color,
                          }}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.8125rem", color: "#5b6472", margin: "0.25rem 0 0" }}>{ro.garageName}</p>
                    </div>
                    {ro.totalMinorUnits > 0 && (
                      <div style={{ textAlign: "end" }}>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#081a2f" }}>
                          {formatCurrency(ro.totalMinorUnits, ro.currency)}
                        </div>
                        <div style={{ fontSize: "0.6875rem", color: "#8a92a6" }}>Estimated Total</div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.8125rem", marginBottom: "0.875rem" }}>
                    <div>
                      <div style={{ color: "#8a92a6", fontSize: "0.6875rem", textTransform: "uppercase" }}>Vehicle</div>
                      <div style={{ color: "#081a2f", fontWeight: 600 }}>
                        {ro.vehicleLabel}
                        {ro.plateNumber && ` (${ro.plateNumber})`}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#8a92a6", fontSize: "0.6875rem", textTransform: "uppercase" }}>Diagnosis</div>
                      <div style={{ color: "#081a2f" }}>{ro.confirmedDiagnosis ?? "Pending"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.625rem" }}>
                    <button
                      type="button"
                      onClick={() => router.push(`/dashboard/repair-orders/${ro.id}` as never)}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "0.5rem",
                        border: "1px solid var(--border)",
                        backgroundColor: "transparent",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      View Details
                    </button>
                    {ro.status === "AWAITING_APPROVAL" && (
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/repair-orders/${ro.id}` as never)}
                        style={{
                          padding: "0.5rem 1.25rem",
                          borderRadius: "0.5rem",
                          border: "none",
                          backgroundColor: "#00b8d9",
                          color: "#fff",
                          fontSize: "0.8125rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Review Estimate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
