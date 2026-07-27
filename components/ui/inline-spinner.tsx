"use client";

import { ClipLoader } from "react-spinners";

/** Small spinner for inline use inside buttons/rows during a pending action. */
export function InlineSpinner({ color = "#ffffff", size = 14 }: { color?: string; size?: number }) {
  return <ClipLoader color={color} size={size} aria-label="Loading" />;
}
