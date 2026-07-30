"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { SidebarNavLink, type PortalNavItem } from "@/components/layout/sidebar-nav-link";
import { GlobalSearch } from "@/components/search/global-search";
import { MobileAccountPanel } from "@/components/account/mobile-account-panel";
import type { OrgStatusBadge } from "@/components/layout/org-status-badge";

interface Props {
  open: boolean;
  onClose: () => void;
  brandIcon: ReactNode;
  brandLabel: string;
  orgBadge?: OrgStatusBadge;
  navItems: readonly PortalNavItem[];
  secondaryItems?: readonly PortalNavItem[];
  profileHref: string;
  settingsHref: string;
}

/** The portal's primary nav + search + account, as a full-height overlay
 * layer above the layout (backdrop + slide-in panel) — mirrors the
 * marketing SiteHeader's mobile drawer pattern exactly, rather than the
 * old push-down panel. Slides from the left (same side the desktop
 * sidebar occupies), replacing both the old icon-only mobile sidebar rail
 * and the topbar's previous push-down account/search panel in one surface.
 * z-40/z-45 — deliberately below shadcn's z-50 primitives (Dialog,
 * DropdownMenu, Tooltip) so GlobalSearch's own dialog, opened from inside
 * this drawer, still renders on top of it. */
export function PortalMobileDrawer({
  open,
  onClose,
  brandIcon,
  brandLabel,
  orgBadge,
  navItems,
  secondaryItems,
  profileHref,
  settingsHref,
}: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname.includes(href);
  }

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Slide-in drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`fixed inset-y-0 left-0 z-[45] flex w-[82%] max-w-[300px] flex-col shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: "#081a2f" }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.25rem 1rem",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
                {brandIcon}
              </div>
              <span
                style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.01em" }}
              >
                {brandLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              style={{
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "9999px",
                border: "none",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              <X size={20} />
            </button>
          </div>

          {orgBadge && (
            <div style={{ marginTop: "0.875rem" }}>
              <p style={{ color: "#fff", fontSize: "0.8125rem", fontWeight: 600, margin: 0 }}>
                {orgBadge.name}
              </p>
              <span
                style={{
                  display: "inline-block",
                  marginTop: "0.375rem",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  padding: "0.125rem 0.5rem",
                  borderRadius: "9999px",
                  backgroundColor: orgBadge.backgroundColor,
                  color: orgBadge.color,
                }}
              >
                {orgBadge.label}
              </span>
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ padding: "1rem 1rem 0" }}>
          <GlobalSearch fullWidth />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "1rem 0.75rem" }}>
          {navItems.map(({ href, label, icon, soon, navigateHref }) => (
            <SidebarNavLink
              key={href}
              href={navigateHref ?? href}
              label={label}
              icon={icon}
              active={isActive(href)}
              collapsed={false}
              soon={soon}
              onNavigate={onClose}
            />
          ))}

          {secondaryItems && secondaryItems.length > 0 && (
            <>
              <div
                style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.08)", margin: "0.75rem 0" }}
              />
              {secondaryItems.map(({ href, label, icon, soon, navigateHref }) => (
                <SidebarNavLink
                  key={href}
                  href={navigateHref ?? href}
                  label={label}
                  icon={icon}
                  active={isActive(href)}
                  collapsed={false}
                  soon={soon}
                  onNavigate={onClose}
                />
              ))}
            </>
          )}
        </nav>

        {/* Account */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            padding: "0.75rem 1rem",
            backgroundColor: "#fff",
            flexShrink: 0,
          }}
        >
          <MobileAccountPanel profileHref={profileHref} settingsHref={settingsHref} onNavigate={onClose} />
        </div>
      </div>
    </>
  );
}
