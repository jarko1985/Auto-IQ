"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useIsRtl } from "@/i18n/direction";
import {
  Droplet,
  Disc,
  Filter,
  Gauge,
  BatteryCharging,
  Wrench,
  Wind,
  Settings,
  ClipboardCheck,
  ChevronRight,
  ChevronLeft,
  Cog,
  Zap,
  MoveVertical,
  Thermometer,
  Cylinder,
  CircleDot,
  Car,
  Compass,
  Fuel,
  type LucideIcon,
} from "lucide-react";

interface Props {
  garageId: string;
  locationId: string;
  vehicleId: string;
  services: string[];
}

const SERVICE_META: Record<string, { label: string; description: string; icon: LucideIcon }> = {
  OIL_CHANGE: {
    label: "Oil Change",
    description: "Engine oil and filter replacement.",
    icon: Droplet,
  },
  TYRE_ROTATION: {
    label: "Tyre Rotation",
    description: "Even out tyre wear for a smoother, safer ride.",
    icon: Disc,
  },
  BRAKE_SERVICE: {
    label: "Brake Service",
    description: "Pad, rotor, and hydraulic system inspection or replacement.",
    icon: Gauge,
  },
  FILTER_CHANGE: {
    label: "Filter Change",
    description: "Air, cabin, or fuel filter replacement.",
    icon: Filter,
  },
  FLUID_CHECK: {
    label: "Fluid Check",
    description: "Coolant, brake, and transmission fluid inspection.",
    icon: Droplet,
  },
  BATTERY_REPLACEMENT: {
    label: "Battery Replacement",
    description: "Diagnose and replace a weak or failed battery.",
    icon: BatteryCharging,
  },
  TIMING_BELT: {
    label: "Timing Belt",
    description: "Timing belt/chain inspection and replacement.",
    icon: Settings,
  },
  AC_SERVICE: {
    label: "AC Service",
    description: "Air conditioning performance and refrigerant check.",
    icon: Wind,
  },
  TRANSMISSION_SERVICE: {
    label: "Transmission Service",
    description: "Transmission fluid and system check.",
    icon: Settings,
  },
  GENERAL_INSPECTION: {
    label: "General Inspection",
    description: "Comprehensive multi-point vehicle health check.",
    icon: ClipboardCheck,
  },
  OTHER: {
    label: "Other",
    description: "Discuss your specific requirement with the garage.",
    icon: Wrench,
  },
  ENGINE_REPAIR: {
    label: "Engine Repair",
    description: "Diagnosis and repair of engine mechanical issues.",
    icon: Cog,
  },
  ELECTRICAL_REPAIR: {
    label: "Electrical Repair",
    description: "Wiring, sensors, and electrical system faults.",
    icon: Zap,
  },
  SUSPENSION_REPAIR: {
    label: "Suspension Repair",
    description: "Shocks, struts, and suspension component repair.",
    icon: MoveVertical,
  },
  COOLING_SYSTEM_REPAIR: {
    label: "Cooling System Repair",
    description: "Radiator, hoses, and cooling system repair.",
    icon: Thermometer,
  },
  EXHAUST_REPAIR: {
    label: "Exhaust Repair",
    description: "Exhaust system and emissions component repair.",
    icon: Cylinder,
  },
  TYRE_REPAIR: {
    label: "Tyre Repair",
    description: "Puncture repair and tyre replacement.",
    icon: CircleDot,
  },
  BODY_REPAIR: {
    label: "Body Repair",
    description: "Bodywork, panel, and paint repair.",
    icon: Car,
  },
  STEERING_REPAIR: {
    label: "Steering Repair",
    description: "Steering system inspection and repair.",
    icon: Compass,
  },
  FUEL_SYSTEM_REPAIR: {
    label: "Fuel System Repair",
    description: "Fuel pump, injectors, and fuel system repair.",
    icon: Fuel,
  },
};

export function SelectServiceForm({ garageId, locationId, vehicleId, services }: Props) {
  const router = useRouter();
  const [serviceType, setServiceType] = useState(services[0] ?? "");
  const isRtl = useIsRtl();
  const BackIcon = isRtl ? ChevronRight : ChevronLeft;
  const ForwardIcon = isRtl ? ChevronLeft : ChevronRight;

  function next() {
    if (!serviceType) return;
    const params = new URLSearchParams({ locationId, vehicleId, serviceType });
    router.push(`/garages/${garageId}/book/schedule?${params.toString()}` as never);
  }

  return (
    <div>
      <div
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}
      >
        {services.map((s) => {
          const meta = SERVICE_META[s] ?? SERVICE_META.OTHER!;
          const Icon = meta.icon;
          const selected = serviceType === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setServiceType(s)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "1rem 1.25rem",
                textAlign: "start",
                border: selected ? "2px solid #00b8d9" : "1px solid #ebeef1",
                borderRadius: "0.875rem",
                backgroundColor: "#fff",
                cursor: "pointer",
                boxShadow: selected ? "0 0 0 4px rgba(0,184,217,0.12)" : "none",
              }}
            >
              <div
                style={{
                  width: "2.75rem",
                  height: "2.75rem",
                  borderRadius: "0.75rem",
                  backgroundColor: selected ? "#00b8d9" : "#f0f2f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={20} color={selected ? "#fff" : "#5b6472"} />
              </div>
              <div>
                <p
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    color: "#081a2f",
                    margin: "0 0 0.125rem",
                  }}
                >
                  {meta.label}
                </p>
                <p style={{ fontSize: "0.8125rem", color: "#74777d", margin: 0 }}>
                  {meta.description}
                </p>
              </div>
            </button>
          );
        })}
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
          href={`/garages/${garageId}/book/vehicle?locationId=${locationId}` as never}
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
          <BackIcon size={15} /> Back
        </Link>
        <button
          type="button"
          onClick={next}
          disabled={!serviceType}
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
            cursor: serviceType ? "pointer" : "not-allowed",
            opacity: serviceType ? 1 : 0.6,
          }}
        >
          Continue to Schedule <ForwardIcon size={15} />
        </button>
      </div>
    </div>
  );
}
