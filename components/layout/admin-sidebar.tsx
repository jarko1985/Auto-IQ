"use client";

import { Link } from "@/i18n/routing";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Store, Wrench, ShieldCheck, Bell, Star } from "lucide-react";

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

      <nav style={{ flex: 1, padding: "1rem 0.75rem 0.75rem" }}>
        {navItems.map(({ href, label, icon: Icon, soon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={soon ? "/admin/vendors" : href}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                padding: "0.625rem 0.75rem",
                borderRadius: "0.625rem",
                textDecoration: "none",
                marginBottom: "0.125rem",
                backgroundColor: active ? "rgba(0,184,217,0.15)" : "transparent",
                color: active
                  ? "#00b8d9"
                  : soon
                    ? "rgba(255,255,255,0.3)"
                    : "rgba(255,255,255,0.55)",
                fontWeight: active ? 600 : 400,
                fontSize: "0.875rem",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Icon size={17} strokeWidth={active ? 2.5 : 1.75} />
                {label}
              </span>
              {soon && (
                <span
                  style={{
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    padding: "0.0625rem 0.375rem",
                    borderRadius: "9999px",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
