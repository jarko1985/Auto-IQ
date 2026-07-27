import { AuthSplitPanel } from "@/components/layout/auth-split-panel";
import { SignInForm } from "./_components/sign-in-form";

export default function SignInPage() {
  return (
    <AuthSplitPanel
      imageSrc="/images/auth-garage-night.jpg"
      imageAlt="UAE garage at night"
      overlayTitle="Trusted by 15,000+ Drivers across the UAE."
      overlaySubtitle="From AI-powered diagnostics to instant garage booking — your complete automotive platform."
    >
      <SignInForm />
    </AuthSplitPanel>
  );
}
