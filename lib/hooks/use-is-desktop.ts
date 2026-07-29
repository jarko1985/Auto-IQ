"use client";

import { useEffect, useState } from "react";

/** Below this width, portal sidebars collapse to an icon-only rail and the
 * topbar collapses to a burger menu (tablet + mobile). Matches Tailwind's
 * default `lg` breakpoint. JS-based (resize listener), not a CSS media
 * query — same viewport-detection convention AuthSplitPanel already uses,
 * since this app's Tailwind v4 setup avoids relying on class-driven
 * responsive layout (see CLAUDE.md's Card/@container note). */
const DESKTOP_BREAKPOINT_PX = 1024;

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT_PX);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isDesktop;
}
