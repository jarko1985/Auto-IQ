import { AuthSplitPanel } from "@/components/layout/auth-split-panel";
import { ResetPasswordForm } from "./_components/reset-password-form";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const rawParams = await searchParams;
  const tokenParam = rawParams.token;
  const token = (Array.isArray(tokenParam) ? tokenParam[0] : tokenParam) ?? "";

  return (
    <AuthSplitPanel
      imageSrc="/images/auth-garage-night.jpg"
      imageAlt="UAE garage at night"
      overlayTitle="Secure. Encrypted. Trusted."
      overlaySubtitle="Your fleet data is protected by enterprise-grade encryption and AI-driven security monitoring."
    >
      <ResetPasswordForm token={token} />
    </AuthSplitPanel>
  );
}
