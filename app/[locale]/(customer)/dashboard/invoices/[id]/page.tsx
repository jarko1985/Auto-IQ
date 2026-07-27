import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getMyInvoice } from "@/features/payments/service";
import { NotFoundError } from "@/lib/errors";
import { InvoiceDetailView } from "./_components/invoice-detail-view";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { id } = await params;
  const invoice = await getMyInvoice(session.user.id, id).catch((err) => {
    if (err instanceof NotFoundError) return null;
    throw err;
  });
  if (!invoice) notFound();

  const lineItems = invoice.lineItemsSnapshot as Array<{
    description: string;
    quantity: number;
    unitPriceMinorUnits: number;
    totalMinorUnits: number;
  }>;

  const latestIntent = invoice.paymentIntents[0];
  const latestTransaction = latestIntent?.transactions.find((t) => t.status === "SUCCEEDED");
  const totalRefunded = latestTransaction
    ? latestTransaction.refunds
        .filter((r) => r.status === "SUCCEEDED")
        .reduce((sum, r) => sum + r.amountMinorUnits, 0)
    : 0;

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: "72rem", margin: "0 auto" }}>
      <InvoiceDetailView
        invoice={{
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          payableType: invoice.payableType,
          payableId: invoice.payableId,
          currency: invoice.currency,
          subtotalMinorUnits: invoice.subtotalMinorUnits,
          vatMinorUnits: invoice.vatMinorUnits,
          totalMinorUnits: invoice.totalMinorUnits,
          totalRefundedMinorUnits: totalRefunded,
          issuedAt: invoice.issuedAt ? invoice.issuedAt.toISOString() : null,
          paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
          customerName: invoice.customer.name,
          customerEmail: invoice.customer.email,
          customerPhone: invoice.customer.phone,
          recipientName: invoice.recipient.name,
          transactionRef: latestTransaction?.providerTransactionId ?? null,
          lineItems,
        }}
      />
    </div>
  );
}
