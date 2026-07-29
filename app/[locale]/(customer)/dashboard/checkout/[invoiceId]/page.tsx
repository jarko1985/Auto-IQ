import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getMyInvoice } from "@/features/payments/service";
import { NotFoundError } from "@/lib/errors";
import { CheckoutView } from "./_components/checkout-view";

export default async function CheckoutPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { invoiceId } = await params;
  const invoice = await getMyInvoice(session.user.id, invoiceId).catch((err) => {
    if (err instanceof NotFoundError) return null;
    throw err;
  });
  if (!invoice) notFound();

  if (invoice.status === "PAID") {
    redirect(`/dashboard/invoices/${invoice.id}` as never);
  }

  const lineItems = (
    invoice.lineItemsSnapshot as Array<{
      description: string;
      quantity: number;
      unitPriceMinorUnits: number;
      totalMinorUnits: number;
    }>
  ).map((item, index) => ({ id: `${invoiceId}-${index}`, ...item }));

  return (
    <div
      className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-8"
      style={{ maxWidth: "1280px", margin: "0 auto" }}
    >
      <CheckoutView
        invoice={{
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          payableType: invoice.payableType,
          payableId: invoice.payableId,
          subtotalMinorUnits: invoice.subtotalMinorUnits,
          vatMinorUnits: invoice.vatMinorUnits,
          totalMinorUnits: invoice.totalMinorUnits,
          currency: invoice.currency,
          lineItems,
        }}
      />
    </div>
  );
}
