"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Store, Wrench, ShieldCheck, Bell, Star } from "lucide-react";
import { useIsDesktop } from "@/lib/hooks/use-is-desktop";
import { SidebarNavLink, type PortalNavItem } from "@/components/layout/sidebar-nav-link";
import { TooltipProvider } from "@/components/ui/tooltip";

export const adminNavItems: readonly PortalNavItem[] = [
  { href: "/admin/vendors", label: "Vendor Approvals", icon: Store },
  { href: "/admin/garages", label: "Garage Approvals", icon: Wrench },
  { href: "/admin/parts", label: "Parts Catalog", icon: Package },
  { href: "/admin/diagnostics", label: "Diagnostic Feedback", icon: Star },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  {
    href: "/admin/dashboard",
    label: "Operations",
    icon: LayoutDashboard,
    soon: true,
    navigateHref: "/admin/vendors",
  },
];

/** Desktop-only (>= lg) — below that breakpoint, PortalMobileDrawer (opened
 * from PortalTopbar's burger button) carries this same nav data instead of
 * an icon-only rail. */
export function AdminSidebar() {
  const pathname = usePathname();
  const isDesktop = useIsDesktop();

  if (!isDesktop) return null;

  function isActive(href: string) {
    return pathname.includes(href);
  }

  return (
    <aside
      style={{
        width: "240px",
        minWidth: "240px",
        height: "100vh",
        position: "sticky",
        top: 0,
        backgroundColor: "#081a2f",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: "1.5rem 1.25rem",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "0.5rem",
              backgroundColor: "#00b8d9",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={16} color="#fff" />
          </div>
          <span
            style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.01em" }}
          >
            AutoIQ Admin
          </span>
        </div>
      </div>

      <TooltipProvider>
        <nav style={{ flex: 1, padding: "1rem 0.75rem 0.75rem" }}>
          {adminNavItems.map(({ href, label, icon, soon, navigateHref }) => (
            <SidebarNavLink
              key={href}
              href={navigateHref ?? href}
              label={label}
              icon={icon}
              active={isActive(href)}
              collapsed={false}
              soon={soon}
            />
          ))}
        </nav>
      </TooltipProvider>
    </aside>
  );
}
