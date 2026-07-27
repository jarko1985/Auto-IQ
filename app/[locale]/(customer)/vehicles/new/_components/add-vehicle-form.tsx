"use client";

import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createVehicleSchema,
  type CreateVehicleInput,
  vehicleTypeValues,
  fuelTypeValues,
  transmissionValues,
} from "@/features/vehicles/schemas";

const fuelLabels: Record<string, string> = {
  PETROL: "Petrol",
  DIESEL: "Diesel",
  HYBRID: "Hybrid",
  ELECTRIC: "Electric",
  PLUG_IN_HYBRID: "Plug-in Hybrid",
  LPG: "LPG",
};
const transmissionLabels: Record<string, string> = {
  AUTOMATIC: "Automatic",
  MANUAL: "Manual",
  CVT: "CVT",
  DCT: "DCT",
  SEMI_AUTOMATIC: "Semi-Automatic",
};
const typeLabels: Record<string, string> = {
  SEDAN: "Sedan",
  SUV: "SUV",
  HATCHBACK: "Hatchback",
  COUPE: "Coupe",
  PICKUP_TRUCK: "Pickup Truck",
  VAN: "Van",
  MINIBUS: "Minibus",
  TRUCK: "Truck",
  OTHER: "Other",
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => CURRENT_YEAR + 1 - i);

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: "0.875rem",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "var(--foreground)",
  marginBottom: "0.375rem",
};

const errorStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "var(--destructive)",
  marginTop: "0.25rem",
};

const rowStyle: React.CSSProperties = { marginBottom: "1.25rem" };

export function AddVehicleForm() {
  const t = useTranslations("Vehicles");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateVehicleInput>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues: { mileageKm: 0, isDefault: false },
  });

  async function onSubmit(data: CreateVehicleInput) {
    const res = await fetch("/api/v1/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = (await res.json()) as { error?: { message?: string } };
      toast.error(body.error?.message ?? "Failed to save vehicle.");
      return;
    }

    const { data: result } = (await res.json()) as { data: { id: string } };
    toast.success("Vehicle added.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(`/vehicles/${result.id}` as any);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Make / Model / Trim */}
      <div
        style={{
          display: "grid",
          gap: "0 1rem",
          gridTemplateColumns: "1fr 1fr",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <label style={labelStyle}>{t("make")} *</label>
          <input style={fieldStyle} placeholder="e.g. Toyota" {...register("makeName")} />
          {errors.makeName && <p style={errorStyle}>{errors.makeName.message}</p>}
        </div>
        <div>
          <label style={labelStyle}>{t("model")} *</label>
          <input style={fieldStyle} placeholder="e.g. Camry" {...register("modelName")} />
          {errors.modelName && <p style={errorStyle}>{errors.modelName.message}</p>}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: "0 1rem",
          gridTemplateColumns: "1fr 1fr",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <label style={labelStyle}>{t("trim")}</label>
          <input style={fieldStyle} placeholder="e.g. SE, XLE" {...register("trimName")} />
          {errors.trimName && <p style={errorStyle}>{errors.trimName.message}</p>}
        </div>
        <div>
          <label style={labelStyle}>{t("year")} *</label>
          <select style={fieldStyle} {...register("year", { valueAsNumber: true })}>
            <option value="">Select year</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {errors.year && <p style={errorStyle}>{errors.year.message}</p>}
        </div>
      </div>

      {/* Vehicle Type / Fuel / Transmission */}
      <div
        style={{
          display: "grid",
          gap: "0 1rem",
          gridTemplateColumns: "1fr 1fr 1fr",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <label style={labelStyle}>{t("vehicleType")} *</label>
          <select style={fieldStyle} {...register("vehicleType")}>
            <option value="">Select type</option>
            {vehicleTypeValues.map((v) => (
              <option key={v} value={v}>
                {typeLabels[v]}
              </option>
            ))}
          </select>
          {errors.vehicleType && <p style={errorStyle}>{errors.vehicleType.message}</p>}
        </div>
        <div>
          <label style={labelStyle}>{t("fuelType")} *</label>
          <select style={fieldStyle} {...register("fuelType")}>
            <option value="">Select fuel</option>
            {fuelTypeValues.map((v) => (
              <option key={v} value={v}>
                {fuelLabels[v]}
              </option>
            ))}
          </select>
          {errors.fuelType && <p style={errorStyle}>{errors.fuelType.message}</p>}
        </div>
        <div>
          <label style={labelStyle}>{t("transmission")} *</label>
          <select style={fieldStyle} {...register("transmission")}>
            <option value="">Select transmission</option>
            {transmissionValues.map((v) => (
              <option key={v} value={v}>
                {transmissionLabels[v]}
              </option>
            ))}
          </select>
          {errors.transmission && <p style={errorStyle}>{errors.transmission.message}</p>}
        </div>
      </div>

      {/* Mileage / Color */}
      <div
        style={{
          display: "grid",
          gap: "0 1rem",
          gridTemplateColumns: "1fr 1fr",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <label style={labelStyle}>{t("mileageKm")} *</label>
          <input
            style={fieldStyle}
            type="number"
            min={0}
            placeholder="0"
            {...register("mileageKm", { valueAsNumber: true })}
          />
          {errors.mileageKm && <p style={errorStyle}>{errors.mileageKm.message}</p>}
        </div>
        <div>
          <label style={labelStyle}>{t("color")}</label>
          <input style={fieldStyle} placeholder="e.g. White, Silver" {...register("color")} />
        </div>
      </div>

      {/* Plate / VIN */}
      <div
        style={{
          display: "grid",
          gap: "0 1rem",
          gridTemplateColumns: "1fr 1fr",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <label style={labelStyle}>{t("plateNumber")}</label>
          <input style={fieldStyle} placeholder="e.g. A 12345" {...register("plateNumber")} />
          {errors.plateNumber && <p style={errorStyle}>{errors.plateNumber.message}</p>}
        </div>
        <div>
          <label style={labelStyle}>{t("vin")}</label>
          <input
            style={fieldStyle}
            placeholder="17-character VIN"
            maxLength={17}
            {...register("vin")}
          />
          {errors.vin && <p style={errorStyle}>{errors.vin.message}</p>}
        </div>
      </div>

      {/* Notes */}
      <div style={rowStyle}>
        <label style={labelStyle}>{t("notes")}</label>
        <textarea
          style={{ ...fieldStyle, minHeight: "5rem", resize: "vertical" }}
          placeholder="Any additional details..."
          {...register("notes")}
        />
      </div>

      {/* Default checkbox */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <input
          id="isDefault"
          type="checkbox"
          {...register("isDefault")}
          style={{ width: "1rem", height: "1rem", cursor: "pointer" }}
        />
        <label htmlFor="isDefault" style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}>
          {t("isDefault")}
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          width: "100%",
          padding: "0.625rem 1.25rem",
          backgroundColor: isSubmitting ? "var(--muted)" : "var(--navy)",
          color: "#fff",
          border: "none",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          fontWeight: 600,
          cursor: isSubmitting ? "not-allowed" : "pointer",
        }}
      >
        {isSubmitting ? t("saving") : t("save")}
      </button>
    </form>
  );
}
