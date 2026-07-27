"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useIsRtl } from "@/i18n/direction";
import { Car, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

interface Vehicle {
  id: string;
  makeName: string;
  modelName: string;
  trimName: string | null;
  year: number;
  plateNumber: string | null;
  isDefault: boolean;
}

interface Props {
  garageId: string;
  locationId: string;
  vehicles: Vehicle[];
}

export function SelectVehicleForm({ garageId, locationId, vehicles }: Props) {
  const router = useRouter();
  const [vehicleId, setVehicleId] = useState(
    vehicles.find((v) => v.isDefault)?.id ?? vehicles[0]?.id ?? "",
  );
  const isRtl = useIsRtl();
  const ForwardIcon = isRtl ? ChevronLeft : ChevronRight;

  function next() {
    if (!vehicleId) return;
    const params = new URLSearchParams({ locationId, vehicleId });
    router.push(`/garages/${garageId}/book/service?${params.toString()}` as never);
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {vehicles.map((v) => {
          const selected = vehicleId === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setVehicleId(v.id)}
              style={{
                textAlign: "start",
                padding: 0,
                border: selected ? "2px solid #00b8d9" : "1px solid #ebeef1",
                borderRadius: "1rem",
                backgroundColor: "#fff",
                cursor: "pointer",
                overflow: "hidden",
                boxShadow: selected ? "0 0 0 4px rgba(0,184,217,0.12)" : "none",
              }}
            >
              <div
                style={{
                  height: "100px",
                  background: "linear-gradient(135deg, #0f2744 0%, #1a3a5c 50%, #0f2744 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <Car size={40} color="rgba(255,255,255,0.15)" />
                {selected && (
                  <span
                    style={{
                      position: "absolute",
                      top: "0.625rem",
                      insetInlineEnd: "0.625rem",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      backgroundColor: "rgba(0,184,217,0.9)",
                      color: "#fff",
                      borderRadius: "9999px",
                      padding: "0.25rem 0.625rem",
                    }}
                  >
                    Selected
                  </span>
                )}
              </div>
              <div style={{ padding: "1rem" }}>
                <p
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    color: "#081a2f",
                    margin: "0 0 0.25rem",
                  }}
                >
                  {v.year} {v.makeName} {v.modelName}
                </p>
                <p style={{ fontSize: "0.75rem", color: "#74777d", margin: 0 }}>
                  {v.plateNumber ? `Plate: ${v.plateNumber}` : (v.trimName ?? "No plate on file")}
                </p>
              </div>
            </button>
          );
        })}

        <Link
          href={"/vehicles/new" as never}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem 1rem",
            border: "2px dashed #c4c6cd",
            borderRadius: "1rem",
            backgroundColor: "#f9fafb",
            textDecoration: "none",
            gap: "0.5rem",
          }}
        >
          <div
            style={{
              width: "2.5rem",
              height: "2.5rem",
              borderRadius: "50%",
              border: "2px dashed #c4c6cd",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={18} color="#74777d" />
          </div>
          <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#181c1e", margin: 0 }}>
            Register New Vehicle
          </p>
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "1.25rem",
          borderTop: "1px solid #ebeef1",
        }}
      >
        <Link
          href={`/garages/${garageId}` as never}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1.25rem",
            color: "#44474d",
            border: "1px solid #c4c6cd",
            borderRadius: "0.75rem",
            fontSize: "0.9375rem",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          <X size={15} /> Cancel Booking
        </Link>
        <button
          type="button"
          onClick={next}
          disabled={!vehicleId}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1.375rem",
            backgroundColor: "#081a2f",
            color: "#fff",
            border: "none",
            borderRadius: "0.75rem",
            fontSize: "0.9375rem",
            fontWeight: 600,
            cursor: vehicleId ? "pointer" : "not-allowed",
            opacity: vehicleId ? 1 : 0.6,
          }}
        >
          Next Step <ForwardIcon size={15} />
        </button>
      </div>
    </div>
  );
}
