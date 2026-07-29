import type { CSSProperties } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Shared inline-style building blocks for this app's hand-rolled forms.
 *
 * Every form in the app builds its own <input>/<select> markup directly
 * (matching CLAUDE.md's "use inline style for layout, CSS vars for AutoIQ
 * design tokens" convention) rather than going through shadcn's generic
 * <Input> — that component isn't themed to the --navy/--cyan design system
 * and is only used by one unrelated settings form. This module exists so
 * that convention doesn't get re-typed from scratch in every form file.
 */

export const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "0.75rem 0.875rem",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  // 16px prevents iOS Safari from auto-zooming the viewport on focus.
  fontSize: "1rem",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  outline: "none",
  boxSizing: "border-box",
};

// Focus ring can't be expressed via the CSS-var-driven inline style object
// above, so it's layered on as a class instead.
export const fieldFocusClass =
  "transition-colors focus:border-[var(--cyan)] focus:ring-2 focus:ring-[var(--cyan)]/20";

// Native <select> arrows render flush against the border regardless of
// padding, so the OS-drawn one is suppressed in favor of <SelectChevron>,
// a positioned icon with real breathing room from the edge.
export const selectStyle: CSSProperties = {
  ...fieldStyle,
  paddingInlineEnd: "2.25rem",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

export const selectWrapperStyle: CSSProperties = { position: "relative" };

export function SelectChevron({
  size = 16,
  insetInlineEnd = "0.875rem",
}: {
  size?: number;
  insetInlineEnd?: string;
}) {
  return (
    <ChevronDown
      size={size}
      style={{
        position: "absolute",
        insetInlineEnd,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
        color: "var(--muted-foreground)",
      }}
      aria-hidden
    />
  );
}

export const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "var(--foreground)",
  marginBottom: "0.375rem",
};

export const requiredStyle: CSSProperties = { color: "var(--cyan)" };

export const errorStyle: CSSProperties = {
  fontSize: "0.8125rem",
  color: "var(--destructive)",
  marginTop: "0.25rem",
};

export const sectionHeadingStyle: CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--muted-foreground)",
  margin: "0 0 0.75rem",
};

// Applied to a form's outer card container: 0.75rem padding on mobile
// instead of a fixed 2rem that eats most of the viewport width on a phone,
// widening back out to the original 2rem from `sm:` up.
export const cardMobilePaddingClass = "p-3 sm:p-8";
