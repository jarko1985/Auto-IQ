"use client";

import { Link } from "@/i18n/routing";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Stethoscope,
  ShoppingBag,
  Wrench,
  BarChart3,
  Settings,
  HelpCircle,
  Store,
  PackageSearch,
  Zap,
  CalendarClock,
  ClipboardList,
  Bell,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/diagnostics", label: "Diagnostics", icon: Stethoscope },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/dashboard/orders", label: "My Orders", icon: PackageSearch },
  { href: "/garages", label: "Garages", icon: Wrench },
  { href: "/dashboard/bookings", label: "My Bookings", icon: CalendarClock },
  { href: "/dashboard/repair-orders", label: "Repair Orders", icon: ClipboardList },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

const secondaryItems = [
  { href: "/vendor/onboarding", label: "Sell on AutoIQ", icon: Store },
  { href: "/garage/onboarding", label: "Register a Garage", icon: Wrench },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/support", label: "Support", icon: HelpCircle },
] as const;

export function CustomerSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    // pathname is like /en/dashboard
    return pathname.includes(href);
  }

  return (
    <aside
      className="no-print"
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
        flexShrink: 0,
      }}
    >
      {/* Logo */}
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
            <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.875rem" }}>A</span>
          </div>
          <span
            style={{
              color: "#fff",
              fontWeight: 700,
              fontSize: "1rem",
              letterSpacing: "-0.01em",
            }}
          >
            AutoIQ
          </span>
        </div>
      </div>

      {/* Upgrade to Pro */}
      <div
        style={{
          margin: "1rem 0.875rem 0",
          padding: "0.875rem 1rem",
          backgroundColor: "rgba(0,184,217,0.1)",
          borderRadius: "0.75rem",
          border: "1px solid rgba(0,184,217,0.2)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            marginBottom: "0.25rem",
          }}
        >
          <Zap size={12} color="#00b8d9" />
          <span style={{ color: "#00b8d9", fontSize: "0.6875rem", fontWeight: 700 }}>
            UPGRADE TO PRO
          </span>
        </div>
        <p
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: "0.6875rem",
            margin: "0 0 0.625rem",
            lineHeight: 1.5,
          }}
        >
          Unlock AI diagnostics &amp; fleet analytics
        </p>
        <button
          style={{
            width: "100%",
            padding: "0.375rem",
            backgroundColor: "#00b8d9",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Upgrade
        </button>
      </div>

      {/* Primary nav */}
      <nav style={{ flex: 1, padding: "1rem 0.75rem 0.75rem" }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.625rem 0.75rem",
                borderRadius: "0.625rem",
                textDecoration: "none",
                marginBottom: "0.125rem",
                backgroundColor: active ? "rgba(0,184,217,0.15)" : "transparent",
                color: active ? "#00b8d9" : "rgba(255,255,255,0.55)",
                fontWeight: active ? 600 : 400,
                fontSize: "0.875rem",
                transition: "background-color 0.15s, color 0.15s",
              }}
            >
              <Icon size={17} strokeWidth={active ? 2.5 : 1.75} />
              {label}
            </Link>
          );
        })}

        <div
          style={{
            height: "1px",
            backgroundColor: "rgba(255,255,255,0.08)",
            margin: "0.75rem 0",
          }}
        />

        {secondaryItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.625rem 0.75rem",
                borderRadius: "0.625rem",
                textDecoration: "none",
                marginBottom: "0.125rem",
                backgroundColor: active ? "rgba(0,184,217,0.15)" : "transparent",
                color: active ? "#00b8d9" : "rgba(255,255,255,0.4)",
                fontWeight: active ? 600 : 400,
                fontSize: "0.875rem",
              }}
            >
              <Icon size={17} strokeWidth={active ? 2.5 : 1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
