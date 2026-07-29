"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useIsDesktop } from "@/lib/hooks/use-is-desktop";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { GlobalSearch } from "@/components/search/global-search";
import { UserAvatarMenu } from "@/components/account/user-avatar-menu";
import { MobileAccountPanel } from "@/components/account/mobile-account-panel";

interface Props {
  notificationsHref: string;
  profileHref: string;
  settingsHref: string;
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

/** Desktop: search + bell + avatar inline. Tablet/mobile (< lg): the topbar
 * collapses to a burger button + the notification bell; toggling the burger
 * reveals a panel with the search trigger and the account menu (flattened,
 * not nested inside a second dropdown) — see MobileAccountPanel. */
export function PortalTopbar({ notificationsHref, profileHref, settingsHref }: Props) {
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
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
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
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <NotificationBell centerHref={notificationsHref} />
      </header>

      {menuOpen && (
        <div
          className="no-print"
          style={{
            borderBottom: "1px solid #e5e8eb",
            backgroundColor: "#fff",
            padding: "1rem 1.5rem 1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            boxShadow: "0 12px 24px rgba(0,0,0,0.06)",
          }}
        >
          <GlobalSearch fullWidth />
          <MobileAccountPanel
            profileHref={profileHref}
            settingsHref={settingsHref}
            onNavigate={() => setMenuOpen(false)}
          />
        </div>
      )}
    </>
  );
}
