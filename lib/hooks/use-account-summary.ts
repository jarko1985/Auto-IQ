"use client";

import { useCallback, useEffect, useState } from "react";

export interface AccountSummary {
  name: string | null;
  email: string;
  image: string | null;
}

/** Fetches the current user's basic account info (name/email/avatar) for
 * chrome like the topbar avatar menu — self-contained, matching
 * NotificationBell's own self-fetching pattern rather than threading session
 * props through every layout. Re-fetches on an "account:updated" browser
 * event, which the Profile/Settings pages dispatch after a successful save
 * (the session JWT itself doesn't refresh image/name until next sign-in). */
export function useAccountSummary(): AccountSummary | null {
  const [account, setAccount] = useState<AccountSummary | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/account");
    if (!res.ok) return;
    const json = (await res.json()) as { data: AccountSummary };
    setAccount(json.data);
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener("account:updated", load);
    return () => window.removeEventListener("account:updated", load);
  }, [load]);

  return account;
}
