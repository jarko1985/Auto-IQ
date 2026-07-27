import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getMyInvoice } from "@/features/payments/service";
import { NotFoundError } from "@/lib/errors";
import { ConfirmationView } from "./_components/confirmation-view";

export default async function PaymentConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ status?: string; reason?: string; redirect_status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { invoiceId } = await params;
  const query = await searchParams;

  const invoice = await getMyInvoice(session.user.id, invoiceId).catch((err) => {
    if (err instanceof NotFoundError) return null;
    throw err;
  });
  if (!invoice) notFound();

  // Stripe's own redirect (3DS) appends redirect_status; our synchronous
  // confirm flow appends our own status param. Either can drive the outcome.
  const outcome =
    query.status === "failed" || query.redirect_status === "failed"
      ? "failed"
      : invoice.status === "PAID" ||
          query.status === "success" ||
          query.redirect_status === "succeeded"
        ? "success"
        : "pending";

  const latestIntent = invoice.paymentIntents[0];
  const latestTransaction = latestIntent?.transactions[0];

  return (
    <div style={{ padding: "3rem 2rem", display: "flex", justifyContent: "center" }}>
      <ConfirmationView
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        currency={invoice.currency}
        totalMinorUnits={invoice.totalMinorUnits}
        initialOutcome={outcome}
        failureReason={query.reason ?? latestIntent?.failureReason ?? null}
        paidAt={invoice.paidAt ? invoice.paidAt.toISOString() : null}
        transactionRef={latestTransaction?.providerTransactionId ?? null}
      />
    </div>
  );
}
