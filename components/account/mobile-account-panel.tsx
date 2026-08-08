"use client";

import { signOut } from "next-auth/react";
import { User as UserIcon, Settings as SettingsIcon, LogOut } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAccountSummary } from "@/lib/hooks/use-account-summary";
import { initials } from "./initials";

interface Props {
  profileHref: string;
  settingsHref: string;
  onNavigate: () => void;
}

const ROW_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  padding: "0.75rem 0.25rem",
  fontSize: "0.875rem",
  fontWeight: 600,
  textDecoration: "none",
  color: "#181c1e",
  border: "none",
  background: "transparent",
  width: "100%",
  textAlign: "start",
  cursor: "pointer",
};

/** Flat, non-dropdown rendering of the account menu for the topbar's mobile
 * burger panel — reuses useAccountSummary/initials from UserAvatarMenu, but
 * plain rows instead of Radix DropdownMenuItem (there's no dropdown chrome
 * to nest inside here, the panel itself is already the open surface). */
export function MobileAccountPanel({ profileHref, settingsHref, onNavigate }: Props) {
  const account = useAccountSummary();

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.5rem 0.25rem 1rem",
        }}
      >
        <Avatar>
          {account?.image && (
            <AvatarImage src={account.image} alt={account.name ?? account.email} />
          )}
          <AvatarFallback style={{ backgroundColor: "#081a2f", color: "#fff", fontWeight: 700 }}>
            {account ? initials(account.name, account.email) : ""}
          </AvatarFallback>
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 700, color: "#081a2f" }}>
            {account?.name ?? "My Account"}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              color: "#75859f",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {account?.email}
          </p>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #eef1f4" }}>
        <Link href={profileHref as never} onClick={onNavigate} style={ROW_STYLE}>
          <UserIcon size={16} />
          Profile
        </Link>
        <Link href={settingsHref as never} onClick={onNavigate} style={ROW_STYLE}>
          <SettingsIcon size={16} />
          Settings
        </Link>
        <button
          onClick={() => {
            onNavigate();
            void signOut({ callbackUrl: "/" });
          }}
          style={{ ...ROW_STYLE, color: "#ba1a1a" }}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );
}
