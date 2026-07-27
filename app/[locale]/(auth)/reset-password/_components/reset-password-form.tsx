"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Link } from "@/i18n/routing";
import { resetPasswordSchema, type ResetPasswordInput } from "@/features/auth/schemas";

interface Props {
  token: string;
}

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

export function ResetPasswordForm({ token }: Props) {
  const t = useTranslations("Auth");
  const [status, setStatus] = useState<"idle" | "success" | "invalid">("idle");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  async function onSubmit(data: ResetPasswordInput) {
    const res = await fetch("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = (await res.json()) as ApiErrorBody;
      if (body.error?.code === "INVALID_TOKEN") {
        setStatus("invalid");
        return;
      }
      setStatus("invalid");
      return;
    }

    setStatus("success");
  }

  if (!token) {
    return <InvalidTokenState t={t} />;
  }

  if (status === "invalid") {
    return <InvalidTokenState t={t} />;
  }

  if (status === "success") {
    return (
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: "4rem",
            height: "4rem",
            borderRadius: "50%",
            backgroundColor: "rgba(0,184,217,0.1)",
            border: "1px solid rgba(0,184,217,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            fontSize: "1.75rem",
          }}
        >
          ✅
        </div>
        <h1
          style={{
            fontSize: "1.875rem",
            fontWeight: 700,
            color: "#081a2f",
            margin: "0 0 0.5rem",
            letterSpacing: "-0.02em",
          }}
        >
          {t("resetPasswordTitle")}
        </h1>
        <p
          style={{
            fontSize: "0.9375rem",
            color: "#44474d",
            margin: "0 0 2rem",
            lineHeight: 1.65,
          }}
        >
          {t("passwordResetSuccess")}
        </p>
        <Link
          href="/sign-in"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "48px",
            backgroundColor: "#00b8d9",
            color: "#fff",
            border: "none",
            borderRadius: "0.75rem",
            fontSize: "0.9375rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {t("goToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <input type="hidden" {...register("token")} />

      <h1
        style={{
          fontSize: "1.875rem",
          fontWeight: 700,
          color: "#081a2f",
          margin: "0 0 0.375rem",
          letterSpacing: "-0.02em",
        }}
      >
        {t("resetPasswordTitle")}
      </h1>
      <p style={{ fontSize: "0.9375rem", color: "#44474d", margin: "0 0 2rem", lineHeight: 1.5 }}>
        {t("resetPasswordDescription")}
      </p>

      <div style={{ marginBottom: "1.25rem" }}>
        <label
          htmlFor="password"
          style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#181c1e",
            marginBottom: "0.5rem",
          }}
        >
          {t("newPassword")}
        </label>
        <div style={{ position: "relative" }}>
          <Lock
            size={17}
            style={{
              position: "absolute",
              insetInlineStart: "0.875rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#74777d",
              pointerEvents: "none",
            }}
          />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            style={{
              width: "100%",
              height: "48px",
              padding: "0 2.75rem 0 2.75rem",
              border: "1px solid #c4c6cd",
              borderRadius: "0.75rem",
              fontSize: "0.9375rem",
              color: "#181c1e",
              backgroundColor: "#fff",
              outline: "none",
              boxSizing: "border-box",
            }}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            style={{
              position: "absolute",
              insetInlineEnd: "0.875rem",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#74777d",
              padding: 0,
              display: "flex",
            }}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {errors.password && (
          <p style={{ fontSize: "0.8125rem", color: "#ba1a1a", marginTop: "0.375rem" }}>
            {errors.password.message}
          </p>
        )}
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <label
          htmlFor="confirmPassword"
          style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#181c1e",
            marginBottom: "0.5rem",
          }}
        >
          {t("confirmPassword")}
        </label>
        <div style={{ position: "relative" }}>
          <Lock
            size={17}
            style={{
              position: "absolute",
              insetInlineStart: "0.875rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#74777d",
              pointerEvents: "none",
            }}
          />
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            style={{
              width: "100%",
              height: "48px",
              padding: "0 0.875rem 0 2.75rem",
              border: "1px solid #c4c6cd",
              borderRadius: "0.75rem",
              fontSize: "0.9375rem",
              color: "#181c1e",
              backgroundColor: "#fff",
              outline: "none",
              boxSizing: "border-box",
            }}
            {...register("confirmPassword")}
          />
        </div>
        {errors.confirmPassword && (
          <p style={{ fontSize: "0.8125rem", color: "#ba1a1a", marginTop: "0.375rem" }}>
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          width: "100%",
          height: "48px",
          backgroundColor: isSubmitting ? "#74c8db" : "#00b8d9",
          color: "#fff",
          border: "none",
          borderRadius: "0.75rem",
          fontSize: "0.9375rem",
          fontWeight: 600,
          cursor: isSubmitting ? "not-allowed" : "pointer",
        }}
      >
        {isSubmitting ? t("resettingPassword") : t("resetPasswordButton")}
      </button>
    </form>
  );
}

function InvalidTokenState({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: "4rem",
          height: "4rem",
          borderRadius: "50%",
          backgroundColor: "rgba(186,26,26,0.08)",
          border: "1px solid rgba(186,26,26,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 1.5rem",
          fontSize: "1.75rem",
        }}
      >
        ⚠️
      </div>
      <h1
        style={{
          fontSize: "1.875rem",
          fontWeight: 700,
          color: "#081a2f",
          margin: "0 0 0.5rem",
          letterSpacing: "-0.02em",
        }}
      >
        {t("resetPasswordTitle")}
      </h1>
      <p style={{ fontSize: "0.9375rem", color: "#44474d", margin: "0 0 2rem", lineHeight: 1.65 }}>
        {t("invalidResetLink")}
      </p>
      <Link
        href="/forgot-password"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "48px",
          backgroundColor: "#00b8d9",
          color: "#fff",
          border: "none",
          borderRadius: "0.75rem",
          fontSize: "0.9375rem",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        {t("requestNewLink")}
      </Link>
    </div>
  );
}
