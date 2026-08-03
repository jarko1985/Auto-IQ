"use client";

import { useEffect, useState } from "react";
import { Globe, Bell, ShieldCheck } from "lucide-react";
import { useRouter, usePathname, routing, type Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
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

const LOCALE_LABELS: Record<Locale, string> = { en: "English", ar: "العربية" };

interface Props {
  notificationPreferencesHref: string;
}

export function SettingsView({ notificationPreferencesHref }: Props) {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocale, setSelectedLocale] = useState<Locale>("en");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/v1/account");
      if (res.ok) {
        const json = (await res.json()) as { data: AccountData };
        setAccount(json.data);
        setSelectedLocale((json.data.locale as Locale) ?? "en");
      }
      setLoading(false);
    })();
  }, []);

  async function handleSaveLocale() {
    setSaving(true);
    await fetch("/api/v1/account/locale", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: selectedLocale }),
    });
    window.dispatchEvent(new Event("account:updated"));
    router.replace(pathname as never, { locale: selectedLocale });
  }

  if (loading || !account) return null;

  const localeChanged = selectedLocale !== account.locale;

  return (
    <div style={{ padding: "2rem 1.5rem 6rem", maxWidth: "6xl" }}>
      <h1 style={{ margin: "0 0 0.375rem", fontSize: "1.5rem", fontWeight: 700, color: "#081a2f" }}>
        Settings
      </h1>
      <p style={{ color: "#75859f", margin: "0 0 2rem" }}>
        Manage your language preference, notifications, and account security
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* General Settings */}
        <section style={CARD_STYLE}>
          <h2 style={SECTION_TITLE_STYLE}>
            <Globe size={16} style={{ display: "inline", marginInlineEnd: "0.5rem", verticalAlign: "-2px" }} />
            General Settings
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", fontWeight: 600, color: "#181c1e" }}>
                Interface Language
              </p>
              <div className="flex gap-2 align-center justify-start">
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {routing.locales.map((locale) => (
                  <button
                    key={locale}
                    onClick={() => setSelectedLocale(locale)}
                    style={{
                      padding:selectedLocale === locale ? "0.2rem 1.25rem" : "0.2rem 1.25rem",
                      borderRadius: "10px",
                      border: selectedLocale === locale ? "1px solid #00b8d9" : "1px solid #e5e8eb",
                      backgroundColor: selectedLocale === locale ? "rgba(0,184,217,0.08)" : "#fff",
                      color: selectedLocale === locale ? "#00b8d9" : "#44474d",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {LOCALE_LABELS[locale]}
                  </button>
                ))}
              </div>
              {localeChanged && (
                <Button onClick={() => void handleSaveLocale()} disabled={saving} size="sm" style={{ padding: "0.875rem" }}>
                  {saving ? "Saving..." : "Save Language"}
                </Button>
              )}
              </div>
            </div>

            <div>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", fontWeight: 600, color: "#181c1e" }}>
                Default Currency
              </p>
              <div
                style={{
                  display: "inline-block",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  backgroundColor: "#f7fafd",
                  border: "1px solid #e5e8eb",
                  fontSize: "0.8125rem",
                  color: "#75859f",
                }}
              >
                AED — UAE Dirham
              </div>
              <p style={{ margin: "0.375rem 0 0", fontSize: "0.75rem", color: "#9aa3af" }}>
                AutoIQ UAE currently supports AED only.
              </p>
            </div>
          </div>
        </section>

        {/* Notification Preferences */}
        <section style={CARD_STYLE}>
          <h2 style={SECTION_TITLE_STYLE}>
            <Bell size={16} style={{ display: "inline", marginInlineEnd: "0.5rem", verticalAlign: "-2px" }} />
            Notification Preferences
          </h2>
          <p style={{ margin: "0 0 1rem", fontSize: "0.8125rem", color: "#75859f" }}>
            Choose how you&apos;d like to be notified about diagnostics, bookings, repair orders, and payments.
          </p>
          <Button variant="outline" asChild>
            <a href={notificationPreferencesHref}>Manage Notification Preferences</a>
          </Button>
        </section>

        {/* Security */}
        <section style={CARD_STYLE}>
          <h2 style={SECTION_TITLE_STYLE}>
            <ShieldCheck size={16} style={{ display: "inline", marginInlineEnd: "0.5rem", verticalAlign: "-2px" }} />
            Security
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.875rem 1rem",
              borderRadius: "0.5rem",
              backgroundColor: "rgba(241,244,247,0.5)",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "#181c1e" }}>
                Two-Factor Authentication
              </p>
              <p style={{ margin: "0.125rem 0 0", fontSize: "0.75rem", color: "#75859f" }}>
                Add an extra layer of security to your account.
              </p>
            </div>
            <span
              style={{
                fontSize: "0.6875rem",
                fontWeight: 700,
                color: "#75859f",
                backgroundColor: "#e5e8eb",
                padding: "0.25rem 0.625rem",
                borderRadius: "9999px",
                whiteSpace: "nowrap",
              }}
            >
              COMING SOON
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
