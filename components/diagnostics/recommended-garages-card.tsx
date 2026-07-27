import { Star, MapPin, Calendar, ArrowRight, Wrench } from "lucide-react";
import { Link } from "@/i18n/routing";
import { GarageMap } from "@/components/maps/garage-map";

export interface RecommendedGarage {
  id: string;
  businessName: string;
  emirate: string | null;
  addressLine1: string | null;
  latitude: number | null;
  longitude: number | null;
  primaryLocationId: string | null;
  services: string[];
  makeNames: string[];
  averageRating: number;
  reviewCount: number;
  distanceKm: number | null;
}

interface Props {
  garages: RecommendedGarage[];
  deepLinkQuery: string;
}

const EMIRATE_LABELS: Record<string, string> = {
  DUBAI: "Dubai",
  ABU_DHABI: "Abu Dhabi",
  SHARJAH: "Sharjah",
  AJMAN: "Ajman",
  UMM_AL_QUWAIN: "Umm Al Quwain",
  RAS_AL_KHAIMAH: "Ras Al Khaimah",
  FUJAIRAH: "Fujairah",
};

const SERVICE_LABELS: Record<string, string> = {
  OIL_CHANGE: "Oil Change",
  TYRE_ROTATION: "Tyre Rotation",
  BRAKE_SERVICE: "Brake Service",
  FILTER_CHANGE: "Filter Change",
  FLUID_CHECK: "Fluid Check",
  BATTERY_REPLACEMENT: "Battery Replacement",
  TIMING_BELT: "Timing Belt",
  AC_SERVICE: "AC Service",
  TRANSMISSION_SERVICE: "Transmission Service",
  GENERAL_INSPECTION: "General Inspection",
  OTHER: "Other",
  ENGINE_REPAIR: "Engine Repair",
  ELECTRICAL_REPAIR: "Electrical Repair",
  SUSPENSION_REPAIR: "Suspension Repair",
  COOLING_SYSTEM_REPAIR: "Cooling System Repair",
  EXHAUST_REPAIR: "Exhaust Repair",
  TYRE_REPAIR: "Tyre Repair",
  BODY_REPAIR: "Body Repair",
  STEERING_REPAIR: "Steering Repair",
  FUEL_SYSTEM_REPAIR: "Fuel System Repair",
};

function locationLine(g: RecommendedGarage): string | null {
  const parts: string[] = [];
  if (g.addressLine1) parts.push(g.addressLine1);
  else if (g.emirate) parts.push(EMIRATE_LABELS[g.emirate] ?? g.emirate);
  if (g.distanceKm != null) parts.push(`${g.distanceKm.toFixed(1)} km away`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * "Recommended Garages" card for the diagnostic result page's right column
 * (per the Stitch "AI Diagnostic Results - Refined Light Theme" reference
 * screen) — top pick gets a "RECOMMENDED" badge and a prominent "Book Now"
 * button. Each garage gets its own small location-map preview plus matching
 * services/specialization details — deliberately no fabricated data (e.g.
 * "next opening" times), only real rating/distance/address/service info
 * this app actually has.
 */
export function RecommendedGaragesCard({ garages, deepLinkQuery }: Props) {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #ebeef1",
        borderRadius: "1rem",
        padding: "1.25rem 1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#74777d",
            letterSpacing: "0.06em",
            margin: 0,
          }}
        >
          RECOMMENDED GARAGES
        </p>
        <Link
          href={`/garages?${deepLinkQuery}` as never}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#00b8d9",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          All Garages <ArrowRight size={12} />
        </Link>
      </div>

      {garages.length === 0 ? (
        <div style={{ textAlign: "center", padding: "1rem 0" }}>
          <p style={{ fontSize: "0.8125rem", color: "#a1a5ab", margin: "0 0 0.875rem" }}>
            No garages matching this exact repair yet.
          </p>
          <Link
            href={`/garages?${deepLinkQuery}` as never}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#081a2f",
              color: "#fff",
              borderRadius: "0.5rem",
              fontWeight: 700,
              fontSize: "0.8125rem",
              textDecoration: "none",
            }}
          >
            Browse All Garages
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {garages.slice(0, 3).map((g, i) => {
            const isTop = i === 0;
            const line = locationLine(g);
            const hasCoords = g.latitude != null && g.longitude != null;
            return (
              <div
                key={g.id}
                style={{
                  paddingTop: i === 0 ? 0 : "1.25rem",
                  paddingBottom: i < Math.min(garages.length, 3) - 1 ? "1.25rem" : 0,
                  borderBottom:
                    i < Math.min(garages.length, 3) - 1 ? "1px solid #f1f4f7" : "none",
                }}
              >
                <div style={{ display: "flex", gap: "0.625rem", marginBottom: "0.75rem" }}>
                  <div
                    style={{
                      width: "2.25rem",
                      height: "2.25rem",
                      borderRadius: "0.625rem",
                      backgroundColor: isTop ? "#081a2f" : "#f1f4f7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Wrench size={15} color={isTop ? "#00b8d9" : "#74777d"} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                        flexWrap: "wrap",
                        marginBottom: "0.125rem",
                      }}
                    >
                      <Link
                        href={`/garages/${g.id}` as never}
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 700,
                          color: "#081a2f",
                          textDecoration: "none",
                        }}
                      >
                        {g.businessName}
                      </Link>
                      {isTop && (
                        <span
                          style={{
                            fontSize: "0.625rem",
                            fontWeight: 700,
                            color: "#16a34a",
                            backgroundColor: "rgba(22,163,74,0.12)",
                            borderRadius: "9999px",
                            padding: "0.0625rem 0.4375rem",
                            letterSpacing: "0.02em",
                          }}
                        >
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    {g.reviewCount > 0 ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontSize: "0.75rem",
                          color: "#5b6472",
                        }}
                      >
                        <Star size={11} color="#d97706" fill="#d97706" />
                        {g.averageRating.toFixed(1)} ({g.reviewCount} review
                        {g.reviewCount === 1 ? "" : "s"})
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "#a1a5ab" }}>No reviews yet</span>
                    )}
                    {line && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontSize: "0.75rem",
                          color: "#8a92a6",
                          marginTop: "0.125rem",
                        }}
                      >
                        <MapPin size={10} />
                        {line}
                      </div>
                    )}
                  </div>
                </div>

                {hasCoords && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <GarageMap
                      pins={[
                        {
                          id: g.id,
                          name: g.businessName,
                          latitude: g.latitude!,
                          longitude: g.longitude!,
                        },
                      ]}
                      height="96px"
                    />
                  </div>
                )}

                {(g.services.length > 0 || g.makeNames.length > 0) && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    {g.services.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.3rem",
                          marginBottom: g.makeNames.length > 0 ? "0.375rem" : 0,
                        }}
                      >
                        {g.services.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            style={{
                              padding: "0.1875rem 0.5rem",
                              borderRadius: "9999px",
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              backgroundColor: "rgba(0,184,217,0.1)",
                              color: "#0891b2",
                            }}
                          >
                            {SERVICE_LABELS[s] ?? s}
                          </span>
                        ))}
                      </div>
                    )}
                    {g.makeNames.length > 0 && (
                      <p style={{ fontSize: "0.6875rem", color: "#a1a5ab", margin: 0 }}>
                        Specialized in {g.makeNames.slice(0, 3).join(", ")}
                      </p>
                    )}
                  </div>
                )}

                <Link
                  href={
                    (g.primaryLocationId
                      ? `/garages/${g.id}/book/vehicle?locationId=${g.primaryLocationId}`
                      : `/garages/${g.id}`) as never
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.375rem",
                    padding: isTop ? "0.625rem" : "0.5rem",
                    borderRadius: "0.5rem",
                    textDecoration: "none",
                    fontSize: isTop ? "0.8125rem" : "0.75rem",
                    fontWeight: 700,
                    ...(isTop
                      ? { backgroundColor: "#081a2f", color: "#fff", border: "none" }
                      : { backgroundColor: "#fff", color: "#081a2f", border: "1px solid #e5e8eb" }),
                  }}
                >
                  <Calendar size={isTop ? 14 : 12} />
                  Book Now
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
