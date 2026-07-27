// Root layout — required by Next.js.
// The [locale]/layout.tsx provides <html> and <body> with locale-aware attributes.
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
