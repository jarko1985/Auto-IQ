"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useIsRtl } from "@/i18n/direction";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";
import { getPostLoginPath } from "@/features/auth/route-for-role";
import type { RoleName } from "@prisma/client";

const inputWrap: React.CSSProperties = { position: "relative", marginBottom: "1.25rem" };
const label: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#181c1e",
  marginBottom: "0.5rem",
};
const inputBase: React.CSSProperties = {
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
  transition: "border-color 0.15s, box-shadow 0.15s",
};
const iconStart: React.CSSProperties = {
  position: "absolute",
  insetInlineStart: "0.875rem",
  top: "50%",
  transform: "translateY(-50%)",
  color: "#74777d",
  pointerEvents: "none",
};

export function SignInForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const ForwardIcon = useIsRtl() ? ArrowLeft : ArrowRight;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    if (result?.error) {
      toast.error(t("invalidCredentials"));
      return;
    }

    const sessionRes = await fetch("/api/v1/auth/session");
    const { data: session } = (await sessionRes.json()) as {
      data: { user: { role: RoleName } } | null;
    };
    toast.success("Signed in successfully.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push((session ? getPostLoginPath(session.user.role) : "/dashboard") as any);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Heading */}
      <h1
        style={{
          fontSize: "1.875rem",
          fontWeight: 700,
          color: "#081a2f",
          margin: "0 0 0.375rem",
          letterSpacing: "-0.02em",
        }}
      >
        Welcome Back
      </h1>
      <p style={{ fontSize: "0.9375rem", color: "#44474d", margin: "0 0 2rem", lineHeight: 1.5 }}>
        Enter your credentials to access your dashboard
      </p>

      {/* Email */}
      <div style={inputWrap}>
        <label style={label} htmlFor="email">
          {t("email")}
        </label>
        <div style={{ position: "relative" }}>
          <Mail size={17} style={iconStart} />
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.ae"
            style={inputBase}
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p style={{ fontSize: "0.8125rem", color: "#ba1a1a", marginTop: "0.375rem" }}>
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div style={inputWrap}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <label style={{ ...label, margin: 0 }} htmlFor="password">
            {t("password")}
          </label>
          <Link
            href="/forgot-password"
            style={{
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "#00b8d9",
              textDecoration: "none",
            }}
          >
            {t("forgotPassword")}
          </Link>
        </div>
        <div style={{ position: "relative" }}>
          <Lock size={17} style={iconStart} />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            style={{ ...inputBase, paddingInlineEnd: "2.75rem" }}
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

      {/* Submit */}
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
          marginBottom: "1.25rem",
          transition: "background-color 0.15s",
        }}
      >
        {isSubmitting ? t("signingIn") : t("signIn")}
        {!isSubmitting && <ForwardIcon size={17} />}
      </button>

      {/* Divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{ flex: 1, height: "1px", backgroundColor: "#c4c6cd" }} />
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#74777d",
            letterSpacing: "0.05em",
          }}
        >
          OR CONTINUE WITH
        </span>
        <div style={{ flex: 1, height: "1px", backgroundColor: "#c4c6cd" }} />
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/post-login" })}
        style={{
          width: "100%",
          height: "48px",
          backgroundColor: "#fff",
          border: "1px solid #c4c6cd",
          borderRadius: "0.75rem",
          fontSize: "0.9375rem",
          fontWeight: 500,
          color: "#181c1e",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.625rem",
          marginBottom: "1.5rem",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      >
        {/* Google icon */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
            fill="#4285F4"
          />
          <path
            d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
            fill="#34A853"
          />
          <path
            d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
            fill="#FBBC05"
          />
          <path
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
            fill="#EA4335"
          />
        </svg>
        {t("signInWithGoogle")}
      </button>

      {/* Sign up link */}
      <p
        style={{
          textAlign: "center",
          fontSize: "0.9375rem",
          color: "#44474d",
          margin: "0 0 1.5rem",
        }}
      >
        {t("noAccount")}{" "}
        <Link href="/sign-up" style={{ fontWeight: 600, color: "#00b8d9", textDecoration: "none" }}>
          {t("createAccount")}
        </Link>
      </p>

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
          <strong style={{ color: "#081a2f" }}>AI Security:</strong> Our adaptive intelligence
          monitors login patterns to ensure the highest level of security for your fleet data.
        </p>
      </div>
    </form>
  );
}
