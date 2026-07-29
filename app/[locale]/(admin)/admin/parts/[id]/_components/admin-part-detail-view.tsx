"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Image from "next/image";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/i18n/routing";
import { ImagePlus, Trash2 } from "lucide-react";
import {
  createPartCompatibilitySchema,
  updatePartSchema,
  type CreatePartCompatibilityInput,
  type UpdatePartInput,
} from "@/features/catalog/schemas";
import { getPartImage } from "@/features/catalog/part-image";
import { SelectChevron } from "@/components/forms/field-styles";

interface Media {
  id: string;
  filename: string;
  storageKey: string;
}

interface Compatibility {
  id: string;
  makeName: string;
  modelName: string;
  yearFrom: number | null;
  yearTo: number | null;
  engineCode: string | null;
  trimName: string | null;
  notes: string | null;
}

interface PartDetail {
  id: string;
  name: string;
  manufacturerName: string;
  partNumber: string;
  alternatePartNumbers: string[];
  categoryId: string;
  categoryName: string;
  origin: string;
  description: string | null;
  approvalState: string;
  rejectionReason: string | null;
  submittedByVendorName: string | null;
  media: Media[];
  compatibilities: Compatibility[];
}

interface Props {
  part: PartDetail;
  categories: { id: string; name: string }[];
}

const DEFAULT_STATE = { bg: "rgba(217,119,6,0.12)", color: "#d97706", label: "Pending Review" };
const STATE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  APPROVED: { bg: "rgba(22,163,74,0.12)", color: "#16a34a", label: "Approved" },
  PENDING_REVIEW: DEFAULT_STATE,
  REJECTED: { bg: "rgba(220,38,38,0.12)", color: "#dc2626", label: "Rejected" },
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: "0.8125rem",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  outline: "none",
  boxSizing: "border-box",
};

// Native <select> arrows render flush against the border regardless of
// padding — this reserves room for a positioned chevron instead.
const selectStyle: React.CSSProperties = {
  ...fieldStyle,
  paddingInlineEnd: "1.75rem",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#5b6472",
  marginBottom: "0.25rem",
};

export function AdminPartDetailView({ part, categories }: Props) {
  const router = useRouter();
  const [media, setMedia] = useState(part.media);
  const [compatibilities, setCompatibilities] = useState(part.compatibilities);
  const [approvalState, setApprovalState] = useState(part.approvalState);
  const [rejectionReason, setRejectionReason] = useState(part.rejectionReason);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePartInput>({
    resolver: zodResolver(updatePartSchema),
    defaultValues: {
      categoryId: part.categoryId,
      manufacturerName: part.manufacturerName,
      partNumber: part.partNumber,
      name: part.name,
      description: part.description ?? undefined,
      origin: part.origin as "OEM" | "AFTERMARKET",
    },
  });

  const {
    register: registerRule,
    handleSubmit: handleSubmitRule,
    reset: resetRule,
    formState: { errors: ruleErrors, isSubmitting: isSubmittingRule },
  } = useForm<CreatePartCompatibilityInput>({
    resolver: zodResolver(createPartCompatibilitySchema),
  });

  async function onSaveDetails(data: UpdatePartInput) {
    const res = await fetch(`/api/v1/admin/parts/${part.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: { message?: string } };
      toast.error(body.error?.message ?? "Failed to save.");
      return;
    }
    toast.success("Part details saved.");
    router.refresh();
  }

  async function approve() {
    const res = await fetch(`/api/v1/admin/parts/${part.id}/approve`, { method: "POST" });
    if (!res.ok) {
      const body = (await res.json()) as { error?: { message?: string } };
      toast.error(body.error?.message ?? "Failed to approve part.");
      return;
    }
    setApprovalState("APPROVED");
    toast.success("Part approved.");
  }

  async function reject() {
    const reason = window.prompt("Reason for rejecting this part:");
    if (!reason) return;
    const res = await fetch(`/api/v1/admin/parts/${part.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: { message?: string } };
      toast.error(body.error?.message ?? "Failed to reject part.");
      return;
    }
    setApprovalState("REJECTED");
    setRejectionReason(reason);
    toast.success("Part rejected.");
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch(`/api/v1/admin/parts/${part.id}/media`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        toast.error(body.error?.message ?? "Failed to upload image.");
        return;
      }
      const body = (await res.json()) as { data: Media };
      setMedia((prev) => [...prev, body.data]);
      toast.success("Image uploaded.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteMedia(mediaId: string) {
    const res = await fetch(`/api/v1/admin/parts/${part.id}/media/${mediaId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Failed to remove image.");
      return;
    }
    setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    toast.success("Image removed.");
  }

  async function onAddRule(data: CreatePartCompatibilityInput) {
    const res = await fetch(`/api/v1/admin/parts/${part.id}/compatibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: { message?: string } };
      toast.error(body.error?.message ?? "Failed to add compatibility rule.");
      return;
    }
    const body = (await res.json()) as { data: Compatibility };
    setCompatibilities((prev) => [body.data, ...prev]);
    resetRule({});
    toast.success("Compatibility rule added.");
  }

  async function removeRule(ruleId: string) {
    const res = await fetch(`/api/v1/admin/parts/${part.id}/compatibility/${ruleId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Failed to remove compatibility rule.");
      return;
    }
    setCompatibilities((prev) => prev.filter((c) => c.id !== ruleId));
    toast.success("Compatibility rule removed.");
  }

  const state = STATE_STYLES[approvalState] ?? DEFAULT_STATE;
  const fallbackPhoto = getPartImage({ partNumber: part.partNumber });

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
              {part.name}
            </h1>
            <span
              style={{
                padding: "0.1875rem 0.625rem",
                borderRadius: "9999px",
                fontSize: "0.6875rem",
                fontWeight: 700,
                backgroundColor: state.bg,
                color: state.color,
              }}
            >
              {state.label}
            </span>
          </div>
          <p style={{ fontSize: "0.875rem", color: "#5b6472", marginTop: "0.25rem" }}>
            {part.manufacturerName} · {part.partNumber}
            {part.submittedByVendorName && ` · Submitted by ${part.submittedByVendorName}`}
          </p>
          {approvalState === "REJECTED" && rejectionReason && (
            <p style={{ fontSize: "0.8125rem", color: "#dc2626", marginTop: "0.375rem" }}>
              Rejection reason: {rejectionReason}
            </p>
          )}
        </div>
        {approvalState === "PENDING_REVIEW" && (
          <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => void approve()}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => void reject()}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#fee2e2",
                color: "#991b1b",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Details form */}
      <form
        onSubmit={handleSubmit(onSaveDetails)}
        style={{
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          padding: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#081a2f", marginTop: 0 }}>
          Part Details
        </h2>
        <div
          className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2"
          style={{ marginBottom: "1rem" }}
        >
          <div>
            <label style={labelStyle}>Category</label>
            <div style={{ position: "relative" }}>
              <select style={selectStyle} {...register("categoryId")}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <SelectChevron size={14} insetInlineEnd="0.625rem" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Origin</label>
            <div style={{ position: "relative" }}>
              <select style={selectStyle} {...register("origin")}>
                <option value="OEM">OEM</option>
                <option value="AFTERMARKET">Aftermarket</option>
              </select>
              <SelectChevron size={14} insetInlineEnd="0.625rem" />
            </div>
          </div>
        </div>
        <div
          className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2"
          style={{ marginBottom: "1rem" }}
        >
          <div>
            <label style={labelStyle}>Manufacturer</label>
            <input style={fieldStyle} {...register("manufacturerName")} />
          </div>
          <div>
            <label style={labelStyle}>Part Number</label>
            <input style={fieldStyle} {...register("partNumber")} />
          </div>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Name</label>
          <input style={fieldStyle} {...register("name")} />
          {errors.name && (
            <p style={{ fontSize: "0.75rem", color: "#dc2626" }}>{errors.name.message}</p>
          )}
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...fieldStyle, minHeight: "4rem" }} {...register("description")} />
        </div>
        {part.alternatePartNumbers.length > 0 && (
          <p style={{ fontSize: "0.75rem", color: "#8a92a6", marginBottom: "1rem" }}>
            Alternate part numbers: {part.alternatePartNumbers.join(", ")}
          </p>
        )}
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
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Media */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          padding: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "#081a2f",
            marginTop: 0,
            marginBottom: "1rem",
          }}
        >
          Images
        </h2>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {media.length === 0 && fallbackPhoto && (
            <div
              style={{
                position: "relative",
                width: "100px",
                height: "100px",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                overflow: "hidden",
              }}
              title="Placeholder illustration — upload a real product photo below"
            >
              <Image
                src={fallbackPhoto}
                alt={part.name}
                fill
                sizes="100px"
                style={{ objectFit: "cover" }}
              />
            </div>
          )}
          {media.map((m) => (
            <div
              key={m.id}
              style={{
                position: "relative",
                width: "100px",
                height: "100px",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.6875rem",
                color: "#8a92a6",
                textAlign: "center",
                padding: "0.25rem",
                overflow: "hidden",
              }}
            >
              {m.filename}
              <button
                type="button"
                onClick={() => void deleteMedia(m.id)}
                style={{
                  position: "absolute",
                  top: "0.25rem",
                  insetInlineEnd: "0.25rem",
                  background: "rgba(0,0,0,0.6)",
                  border: "none",
                  borderRadius: "0.25rem",
                  padding: "0.125rem",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <Trash2 size={12} color="#fff" />
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "100px",
              height: "100px",
              border: "1px dashed var(--border)",
              borderRadius: "0.5rem",
              background: "none",
              cursor: uploading ? "not-allowed" : "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.25rem",
              color: "#8a92a6",
              fontSize: "0.6875rem",
            }}
          >
            <ImagePlus size={20} />
            {uploading ? "Uploading..." : "Add Image"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Compatibility */}
      <div
        style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.25rem" }}
      >
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "#081a2f",
            marginTop: 0,
            marginBottom: "1rem",
          }}
        >
          Vehicle Compatibility ({compatibilities.length})
        </h2>

        {compatibilities.length > 0 && (
          <div style={{ marginBottom: "1.25rem" }}>
            {compatibilities.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.625rem 0",
                  borderBottom: "1px solid var(--border)",
                  fontSize: "0.8125rem",
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: "#081a2f" }}>
                    {c.makeName} {c.modelName}
                  </span>{" "}
                  <span style={{ color: "#8a92a6" }}>
                    ({c.yearFrom ?? "any"}–{c.yearTo ?? "any"})
                    {c.engineCode ? ` · ${c.engineCode}` : ""}
                    {c.trimName ? ` · ${c.trimName}` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void removeRule(c.id)}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "#dc2626",
                    display: "flex",
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSubmitRule(onAddRule)}
          className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label style={labelStyle}>Make *</label>
            <input style={fieldStyle} placeholder="Toyota" {...registerRule("makeName")} />
            {ruleErrors.makeName && (
              <p style={{ fontSize: "0.6875rem", color: "#dc2626" }}>
                {ruleErrors.makeName.message}
              </p>
            )}
          </div>
          <div>
            <label style={labelStyle}>Model *</label>
            <input style={fieldStyle} placeholder="Land Cruiser" {...registerRule("modelName")} />
            {ruleErrors.modelName && (
              <p style={{ fontSize: "0.6875rem", color: "#dc2626" }}>
                {ruleErrors.modelName.message}
              </p>
            )}
          </div>
          <div>
            <label style={labelStyle}>Year From</label>
            <input style={fieldStyle} type="number" {...registerRule("yearFrom")} />
          </div>
          <div>
            <label style={labelStyle}>Year To</label>
            <input style={fieldStyle} type="number" {...registerRule("yearTo")} />
          </div>
          <div>
            <label style={labelStyle}>Engine Code</label>
            <input style={fieldStyle} placeholder="Optional" {...registerRule("engineCode")} />
          </div>
          <div>
            <label style={labelStyle}>Trim</label>
            <input style={fieldStyle} placeholder="Optional" {...registerRule("trimName")} />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSubmittingRule}
              style={{
                padding: "0.5rem 1.25rem",
                backgroundColor: isSubmittingRule ? "#94a3b8" : "#081a2f",
                color: "#fff",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: isSubmittingRule ? "not-allowed" : "pointer",
              }}
            >
              Add Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
