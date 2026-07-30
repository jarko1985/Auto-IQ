"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { useIsDesktop } from "@/lib/hooks/use-is-desktop";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { GlobalSearch } from "@/components/search/global-search";
import { UserAvatarMenu } from "@/components/account/user-avatar-menu";
import { PortalMobileDrawer } from "@/components/layout/portal-mobile-drawer";
import type { PortalNavItem } from "@/components/layout/sidebar-nav-link";
import type { OrgStatusBadge } from "@/components/layout/org-status-badge";

interface Props {
  notificationsHref: string;
  profileHref: string;
  settingsHref: string;
  brandIcon: ReactNode;
  brandLabel: string;
  orgBadge?: OrgStatusBadge;
  navItems: readonly PortalNavItem[];
  secondaryItems?: readonly PortalNavItem[];
}

const HEADER_STYLE: React.CSSProperties = {
  height: "3.5rem",
  flexShrink: 0,
  borderBottom: "1px solid #e5e8eb",
  backgroundColor: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  padding: "0 1.5rem",
};

/** Desktop: search + bell + avatar inline, sidebar nav shown separately by
 * the portal layout. Tablet/mobile (< lg): the topbar collapses to a burger
 * button + the notification bell; toggling the burger opens PortalMobileDrawer
 * — a full-screen overlay layer (not a pushed-down panel) carrying the
 * primary nav that would otherwise render as the desktop sidebar, plus
 * search and the account menu. */
export function PortalTopbar({
  notificationsHref,
  profileHref,
  settingsHref,
  brandIcon,
  brandLabel,
  orgBadge,
  navItems,
  secondaryItems,
}: Props) {
  const isDesktop = useIsDesktop();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (isDesktop) setMenuOpen(false);
  }, [isDesktop]);

  if (isDesktop) {
    return (
      <header className="no-print" style={HEADER_STYLE}>
        <div />
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <GlobalSearch />
          <NotificationBell centerHref={notificationsHref} />
          <UserAvatarMenu profileHref={profileHref} settingsHref={settingsHref} />
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="no-print" style={HEADER_STYLE}>
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          style={{
            width: "2.5rem",
            height: "2.5rem",
            borderRadius: "9999px",
            border: "none",
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#44474d",
          }}
        >
          <Menu size={20} />
        </button>
        <NotificationBell centerHref={notificationsHref} />
      </header>

      <PortalMobileDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        brandIcon={brandIcon}
        brandLabel={brandLabel}
        orgBadge={orgBadge}
        navItems={navItems}
        secondaryItems={secondaryItems}
        profileHref={profileHref}
        settingsHref={settingsHref}
      />
    </>
  );
}
