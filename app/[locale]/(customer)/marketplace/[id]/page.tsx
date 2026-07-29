import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPublicPartDetail } from "@/features/catalog/service";
import { listOffersForPart } from "@/features/inventory/service";
import { NotFoundError } from "@/lib/errors";
import { PartOffersView } from "./_components/part-offers-view";

export default async function MarketplacePartDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { id } = await params;
  const part = await getPublicPartDetail(id).catch((err) => {
    if (err instanceof NotFoundError) return null;
    throw err;
  });
  if (!part) notFound();

  const offers = await listOffersForPart(id);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-8" style={{ maxWidth: "1100px" }}>
      <PartOffersView
        part={{
          id: part.id,
          name: part.name,
          manufacturerName: part.manufacturerName,
          partNumber: part.partNumber,
          alternatePartNumbers: part.alternatePartNumbers,
          origin: part.origin,
          description: part.description,
          categoryName: part.category.name,
          compatibilityCount: part.compatibilities.length,
        }}
        offers={offers.map((o) => ({
          inventoryItemId: o.id,
          vendorName: o.vendor.businessName,
          locationName: o.location.name,
          emirate: o.location.emirate,
          priceMinorUnits: o.priceMinorUnits,
          currency: o.currency,
          qtyAvailable: o.qtyAvailable,
          stockStatus: o.stockStatus,
        }))}
      />
    </div>
  );
}
