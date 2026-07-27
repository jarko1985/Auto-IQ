import type { ReactNode } from "react";

// Public routes layout — no auth required.
// Shared header/footer will be added in Sprint 2 (landing page sprint).
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
