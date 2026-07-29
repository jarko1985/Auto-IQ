"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Clock, MapPin, Plus, XCircle } from "lucide-react";
import {
  createGarageLocationSchema,
  emirateValues,
  type CreateGarageLocationInput,
} from "@/features/garages/schemas";
import { SelectChevron } from "@/components/forms/field-styles";

interface WorkingHourEntry {
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
  email: string | null;
  isPrimary: boolean;
  isActive: boolean;
  workingHours: WorkingHourEntry[];
}

interface Props {
  initialLocations: GarageLocation[];
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

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

const selectStyle: React.CSSProperties = {
  ...fieldStyle,
  paddingInlineEnd: "1.75rem",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: "var(--foreground)",
  marginBottom: "0.25rem",
};

function defaultHours(existing: WorkingHourEntry[]): WorkingHourEntry[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    const found = existing.find((h) => h.dayOfWeek === dayOfWeek);
    if (found) return found;
    const isWeekend = dayOfWeek === 5; // Friday
    return { dayOfWeek, isClosed: isWeekend, openTime: "08:00", closeTime: "20:00" };
  });
}

function WorkingHoursEditor({
  locationId,
  initialHours,
  onSaved,
}: {
  locationId: string;
  initialHours: WorkingHourEntry[];
  onSaved: (hours: WorkingHourEntry[]) => void;
}) {
  const [hours, setHours] = useState<WorkingHourEntry[]>(defaultHours(initialHours));
  const [saving, setSaving] = useState(false);

  function updateDay(dayOfWeek: number, patch: Partial<WorkingHourEntry>) {
    setHours((prev) => prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, ...patch } : h)));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/garages/me/locations/${locationId}/working-hours`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        toast.error(body.error?.message ?? "Failed to save working hours.");
        return;
      }
      onSaved(hours);
      toast.success("Working hours saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)" }}>
      <p style={{ fontSize: "0.75rem", color: "#8a92a6", marginBottom: "0.75rem" }}>
        Times are in Gulf Standard Time (GMT+4).
      </p>
      {hours.map((h) => (
        <div
          key={h.dayOfWeek}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.375rem 0",
            flexWrap: "wrap",
          }}
        >
          <span style={{ width: "6.5rem", fontSize: "0.8125rem", color: "#081a2f" }}>
            {DAY_LABELS[h.dayOfWeek]}
          </span>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              fontSize: "0.75rem",
              color: "#5b6472",
              width: "5.5rem",
            }}
          >
            <input
              type="checkbox"
              checked={h.isClosed}
              onChange={(e) => updateDay(h.dayOfWeek, { isClosed: e.target.checked })}
            />
            Closed
          </label>
          <input
            type="time"
            disabled={h.isClosed}
            value={h.openTime ?? ""}
            onChange={(e) => updateDay(h.dayOfWeek, { openTime: e.target.value })}
            style={{ ...fieldStyle, width: "8rem", opacity: h.isClosed ? 0.4 : 1 }}
          />
          <span style={{ color: "#8a92a6", fontSize: "0.75rem" }}>to</span>
          <input
            type="time"
            disabled={h.isClosed}
            value={h.closeTime ?? ""}
            onChange={(e) => updateDay(h.dayOfWeek, { closeTime: e.target.value })}
            style={{ ...fieldStyle, width: "8rem", opacity: h.isClosed ? 0.4 : 1 }}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          marginTop: "0.75rem",
          padding: "0.5rem 1.25rem",
          backgroundColor: saving ? "#94a3b8" : "#00b8d9",
          color: "#fff",
          border: "none",
          borderRadius: "0.5rem",
          fontSize: "0.8125rem",
          fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Saving..." : "Save Hours"}
      </button>
    </div>
  );
}

export function GarageLocationsView({ initialLocations, canManage }: Props) {
  const [locations, setLocations] = useState(initialLocations);
  const [showForm, setShowForm] = useState(false);
  const [expandedHoursId, setExpandedHoursId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGarageLocationInput>({
    resolver: zodResolver(createGarageLocationSchema),
    defaultValues: { isPrimary: locations.length === 0 },
  });

  async function onSubmit(data: CreateGarageLocationInput) {
    const res = await fetch("/api/v1/garages/me/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: { message?: string } };
      toast.error(body.error?.message ?? "Failed to add location.");
      return;
    }
    const body = (await res.json()) as { data: Omit<GarageLocation, "workingHours"> };
    setLocations((prev) =>
      [...prev.filter((l) => !data.isPrimary), { ...body.data, workingHours: [] }].sort(
        (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
      ),
    );
    reset({ isPrimary: false });
    setShowForm(false);
    toast.success("Location added.");
  }

  async function toggleActive(location: GarageLocation) {
    setTogglingId(location.id);
    try {
      const res = await fetch(`/api/v1/garages/me/locations/${location.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !location.isActive }),
      });
      if (res.ok) {
        setLocations((prev) =>
          prev.map((l) => (l.id === location.id ? { ...l, isActive: !l.isActive } : l)),
        );
        toast.success(location.isActive ? "Location marked inactive." : "Location marked active.");
      }
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
            className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2"
            style={{ marginBottom: "1rem" }}
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
              <div style={{ position: "relative" }}>
                <select style={selectStyle} {...register("emirate")}>
                  <option value="">Select emirate</option>
                  {emirateValues.map((v) => (
                    <option key={v} value={v}>
                      {EMIRATE_LABELS[v]}
                    </option>
                  ))}
                </select>
                <SelectChevron size={14} insetInlineEnd="0.625rem" />
              </div>
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
            className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2"
            style={{ marginBottom: "1rem" }}
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
                borderBottom: i < locations.length - 1 ? "1px solid var(--border)" : "none",
                opacity: loc.isActive ? 1 : 0.55,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem 1.25rem",
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

                <div
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedHoursId(expandedHoursId === loc.id ? null : loc.id)}
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
                      cursor: "pointer",
                      color: "#081a2f",
                    }}
                  >
                    <Clock size={14} />
                    Hours
                  </button>
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
              </div>

              {expandedHoursId === loc.id && (
                <WorkingHoursEditor
                  locationId={loc.id}
                  initialHours={loc.workingHours}
                  onSaved={(hours) =>
                    setLocations((prev) =>
                      prev.map((l) => (l.id === loc.id ? { ...l, workingHours: hours } : l)),
                    )
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
