import { AuthSplitPanel } from "@/components/layout/auth-split-panel";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export default async function VerifyEmailPage() {
  const t = await getTranslations("Auth");

  return (
    <AuthSplitPanel
      imageSrc="/images/auth-garage-night.jpg"
      imageAlt="UAE garage at night"
      overlayTitle="Precision Diagnostics, Secured by AI."
      overlaySubtitle="One more step to unlock the full power of AutoIQ — UAE's most trusted automotive platform."
    >
      <div style={{ textAlign: "center" }}>
        {/* Icon */}
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
          {t("checkYourEmail")}
        </h1>
        <p
          style={{
            fontSize: "0.9375rem",
            color: "#44474d",
            margin: "0 0 0.75rem",
            lineHeight: 1.65,
          }}
        >
          {t("verifyEmailDescription")}
        </p>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#74777d",
            margin: "0 0 2rem",
            lineHeight: 1.65,
          }}
        >
          {t("verifyEmailInstructions")}
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
            marginBottom: "1.5rem",
          }}
        >
          {t("backToSignIn")}
        </Link>

        <p style={{ fontSize: "0.875rem", color: "#74777d", margin: 0 }}>
          Didn&apos;t receive the email?{" "}
          <span style={{ color: "#00b8d9", fontWeight: 500, cursor: "pointer" }}>Resend</span>
        </p>
      </div>
    </AuthSplitPanel>
  );
}
