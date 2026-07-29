import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { searchGaragesSchema } from "@/features/bookings/schemas";
import { searchGarages, toGarageSearchResult } from "@/features/bookings/service";
import { db } from "@/lib/db";
import { GarageSearchView } from "./_components/garage-search-view";

interface Props {
  // Next.js searchParams values are string | string[] | undefined.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function GarageSearchPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  // Deep-linked filters (e.g. the diagnostic result page's "Find a Garage for
  // This Repair" CTA / "See all matches" link) are read here and applied to
  // the initial server-rendered result — the query string was previously
  // generated but never actually consumed on this end, so a deep link always
  // silently showed the plain unfiltered default instead of what it claimed
  // to link to.
  const rawParams = await searchParams;
  const parsed = searchGaragesSchema.safeParse({
    query: firstValue(rawParams.query),
    emirate: firstValue(rawParams.emirate),
    serviceTypes: firstValue(rawParams.serviceTypes),
    vehicleType: firstValue(rawParams.vehicleType),
    makeId: firstValue(rawParams.makeId),
    limit: 12,
    offset: 0,
    sort: "relevance",
  });
  const input = parsed.success ? parsed.data : { limit: 12, offset: 0, sort: "relevance" as const };

  const [{ garages, total }, makes] = await Promise.all([
    searchGarages(input),
    db.vehicleMake.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-8" style={{ maxWidth: "1300px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Garage Search
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        Find a verified UAE garage and book an appointment.
      </p>

      <GarageSearchView
        initialGarages={garages.map(toGarageSearchResult)}
        initialTotal={total}
        makes={makes.map((m) => ({ id: m.id, name: m.name }))}
        initialFilters={{
          query: input.query,
          emirate: input.emirate,
          serviceTypes: input.serviceTypes,
          vehicleType: input.vehicleType,
          makeId: input.makeId,
        }}
      />
    </div>
  );
}
