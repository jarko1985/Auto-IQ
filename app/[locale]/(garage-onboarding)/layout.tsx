import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  CustomerSidebar,
  customerNavItems,
  customerSecondaryItems,
} from "@/components/layout/customer-sidebar";
import { PortalTopbar } from "@/components/layout/portal-topbar";

const BRAND_ICON = <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.875rem" }}>A</span>;

// A garage applicant is still a plain CUSTOMER account until their
// application is approved (see features/garages/service.ts) — the real
// GarageSidebar requires an existing org and redirects here when one
// doesn't exist yet, so onboarding shares the customer portal's chrome
// instead (its own secondary nav already links to /garage/onboarding).
export default async function GarageOnboardingLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (session.user.status === "SUSPENDED") redirect("/sign-in?error=suspended");

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--background)" }}>
      <CustomerSidebar />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <PortalTopbar
          notificationsHref="/dashboard/notifications"
          profileHref="/dashboard/profile"
          settingsHref="/dashboard/settings"
          brandIcon={BRAND_ICON}
          brandLabel="AutoIQ"
          navItems={customerNavItems}
          secondaryItems={customerSecondaryItems}
        />
        <main style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
