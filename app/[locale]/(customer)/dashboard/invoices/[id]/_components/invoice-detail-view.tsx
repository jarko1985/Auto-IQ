"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Download,
  Printer,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Car,
  ChevronLeft,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useIsRtl } from "@/i18n/direction";

interface LineItem {
  description: string;
  quantity: number;
  unitPriceMinorUnits: number;
  totalMinorUnits: number;
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "VOID";
  payableType: "VENDOR_ORDER" | "REPAIR_ORDER";
  payableId: string;
  currency: string;
  subtotalMinorUnits: number;
  vatMinorUnits: number;
  totalMinorUnits: number;
  totalRefundedMinorUnits: number;
  issuedAt: string | null;
  paidAt: string | null;
  customerName: string | null;
  customerEmail: string;
  customerPhone: string | null;
  recipientName: string;
  transactionRef: string | null;
  lineItems: LineItem[];
}

const card = {
  backgroundColor: "#fff",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
} as const;

const STATUS_BADGE: Record<
  InvoiceDetail["status"],
  { label: string; bg: string; color: string; pill: boolean }
> = {
  PAID: { label: "Paid", bg: "rgba(22,163,74,0.12)", color: "#16a34a", pill: true },
  ISSUED: { label: "Unpaid", bg: "rgba(217,119,6,0.12)", color: "#d97706", pill: false },
  DRAFT: { label: "Draft", bg: "rgba(217,119,6,0.12)", color: "#d97706", pill: false },
  PARTIALLY_REFUNDED: {
    label: "Partially Refunded",
    bg: "rgba(8,26,47,0.06)",
    color: "#5b6472",
    pill: false,
  },
  REFUNDED: { label: "Refunded", bg: "rgba(8,26,47,0.06)", color: "#5b6472", pill: false },
  VOID: { label: "Void", bg: "rgba(8,26,47,0.06)", color: "#5b6472", pill: false },
};

export function InvoiceDetailView({ invoice }: { invoice: InvoiceDetail }) {
  const badge = STATUS_BADGE[invoice.status];
  const isRtl = useIsRtl();
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const ForwardIcon = isRtl ? ChevronLeft : ChevronRight;
  const backHref =
    invoice.payableType === "REPAIR_ORDER"
      ? `/dashboard/repair-orders/${invoice.payableId}`
      : `/dashboard/orders/${invoice.payableId}`;
  const relatedLabel = invoice.payableType === "REPAIR_ORDER" ? "Repair Order" : "Order";

  return (
    <div>
      <Link
        href={backHref as never}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          fontSize: "0.8125rem",
          color: "#5b6472",
          textDecoration: "none",
          marginBottom: "1rem",
        }}
      >
        <BackIcon size={14} /> Back to Invoices
      </Link>

      <div style={{ ...card, padding: "1.75rem", marginBottom: "1.25rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "0.375rem",
              }}
            >
              <h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
                Invoice #{invoice.invoiceNumber}
              </h1>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: badge.pill ? "0.25rem 0.75rem" : "0.1875rem 0.5rem",
                  borderRadius: badge.pill ? "9999px" : "0.25rem",
                  fontSize: badge.pill ? "0.75rem" : "0.6875rem",
                  fontWeight: 700,
                  textTransform: badge.pill ? "none" : "uppercase",
                  letterSpacing: badge.pill ? "normal" : "0.03em",
                  backgroundColor: badge.bg,
                  color: badge.color,
                }}
              >
                {badge.pill && <CheckCircle2 size={13} />} {badge.label}
              </span>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "#8a92a6", margin: 0 }}>
              Issue Date: {invoice.issuedAt ? formatDate(invoice.issuedAt) : "—"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.625rem 1rem",
                borderRadius: "0.5rem",
                border: "1px solid var(--border)",
                background: "none",
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "#081a2f",
                cursor: "pointer",
              }}
            >
              <Download size={14} /> Download PDF
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              aria-label="Print invoice"
              style={{
                padding: "0.625rem",
                borderRadius: "0.5rem",
                border: "1px solid var(--border)",
                background: "none",
                cursor: "pointer",
              }}
            >
              <Printer size={16} color="#081a2f" />
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.25rem",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{ ...card, padding: "1.25rem" }}>
          <h3
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#8a92a6",
              textTransform: "uppercase",
              margin: "0 0 0.625rem",
            }}
          >
            Billed To
          </h3>
          <p
            style={{
              fontSize: "0.9375rem",
              fontWeight: 700,
              color: "#081a2f",
              margin: "0 0 0.25rem",
            }}
          >
            {invoice.customerName ?? invoice.customerEmail}
          </p>
          <p style={{ fontSize: "0.8125rem", color: "#5b6472", margin: 0 }}>
            {invoice.customerEmail}
          </p>
          {invoice.customerPhone && (
            <p style={{ fontSize: "0.8125rem", color: "#5b6472", margin: 0 }}>
              {invoice.customerPhone}
            </p>
          )}
        </div>
        <div style={{ ...card, padding: "1.25rem" }}>
          <h3
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#8a92a6",
              textTransform: "uppercase",
              margin: "0 0 0.625rem",
            }}
          >
            Related {relatedLabel}
          </h3>
          <Link
            href={backHref as never}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "0.5rem",
                backgroundColor: "#f7fafd",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Car size={16} color="#00b8d9" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
                {invoice.recipientName}
              </p>
            </div>
            <ForwardIcon size={16} color="#8a92a6" />
          </Link>
        </div>
      </div>

      <div style={{ ...card, overflow: "hidden", marginBottom: "1.25rem" }}>
        <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
            Service Items
          </h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
          <thead>
            <tr style={{ textAlign: "start" }}>
              {[
                "Description",
                "Qty",
                `Unit Price (${invoice.currency})`,
                `Total (${invoice.currency})`,
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "0.5rem 1.25rem",
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
            {invoice.lineItems.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "0.625rem 1.25rem", color: "#081a2f", fontWeight: 600 }}>
                  {item.description}
                </td>
                <td style={{ padding: "0.625rem 1.25rem", color: "#5b6472" }}>{item.quantity}</td>
                <td style={{ padding: "0.625rem 1.25rem", color: "#5b6472" }}>
                  {formatCurrency(item.unitPriceMinorUnits, invoice.currency)}
                </td>
                <td style={{ padding: "0.625rem 1.25rem", color: "#081a2f", fontWeight: 600 }}>
                  {formatCurrency(item.totalMinorUnits, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          style={{
            padding: "1.25rem",
            display: "grid",
            gridTemplateColumns: "1fr 18rem",
            gap: "1.5rem",
            alignItems: "start",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "0.625rem",
              padding: "0.875rem",
              borderRadius: "0.5rem",
              backgroundColor: "rgba(0,184,217,0.05)",
              border: "1px solid rgba(0,184,217,0.2)",
            }}
          >
            <Sparkles size={16} color="#00b8d9" style={{ flexShrink: 0, marginTop: "0.125rem" }} />
            <div>
              <div
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: "#00b8d9",
                  textTransform: "uppercase",
                  marginBottom: "0.25rem",
                }}
              >
                AI Optimizer Note
              </div>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "#5b6472",
                  fontStyle: "italic",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Keeping up with scheduled maintenance like this helps extend your vehicle&rsquo;s
                component lifespan and reduces the risk of unexpected repairs down the road.
              </p>
            </div>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8125rem",
                color: "#5b6472",
                padding: "0.25rem 0",
              }}
            >
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.subtotalMinorUnits, invoice.currency)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8125rem",
                color: "#5b6472",
                padding: "0.25rem 0",
              }}
            >
              <span>VAT (5%)</span>
              <span>{formatCurrency(invoice.vatMinorUnits, invoice.currency)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 800,
                fontSize: "1.0625rem",
                color: "#081a2f",
                padding: "0.5rem 0",
                borderTop: "1px solid var(--border)",
                marginTop: "0.375rem",
              }}
            >
              <span>Total</span>
              <span>{formatCurrency(invoice.totalMinorUnits, invoice.currency)}</span>
            </div>
            {invoice.status === "PAID" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  color: "#16a34a",
                  padding: "0.5rem 0",
                }}
              >
                <span>Amount Paid</span>
                <span>{formatCurrency(invoice.totalMinorUnits, invoice.currency)}</span>
              </div>
            )}
            {invoice.totalRefundedMinorUnits > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  color: "#5b6472",
                  padding: "0.5rem 0",
                }}
              >
                <span>Refunded</span>
                <span>{formatCurrency(invoice.totalRefundedMinorUnits, invoice.currency)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {invoice.status === "PAID" ||
      invoice.status === "PARTIALLY_REFUNDED" ||
      invoice.status === "REFUNDED" ? (
        <div
          style={{
            ...card,
            padding: "1.25rem",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.25rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.6875rem",
                color: "#8a92a6",
                fontWeight: 600,
                textTransform: "uppercase",
                marginBottom: "0.25rem",
              }}
            >
              Payment Method
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "#081a2f",
              }}
            >
              <CreditCard size={14} /> Card
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.6875rem",
                color: "#8a92a6",
                fontWeight: 600,
                textTransform: "uppercase",
                marginBottom: "0.25rem",
              }}
            >
              Payment Date
            </div>
            <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#081a2f" }}>
              {invoice.paidAt ? formatDate(invoice.paidAt) : "—"}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.6875rem",
                color: "#8a92a6",
                fontWeight: 600,
                textTransform: "uppercase",
                marginBottom: "0.25rem",
              }}
            >
              Transaction Ref
            </div>
            <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#081a2f" }}>
              {invoice.transactionRef ?? "—"}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            ...card,
            padding: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p style={{ fontSize: "0.8125rem", color: "#5b6472", margin: 0 }}>
            This invoice hasn&rsquo;t been paid yet.
          </p>
          <Link
            href={`/dashboard/checkout/${invoice.id}` as never}
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "0.5rem",
              backgroundColor: "#00b8d9",
              color: "#fff",
              fontSize: "0.8125rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Pay Now
          </Link>
        </div>
      )}
    </div>
  );
}
