"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  LayoutDashboard,
  CreditCard,
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { formatCurrency, formatDate } from "@/lib/utils";

type Outcome = "success" | "failed" | "pending";

interface Props {
  invoiceId: string;
  invoiceNumber: string;
  currency: string;
  totalMinorUnits: number;
  initialOutcome: Outcome;
  failureReason: string | null;
  paidAt: string | null;
  transactionRef: string | null;
}

const card = {
  backgroundColor: "#fff",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
} as const;

export function ConfirmationView(props: Props) {
  const router = useRouter();
  const [outcome, setOutcome] = useState(props.initialOutcome);
  const [paidAt, setPaidAt] = useState(props.paidAt);
  const [transactionRef, setTransactionRef] = useState(props.transactionRef);
  const [attempts, setAttempts] = useState(0);

  // Webhook processing is async — if Stripe already told us the charge
  // succeeded but our own Invoice/PaymentTransaction rows haven't caught up
  // yet, poll briefly for the receipt details rather than showing nothing.
  useEffect(() => {
    if (outcome !== "pending" || attempts >= 6) return;
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/v1/invoices/${props.invoiceId}`);
      const json = (await res.json()) as {
        data?: {
          status: string;
          paidAt: string | null;
          paymentIntents: Array<{ transactions: Array<{ providerTransactionId: string | null }> }>;
        };
      };
      if (json.data?.status === "PAID") {
        setOutcome("success");
        setPaidAt(json.data.paidAt);
        setTransactionRef(
          json.data.paymentIntents[0]?.transactions[0]?.providerTransactionId ?? null,
        );
      } else {
        setAttempts((a) => a + 1);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [outcome, attempts, props.invoiceId]);

  if (outcome === "pending") {
    return (
      <div
        style={{
          ...card,
          maxWidth: "28rem",
          width: "100%",
          padding: "3rem 2rem",
          textAlign: "center",
        }}
      >
        <Loader2
          size={40}
          color="#00b8d9"
          className="animate-spin"
          style={{ margin: "0 auto 1rem" }}
        />
        <h2
          style={{ fontSize: "1.25rem", fontWeight: 700, color: "#081a2f", margin: "0 0 0.5rem" }}
        >
          Confirming your payment…
        </h2>
        <p style={{ fontSize: "0.8125rem", color: "#5b6472" }}>
          This usually only takes a few seconds.
        </p>
      </div>
    );
  }

  if (outcome === "failed") {
    return (
      <div
        style={{
          ...card,
          maxWidth: "28rem",
          width: "100%",
          padding: "3rem 2rem",
          textAlign: "center",
        }}
      >
        <XCircle size={56} color="#dc2626" style={{ margin: "0 auto 1.25rem" }} />
        <h2
          style={{ fontSize: "1.375rem", fontWeight: 700, color: "#081a2f", margin: "0 0 0.5rem" }}
        >
          Payment Failed
        </h2>
        <p style={{ fontSize: "0.8125rem", color: "#5b6472", marginBottom: "1.75rem" }}>
          {props.failureReason ?? "Your payment could not be processed. No amount was charged."}
        </p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/checkout/${props.invoiceId}` as never)}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: "#00b8d9",
              color: "#fff",
              fontSize: "0.8125rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard" as never)}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--border)",
              background: "none",
              color: "#081a2f",
              fontSize: "0.8125rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Back to Dashboard
          </button>
        </div>
        <p style={{ fontSize: "0.75rem", color: "#8a92a6", marginTop: "1.5rem" }}>
          Having trouble? Contact our 24/7 Support Team
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "28rem", width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <CheckCircle2 size={56} color="#00b8d9" style={{ margin: "0 auto 1.25rem" }} />
        <h2
          style={{ fontSize: "1.375rem", fontWeight: 700, color: "#081a2f", margin: "0 0 0.5rem" }}
        >
          Payment Successful
        </h2>
        <p style={{ fontSize: "0.8125rem", color: "#5b6472" }}>
          Your payment of{" "}
          <strong style={{ color: "#081a2f" }}>
            {formatCurrency(props.totalMinorUnits, props.currency)}
          </strong>{" "}
          has been received. A receipt has been sent to your email.
        </p>
      </div>

      <div style={{ ...card, padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.6875rem",
                color: "#8a92a6",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              Transaction Details
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#081a2f" }}>
              {props.invoiceNumber}
            </div>
          </div>
          <span
            style={{
              padding: "0.25rem 0.625rem",
              borderRadius: "9999px",
              fontSize: "0.6875rem",
              fontWeight: 700,
              backgroundColor: "rgba(22,163,74,0.12)",
              color: "#16a34a",
            }}
          >
            Paid
          </span>
        </div>

        <div
          style={{
            fontSize: "0.8125rem",
            display: "flex",
            justifyContent: "space-between",
            padding: "0.5rem 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span style={{ color: "#5b6472" }}>Date</span>
          <span style={{ color: "#081a2f", fontWeight: 600 }}>
            {paidAt ? formatDate(paidAt) : "—"}
          </span>
        </div>
        <div
          style={{
            fontSize: "0.8125rem",
            display: "flex",
            justifyContent: "space-between",
            padding: "0.5rem 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span
            style={{ color: "#5b6472", display: "flex", alignItems: "center", gap: "0.375rem" }}
          >
            <CreditCard size={13} /> Payment Method
          </span>
          <span style={{ color: "#081a2f", fontWeight: 600 }}>{transactionRef ? "Card" : "—"}</span>
        </div>
        <div
          style={{
            fontSize: "0.9375rem",
            display: "flex",
            justifyContent: "space-between",
            padding: "0.75rem 0 0",
          }}
        >
          <span style={{ fontWeight: 700, color: "#081a2f" }}>Total Paid</span>
          <span style={{ fontWeight: 800, color: "#081a2f" }}>
            {formatCurrency(props.totalMinorUnits, props.currency)}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/invoices/${props.invoiceId}` as never)}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.375rem",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid var(--border)",
            background: "none",
            color: "#081a2f",
            fontSize: "0.8125rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <FileText size={15} /> View Invoice
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard" as never)}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.375rem",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "none",
            backgroundColor: "#00b8d9",
            color: "#fff",
            fontSize: "0.8125rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <LayoutDashboard size={15} /> Back to Dashboard
        </button>
      </div>

      <p
        style={{ fontSize: "0.75rem", color: "#8a92a6", marginTop: "1.5rem", textAlign: "center" }}
      >
        Having trouble? Contact our 24/7 Support Team
      </p>
    </div>
  );
}
