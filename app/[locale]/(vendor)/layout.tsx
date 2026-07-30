import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyVendorDashboard } from "@/features/vendors/service";
import {
  VendorSidebar,
  vendorNavItems,
  vendorSecondaryItems,
} from "@/components/layout/vendor-sidebar";
import { resolveOrgStatusBadge } from "@/components/layout/org-status-badge";
import { PortalTopbar } from "@/components/layout/portal-topbar";

const BRAND_ICON = <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.875rem" }}>A</span>;

export default async function VendorLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (session.user.status === "SUSPENDED") redirect("/sign-in?error=suspended");

  const dashboard = await getMyVendorDashboard(session.user.id);
  if (!dashboard) redirect("/vendor/onboarding" as never);

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--background)" }}>
      <VendorSidebar
        organizationName={dashboard.organization.name}
        organizationStatus={dashboard.organization.status}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <PortalTopbar
          notificationsHref="/vendor/notifications"
          profileHref="/vendor/profile"
          settingsHref="/vendor/settings"
          brandIcon={BRAND_ICON}
          brandLabel="AutoIQ Vendor"
          orgBadge={resolveOrgStatusBadge(
            dashboard.organization.name,
            dashboard.organization.status,
            "Verified Vendor",
          )}
          navItems={vendorNavItems}
          secondaryItems={vendorSecondaryItems}
        />
        <main style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
