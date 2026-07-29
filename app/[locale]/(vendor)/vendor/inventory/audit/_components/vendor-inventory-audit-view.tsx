"use client";

import { useState } from "react";
import { SelectChevron } from "@/components/forms/field-styles";

interface AuditEntry {
  id: string;
  createdAt: string;
  partName: string;
  partNumber: string;
  locationName: string;
  changeType: string;
  qtyAvailableDelta: number;
  qtyReservedDelta: number;
  qtyDamagedDelta: number;
  qtyAvailableAfter: number;
  reason: string | null;
  performedByName: string;
}

interface Props {
  initialEntries: AuditEntry[];
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  RESTOCK: "Restock",
  ADJUSTMENT: "Stock Adjustment",
  DAMAGE: "Marked Damaged",
  RESERVATION: "Reservation",
  RESERVATION_RELEASED: "Reservation Released",
  ORDER_FULFILLED: "Order Fulfilled",
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
  RESTOCK: "#16a34a",
  ADJUSTMENT: "#5b6472",
  DAMAGE: "#dc2626",
  RESERVATION: "#d97706",
  RESERVATION_RELEASED: "#00b8d9",
  ORDER_FULFILLED: "#081a2f",
};

function formatDelta(delta: number): string {
  if (delta === 0) return "0";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-AE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VendorInventoryAuditView({ initialEntries }: Props) {
  const [changeTypeFilter, setChangeTypeFilter] = useState("");

  const filtered = changeTypeFilter
    ? initialEntries.filter((e) => e.changeType === changeTypeFilter)
    : initialEntries;

  return (
    <div>
      <div style={{ marginBottom: "1.25rem", position: "relative", display: "inline-block" }}>
        <select
          value={changeTypeFilter}
          onChange={(e) => setChangeTypeFilter(e.target.value)}
          style={{
            paddingBlock: "0.5rem",
            paddingInlineStart: "0.75rem",
            paddingInlineEnd: "1.75rem",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            fontSize: "0.8125rem",
            backgroundColor: "transparent",
            appearance: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
          }}
        >
          <option value="">All change types</option>
          {Object.entries(CHANGE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <SelectChevron size={14} insetInlineEnd="0.625rem" />
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "#8a92a6" }}>
          No audit entries match this filter.
        </p>
      ) : (
        <div
          style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", overflowX: "auto" }}
        >
          <table
            style={{
              width: "100%",
              minWidth: "860px",
              borderCollapse: "collapse",
              fontSize: "0.8125rem",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f7fafd", textAlign: "start" }}>
                {[
                  "Timestamp",
                  "Part",
                  "Location",
                  "Change Type",
                  "Qty Shift",
                  "Balance After",
                  "Reason",
                  "Operator",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.625rem 1rem",
                      fontWeight: 600,
                      color: "#5b6472",
                      borderBottom: "1px solid var(--border)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.75rem 1rem", color: "#5b6472", whiteSpace: "nowrap" }}>
                    {formatDateTime(e.createdAt)}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ fontWeight: 600, color: "#081a2f" }}>{e.partName}</div>
                    <div style={{ color: "#8a92a6", fontSize: "0.75rem" }}>{e.partNumber}</div>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#5b6472" }}>{e.locationName}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        fontWeight: 600,
                        color: CHANGE_TYPE_COLORS[e.changeType] ?? "#5b6472",
                      }}
                    >
                      {CHANGE_TYPE_LABELS[e.changeType] ?? e.changeType}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#5b6472" }}>
                    {formatDelta(e.qtyAvailableDelta)} avail
                    {e.qtyReservedDelta !== 0 ? ` / ${formatDelta(e.qtyReservedDelta)} resv` : ""}
                    {e.qtyDamagedDelta !== 0 ? ` / ${formatDelta(e.qtyDamagedDelta)} dmg` : ""}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#081a2f", fontWeight: 600 }}>
                    {e.qtyAvailableAfter}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#8a92a6" }}>{e.reason ?? "—"}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "#5b6472" }}>{e.performedByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
