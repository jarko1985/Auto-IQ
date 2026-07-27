"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Car,
  Wrench,
  ShoppingBag,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useIsRtl } from "@/i18n/direction";
import {
  requestSignupOtpSchema,
  type RequestSignupOtpInput,
  completeSignupSchema,
} from "@/features/auth/schemas";
import { OtpInput } from "@/components/auth/otp-input";
import { getPostLoginPath } from "@/features/auth/route-for-role";
import type { RoleName } from "@prisma/client";

const RESEND_COOLDOWN_SECONDS = 60;

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
const submitButton: React.CSSProperties = {
  width: "100%",
  height: "48px",
  color: "#fff",
  border: "none",
  borderRadius: "0.75rem",
  fontSize: "0.9375rem",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
  marginBottom: "1.25rem",
};

const accountTypes = [
  { id: "owner", label: "Car Owner", icon: Car, desc: "Personal vehicle", comingSoon: false },
  { id: "garage", label: "Garage", icon: Wrench, desc: "Service center", comingSoon: false },
  { id: "vendor", label: "Vendor", icon: ShoppingBag, desc: "Parts supplier", comingSoon: false },
] as const;

type AccountType = (typeof accountTypes)[number]["id"];

const createPasswordSchema = completeSignupSchema
  .omit({ ticket: true })
  .extend({ confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type CreatePasswordInput = z.infer<typeof createPasswordSchema>;

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: { retryAfterSeconds?: number } };
}

export function SignUpForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const isRtl = useIsRtl();
  const ForwardIcon = isRtl ? ArrowLeft : ArrowRight;
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accountType, setAccountType] = useState<AccountType>("owner");
  const [email, setEmail] = useState("");
  const [ticket, setTicket] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const emailForm = useForm<RequestSignupOtpInput>({
    resolver: zodResolver(requestSignupOtpSchema),
  });
  const passwordForm = useForm<CreatePasswordInput>({
    resolver: zodResolver(createPasswordSchema),
  });

  async function requestOtp(targetEmail: string): Promise<boolean> {
    const res = await fetch("/api/v1/auth/signup/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail }),
    });

    if (!res.ok) {
      const body = (await res.json()) as ApiErrorBody;
      if (body.error?.code === "CONFLICT") {
        toast.error(t("emailAlreadyRegistered"));
      } else if (body.error?.code === "OTP_COOLDOWN") {
        setCooldown(body.error.details?.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS);
        toast.error(t("tooManyRequests"));
      } else {
        toast.error(body.error?.message ?? t("registrationFailed"));
      }
      return false;
    }

    setCooldown(RESEND_COOLDOWN_SECONDS);
    return true;
  }

  async function onSubmitEmail(data: RequestSignupOtpInput) {
    const ok = await requestOtp(data.email);
    if (!ok) return;
    setEmail(data.email);
    setCode("");
    setCodeError(null);
    setStep(2);
  }

  async function handleVerifyCode() {
    if (code.length !== 6) return;
    setIsVerifying(true);
    setCodeError(null);
    try {
      const res = await fetch("/api/v1/auth/signup/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const body = (await res.json()) as ApiErrorBody & { data?: { ticket: string } };
      if (!res.ok || !body.data) {
        setCodeError(t("invalidCode"));
        return;
      }
      setTicket(body.data.ticket);
      setStep(3);
    } finally {
      setIsVerifying(false);
    }
  }

  async function onSubmitPassword(data: CreatePasswordInput) {
    const res = await fetch("/api/v1/auth/signup/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket, name: data.name, password: data.password }),
    });

    if (!res.ok) {
      const body = (await res.json()) as ApiErrorBody;
      if (body.error?.code === "INVALID_TICKET") {
        toast.error(t("sessionExpired"));
        setStep(1);
        setTicket("");
        return;
      }
      toast.error(body.error?.message ?? t("registrationFailed"));
      return;
    }

    const result = await signIn("credentials", {
      email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      toast.success("Account created. Please sign in.");
      router.push("/sign-in");
      return;
    }

    const sessionRes = await fetch("/api/v1/auth/session");
    const { data: session } = (await sessionRes.json()) as {
      data: { user: { role: RoleName } } | null;
    };
    toast.success("Account created.");
    // Registration never assigns a role itself — every new account starts as
    // CUSTOMER — so "Account Type" is only a client-side hint for where to land
    // next, not a role. Picking "Vendor"/"Garage" sends them straight into the
    // matching onboarding wizard instead of creating an org here, since that
    // needs business details this form doesn't collect.
    const target =
      accountType === "vendor"
        ? "/vendor/onboarding"
        : accountType === "garage"
          ? "/garage/onboarding"
          : session
            ? getPostLoginPath(session.user.role)
            : "/dashboard";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(target as any);
    router.refresh();
  }

  const heading: React.CSSProperties = {
    fontSize: "1.875rem",
    fontWeight: 700,
    color: "#081a2f",
    margin: "0 0 0.375rem",
    letterSpacing: "-0.02em",
  };
  const subheading: React.CSSProperties = {
    fontSize: "0.9375rem",
    color: "#44474d",
    margin: "0 0 1.5rem",
    lineHeight: 1.5,
  };
  const stepLabel: React.CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#00b8d9",
    letterSpacing: "0.05em",
    margin: "0 0 0.5rem",
    textTransform: "uppercase",
  };

  if (step === 2) {
    return (
      <div>
        <p style={stepLabel}>{t("stepOf", { current: 2, total: 3 })}</p>
        <h1 style={heading}>{t("verifyEmailStepTitle")}</h1>
        <p style={subheading}>
          {t("verifyCodeDescription")} <strong style={{ color: "#181c1e" }}>{email}</strong>
        </p>

        <div style={{ marginBottom: "0.75rem" }}>
          <OtpInput value={code} onChange={setCode} disabled={isVerifying} hasError={!!codeError} />
        </div>
        {codeError && (
          <p
            style={{
              fontSize: "0.8125rem",
              color: "#ba1a1a",
              textAlign: "center",
              margin: "0 0 1rem",
            }}
          >
            {codeError}
          </p>
        )}

        <button
          type="button"
          disabled={code.length !== 6 || isVerifying}
          onClick={handleVerifyCode}
          style={{
            ...submitButton,
            marginTop: "1.5rem",
            backgroundColor: code.length !== 6 || isVerifying ? "#74c8db" : "#00b8d9",
            cursor: code.length !== 6 || isVerifying ? "not-allowed" : "pointer",
          }}
        >
          {isVerifying ? t("verifying") : t("verifyCode")}
          {!isVerifying && <ForwardIcon size={17} />}
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.875rem",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setCode("");
              setCodeError(null);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              background: "none",
              border: "none",
              color: "#44474d",
              fontWeight: 500,
              cursor: "pointer",
              padding: 0,
            }}
          >
            <BackIcon size={15} />
            {t("changeEmail")}
          </button>

          <button
            type="button"
            disabled={cooldown > 0}
            onClick={() => void requestOtp(email)}
            style={{
              background: "none",
              border: "none",
              color: cooldown > 0 ? "#74777d" : "#00b8d9",
              fontWeight: 500,
              cursor: cooldown > 0 ? "not-allowed" : "pointer",
              padding: 0,
            }}
          >
            {cooldown > 0 ? t("resendCodeIn", { seconds: cooldown }) : t("resendCode")}
          </button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} noValidate>
        <p style={stepLabel}>{t("stepOf", { current: 3, total: 3 })}</p>
        <h1 style={heading}>{t("createPasswordTitle")}</h1>
        <p style={subheading}>{t("createPasswordDescription")}</p>

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={label} htmlFor="name">
            {t("name")}
          </label>
          <div style={{ position: "relative" }}>
            <User size={17} style={iconStart} />
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Your full name"
              style={inputBase}
              {...passwordForm.register("name")}
            />
          </div>
          {passwordForm.formState.errors.name && (
            <p style={{ fontSize: "0.8125rem", color: "#ba1a1a", marginTop: "0.375rem" }}>
              {passwordForm.formState.errors.name.message}
            </p>
          )}
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={label} htmlFor="password">
            {t("password")}
          </label>
          <div style={{ position: "relative" }}>
            <Lock size={17} style={iconStart} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              style={{ ...inputBase, paddingInlineEnd: "2.75rem" }}
              {...passwordForm.register("password")}
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
          {passwordForm.formState.errors.password && (
            <p style={{ fontSize: "0.8125rem", color: "#ba1a1a", marginTop: "0.375rem" }}>
              {passwordForm.formState.errors.password.message}
            </p>
          )}
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={label} htmlFor="confirmPassword">
            {t("confirmPassword")}
          </label>
          <div style={{ position: "relative" }}>
            <Lock size={17} style={iconStart} />
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              style={inputBase}
              {...passwordForm.register("confirmPassword")}
            />
          </div>
          {passwordForm.formState.errors.confirmPassword && (
            <p style={{ fontSize: "0.8125rem", color: "#ba1a1a", marginTop: "0.375rem" }}>
              {passwordForm.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={passwordForm.formState.isSubmitting}
          style={{
            ...submitButton,
            backgroundColor: passwordForm.formState.isSubmitting ? "#74c8db" : "#00b8d9",
            cursor: passwordForm.formState.isSubmitting ? "not-allowed" : "pointer",
          }}
        >
          {passwordForm.formState.isSubmitting ? t("creatingAccount") : t("createAccount")}
          {!passwordForm.formState.isSubmitting && <ForwardIcon size={17} />}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} noValidate>
      <p style={stepLabel}>{t("stepOf", { current: 1, total: 3 })}</p>
      <h1 style={heading}>Create Account</h1>
      <p style={subheading}>{t("signUpDescription")}</p>

      {/* Account type selector */}
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ ...label, marginBottom: "0.625rem" }}>Account Type</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.625rem" }}>
          {accountTypes.map(({ id, label: lbl, icon: Icon, desc, comingSoon }) => {
            const active = accountType === id;
            return (
              <button
                key={id}
                type="button"
                disabled={comingSoon}
                onClick={() => setAccountType(id)}
                style={{
                  position: "relative",
                  padding: "0.75rem 0.5rem",
                  border: active ? "1.5px solid #00b8d9" : "1px solid #c4c6cd",
                  borderRadius: "0.75rem",
                  backgroundColor: active ? "rgba(0,184,217,0.06)" : "#fff",
                  cursor: comingSoon ? "not-allowed" : "pointer",
                  textAlign: "center",
                  opacity: comingSoon ? 0.5 : 1,
                  transition: "border-color 0.15s, background-color 0.15s",
                }}
              >
                {comingSoon && (
                  <span
                    style={{
                      position: "absolute",
                      top: "0.25rem",
                      insetInlineEnd: "0.375rem",
                      fontSize: "0.5625rem",
                      fontWeight: 700,
                      color: "#74777d",
                      letterSpacing: "0.03em",
                    }}
                  >
                    SOON
                  </span>
                )}
                <Icon
                  size={18}
                  color={active ? "#00b8d9" : "#74777d"}
                  style={{ margin: "0 auto 0.375rem" }}
                />
                <p
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: active ? "#00b8d9" : "#181c1e",
                    margin: "0 0 0.125rem",
                  }}
                >
                  {lbl}
                </p>
                <p style={{ fontSize: "0.6875rem", color: "#74777d", margin: 0 }}>{desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Email */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={label} htmlFor="email">
          {t("email")}
        </label>
        <div style={{ position: "relative" }}>
          <Mail size={17} style={iconStart} />
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            style={inputBase}
            {...emailForm.register("email")}
          />
        </div>
        {emailForm.formState.errors.email && (
          <p style={{ fontSize: "0.8125rem", color: "#ba1a1a", marginTop: "0.375rem" }}>
            {emailForm.formState.errors.email.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={emailForm.formState.isSubmitting}
        style={{
          ...submitButton,
          backgroundColor: emailForm.formState.isSubmitting ? "#74c8db" : "#00b8d9",
          cursor: emailForm.formState.isSubmitting ? "not-allowed" : "pointer",
        }}
      >
        {emailForm.formState.isSubmitting ? t("sendingCode") : t("sendCode")}
        {!emailForm.formState.isSubmitting && <ForwardIcon size={17} />}
      </button>

      {/* Divider */}
      <div
        style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}
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
        }}
      >
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
        Continue with Google
      </button>

      <p style={{ textAlign: "center", fontSize: "0.9375rem", color: "#44474d", margin: 0 }}>
        {t("hasAccount")}{" "}
        <Link href="/sign-in" style={{ fontWeight: 600, color: "#00b8d9", textDecoration: "none" }}>
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}
