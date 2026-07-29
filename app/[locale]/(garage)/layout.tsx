import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyGarageDashboard } from "@/features/garages/service";
import { GarageSidebar } from "@/components/layout/garage-sidebar";
import { PortalTopbar } from "@/components/layout/portal-topbar";

export default async function GarageLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (session.user.status === "SUSPENDED") redirect("/sign-in?error=suspended");

  const dashboard = await getMyGarageDashboard(session.user.id);
  if (!dashboard) redirect("/garage/onboarding" as never);

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--background)" }}>
      <GarageSidebar
        organizationName={dashboard.organization.name}
        organizationStatus={dashboard.organization.status}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <PortalTopbar
          notificationsHref="/garage/notifications"
          profileHref="/garage/profile"
          settingsHref="/garage/settings"
        />
        <main style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
