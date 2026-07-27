import type { ReactNode } from "react";

// Visual structure handled by AuthSplitPanel inside each page.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
