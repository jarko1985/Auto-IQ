import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listCategories, searchParts } from "@/features/catalog/service";
import { listUserVehicles } from "@/features/vehicles/service";
import { MarketplaceView } from "./_components/marketplace-view";

export default async function MarketplacePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const [results, categories, vehicles] = await Promise.all([
    searchParts({ limit: 24, offset: 0 }),
    listCategories(),
    listUserVehicles(session.user.id),
  ]);

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: "1300px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Spare Parts Marketplace
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        Compare prices and availability across verified UAE vendors.
      </p>

      <MarketplaceView
        initialResults={results}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        vehicles={vehicles.map((v) => ({
          id: v.id,
          label: `${v.makeName} ${v.modelName} (${v.year})`,
          makeName: v.makeName,
          modelName: v.modelName,
          year: v.year,
        }))}
      />
    </div>
  );
}
