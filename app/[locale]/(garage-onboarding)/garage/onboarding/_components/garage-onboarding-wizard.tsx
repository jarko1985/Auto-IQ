"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/routing";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, FileText, Loader2, Trash2, Upload } from "lucide-react";
import {
  createGarageProfileSchema,
  emirateValues,
  type CreateGarageProfileInput,
} from "@/features/garages/schemas";
import { fieldFocusClass, SelectChevron } from "@/components/forms/field-styles";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GarageDocSummary {
  id: string;
  type: string;
  filename: string;
}

export interface InitialGarage {
  id: string;
  verificationStatus: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  businessName: string;
  tradeLicenseNumber: string;
  tradeLicenseExpiry: string;
  contactPersonName: string;
  contactPhone: string;
  contactEmail: string;
  addressLine1: string;
  emirate: string;
  authorizedSignatoryName: string | null;
  authorizedSignatoryEmiratesId: string | null;
  rejectionReason: string | null;
  documents: GarageDocSummary[];
}

interface Props {
  initialGarage: InitialGarage | null;
}

// ── Labels ────────────────────────────────────────────────────────────────────

const EMIRATE_LABELS: Record<string, string> = {
  DUBAI: "Dubai",
  ABU_DHABI: "Abu Dhabi",
  SHARJAH: "Sharjah",
  AJMAN: "Ajman",
  UMM_AL_QUWAIN: "Umm Al Quwain",
  RAS_AL_KHAIMAH: "Ras Al Khaimah",
  FUJAIRAH: "Fujairah",
};

const DOCUMENT_LABELS: Record<string, { label: string; hint: string; required: boolean }> = {
  TRADE_LICENSE: {
    label: "UAE Trade License",
    hint: "Valid PDF or high-resolution image",
    required: true,
  },
  VAT_CERTIFICATE: {
    label: "VAT Registration Certificate",
    hint: "Official TRN certificate issued by the FTA",
    required: true,
  },
  EMIRATES_ID_FRONT: {
    label: "Emirates ID (Front)",
    hint: "Authorized signatory's Emirates ID, front side",
    required: true,
  },
  EMIRATES_ID_BACK: {
    label: "Emirates ID (Back)",
    hint: "Authorized signatory's Emirates ID, back side",
    required: true,
  },
  PASSPORT: {
    label: "Passport Copy",
    hint: "Recommended for non-GCC nationals to expedite verification",
    required: false,
  },
};

const DOCUMENT_ORDER = [
  "TRADE_LICENSE",
  "VAT_CERTIFICATE",
  "EMIRATES_ID_FRONT",
  "EMIRATES_ID_BACK",
  "PASSPORT",
];

// ── Shared field styles (matches vendor onboarding conventions) ─────────────

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 0.875rem",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  // 16px prevents iOS Safari from auto-zooming the viewport on focus.
  fontSize: "1rem",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...fieldStyle,
  paddingInlineEnd: "2.25rem",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
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
  color: "#dc2626",
  marginTop: "0.25rem",
};

const rowStyle: React.CSSProperties = { marginBottom: "1.25rem" };

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Business Profile", "Documents", "Submitted"];
  return (
    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n <= step;
        return (
          <div key={label} style={{ flex: 1 }}>
            <div
              style={{
                height: "4px",
                borderRadius: "9999px",
                backgroundColor: active ? "#00b8d9" : "#e0e3e6",
                marginBottom: "0.5rem",
              }}
            />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: n === step ? 700 : 500,
                color: active ? "#081a2f" : "#8a92a6",
              }}
            >
              {n}. {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      error?: { message?: string; details?: { missing?: string[] } };
    };
    if (body.error?.details?.missing?.length) {
      const names = body.error.details.missing.map((t) => DOCUMENT_LABELS[t]?.label ?? t);
      return `Missing required documents: ${names.join(", ")}`;
    }
    return body.error?.message ?? "Something went wrong.";
  } catch {
    return "Something went wrong.";
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GarageOnboardingWizard({ initialGarage }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(
    !initialGarage ? 1 : initialGarage.verificationStatus === "SUBMITTED" ? 3 : 2,
  );
  const [garageId, setGarageId] = useState<string | undefined>(initialGarage?.id);
  const [documents, setDocuments] = useState<GarageDocSummary[]>(initialGarage?.documents ?? []);
  const [signatoryName, setSignatoryName] = useState(initialGarage?.authorizedSignatoryName ?? "");
  const [signatoryId, setSignatoryId] = useState(
    initialGarage?.authorizedSignatoryEmiratesId ?? "",
  );
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [businessName, setBusinessName] = useState(initialGarage?.businessName ?? "");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: savingProfile },
  } = useForm<CreateGarageProfileInput>({
    resolver: zodResolver(createGarageProfileSchema),
    defaultValues: initialGarage
      ? {
          businessName: initialGarage.businessName,
          tradeLicenseNumber: initialGarage.tradeLicenseNumber,
          tradeLicenseExpiry: initialGarage.tradeLicenseExpiry.slice(0, 10),
          contactPersonName: initialGarage.contactPersonName,
          contactPhone: initialGarage.contactPhone,
          contactEmail: initialGarage.contactEmail,
          addressLine1: initialGarage.addressLine1,
          emirate: initialGarage.emirate as CreateGarageProfileInput["emirate"],
        }
      : undefined,
  });

  async function onProfileSubmit(data: CreateGarageProfileInput) {
    const res = await fetch(garageId ? "/api/v1/garages/me" : "/api/v1/garages", {
      method: garageId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      toast.error(await parseError(res));
      return;
    }

    if (!garageId) {
      const body = (await res.json()) as { data: { garageId: string } };
      setGarageId(body.data.garageId);
    }
    setBusinessName(data.businessName);
    toast.success("Business profile saved.");
    setStep(2);
  }

  async function handleFileSelected(type: string, file: File) {
    setUploadingType(type);
    try {
      const existing = documents.find((d) => d.type === type);
      if (existing) {
        await fetch(`/api/v1/garages/me/documents/${existing.id}`, { method: "DELETE" });
      }

      const formData = new FormData();
      formData.set("type", type);
      formData.set("file", file);
      const res = await fetch("/api/v1/garages/me/documents", { method: "POST", body: formData });

      if (!res.ok) {
        toast.error(await parseError(res));
        return;
      }

      const body = (await res.json()) as { data: GarageDocSummary };
      setDocuments((prev) => [...prev.filter((d) => d.type !== type), body.data]);
      toast.success("Document uploaded.");
    } finally {
      setUploadingType(null);
    }
  }

  async function handleDeleteDocument(docId: string) {
    const res = await fetch(`/api/v1/garages/me/documents/${docId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(await parseError(res));
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    toast.success("Document removed.");
  }

  async function handleSubmitForReview() {
    setSubmitting(true);
    try {
      if (signatoryName.trim() && signatoryId.trim()) {
        const profileRes = await fetch("/api/v1/garages/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorizedSignatoryName: signatoryName.trim(),
            authorizedSignatoryEmiratesId: signatoryId.trim(),
          }),
        });
        if (!profileRes.ok) {
          toast.error(await parseError(profileRes));
          return;
        }
      }

      const res = await fetch("/api/v1/garages/me/submit", { method: "POST" });
      if (!res.ok) {
        toast.error(await parseError(res));
        return;
      }
      toast.success("Application submitted for review.");
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step 1: Business Profile ─────────────────────────────────────────────────

  if (step === 1) {
    return (
      <div className="px-4 py-8 sm:px-6 sm:py-10" style={{ maxWidth: "640px", margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#081a2f",
            marginBottom: "0.375rem",
          }}
        >
          Register Your Garage
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
          Tell us about your workshop to start receiving bookings on AutoIQ UAE.
        </p>

        <StepIndicator step={1} />

        {initialGarage?.rejectionReason && (
          <div
            style={{
              padding: "0.875rem 1rem",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "0.5rem",
              marginBottom: "1.25rem",
              fontSize: "0.875rem",
              color: "#991b1b",
            }}
          >
            <strong>Your previous application was not approved:</strong>{" "}
            {initialGarage.rejectionReason}
            <br />
            Update your details below and resubmit.
          </div>
        )}

        <form onSubmit={handleSubmit(onProfileSubmit)}>
          <div style={rowStyle}>
            <label style={labelStyle}>Garage / Workshop Name *</label>
            <input
              className={fieldFocusClass}
              style={fieldStyle}
              placeholder="e.g. Precision Motors Dubai"
              {...register("businessName")}
            />
            {errors.businessName && <p style={errorStyle}>{errors.businessName.message}</p>}
          </div>

          <div
            className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2"
            style={{ marginBottom: "1.25rem" }}
          >
            <div>
              <label style={labelStyle}>UAE Trade License Number *</label>
              <input
                className={fieldFocusClass}
                style={fieldStyle}
                placeholder="e.g. TL-449283"
                {...register("tradeLicenseNumber")}
              />
              {errors.tradeLicenseNumber && (
                <p style={errorStyle}>{errors.tradeLicenseNumber.message}</p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Trade License Expiry *</label>
              <input
                className={fieldFocusClass}
                style={fieldStyle}
                type="date"
                {...register("tradeLicenseExpiry")}
              />
              {errors.tradeLicenseExpiry && (
                <p style={errorStyle}>{errors.tradeLicenseExpiry.message}</p>
              )}
            </div>
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>Emirate *</label>
            <div style={{ position: "relative" }}>
              <select className={fieldFocusClass} style={selectStyle} {...register("emirate")}>
                <option value="">Select emirate</option>
                {emirateValues.map((v) => (
                  <option key={v} value={v}>
                    {EMIRATE_LABELS[v]}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
            {errors.emirate && <p style={errorStyle}>{errors.emirate.message}</p>}
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>Street Address *</label>
            <input
              className={fieldFocusClass}
              style={fieldStyle}
              placeholder="e.g. Al Quoz Industrial 3, St 22"
              {...register("addressLine1")}
            />
            {errors.addressLine1 && <p style={errorStyle}>{errors.addressLine1.message}</p>}
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>Contact Person Name *</label>
            <input
              className={fieldFocusClass}
              style={fieldStyle}
              placeholder="e.g. Ahmed Al-Maktoum"
              {...register("contactPersonName")}
            />
            {errors.contactPersonName && (
              <p style={errorStyle}>{errors.contactPersonName.message}</p>
            )}
          </div>

          <div
            className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2"
            style={{ marginBottom: "1.5rem" }}
          >
            <div>
              <label style={labelStyle}>Contact Phone *</label>
              <input
                className={fieldFocusClass}
                style={fieldStyle}
                placeholder="+9715XXXXXXXX"
                {...register("contactPhone")}
              />
              {errors.contactPhone && <p style={errorStyle}>{errors.contactPhone.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Contact Email *</label>
              <input
                className={fieldFocusClass}
                style={fieldStyle}
                type="email"
                placeholder="garage@example.com"
                {...register("contactEmail")}
              />
              {errors.contactEmail && <p style={errorStyle}>{errors.contactEmail.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            style={{
              width: "100%",
              padding: "0.75rem 1.25rem",
              backgroundColor: savingProfile ? "#94a3b8" : "#081a2f",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: savingProfile ? "not-allowed" : "pointer",
            }}
          >
            {savingProfile ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    );
  }

  // ── Step 2: Documents ─────────────────────────────────────────────────────────

  if (step === 2) {
    return (
      <div className="px-4 py-8 sm:px-6 sm:py-10" style={{ maxWidth: "640px", margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#081a2f",
            marginBottom: "0.375rem",
          }}
        >
          Documents &amp; Verification
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
          Upload the required documents to verify your workshop. Ensure all files are clear and
          legible.
        </p>

        <StepIndicator step={2} />

        <div style={{ marginBottom: "1.5rem" }}>
          {DOCUMENT_ORDER.map((type) => {
            const meta = DOCUMENT_LABELS[type]!;
            const uploaded = documents.find((d) => d.type === type);
            const isUploading = uploadingType === type;
            return (
              <div
                key={type}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  marginBottom: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                  <FileText
                    size={20}
                    color={uploaded ? "#00b8d9" : "#8a92a6"}
                    style={{ flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#081a2f" }}>
                      {meta.label} {meta.required && <span style={{ color: "#dc2626" }}>*</span>}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#8a92a6" }}>
                      {uploaded ? uploaded.filename : meta.hint}
                    </div>
                  </div>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}
                >
                  {isUploading ? (
                    <Loader2 size={18} className="animate-spin" color="#00b8d9" />
                  ) : uploaded ? (
                    <>
                      <CheckCircle2 size={18} color="#16a34a" />
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(uploaded.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "0.25rem",
                        }}
                        aria-label={`Delete ${meta.label}`}
                      >
                        <Trash2 size={16} color="#dc2626" />
                      </button>
                    </>
                  ) : null}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      padding: "0.375rem 0.75rem",
                      border: "1px solid var(--border)",
                      borderRadius: "0.5rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#081a2f",
                      cursor: "pointer",
                    }}
                  >
                    <Upload size={14} />
                    {uploaded ? "Replace" : "Upload"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFileSelected(type, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <p
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#081a2f",
              marginBottom: "0.75rem",
            }}
          >
            Authorized Signatory
          </p>
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <div style={rowStyle}>
              <label style={labelStyle}>Full Name (as on Emirates ID) *</label>
              <input
                className={fieldFocusClass}
                style={fieldStyle}
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="e.g. Ahmed Al-Maktoum"
              />
            </div>
            <div style={rowStyle}>
              <label style={labelStyle}>Emirates ID Number *</label>
              <input
                className={fieldFocusClass}
                style={fieldStyle}
                value={signatoryId}
                onChange={(e) => setSignatoryId(e.target.value)}
                placeholder="784-YYYY-XXXXXXX-X"
              />
            </div>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#8a92a6" }}>
            Your identity data is used only for verification and is never shared with customers.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={() => setStep(1)}
            style={{
              flex: "0 0 auto",
              padding: "0.75rem 1.25rem",
              backgroundColor: "transparent",
              color: "#081a2f",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleSubmitForReview}
            disabled={submitting}
            style={{
              flex: 1,
              padding: "0.75rem 1.25rem",
              backgroundColor: submitting ? "#94a3b8" : "#00b8d9",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Submitting..." : "Submit for Review"}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Submitted ─────────────────────────────────────────────────────────

  return (
    <div
      className="px-4 py-10 sm:px-6 sm:py-12"
      style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center" }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "200px",
          borderRadius: "1rem",
          overflow: "hidden",
          margin: "0 auto 1.5rem",
        }}
      >
        <Image
          src="/images/garage/onboarding-submitted.jpg"
          alt="Garage owner in workshop"
          fill
          sizes="560px"
          style={{ objectFit: "cover" }}
          priority
        />
      </div>
      <div
        style={{
          width: "4rem",
          height: "4rem",
          borderRadius: "9999px",
          backgroundColor: "#dcfce7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 1.5rem",
        }}
      >
        <CheckCircle2 size={32} color="#16a34a" />
      </div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.5rem" }}>
        Application Submitted
      </h1>
      <p style={{ fontSize: "0.9375rem", color: "#5b6472", marginBottom: "2rem", lineHeight: 1.6 }}>
        Thank you for joining AutoIQ. Our administrators are reviewing your documents — this
        typically takes 1-2 business days. You&apos;ll receive an email once your account is
        verified.
      </p>

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          padding: "1.25rem",
          textAlign: "start",
          marginBottom: "2rem",
        }}
      >
        <p
          style={{
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: "#081a2f",
            marginBottom: "0.25rem",
          }}
        >
          {businessName || initialGarage?.businessName}
        </p>
        <p style={{ fontSize: "0.8125rem", color: "#8a92a6", marginBottom: "0.75rem" }}>
          Trade License {initialGarage?.tradeLicenseNumber}
        </p>
        {documents.map((d) => (
          <div
            key={d.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.8125rem",
              color: "#081a2f",
              marginBottom: "0.25rem",
            }}
          >
            <CheckCircle2 size={14} color="#16a34a" />
            {DOCUMENT_LABELS[d.type]?.label ?? d.type}
          </div>
        ))}
      </div>

      <button
        type="button"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={() => router.push("/garage/dashboard" as any)}
        style={{
          padding: "0.75rem 1.5rem",
          backgroundColor: "#081a2f",
          color: "#fff",
          border: "none",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}
