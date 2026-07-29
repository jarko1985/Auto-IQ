import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CustomerSidebar } from "@/components/layout/customer-sidebar";
import { PortalTopbar } from "@/components/layout/portal-topbar";

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  if (session.user.status === "SUSPENDED") {
    redirect("/sign-in?error=suspended");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--background)" }}>
      <CustomerSidebar />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <PortalTopbar
          notificationsHref="/dashboard/notifications"
          profileHref="/dashboard/profile"
          settingsHref="/dashboard/settings"
        />
        <main style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
