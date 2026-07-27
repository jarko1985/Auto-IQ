import { AuthSplitPanel } from "@/components/layout/auth-split-panel";
import { ForgotPasswordForm } from "./_components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthSplitPanel
      imageSrc="/images/auth-garage-night.jpg"
      imageAlt="UAE garage at night"
      overlayTitle="Secure. Encrypted. Trusted."
      overlaySubtitle="Your fleet data is protected by enterprise-grade encryption and AI-driven security monitoring."
    >
      <ForgotPasswordForm />
    </AuthSplitPanel>
  );
}
