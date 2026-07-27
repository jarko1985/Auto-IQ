"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, MapPin, Plus, XCircle } from "lucide-react";
import {
  createVendorLocationSchema,
  emirateValues,
  type CreateVendorLocationInput,
} from "@/features/vendors/schemas";

interface VendorLocation {
  id: string;
  name: string;
  emirate: string;
  addressLine1: string;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  isActive: boolean;
}

interface Props {
  initialLocations: VendorLocation[];
  canManage: boolean;
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
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: "var(--foreground)",
  marginBottom: "0.25rem",
};

export function VendorLocationsView({ initialLocations, canManage }: Props) {
  const [locations, setLocations] = useState(initialLocations);
  const [showForm, setShowForm] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateVendorLocationInput>({
    resolver: zodResolver(createVendorLocationSchema),
    defaultValues: { isPrimary: locations.length === 0 },
  });

  async function onSubmit(data: CreateVendorLocationInput) {
    const res = await fetch("/api/v1/vendors/me/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: { message?: string } };
      toast.error(body.error?.message ?? "Failed to add location.");
      return;
    }
    const body = (await res.json()) as { data: VendorLocation };
    setLocations((prev) =>
      [...prev.filter((l) => !data.isPrimary), body.data].sort(
        (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
      ),
    );
    reset({ isPrimary: false });
    setShowForm(false);
    toast.success("Location added.");
  }

  async function toggleActive(location: VendorLocation) {
    setTogglingId(location.id);
    try {
      const res = await fetch(`/api/v1/vendors/me/locations/${location.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !location.isActive }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        toast.error(body.error?.message ?? "Failed to update location.");
        return;
      }
      setLocations((prev) =>
        prev.map((l) => (l.id === location.id ? { ...l, isActive: !l.isActive } : l)),
      );
      toast.success(location.isActive ? "Location deactivated." : "Location activated.");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      {canManage && (
        <div style={{ marginBottom: "1.25rem" }}>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#081a2f",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={14} />
            Add Location
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            padding: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: "0 1rem",
              gridTemplateColumns: "1fr 1fr",
              marginBottom: "1rem",
            }}
          >
            <div>
              <label style={labelStyle}>Location Name *</label>
              <input style={fieldStyle} placeholder="e.g. Dubai Main Hub" {...register("name")} />
              {errors.name && (
                <p style={{ fontSize: "0.75rem", color: "#dc2626" }}>{errors.name.message}</p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Emirate *</label>
              <select style={fieldStyle} {...register("emirate")}>
                <option value="">Select emirate</option>
                {emirateValues.map((v) => (
                  <option key={v} value={v}>
                    {EMIRATE_LABELS[v]}
                  </option>
                ))}
              </select>
              {errors.emirate && (
                <p style={{ fontSize: "0.75rem", color: "#dc2626" }}>{errors.emirate.message}</p>
              )}
            </div>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Street Address *</label>
            <input
              style={fieldStyle}
              placeholder="e.g. Al Quoz Industrial 3"
              {...register("addressLine1")}
            />
            {errors.addressLine1 && (
              <p style={{ fontSize: "0.75rem", color: "#dc2626" }}>{errors.addressLine1.message}</p>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gap: "0 1rem",
              gridTemplateColumns: "1fr 1fr",
              marginBottom: "1rem",
            }}
          >
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={fieldStyle} placeholder="+9714XXXXXXX" {...register("phone")} />
              {errors.phone && (
                <p style={{ fontSize: "0.75rem", color: "#dc2626" }}>{errors.phone.message}</p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                style={fieldStyle}
                type="email"
                placeholder="branch@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p style={{ fontSize: "0.75rem", color: "#dc2626" }}>{errors.email.message}</p>
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1.25rem",
            }}
          >
            <input
              id="isPrimary"
              type="checkbox"
              {...register("isPrimary")}
              style={{ width: "1rem", height: "1rem" }}
            />
            <label htmlFor="isPrimary" style={{ ...labelStyle, marginBottom: 0 }}>
              Set as primary location
            </label>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "0.5rem 1.25rem",
              backgroundColor: isSubmitting ? "#94a3b8" : "#00b8d9",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Saving..." : "Save Location"}
          </button>
        </form>
      )}

      {locations.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: "0.75rem",
            padding: "3rem 1.5rem",
            textAlign: "center",
          }}
        >
          <MapPin size={32} color="#8a92a6" style={{ margin: "0 auto 0.75rem" }} />
          <p style={{ fontSize: "0.875rem", color: "#5b6472" }}>No locations added yet.</p>
        </div>
      ) : (
        <div
          style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" }}
        >
          {locations.map((loc, i) => (
            <div
              key={loc.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.25rem",
                borderBottom: i < locations.length - 1 ? "1px solid var(--border)" : "none",
                opacity: loc.isActive ? 1 : 0.55,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                <MapPin size={18} color="#00b8d9" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#081a2f" }}>
                    {loc.name}
                    {loc.isPrimary && (
                      <span
                        style={{
                          marginInlineStart: "0.5rem",
                          fontSize: "0.625rem",
                          fontWeight: 700,
                          padding: "0.0625rem 0.375rem",
                          borderRadius: "9999px",
                          backgroundColor: "rgba(0,184,217,0.12)",
                          color: "#00b8d9",
                        }}
                      >
                        PRIMARY
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#8a92a6" }}>
                    {EMIRATE_LABELS[loc.emirate] ?? loc.emirate} — {loc.addressLine1}
                    {loc.phone ? ` · ${loc.phone}` : ""}
                  </div>
                </div>
              </div>

              {canManage && (
                <button
                  type="button"
                  disabled={togglingId === loc.id}
                  onClick={() => toggleActive(loc)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    padding: "0.375rem 0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: togglingId === loc.id ? "not-allowed" : "pointer",
                    color: loc.isActive ? "#16a34a" : "#8a92a6",
                    flexShrink: 0,
                  }}
                >
                  {loc.isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {loc.isActive ? "Active" : "Inactive"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
