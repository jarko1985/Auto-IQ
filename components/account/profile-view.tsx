"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Car, CalendarCheck, Brain, Coins } from "lucide-react";
import type { AuditAction } from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { humanizeAuditAction } from "@/features/account/activity-labels";
import { formatRelativeTime } from "@/components/notifications/notification-icon";
import { initials } from "./initials";
import type { AccountData } from "./types";

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: "#fff",
  borderRadius: "0.75rem",
  border: "1px solid #e5e8eb",
  boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
  padding: "1.5rem",
};

const SECTION_TITLE_STYLE: React.CSSProperties = {
  margin: "0 0 1rem",
  fontSize: "1rem",
  fontWeight: 700,
  color: "#081a2f",
};

const PROVIDER_LABELS: Record<string, string> = { google: "Google", apple: "Apple" };

function notifyUpdated() {
  window.dispatchEvent(new Event("account:updated"));
}

export function ProfileView() {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  async function load() {
    const res = await fetch("/api/v1/account");
    if (res.ok) {
      const json = (await res.json()) as { data: AccountData };
      setAccount(json.data);
      setName(json.data.name ?? "");
      setPhone(json.data.phone ?? "");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSaveProfile() {
    setSavingProfile(true);
    setProfileError(null);
    const res = await fetch("/api/v1/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone: phone || null }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: { message?: string } };
      setProfileError(json.error?.message ?? "Could not save changes.");
    } else {
      notifyUpdated();
    }
    setSavingProfile(false);
  }

  async function handleAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/v1/account/avatar", { method: "POST", body: formData });
    if (res.ok) {
      const json = (await res.json()) as { data: { image: string } };
      setAccount((prev) => (prev ? { ...prev, image: json.data.image } : prev));
      notifyUpdated();
    }
    setAvatarUploading(false);
  }

  async function handleChangePassword() {
    setChangingPassword(true);
    setPasswordError(null);
    const res = await fetch("/api/v1/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: { message?: string } };
      setPasswordError(json.error?.message ?? "Could not change password.");
    } else {
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  }

  if (loading || !account) return null;

  return (
    <div style={{ padding: "2rem 1.5rem 6rem", margin: "0 auto", maxWidth: "72rem" }}>
      <h1 style={{ margin: "0 0 0.375rem", fontSize: "1.5rem", fontWeight: 700, color: "#081a2f" }}>
        Profile
      </h1>
      <p style={{ color: "#75859f", margin: "0 0 2rem" }}>
        Manage your personal information and account security
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "1.5rem", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>
          {/* Personal Information */}
          <section style={CARD_STYLE}>
            <h2 style={SECTION_TITLE_STYLE}>Personal Information</h2>

            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ position: "relative" }}>
                <Avatar size="lg" style={{ width: "4.5rem", height: "4.5rem" }}>
                  {account.image && <AvatarImage src={account.image} alt={account.name ?? account.email} />}
                  <AvatarFallback style={{ backgroundColor: "#081a2f", color: "#fff", fontSize: "1.25rem", fontWeight: 700 }}>
                    {initials(account.name, account.email)}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  aria-label="Change photo"
                  style={{
                    position: "absolute",
                    bottom: -2,
                    insetInlineEnd: -2,
                    width: "1.75rem",
                    height: "1.75rem",
                    borderRadius: "9999px",
                    backgroundColor: "#00b8d9",
                    border: "2px solid #fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: avatarUploading ? "default" : "pointer",
                  }}
                >
                  <Camera size={13} color="#fff" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => void handleAvatarSelected(e)}
                />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "0.8125rem", color: "#75859f" }}>
                  {avatarUploading ? "Uploading..." : "JPG, PNG or WebP. Max 5MB."}
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <Label htmlFor="profile-name">Full Name</Label>
                <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="profile-email">
                  Email Address
                  {account.emailVerified && (
                    <CheckCircle2 size={13} color="#059669" style={{ marginInlineStart: "0.25rem" }} />
                  )}
                </Label>
                <Input id="profile-email" value={account.email} disabled className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="profile-phone">Phone Number</Label>
                <Input
                  id="profile-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+9715XXXXXXXX"
                  className="mt-1.5"
                />
              </div>
            </div>

            {profileError && (
              <p style={{ color: "#ba1a1a", fontSize: "0.8125rem", marginTop: "0.75rem" }}>{profileError}</p>
            )}
            <div style={{ marginTop: "1.25rem" }}>
              <Button onClick={() => void handleSaveProfile()} disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </section>

          {/* Password */}
          <section style={CARD_STYLE}>
            <h2 style={SECTION_TITLE_STYLE}>Password</h2>
            <p style={{ margin: "0 0 1rem", fontSize: "0.8125rem", color: "#75859f" }}>
              Change the password used to sign in to your account.
            </p>
            <Dialog
              open={passwordOpen}
              onOpenChange={(open) => {
                setPasswordOpen(open);
                if (!open) setPasswordError(null);
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline">Change Password</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
                </DialogHeader>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  {passwordError && <p style={{ color: "#ba1a1a", fontSize: "0.8125rem" }}>{passwordError}</p>}
                </div>
                <DialogFooter>
                  <Button onClick={() => void handleChangePassword()} disabled={changingPassword}>
                    {changingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>

          {/* Connected Accounts */}
          {account.linkedProviders.length > 0 && (
            <section style={CARD_STYLE}>
              <h2 style={SECTION_TITLE_STYLE}>Connected Accounts</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {account.linkedProviders.map((provider) => (
                  <div
                    key={provider}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      backgroundColor: "#f7fafd",
                    }}
                  >
                    <span style={{ fontSize: "0.875rem", color: "#181c1e", fontWeight: 600 }}>
                      {PROVIDER_LABELS[provider] ?? provider}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#059669",
                        backgroundColor: "rgba(16,185,129,0.1)",
                        padding: "0.25rem 0.625rem",
                        borderRadius: "9999px",
                      }}
                    >
                      Connected
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent Activity */}
          <section style={CARD_STYLE}>
            <h2 style={SECTION_TITLE_STYLE}>Recent Activity</h2>
            {account.recentActivity.length === 0 ? (
              <p style={{ color: "#75859f", fontSize: "0.875rem", margin: 0 }}>No recent activity yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {account.recentActivity.map((item, i) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.75rem 0",
                      borderTop: i > 0 ? "1px solid #eef1f4" : "none",
                    }}
                  >
                    <span style={{ fontSize: "0.875rem", color: "#181c1e" }}>
                      {humanizeAuditAction(item.action as AuditAction)}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#75859f" }}>
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ ...CARD_STYLE, textAlign: "center" }}>
            <Avatar style={{ width: "4.5rem", height: "4.5rem", margin: "0 auto 0.75rem" }}>
              {account.image && <AvatarImage src={account.image} alt={account.name ?? account.email} />}
              <AvatarFallback style={{ backgroundColor: "#081a2f", color: "#fff", fontSize: "1.25rem", fontWeight: 700 }}>
                {initials(account.name, account.email)}
              </AvatarFallback>
            </Avatar>
            <p style={{ margin: "0 0 0.125rem", fontWeight: 700, color: "#081a2f" }}>
              {account.name ?? "Unnamed"}
            </p>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.8125rem", color: "#75859f" }}>{account.email}</p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#9aa3af" }}>
              Member since {formatDate(account.createdAt)}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <StatTile icon={Car} label="Vehicles" value={account.stats.vehicleCount} />
            <StatTile icon={CalendarCheck} label="Bookings" value={account.stats.completedBookingCount} />
            <StatTile icon={Brain} label="Diagnostics" value={account.stats.diagnosticSessionCount} />
            <StatTile icon={Coins} label="AutoIQ Points" value={account.stats.autoIqPoints} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Car;
  label: string;
  value: number;
}) {
  return (
    <div style={{ ...CARD_STYLE, padding: "1rem", textAlign: "center" }}>
      <Icon size={18} color="#00b8d9" style={{ margin: "0 auto 0.5rem" }} />
      <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#081a2f" }}>{value}</p>
      <p style={{ margin: 0, fontSize: "0.6875rem", color: "#75859f" }}>{label}</p>
    </div>
  );
}
