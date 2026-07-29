"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, MapPin, Phone, Mail, Calendar, Star } from "lucide-react";
import { SERVICE_LABELS, EMIRATE_LABELS } from "../../_components/garage-search-view";
import { RatingSummary } from "@/components/garages/rating-summary";
import { GarageMap } from "@/components/maps/garage-map";

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

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface WorkingHour {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}
interface GarageLocation {
  id: string;
  name: string;
  emirate: string;
  addressLine1: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  workingHours: WorkingHour[];
}
interface GarageReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}
interface Garage {
  id: string;
  businessName: string;
  contactPhone: string;
  contactEmail: string;
  services: string[];
  vehicleCapabilities: string[];
  makeNames: string[];
  averageRating: number;
  reviewCount: number;
  reviews: GarageReview[];
  locations: GarageLocation[];
}

interface Props {
  garage: Garage;
  primaryLocationId: string | null;
}

export function GarageProfileView({ garage, primaryLocationId }: Props) {
  const [locationId, setLocationId] = useState(primaryLocationId ?? garage.locations[0]?.id ?? "");
  const location = garage.locations.find((l) => l.id === locationId) ?? garage.locations[0] ?? null;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
            <h1
              className="text-fluid-page-title break-words"
              style={{ fontWeight: 700, color: "#081a2f", margin: 0 }}
            >
              {garage.businessName}
            </h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.1875rem 0.625rem",
                borderRadius: "9999px",
                fontSize: "0.6875rem",
                fontWeight: 700,
                backgroundColor: "rgba(22,163,74,0.12)",
                color: "#16a34a",
              }}
            >
              <CheckCircle2 size={12} /> Verified
            </span>
          </div>
          <div style={{ marginTop: "0.375rem" }}>
            <RatingSummary
              averageRating={garage.averageRating}
              reviewCount={garage.reviewCount}
              size={14}
            />
          </div>
          {location && (
            <p
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                fontSize: "0.875rem",
                color: "#5b6472",
                marginTop: "0.375rem",
              }}
            >
              <MapPin size={14} />
              {location.addressLine1}, {EMIRATE_LABELS[location.emirate] ?? location.emirate}
            </p>
          )}
        </div>

        <Link
          href={
            locationId
              ? (`/garages/${garage.id}/book/vehicle?locationId=${locationId}` as never)
              : "#"
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1.375rem",
            backgroundColor: "#081a2f",
            color: "#fff",
            borderRadius: "0.75rem",
            fontSize: "0.9375rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <Calendar size={16} /> Book Appointment
        </Link>
      </div>

      {garage.locations.length > 1 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#081a2f",
              marginInlineEnd: "0.5rem",
            }}
          >
            Location
          </label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            style={{
              padding: "0.4375rem 0.75rem",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              fontSize: "0.8125rem",
            }}
          >
            {garage.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          fontSize: "0.8125rem",
          color: "#5b6472",
          marginBottom: "1.5rem",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <Phone size={13} /> {garage.contactPhone}
        </span>
        <span className="overflow-wrap-anywhere" style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <Mail size={13} /> {garage.contactEmail}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div
          style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.25rem" }}
        >
          <h2
            style={{
              fontSize: "0.9375rem",
              fontWeight: 700,
              color: "#081a2f",
              marginTop: 0,
              marginBottom: "0.875rem",
            }}
          >
            Services
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {garage.services.map((s) => (
              <span
                key={s}
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  backgroundColor: "rgba(0,184,217,0.1)",
                  color: "#00b8d9",
                }}
              >
                {SERVICE_LABELS[s] ?? s}
              </span>
            ))}
          </div>

          <h2
            style={{
              fontSize: "0.9375rem",
              fontWeight: 700,
              color: "#081a2f",
              marginTop: "1.25rem",
              marginBottom: "0.75rem",
            }}
          >
            Vehicle Capabilities
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {garage.vehicleCapabilities.map((v) => (
              <span
                key={v}
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  backgroundColor: "#f7fafd",
                  color: "#081a2f",
                  border: "1px solid var(--border)",
                }}
              >
                {VEHICLE_TYPE_LABELS[v] ?? v}
              </span>
            ))}
          </div>

          {garage.makeNames.length > 0 && (
            <p style={{ fontSize: "0.8125rem", color: "#8a92a6", marginTop: "1rem" }}>
              Specialized in {garage.makeNames.join(", ")}
            </p>
          )}
        </div>

        <div
          style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.25rem" }}
        >
          <h2
            style={{
              fontSize: "0.9375rem",
              fontWeight: 700,
              color: "#081a2f",
              marginTop: 0,
              marginBottom: "0.875rem",
            }}
          >
            Working Hours
          </h2>
          {location?.workingHours.map((h) => (
            <div
              key={h.dayOfWeek}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.375rem 0",
                fontSize: "0.8125rem",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={{ color: "#081a2f" }}>{DAY_LABELS[h.dayOfWeek]}</span>
              <span style={{ color: h.isClosed ? "#dc2626" : "#5b6472" }}>
                {h.isClosed ? "Closed" : `${h.openTime} – ${h.closeTime}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {location?.latitude != null && location.longitude != null && (
        <div style={{ marginTop: "1.25rem" }}>
          <GarageMap
            pins={[
              {
                id: garage.id,
                name: garage.businessName,
                latitude: location.latitude,
                longitude: location.longitude,
              },
            ]}
            height="260px"
          />
        </div>
      )}

      <div
        style={{
          marginTop: "1.25rem",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          padding: "1.25rem",
        }}
      >
        <h2
          style={{
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: "#081a2f",
            marginTop: 0,
            marginBottom: "0.875rem",
          }}
        >
          Recent Reviews
        </h2>
        {garage.reviews.length === 0 ? (
          <p style={{ fontSize: "0.8125rem", color: "#8a92a6", margin: 0 }}>
            No reviews yet — this garage hasn't been rated by a customer.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {garage.reviews.map((r) => (
              <div
                key={r.id}
                style={{ paddingBottom: "0.875rem", borderBottom: "1px solid var(--border)" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "0.25rem",
                  }}
                >
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#081a2f" }}>
                    {r.customerName}
                  </span>
                  <div style={{ display: "flex", gap: "0.125rem" }}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <Star
                        key={v}
                        size={12}
                        color={v <= r.rating ? "#d97706" : "#d1d5db"}
                        fill={v <= r.rating ? "#d97706" : "none"}
                      />
                    ))}
                  </div>
                </div>
                {r.comment && (
                  <p style={{ fontSize: "0.8125rem", color: "#5b6472", margin: 0 }}>{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
