"use client";

import { useEffect, useState } from "react";

/** Below this width, filter "pill" rows collapse into a single searchable
 * select (see components/ui/searchable-select.tsx) instead of a wrapping
 * button row — tablet and up keep the pills. Matches Tailwind's default
 * `md` breakpoint. JS-based (resize listener), same viewport-detection
 * convention as use-is-desktop.ts. */
const MOBILE_BREAKPOINT_PX = 768;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}
