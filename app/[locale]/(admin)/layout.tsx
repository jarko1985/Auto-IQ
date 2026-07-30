import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { isAdminRole } from "@/features/auth/rbac";
import { AdminSidebar, adminNavItems } from "@/components/layout/admin-sidebar";
import { PortalTopbar } from "@/components/layout/portal-topbar";

const BRAND_ICON = <ShieldCheck size={16} color="#fff" />;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!isAdminRole(session.user.role)) redirect("/dashboard");

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--background)" }}>
      <AdminSidebar />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <PortalTopbar
          notificationsHref="/admin/notifications"
          profileHref="/admin/profile"
          settingsHref="/admin/settings"
          brandIcon={BRAND_ICON}
          brandLabel="AutoIQ Admin"
          navItems={adminNavItems}
        />
        <main style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
