"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Store, Wrench, ShieldCheck, Bell, Star } from "lucide-react";
import { useIsDesktop } from "@/lib/hooks/use-is-desktop";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import { TooltipProvider } from "@/components/ui/tooltip";

const navItems = [
  { href: "/admin/vendors", label: "Vendor Approvals", icon: Store, soon: false },
  { href: "/admin/garages", label: "Garage Approvals", icon: Wrench, soon: false },
  { href: "/admin/parts", label: "Parts Catalog", icon: Package, soon: false },
  { href: "/admin/diagnostics", label: "Diagnostic Feedback", icon: Star, soon: false },
  { href: "/admin/notifications", label: "Notifications", icon: Bell, soon: false },
  { href: "/admin/dashboard", label: "Operations", icon: LayoutDashboard, soon: true },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const collapsed = !useIsDesktop();

  function isActive(href: string) {
    return pathname.includes(href);
  }

  return (
    <aside
      style={{
        width: collapsed ? "4.5rem" : "240px",
        minWidth: collapsed ? "4.5rem" : "240px",
        height: "100vh",
        position: "sticky",
        top: 0,
        backgroundColor: "#081a2f",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
        flexShrink: 0,
        transition: "width 0.15s, min-width 0.15s",
      }}
    >
      <div
        style={{
          padding: collapsed ? "1.5rem 0" : "1.5rem 1.25rem",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: "0.625rem",
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
            <ShieldCheck size={16} color="#fff" />
          </div>
          {!collapsed && (
            <span
              style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.01em" }}
            >
              AutoIQ Admin
            </span>
          )}
        </div>
      </div>

      <TooltipProvider>
        <nav style={{ flex: 1, padding: collapsed ? "1rem 0.625rem 0.75rem" : "1rem 0.75rem 0.75rem" }}>
          {navItems.map(({ href, label, icon, soon }) => (
            <SidebarNavLink
              key={href}
              href={soon ? "/admin/vendors" : href}
              label={label}
              icon={icon}
              active={isActive(href)}
              collapsed={collapsed}
              soon={soon}
            />
          ))}
        </nav>
      </TooltipProvider>
    </aside>
  );
}
