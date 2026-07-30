"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, MapPin, Users, Settings, Boxes, ShoppingCart, Bell } from "lucide-react";
import { useIsDesktop } from "@/lib/hooks/use-is-desktop";
import { SidebarNavLink, type PortalNavItem } from "@/components/layout/sidebar-nav-link";
import { resolveOrgStatusBadge } from "@/components/layout/org-status-badge";
import { TooltipProvider } from "@/components/ui/tooltip";

export const vendorNavItems: readonly PortalNavItem[] = [
  { href: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendor/inventory", label: "Inventory", icon: Boxes },
  { href: "/vendor/orders", label: "Orders", icon: ShoppingCart },
  { href: "/vendor/locations", label: "Locations", icon: MapPin },
  { href: "/vendor/staff", label: "Staff", icon: Users },
  { href: "/vendor/notifications", label: "Notifications", icon: Bell },
];

export const vendorSecondaryItems: readonly PortalNavItem[] = [
  { href: "/vendor/onboarding", label: "Business Profile", icon: Settings },
];

interface Props {
  organizationName: string;
  organizationStatus: string;
}

/** Desktop-only (>= lg) — below that breakpoint, PortalMobileDrawer (opened
 * from PortalTopbar's burger button) carries this same nav data instead of
 * an icon-only rail. */
export function VendorSidebar({ organizationName, organizationStatus }: Props) {
  const pathname = usePathname();
  const isDesktop = useIsDesktop();

  if (!isDesktop) return null;

  function isActive(href: string) {
    return pathname.includes(href);
  }

  const badge = resolveOrgStatusBadge(organizationName, organizationStatus, "Verified Vendor");

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            marginBottom: "0.875rem",
          }}
        >
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
            <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.875rem" }}>A</span>
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.01em" }}>
            AutoIQ Vendor
          </span>
        </div>
        <p style={{ color: "#fff", fontSize: "0.8125rem", fontWeight: 600, margin: 0 }}>
          {badge.name}
        </p>
        <span
          style={{
            display: "inline-block",
            marginTop: "0.375rem",
            fontSize: "0.6875rem",
            fontWeight: 700,
            padding: "0.125rem 0.5rem",
            borderRadius: "9999px",
            backgroundColor: badge.backgroundColor,
            color: badge.color,
          }}
        >
          {badge.label}
        </span>
      </div>

      <TooltipProvider>
        <nav style={{ flex: 1, padding: "1rem 0.75rem 0.75rem" }}>
          {vendorNavItems.map(({ href, label, icon, soon }) => (
            <SidebarNavLink
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={isActive(href)}
              collapsed={false}
              soon={soon}
            />
          ))}

          <div
            style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.08)", margin: "0.75rem 0" }}
          />

          {vendorSecondaryItems.map(({ href, label, icon, soon }) => (
            <SidebarNavLink
              key={href}
              href={href}
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
