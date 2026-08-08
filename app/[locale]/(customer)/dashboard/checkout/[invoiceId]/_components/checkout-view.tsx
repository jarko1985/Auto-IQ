"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { ShieldCheck, Lock, Sparkles, Gift, ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useIsRtl } from "@/i18n/direction";
import { formatCurrency } from "@/lib/utils";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceMinorUnits: number;
  totalMinorUnits: number;
}

interface InvoiceForCheckout {
  id: string;
  invoiceNumber: string;
  payableType: "VENDOR_ORDER" | "REPAIR_ORDER";
  payableId: string;
  subtotalMinorUnits: number;
  vatMinorUnits: number;
  totalMinorUnits: number;
  currency: string;
  lineItems: LineItem[];
}

const stripePublicKey = process.env.NEXT_PUBLIC_PAYMENT_PUBLIC_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

const card = {
  backgroundColor: "#fff",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
} as const;

function BackLink({ invoice }: { invoice: InvoiceForCheckout }) {
  const label = invoice.payableType === "REPAIR_ORDER" ? `Back to Repair Order` : `Back to Order`;
  const href =
    invoice.payableType === "REPAIR_ORDER"
      ? `/dashboard/repair-orders/${invoice.payableId}`
      : `/dashboard/orders/${invoice.payableId}`;
  const BackIcon = useIsRtl() ? ArrowRight : ArrowLeft;
  return (
    <Link
      href={href as never}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        fontSize: "0.8125rem",
        color: "#5b6472",
        textDecoration: "none",
        marginBottom: "0.75rem",
      }}
    >
      <BackIcon size={14} /> {label}
    </Link>
  );
}

function OrderSummaryCard({ invoice }: { invoice: InvoiceForCheckout }) {
  return (
    <div style={{ ...card, overflow: "hidden", marginBottom: "1.25rem" }}>
      <div
        style={{
          padding: "1.25rem",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
          Order Summary
        </h2>
        <span
          style={{
            padding: "0.25rem 0.625rem",
            borderRadius: "9999px",
            fontSize: "0.6875rem",
            fontWeight: 700,
            backgroundColor: "rgba(0,184,217,0.1)",
            color: "#00b8d9",
          }}
        >
          {invoice.invoiceNumber}
        </span>
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
            <tr style={{ textAlign: "start" }}>
              {["Service / Part Description", "Qty", `Price (${invoice.currency})`].map((h) => (
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
            {invoice.lineItems.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "0.625rem 1.25rem", color: "#081a2f", fontWeight: 600 }}>
                  {item.description}
                </td>
                <td style={{ padding: "0.625rem 1.25rem", color: "#5b6472" }}>{item.quantity}</td>
                <td style={{ padding: "0.625rem 1.25rem", color: "#081a2f", fontWeight: 600 }}>
                  {formatCurrency(item.totalMinorUnits, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentMethodCard({
  clientSecret,
  loadError,
  invoiceId,
  totalMinorUnits,
  currency,
}: {
  clientSecret: string | null;
  loadError: string | null;
  invoiceId: string;
  totalMinorUnits: number;
  currency: string;
}) {
  return (
    <div style={{ ...card, padding: "1.5rem", marginBottom: "1.25rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
          Payment Method
        </h2>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.25rem 0.625rem",
            borderRadius: "9999px",
            fontSize: "0.6875rem",
            fontWeight: 700,
            backgroundColor: "rgba(8,26,47,0.06)",
            color: "#081a2f",
          }}
        >
          <Lock size={11} /> Secured by Stripe
        </span>
      </div>

      {loadError && (
        <p style={{ fontSize: "0.8125rem", color: "#dc2626", marginBottom: "0.75rem" }}>
          {loadError}
        </p>
      )}

      {clientSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
          <PayForm invoiceId={invoiceId} totalMinorUnits={totalMinorUnits} currency={currency} />
        </Elements>
      ) : (
        !loadError && (
          <div
            style={{
              padding: "2rem 0",
              textAlign: "center",
              color: "#8a92a6",
              fontSize: "0.8125rem",
            }}
          >
            Preparing secure checkout…
          </div>
        )
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "1.25rem",
          paddingTop: "1rem",
          borderTop: "1px solid var(--border)",
          opacity: 0.65,
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", gap: "1rem" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.6875rem",
              color: "#5b6472",
            }}
          >
            <ShieldCheck size={13} /> PCI DSS Compliant
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.6875rem",
              color: "#5b6472",
            }}
          >
            <Lock size={13} /> 256-bit SSL Encryption
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.625rem", color: "#8a92a6", fontWeight: 600 }}>
            Secure Gateway
          </span>
          <Image
            src="/images/payments/checkout-card-brand-visa.jpg"
            alt="Visa"
            width={28}
            height={18}
            style={{ borderRadius: "3px", objectFit: "cover" }}
          />
          <Image
            src="/images/payments/checkout-card-brand-mastercard.jpg"
            alt="Mastercard"
            width={28}
            height={18}
            style={{ borderRadius: "3px", objectFit: "cover" }}
          />
          <span
            style={{
              fontSize: "0.625rem",
              fontWeight: 700,
              padding: "0.125rem 0.375rem",
              border: "1px solid var(--border)",
              borderRadius: "3px",
              color: "#5b6472",
            }}
          >
            AMEX
          </span>
        </div>
      </div>
    </div>
  );
}

const STRIPE_APPEARANCE = {
  variables: {
    colorPrimary: "#00b8d9",
    colorText: "#081a2f",
    borderRadius: "8px",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
} as const;

function PayForm({
  invoiceId,
  totalMinorUnits,
  currency,
}: {
  invoiceId: string;
  totalMinorUnits: number;
  currency: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Please check your payment details.");
      setSubmitting(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/checkout/${invoiceId}/confirmation`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setSubmitting(false);
      router.push(
        `/dashboard/checkout/${invoiceId}/confirmation?status=failed&reason=${encodeURIComponent(
          confirmError.message ?? "Your payment could not be processed.",
        )}` as never,
      );
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      router.push(`/dashboard/checkout/${invoiceId}/confirmation?status=success` as never);
      return;
    }

    // requires_action already redirected via return_url; anything else, surface generically.
    setSubmitting(false);
  }

  return (
    <div>
      <PaymentElement />
      {error && (
        <p style={{ fontSize: "0.8125rem", color: "#dc2626", marginTop: "0.75rem" }}>{error}</p>
      )}
      <button
        type="button"
        disabled={!stripe || submitting}
        onClick={() => void handlePay()}
        style={{
          width: "100%",
          marginTop: "1.25rem",
          padding: "0.875rem",
          borderRadius: "0.5rem",
          border: "none",
          backgroundColor: "#00b8d9",
          color: "#fff",
          fontSize: "0.9375rem",
          fontWeight: 700,
          cursor: submitting ? "not-allowed" : "pointer",
          opacity: submitting ? 0.7 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        <Lock size={15} />
        {submitting ? "Processing…" : `Pay ${formatCurrency(totalMinorUnits, currency)}`}
      </button>
      <p
        style={{
          fontSize: "0.6875rem",
          color: "#8a92a6",
          marginTop: "0.75rem",
          textAlign: "center",
        }}
      >
        Your payment is processed securely. AutoIQ never stores your card details. By clicking
        &ldquo;Pay&rdquo;, you agree to our Terms of Service.
      </p>
    </div>
  );
}

export function CheckoutView({ invoice }: { invoice: InvoiceForCheckout }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const idempotencyKey = useMemo(() => `${invoice.id}-${crypto.randomUUID()}`, [invoice.id]);

  useEffect(() => {
    let cancelled = false;
    async function createIntent() {
      try {
        const res = await fetch(`/api/v1/invoices/${invoice.id}/payment-intents`, {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey },
        });
        const json = (await res.json()) as {
          data?: { clientSecret: string };
          error?: { message?: string };
        };
        if (cancelled) return;
        if (!res.ok || !json.data) {
          setLoadError(json.error?.message ?? "Unable to start checkout. Please try again.");
          return;
        }
        setClientSecret(json.data.clientSecret);
      } catch {
        if (!cancelled) setLoadError("Unable to reach the payment server. Please try again.");
      }
    }
    void createIntent();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.id]);

  const estimatedPoints = Math.floor(invoice.totalMinorUnits / 10000);

  return (
    <div>
      <BackLink invoice={invoice} />
      <h1
        className="text-fluid-page-title"
        style={{ fontWeight: 700, color: "#081a2f", margin: "0 0 1.5rem" }}
      >
        Checkout
      </h1>

      <div
        className="grid-content-sidebar"
        style={{ alignItems: "start", "--sidebar-w": "22rem" } as CSSProperties}
      >
        <div>
          <OrderSummaryCard invoice={invoice} />
          <PaymentMethodCard
            clientSecret={clientSecret}
            loadError={loadError}
            invoiceId={invoice.id}
            totalMinorUnits={invoice.totalMinorUnits}
            currency={invoice.currency}
          />

          <div
            style={{
              ...card,
              padding: "1.25rem",
              display: "flex",
              gap: "0.75rem",
              borderColor: "rgba(0,184,217,0.25)",
              backgroundColor: "rgba(0,184,217,0.04)",
            }}
          >
            <Sparkles size={18} color="#00b8d9" style={{ flexShrink: 0, marginTop: "0.125rem" }} />
            <div>
              <h3
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: "#081a2f",
                  margin: "0 0 0.25rem",
                }}
              >
                AI Insight: Service Warranty
              </h3>
              <p style={{ fontSize: "0.8125rem", color: "#5b6472", margin: 0, lineHeight: 1.5 }}>
                Every AutoIQ repair and part purchase is covered by our standard 12-month / 10,000
                km performance warranty, automatically applied once payment is confirmed.
              </p>
            </div>
          </div>
        </div>

        <div style={{ position: "sticky", top: "1.5rem" }}>
          <div style={{ ...card, padding: "1.5rem", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#081a2f", margin: "0 0 1rem" }}>
              Payment Summary
            </h2>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8125rem",
                color: "#5b6472",
                marginBottom: "0.5rem",
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
                marginBottom: "0.75rem",
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
                fontSize: "1.25rem",
                color: "#00b8d9",
                paddingTop: "0.75rem",
                borderTop: "1px solid var(--border)",
              }}
            >
              <span>Total Due</span>
              <span>{formatCurrency(invoice.totalMinorUnits, invoice.currency)}</span>
            </div>
          </div>

          <div
            style={{
              borderRadius: "0.75rem",
              padding: "1.25rem",
              backgroundColor: "#081a2f",
              color: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.375rem",
              }}
            >
              <Gift size={16} color="#00b8d9" />
              <h3 style={{ fontSize: "0.8125rem", fontWeight: 700, margin: 0 }}>
                Earn {estimatedPoints} AutoIQ Points
              </h3>
            </div>
            <p style={{ fontSize: "0.75rem", opacity: 0.75, margin: 0, lineHeight: 1.5 }}>
              Points can be redeemed for your next service or fuel vouchers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
