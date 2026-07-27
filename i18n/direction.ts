import { useLocale } from "next-intl";

/** Pure — usable anywhere a locale string is already in hand (server
 * components via `getLocale()`/`params.locale`, or client components that
 * already have the locale from another source). */
export function isRtlLocale(locale: string): boolean {
  return locale === "ar";
}

/** Client-component hook for RTL-aware rendering decisions that pure CSS
 * logical properties can't express — most commonly flipping a directional
 * icon (e.g. a "Next"/"Back" chevron) so it still points the way reading
 * flows. Client components only, matching this codebase's existing
 * `useTranslations`-in-client / `getTranslations`-in-server split. */
export function useIsRtl(): boolean {
  return isRtlLocale(useLocale());
}
