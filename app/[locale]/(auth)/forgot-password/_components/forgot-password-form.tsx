"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useIsRtl } from "@/i18n/direction";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/features/auth/schemas";

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const [sent, setSent] = useState(false);
  const isRtl = useIsRtl();
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const ForwardIcon = isRtl ? ArrowLeft : ArrowRight;

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(data: ForgotPasswordInput) {
    await fetch("/api/v1/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSent(true);
  }

  if (sent) {
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
          ✉️
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
          Check Your Email
        </h1>
        <p
          style={{
            fontSize: "0.9375rem",
            color: "#44474d",
            margin: "0 0 0.75rem",
            lineHeight: 1.65,
          }}
        >
          We sent a password reset link to
        </p>
        <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#081a2f", margin: "0 0 2rem" }}>
          {getValues("email")}
        </p>
        <Link
          href="/sign-in"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            width: "100%",
            height: "48px",
            backgroundColor: "#00b8d9",
            color: "#fff",
            border: "none",
            borderRadius: "0.75rem",
            fontSize: "0.9375rem",
            fontWeight: 600,
            textDecoration: "none",
            marginBottom: "1.25rem",
          }}
        >
          {t("backToSignIn")}
        </Link>
        <p style={{ fontSize: "0.875rem", color: "#74777d", margin: 0 }}>
          Didn&apos;t receive the email?{" "}
          <button
            type="button"
            onClick={() => setSent(false)}
            style={{
              background: "none",
              border: "none",
              color: "#00b8d9",
              fontWeight: 500,
              cursor: "pointer",
              padding: 0,
              fontSize: "0.875rem",
            }}
          >
            Try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Back link */}
      <Link
        href="/sign-in"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "#44474d",
          textDecoration: "none",
          marginBottom: "1.75rem",
        }}
      >
        <BackIcon size={15} />
        Back to Sign In
      </Link>

      <h1
        style={{
          fontSize: "1.875rem",
          fontWeight: 700,
          color: "#081a2f",
          margin: "0 0 0.375rem",
          letterSpacing: "-0.02em",
        }}
      >
        Forgot Password?
      </h1>
      <p style={{ fontSize: "0.9375rem", color: "#44474d", margin: "0 0 2rem", lineHeight: 1.5 }}>
        No worries — enter your email and we&apos;ll send you a reset link.
      </p>

      {/* Email */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          htmlFor="email"
          style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#181c1e",
            marginBottom: "0.5rem",
          }}
        >
          {t("email")}
        </label>
        <div style={{ position: "relative" }}>
          <Mail
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
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.ae"
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
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p style={{ fontSize: "0.8125rem", color: "#ba1a1a", marginTop: "0.375rem" }}>
            {errors.email.message}
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          marginBottom: "2rem",
        }}
      >
        {isSubmitting ? t("sending") : t("sendResetLink")}
        {!isSubmitting && <ForwardIcon size={17} />}
      </button>

      {/* Security note */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.625rem",
          padding: "0.75rem 1rem",
          backgroundColor: "#f1f4f7",
          borderRadius: "0.75rem",
          border: "1px solid #ebeef1",
        }}
      >
        <span style={{ fontSize: "1rem", flexShrink: 0 }}>🔒</span>
        <p style={{ fontSize: "0.8125rem", color: "#44474d", margin: 0, lineHeight: 1.5 }}>
          <strong style={{ color: "#081a2f" }}>Secure Reset:</strong> Reset links expire after 15
          minutes and can only be used once.
        </p>
      </div>
    </form>
  );
}
