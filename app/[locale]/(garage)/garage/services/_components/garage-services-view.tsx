"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { serviceTypeValues, vehicleTypeValues } from "@/features/garages/schemas";
import { InlineSpinner } from "@/components/ui/inline-spinner";

interface Props {
  initialServices: string[];
  initialVehicleTypes: string[];
  initialMakeIds: string[];
  canManage: boolean;
}

interface VehicleMake {
  id: string;
  name: string;
}

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
  OBD_SCAN: "OBD Scan",
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

function Chip({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.4375rem 0.875rem",
        borderRadius: "9999px",
        border: `1px solid ${active ? "#00b8d9" : "var(--border)"}`,
        backgroundColor: active ? "rgba(0,184,217,0.1)" : "transparent",
        color: active ? "#00b8d9" : "#5b6472",
        fontSize: "0.8125rem",
        fontWeight: active ? 600 : 500,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {active && <Check size={13} />}
      {label}
    </button>
  );
}

const sectionCardStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  padding: "1.25rem",
  marginBottom: "1.25rem",
};

export function GarageServicesView({
  initialServices,
  initialVehicleTypes,
  initialMakeIds,
  canManage,
}: Props) {
  const [services, setServices] = useState<Set<string>>(new Set(initialServices));
  const [vehicleTypes, setVehicleTypes] = useState<Set<string>>(new Set(initialVehicleTypes));
  const [makeIds, setMakeIds] = useState<Set<string>>(new Set(initialMakeIds));
  const [makes, setMakes] = useState<VehicleMake[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/v1/vehicles/catalog/makes")
      .then((res) => res.json())
      .then((body: { data: VehicleMake[] }) => setMakes(body.data))
      .catch(() => setMakes([]));
  }, []);

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, value: string) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const [servicesRes, vehicleTypesRes, makesRes] = await Promise.all([
        fetch("/api/v1/garages/me/capabilities/services", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceTypes: Array.from(services) }),
        }),
        fetch("/api/v1/garages/me/capabilities/vehicle-types", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vehicleTypes: Array.from(vehicleTypes) }),
        }),
        fetch("/api/v1/garages/me/capabilities/makes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ makeIds: Array.from(makeIds) }),
        }),
      ]);

      const failed = [servicesRes, vehicleTypesRes, makesRes].find((r) => !r.ok);
      if (failed) {
        const body = (await failed.json()) as { error?: { message?: string } };
        toast.error(body.error?.message ?? "Failed to save changes.");
        return;
      }
      toast.success("Changes saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={sectionCardStyle}>
        <h2
          style={{
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: "#081a2f",
            marginBottom: "0.25rem",
          }}
        >
          Services Offered
        </h2>
        <p style={{ fontSize: "0.8125rem", color: "#8a92a6", marginBottom: "0.875rem" }}>
          Select the services your workshop performs.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {serviceTypeValues.map((s) => (
            <Chip
              key={s}
              label={SERVICE_LABELS[s] ?? s}
              active={services.has(s)}
              disabled={!canManage}
              onClick={() => toggle(services, setServices, s)}
            />
          ))}
        </div>
      </div>

      <div style={sectionCardStyle}>
        <h2
          style={{
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: "#081a2f",
            marginBottom: "0.25rem",
          }}
        >
          Vehicle Types
        </h2>
        <p style={{ fontSize: "0.8125rem", color: "#8a92a6", marginBottom: "0.875rem" }}>
          Select the vehicle categories you can service. Leave empty to accept all types.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {vehicleTypeValues.map((v) => (
            <Chip
              key={v}
              label={VEHICLE_TYPE_LABELS[v] ?? v}
              active={vehicleTypes.has(v)}
              disabled={!canManage}
              onClick={() => toggle(vehicleTypes, setVehicleTypes, v)}
            />
          ))}
        </div>
      </div>

      <div style={sectionCardStyle}>
        <h2
          style={{
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: "#081a2f",
            marginBottom: "0.25rem",
          }}
        >
          Make Specialization
        </h2>
        <p style={{ fontSize: "0.8125rem", color: "#8a92a6", marginBottom: "0.875rem" }}>
          Select the vehicle makes your team specializes in. Leave empty for &quot;All Makes&quot;.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {makes.length === 0 ? (
            <p
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8125rem",
                color: "#8a92a6",
              }}
            >
              <InlineSpinner color="#8a92a6" size={12} /> Loading makes...
            </p>
          ) : (
            makes.map((m) => (
              <Chip
                key={m.id}
                label={m.name}
                active={makeIds.has(m.id)}
                disabled={!canManage}
                onClick={() => toggle(makeIds, setMakeIds, m.id)}
              />
            ))
          )}
        </div>
      </div>

      {canManage && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: saving ? "#94a3b8" : "#081a2f",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      )}
    </div>
  );
}
