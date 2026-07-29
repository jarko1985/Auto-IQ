"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Users,
  Settings,
  Wrench,
  ClipboardList,
  CalendarDays,
  CalendarClock,
  Bell,
} from "lucide-react";
import { useIsDesktop } from "@/lib/hooks/use-is-desktop";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import { TooltipProvider } from "@/components/ui/tooltip";

const navItems = [
  { href: "/garage/dashboard", label: "Dashboard", icon: LayoutDashboard, soon: false },
  { href: "/garage/locations", label: "Locations & Hours", icon: MapPin, soon: false },
  { href: "/garage/services", label: "Services & Capabilities", icon: Wrench, soon: false },
  { href: "/garage/mechanics", label: "Mechanics", icon: Users, soon: false },
  { href: "/garage/calendar", label: "Calendar", icon: CalendarDays, soon: false },
  { href: "/garage/appointments", label: "Appointments", icon: CalendarClock, soon: false },
  { href: "/garage/repair-orders", label: "Repair Orders", icon: ClipboardList, soon: false },
  { href: "/garage/notifications", label: "Notifications", icon: Bell, soon: false },
] as const;

interface Props {
  organizationName: string;
  organizationStatus: string;
}

export function GarageSidebar({ organizationName, organizationStatus }: Props) {
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
            marginBottom: collapsed ? 0 : "0.875rem",
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
          {!collapsed && (
            <span
              style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.01em" }}
            >
              AutoIQ Garage
            </span>
          )}
        </div>
        {!collapsed && (
          <>
            <p style={{ color: "#fff", fontSize: "0.8125rem", fontWeight: 600, margin: 0 }}>
              {organizationName}
            </p>
            <span
              style={{
                display: "inline-block",
                marginTop: "0.375rem",
                fontSize: "0.6875rem",
                fontWeight: 700,
                padding: "0.125rem 0.5rem",
                borderRadius: "9999px",
                backgroundColor:
                  organizationStatus === "ACTIVE"
                    ? "rgba(22,163,74,0.2)"
                    : organizationStatus === "REJECTED"
                      ? "rgba(220,38,38,0.2)"
                      : "rgba(217,119,6,0.2)",
                color:
                  organizationStatus === "ACTIVE"
                    ? "#4ade80"
                    : organizationStatus === "REJECTED"
                      ? "#f87171"
                      : "#fbbf24",
              }}
            >
              {organizationStatus === "ACTIVE"
                ? "Verified Garage"
                : organizationStatus === "REJECTED"
                  ? "Rejected"
                  : "Pending Approval"}
            </span>
          </>
        )}
      </div>

      <TooltipProvider>
        <nav style={{ flex: 1, padding: collapsed ? "1rem 0.625rem 0.75rem" : "1rem 0.75rem 0.75rem" }}>
          {navItems.map(({ href, label, icon, soon }) => (
            <SidebarNavLink
              key={href}
              href={soon ? "/garage/dashboard" : href}
              label={label}
              icon={icon}
              active={isActive(href)}
              collapsed={collapsed}
              soon={soon}
            />
          ))}

          <div
            style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.08)", margin: "0.75rem 0" }}
          />

          <SidebarNavLink
            href="/garage/onboarding"
            label="Business Profile"
            icon={Settings}
            active={isActive("/garage/onboarding")}
            collapsed={collapsed}
          />
        </nav>
      </TooltipProvider>
    </aside>
  );
}
