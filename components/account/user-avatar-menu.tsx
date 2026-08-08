"use client";

import { signOut } from "next-auth/react";
import { User as UserIcon, Settings as SettingsIcon, LogOut } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccountSummary } from "@/lib/hooks/use-account-summary";
import { initials } from "./initials";

interface Props {
  profileHref: string;
  settingsHref: string;
}

export function UserAvatarMenu({ profileHref, settingsHref }: Props) {
  const account = useAccountSummary();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            borderRadius: "9999px",
            padding: 0,
            display: "flex",
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
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" style={{ width: "16rem" }}>
        <DropdownMenuLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#081a2f" }}>
              {account?.name ?? "My Account"}
            </span>
            <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#75859f" }}>
              {account?.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href={profileHref as never}
            style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}
          >
            <UserIcon size={16} />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href={settingsHref as never}
            style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}
          >
            <SettingsIcon size={16} />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => void signOut({ callbackUrl: "/" })}
          style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer" }}
        >
          <LogOut size={16} />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
