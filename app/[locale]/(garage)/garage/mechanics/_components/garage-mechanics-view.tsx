"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Pencil, UserPlus, X } from "lucide-react";
import {
  inviteStaffSchema,
  serviceTypeValues,
  staffRoleValues,
  type InviteStaffInput,
} from "@/features/garages/schemas";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SelectChevron } from "@/components/forms/field-styles";

interface MechanicProfile {
  specialties: string[];
  yearsExperience: number | null;
  bio: string | null;
}

interface Member {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  mechanicProfile: MechanicProfile | null;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}

interface Props {
  currentUserId: string;
  initialMembers: Member[];
  initialInvitations: Invitation[];
  canManage: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  GARAGE_OWNER: "Owner",
  GARAGE_MANAGER: "Manager",
  MECHANIC: "Mechanic",
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

const selectStyle: React.CSSProperties = {
  ...fieldStyle,
  paddingInlineEnd: "1.75rem",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

function initials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function MechanicProfileEditor({
  membershipId,
  profile,
  onSaved,
}: {
  membershipId: string;
  profile: MechanicProfile | null;
  onSaved: (profile: MechanicProfile) => void;
}) {
  const [specialties, setSpecialties] = useState<Set<string>>(new Set(profile?.specialties ?? []));
  const [yearsExperience, setYearsExperience] = useState(
    profile?.yearsExperience?.toString() ?? "",
  );
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [saving, setSaving] = useState(false);

  function toggleSpecialty(value: string) {
    const next = new Set(specialties);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSpecialties(next);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/garages/me/staff/members/${membershipId}/mechanic-profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialties: Array.from(specialties),
          yearsExperience: yearsExperience ? Number(yearsExperience) : null,
          bio: bio.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        toast.error(body.error?.message ?? "Failed to save mechanic profile.");
        return;
      }
      onSaved({
        specialties: Array.from(specialties),
        yearsExperience: yearsExperience ? Number(yearsExperience) : null,
        bio: bio.trim() || null,
      });
      toast.success("Mechanic profile updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "1rem 1.25rem", backgroundColor: "var(--background)" }}>
      <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#081a2f", marginBottom: "0.5rem" }}>
        Specialties
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.875rem" }}>
        {serviceTypeValues.map((s) => {
          const active = specialties.has(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleSpecialty(s)}
              style={{
                padding: "0.3125rem 0.75rem",
                borderRadius: "9999px",
                border: `1px solid ${active ? "#00b8d9" : "var(--border)"}`,
                backgroundColor: active ? "rgba(0,184,217,0.1)" : "transparent",
                color: active ? "#00b8d9" : "#5b6472",
                fontSize: "0.75rem",
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
              }}
            >
              {SERVICE_LABELS[s] ?? s}
            </button>
          );
        })}
      </div>
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr]"
        style={{ marginBottom: "0.875rem" }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 500,
              marginBottom: "0.25rem",
            }}
          >
            Years of Experience
          </label>
          <input
            type="number"
            min={0}
            max={60}
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
            style={fieldStyle}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 500,
              marginBottom: "0.25rem",
            }}
          >
            Bio
          </label>
          <input
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Short summary of experience"
            style={fieldStyle}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "0.4375rem 1rem",
          backgroundColor: saving ? "#94a3b8" : "#00b8d9",
          color: "#fff",
          border: "none",
          borderRadius: "0.5rem",
          fontSize: "0.75rem",
          fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Saving..." : "Save Skills"}
      </button>
    </div>
  );
}

export function GarageMechanicsView({
  currentUserId,
  initialMembers,
  initialInvitations,
  canManage,
}: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteStaffInput>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: { role: "MECHANIC" },
  });

  async function onInvite(data: InviteStaffInput) {
    const res = await fetch("/api/v1/garages/me/staff/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: { message?: string } };
      toast.error(body.error?.message ?? "Failed to send invitation.");
      return;
    }
    const body = (await res.json()) as { data: Invitation };
    setInvitations((prev) => [body.data, ...prev]);
    reset({ email: "", role: "MECHANIC" });
    setShowForm(false);
    toast.success("Invitation sent.");
  }

  async function revokeInvitation(id: string) {
    const res = await fetch(`/api/v1/garages/me/staff/invitations/${id}`, { method: "DELETE" });
    if (res.ok) {
      setInvitations((prev) => prev.filter((i) => i.id !== id));
      toast.success("Invitation revoked.");
    }
  }

  async function removeMember(id: string) {
    const res = await fetch(`/api/v1/garages/me/staff/members/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
      toast.success("Staff member removed.");
    } else {
      const body = (await res.json()) as { error?: { message?: string } };
      toast.error(body.error?.message ?? "Failed to remove staff member.");
    }
  }

  const [confirmTarget, setConfirmTarget] = useState<
    | { type: "member"; id: string; label: string }
    | { type: "invitation"; id: string; label: string }
    | null
  >(null);

  function confirmPendingAction() {
    if (!confirmTarget) return;
    if (confirmTarget.type === "member") void removeMember(confirmTarget.id);
    else void revokeInvitation(confirmTarget.id);
    setConfirmTarget(null);
  }

  const ownerCount = members.filter((m) => m.role === "GARAGE_OWNER").length;

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" style={{ marginBottom: "1.5rem" }}>
        {[
          { label: "Members", value: members.length },
          { label: "Mechanics", value: members.filter((m) => m.role === "MECHANIC").length },
          { label: "Pending Invitations", value: invitations.length },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              padding: "1.25rem",
            }}
          >
            <p
              style={{
                fontSize: "0.8125rem",
                color: "#5b6472",
                fontWeight: 600,
                margin: "0 0 0.5rem",
              }}
            >
              {stat.label}
            </p>
            <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

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
            <UserPlus size={14} />
            Invite Staff
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit(onInvite)}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            padding: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2"
            style={{ marginBottom: "0.75rem" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  marginBottom: "0.25rem",
                }}
              >
                Email Address *
              </label>
              <input
                style={fieldStyle}
                type="email"
                placeholder="colleague@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p style={{ fontSize: "0.75rem", color: "#dc2626" }}>{errors.email.message}</p>
              )}
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  marginBottom: "0.25rem",
                }}
              >
                Role *
              </label>
              <div style={{ position: "relative" }}>
                <select style={selectStyle} {...register("role")}>
                  {staffRoleValues.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <SelectChevron size={14} insetInlineEnd="0.625rem" />
              </div>
            </div>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#8a92a6", marginBottom: "1rem" }}>
            Owners and managers have management access. Mechanics get a skills profile once they
            join.
          </p>
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
            {isSubmitting ? "Sending..." : "Send Invitation"}
          </button>
        </form>
      )}

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          overflow: "hidden",
          marginBottom: invitations.length > 0 ? "1.5rem" : 0,
        }}
      >
        {members.map((m, i) => (
          <div
            key={m.id}
            style={{ borderBottom: i < members.length - 1 ? "1px solid var(--border)" : "none" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.875rem 1.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                <div
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "9999px",
                    backgroundColor: "#081a2f",
                    color: "#fff",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {initials(m.name, m.email)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#081a2f" }}>
                    {m.name ?? m.email}
                    {m.userId === currentUserId && (
                      <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#8a92a6" }}>
                        {" "}
                        (you)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#8a92a6" }}>
                    {m.email}
                    {m.role === "MECHANIC" && m.mechanicProfile?.specialties.length ? (
                      <span>
                        {" "}
                        ·{" "}
                        {m.mechanicProfile.specialties
                          .map((s) => SERVICE_LABELS[s] ?? s)
                          .join(", ")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    padding: "0.125rem 0.5rem",
                    borderRadius: "9999px",
                    backgroundColor:
                      m.role === "GARAGE_OWNER" ? "rgba(0,184,217,0.12)" : "rgba(148,163,184,0.15)",
                    color: m.role === "GARAGE_OWNER" ? "#00b8d9" : "#5b6472",
                  }}
                >
                  {ROLE_LABELS[m.role] ?? m.role}
                </span>
                {canManage && m.role === "MECHANIC" && (
                  <button
                    type="button"
                    onClick={() => setEditingId(editingId === m.id ? null : m.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0.25rem",
                    }}
                    aria-label={`Edit skills for ${m.email}`}
                  >
                    <Pencil size={15} color="#5b6472" />
                  </button>
                )}
                {canManage && !(m.role === "GARAGE_OWNER" && ownerCount <= 1) && (
                  <button
                    type="button"
                    onClick={() => setConfirmTarget({ type: "member", id: m.id, label: m.email })}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0.25rem",
                    }}
                    aria-label={`Remove ${m.email}`}
                  >
                    <X size={16} color="#8a92a6" />
                  </button>
                )}
              </div>
            </div>
            {editingId === m.id && (
              <MechanicProfileEditor
                membershipId={m.id}
                profile={m.mechanicProfile}
                onSaved={(profile) =>
                  setMembers((prev) =>
                    prev.map((mm) => (mm.id === m.id ? { ...mm, mechanicProfile: profile } : mm)),
                  )
                }
              />
            )}
          </div>
        ))}
      </div>

      {invitations.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: "0.8125rem",
              fontWeight: 700,
              color: "#081a2f",
              marginBottom: "0.75rem",
            }}
          >
            Pending Invitations
          </h2>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              overflow: "hidden",
            }}
          >
            {invitations.map((inv, i) => (
              <div
                key={inv.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.875rem 1.25rem",
                  borderBottom: i < invitations.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <Mail size={16} color="#8a92a6" />
                  <span style={{ fontSize: "0.875rem", color: "#081a2f" }}>{inv.email}</span>
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      padding: "0.125rem 0.5rem",
                      borderRadius: "9999px",
                      backgroundColor: "rgba(217,119,6,0.12)",
                      color: "#d97706",
                    }}
                  >
                    {ROLE_LABELS[inv.role] ?? inv.role} · Pending
                  </span>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmTarget({ type: "invitation", id: inv.id, label: inv.email })
                    }
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#dc2626",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        title={confirmTarget?.type === "member" ? "Remove staff member?" : "Revoke invitation?"}
        description={
          confirmTarget?.type === "member"
            ? `${confirmTarget.label} will lose access to this garage's dashboard immediately.`
            : `The invitation sent to ${confirmTarget?.label} will no longer be usable.`
        }
        confirmLabel={confirmTarget?.type === "member" ? "Remove" : "Revoke"}
        onConfirm={confirmPendingAction}
      />
    </div>
  );
}
