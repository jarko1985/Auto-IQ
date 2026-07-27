import { AuthSplitPanel } from "@/components/layout/auth-split-panel";
import { SignUpForm } from "./_components/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthSplitPanel
      imageSrc="/images/auth-technician.jpg"
      imageAlt="Automotive technician with tablet in modern garage"
      overlayTitle="Join the Future of Automotive Intelligence."
      overlaySubtitle="Connect with 250+ certified UAE garages, access AI diagnostics, and manage your fleet — all in one place."
    >
      <SignUpForm />
    </AuthSplitPanel>
  );
}
