"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, MapPin, Wrench, LocateFixed, X } from "lucide-react";
import { GarageMap } from "@/components/maps/garage-map";
import { RatingSummary } from "@/components/garages/rating-summary";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { SelectChevron } from "@/components/forms/field-styles";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  LiveResultsDropdown,
  type LiveResultItem,
} from "@/components/search/live-results-dropdown";
import type { GarageSearchResult } from "@/features/bookings/service";

type GarageCard = GarageSearchResult;

export interface GarageSearchInitialFilters {
  query?: string;
  emirate?: string;
  serviceTypes?: string[];
  vehicleType?: string;
  makeId?: string;
}

interface Props {
  initialGarages: GarageCard[];
  initialTotal: number;
  makes: { id: string; name: string }[];
  /** Pre-applied filters from a deep link (e.g. the diagnostic result page's
   * "Find a Garage for This Repair" CTA / "See all matches" link) — seeds
   * both the initial server-rendered result set and the filter UI's own
   * state, so the controls visibly reflect what's already applied rather
   * than showing empty inputs next to an already-filtered list. */
  initialFilters?: GarageSearchInitialFilters;
}

export const SERVICE_LABELS: Record<string, string> = {
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

export const EMIRATE_LABELS: Record<string, string> = {
  DUBAI: "Dubai",
  ABU_DHABI: "Abu Dhabi",
  SHARJAH: "Sharjah",
  AJMAN: "Ajman",
  UMM_AL_QUWAIN: "Umm Al Quwain",
  RAS_AL_KHAIMAH: "Ras Al Khaimah",
  FUJAIRAH: "Fujairah",
};

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  SEDAN: "Sedan",
  SUV: "SUV",
  HATCHBACK: "Hatchback",
  COUPE: "Coupe",
  PICKUP_TRUCK: "Pickup Truck",
  VAN: "Van",
  MINIBUS: "Minibus",
  TRUCK: "Heavy Truck",
  OTHER: "Other",
};

const RADIUS_OPTIONS = [5, 10, 25, 50];
const DEBOUNCE_MS = 300;
const DROPDOWN_LIMIT = 6;

const fieldStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: "0.8125rem",
  color: "#081a2f",
  backgroundColor: "#fff",
};

// Native <select> arrows render flush against the border regardless of
// padding — this reserves room on the end side for a positioned chevron
// (see <SelectChevron>) instead of relying on the OS-drawn one.
const selectStyle: React.CSSProperties = {
  ...fieldStyle,
  paddingInlineEnd: "1.75rem",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

const SERVICE_OPTIONS = Object.entries(SERVICE_LABELS).map(([value, label]) => ({ value, label }));

export function GarageSearchView({ initialGarages, initialTotal, makes, initialFilters }: Props) {
  const [garages, setGarages] = useState(initialGarages);
  const [total, setTotal] = useState(initialTotal);
  const [query, setQuery] = useState(initialFilters?.query ?? "");
  const [emirate, setEmirate] = useState(initialFilters?.emirate ?? "");
  const [serviceTypes, setServiceTypes] = useState<string[]>(initialFilters?.serviceTypes ?? []);
  const [vehicleType, setVehicleType] = useState(initialFilters?.vehicleType ?? "");
  const [makeId, setMakeId] = useState(initialFilters?.makeId ?? "");
  const [radiusKm, setRadiusKm] = useState(25);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const limit = 12;
  const geo = useGeolocation();
  const isMobile = useIsMobile();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRunRef = useRef(true);

  // Re-run the search once geolocation resolves, so "Use my location" doesn't
  // require a second manual click to actually apply distance sorting.
  useEffect(() => {
    if (geo.status === "granted") void runSearch(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status]);

  // Elastic search: every filter change re-runs the search automatically
  // (debounced) — no manual "Search" trigger needed anywhere in this view.
  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void runSearch(0), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, emirate, serviceTypes, vehicleType, makeId]);

  async function runSearch(nextOffset = 0) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (emirate) params.set("emirate", emirate);
      if (serviceTypes.length > 0) params.set("serviceTypes", serviceTypes.join(","));
      if (vehicleType) params.set("vehicleType", vehicleType);
      if (makeId) params.set("makeId", makeId);
      if (geo.status === "granted" && geo.coords) {
        params.set("lat", String(geo.coords.latitude));
        params.set("lng", String(geo.coords.longitude));
        params.set("radiusKm", String(radiusKm));
        params.set("sort", "distance");
      }
      params.set("limit", String(limit));
      params.set("offset", String(nextOffset));

      const res = await fetch(`/api/v1/garages/search?${params.toString()}`);
      if (res.ok) {
        const body = (await res.json()) as { data: GarageCard[]; meta: { total: number } };
        setGarages(body.data);
        setTotal(body.meta.total);
        setOffset(nextOffset);
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleService(value: string) {
    setServiceTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function useMyLocation() {
    geo.request();
  }

  function clearFilters() {
    setQuery("");
    setEmirate("");
    setServiceTypes([]);
    setVehicleType("");
    setMakeId("");
  }

  const hasActiveFilters =
    query !== "" ||
    emirate !== "" ||
    serviceTypes.length > 0 ||
    vehicleType !== "" ||
    makeId !== "";

  const dropdownItems: LiveResultItem[] = garages.slice(0, DROPDOWN_LIMIT).map((g) => ({
    id: g.id,
    href: `/garages/${g.id}`,
    title: g.businessName,
    subtitle: g.addressLine1
      ? `${g.addressLine1}, ${g.emirate ? EMIRATE_LABELS[g.emirate] : ""}`
      : "Verified garage",
    imageUrl: null,
    meta: g.averageRating > 0 ? `★ ${g.averageRating.toFixed(1)}` : undefined,
  }));
  const showDropdown = inputFocused && query.trim().length >= 2;

  const mapPins = useMemo(
    () =>
      garages
        .filter(
          (g): g is GarageCard & { latitude: number; longitude: number } =>
            g.latitude != null && g.longitude != null,
        )
        .map((g) => ({
          id: g.id,
          name: g.businessName,
          latitude: g.latitude,
          longitude: g.longitude,
        })),
    [garages],
  );

  return (
    <div>
      {/* Filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.625rem",
          marginBottom: "1.25rem",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search
            size={15}
            color="#8a92a6"
            style={{
              position: "absolute",
              insetInlineStart: "0.625rem",
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
              setInputFocused(true);
            }}
            onBlur={() => {
              blurTimeoutRef.current = setTimeout(() => setInputFocused(false), 150);
            }}
            placeholder="Search garage name..."
            style={{
              ...fieldStyle,
              width: "100%",
              paddingInlineStart: "2rem",
              paddingInlineEnd: query ? "2rem" : "0.75rem",
              boxSizing: "border-box",
            }}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              style={{
                position: "absolute",
                insetInlineEnd: "0.625rem",
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "#8a92a6",
                display: "flex",
              }}
            >
              <X size={14} />
            </button>
          )}
          {showDropdown && (
            <LiveResultsDropdown
              items={dropdownItems}
              loading={loading}
              query={query}
              onSelect={() => setInputFocused(false)}
              fallbackIcon={<Wrench size={16} color="#8a92a6" />}
            />
          )}
        </div>

        <div style={{ position: "relative" }}>
          <select value={emirate} onChange={(e) => setEmirate(e.target.value)} style={selectStyle}>
            <option value="">All Emirates</option>
            {Object.entries(EMIRATE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <SelectChevron size={14} insetInlineEnd="0.625rem" />
        </div>

        <div style={{ position: "relative" }}>
          <select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            style={selectStyle}
          >
            <option value="">All Vehicle Types</option>
            {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <SelectChevron size={14} insetInlineEnd="0.625rem" />
        </div>

        <div style={{ position: "relative" }}>
          <select value={makeId} onChange={(e) => setMakeId(e.target.value)} style={selectStyle}>
            <option value="">All Makes</option>
            {makes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <SelectChevron size={14} insetInlineEnd="0.625rem" />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.5rem 1rem",
              backgroundColor: "transparent",
              color: "#5b6472",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <X size={14} /> Clear Filters
          </button>
        )}
      </div>

      {/* Location / distance controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.625rem",
          alignItems: "center",
          marginBottom: "1.25rem",
        }}
      >
        <button
          type="button"
          onClick={useMyLocation}
          disabled={geo.status === "requesting"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.4375rem 0.875rem",
            border: `1px solid ${geo.status === "granted" ? "#00b8d9" : "var(--border)"}`,
            borderRadius: "9999px",
            backgroundColor: geo.status === "granted" ? "rgba(0,184,217,0.08)" : "transparent",
            color: geo.status === "granted" ? "#00b8d9" : "#5b6472",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: geo.status === "requesting" ? "not-allowed" : "pointer",
          }}
        >
          <LocateFixed size={13} />
          {geo.status === "requesting"
            ? "Locating..."
            : geo.status === "granted"
              ? "Sorted by distance"
              : "Use my location"}
        </button>

        {geo.status === "granted" && (
          <div style={{ position: "relative" }}>
            <select
              value={radiusKm}
              onChange={(e) => {
                setRadiusKm(Number(e.target.value));
                void runSearch(0);
              }}
              style={selectStyle}
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  Within {r} km
                </option>
              ))}
            </select>
            <SelectChevron size={14} insetInlineEnd="0.625rem" />
          </div>
        )}

        {geo.status === "denied" && (
          <span style={{ fontSize: "0.75rem", color: "#a1a5ab" }}>
            Location access denied — showing all garages instead.
          </span>
        )}
        {geo.status === "unsupported" && (
          <span style={{ fontSize: "0.75rem", color: "#a1a5ab" }}>
            Your browser doesn't support location search.
          </span>
        )}
      </div>

      {/* Service filter — pills on tablet/desktop, a searchable multi-select on mobile */}
      <div style={{ marginBottom: "1.5rem" }}>
        {isMobile ? (
          <SearchableSelect
            multiple
            options={SERVICE_OPTIONS}
            value={serviceTypes}
            onChange={setServiceTypes}
            placeholder="All Services"
            searchPlaceholder="Search services..."
          />
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {SERVICE_OPTIONS.map(({ value, label }) => {
              const selected = serviceTypes.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleService(value)}
                  style={{
                    padding: "0.375rem 0.875rem",
                    borderRadius: "9999px",
                    border: "1px solid var(--border)",
                    backgroundColor: selected ? "#081a2f" : "transparent",
                    color: selected ? "#fff" : "#5b6472",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Map */}
      <div style={{ marginBottom: "1.5rem" }}>
        <GarageMap
          pins={mapPins}
          userLocation={geo.status === "granted" ? geo.coords : null}
          height="320px"
        />
      </div>

      {/* Results */}
      <p style={{ fontSize: "0.8125rem", color: "#8a92a6", marginBottom: "1rem" }}>
        {total} garage{total === 1 ? "" : "s"} found
      </p>

      {garages.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: "0.75rem",
            padding: "3rem 1.5rem",
            textAlign: "center",
            color: "#5b6472",
            fontSize: "0.875rem",
          }}
        >
          No garages match your filters.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {garages.map((g) => (
            <Link
              key={g.id}
              href={`/garages/${g.id}` as never}
              style={{
                display: "block",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                overflow: "hidden",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "120px",
                  backgroundColor: "#e5e9ef",
                }}
              >
                <Image
                  src="/images/garages/search-card-3.jpg"
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 280px"
                  style={{ objectFit: "cover" }}
                />
              </div>

              <div style={{ padding: "1.25rem" }}>
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "#081a2f",
                    margin: "0 0 0.375rem",
                  }}
                >
                  {g.businessName}
                </h3>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                    marginBottom: "0.5rem",
                  }}
                >
                  <RatingSummary averageRating={g.averageRating} reviewCount={g.reviewCount} />
                  {g.distanceKm != null && (
                    <span style={{ fontSize: "0.75rem", color: "#8a92a6" }}>
                      · {g.distanceKm.toFixed(1)} km away
                    </span>
                  )}
                </div>

                {g.addressLine1 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      fontSize: "0.8125rem",
                      color: "#5b6472",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <MapPin size={13} />
                    {g.addressLine1}, {g.emirate ? EMIRATE_LABELS[g.emirate] : ""}
                  </div>
                )}

                {g.services.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.375rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {g.services.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          padding: "0.1875rem 0.5rem",
                          borderRadius: "9999px",
                          fontSize: "0.6875rem",
                          fontWeight: 600,
                          backgroundColor: "rgba(0,184,217,0.1)",
                          color: "#00b8d9",
                        }}
                      >
                        <Wrench size={10} />
                        {SERVICE_LABELS[s] ?? s}
                      </span>
                    ))}
                  </div>
                )}

                {g.makeNames.length > 0 && (
                  <p style={{ fontSize: "0.75rem", color: "#8a92a6", margin: 0 }}>
                    Specialized in {g.makeNames.slice(0, 4).join(", ")}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
          <button
            type="button"
            disabled={offset === 0 || loading}
            onClick={() => void runSearch(Math.max(0, offset - limit))}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              backgroundColor: "transparent",
              fontSize: "0.8125rem",
              cursor: offset === 0 ? "not-allowed" : "pointer",
              opacity: offset === 0 ? 0.5 : 1,
            }}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={offset + limit >= total || loading}
            onClick={() => void runSearch(offset + limit)}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              backgroundColor: "transparent",
              fontSize: "0.8125rem",
              cursor: offset + limit >= total ? "not-allowed" : "pointer",
              opacity: offset + limit >= total ? 0.5 : 1,
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
