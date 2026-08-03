"use client";

import { Link } from "@/i18n/routing";
import { useIsRtl } from "@/i18n/direction";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";

export interface PortalNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
  /** Actual navigation target for a `soon` item whose real `href` doesn't
   * exist yet (e.g. AdminSidebar's "Operations") — `href` is still what
   * drives the isActive check, this is only where the link points. */
  navigateHref?: string;
}

interface Props {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
  soon?: boolean;
  /** Fired when the link is clicked — used by PortalMobileDrawer to close
   * itself on navigation. No-op for the desktop sidebar's own usage. */
  onNavigate?: () => void;
}

/** One sidebar row, shared by all four portal sidebars (desktop) and by
 * PortalMobileDrawer (mobile/tablet). Expanded: icon + label (+ "Soon"
 * badge). Collapsed (icon rail): icon only, with the label surfaced as a
 * tooltip on hover — pointed toward the content edge (away from the
 * sidebar), which flips with RTL. */
export function SidebarNavLink({ href, label, icon: Icon, active, collapsed, soon, onNavigate }: Props) {
  const isRtl = useIsRtl();

  const link = (
    <Link
      href={href as never}
      aria-label={label}
      onClick={onNavigate}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        gap: "0.75rem",
        padding: collapsed ? "0.625rem" : "0.625rem 0.75rem",
        borderRadius: "0.625rem",
        textDecoration: "none",
        marginBottom: "0.125rem",
        backgroundColor: active ? "rgba(0,184,217,0.15)" : "transparent",
        color: active ? "#00b8d9" : soon ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.55)",
        fontWeight: active ? 600 : 400,
        fontSize: "0.875rem",
        cursor: soon ? "default" : "pointer",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Icon size={17} strokeWidth={active ? 2.5 : 1.75} style={{ flexShrink: 0 }} />
        {!collapsed && label}
      </span>
      {!collapsed && soon && (
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

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side={isRtl ? "left" : "right"}>
        {label}
        {soon && " (Soon)"}
      </TooltipContent>
    </Tooltip>
  );
}
