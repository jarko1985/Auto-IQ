"use client";

import { useTranslations } from "next-intl";

export default function LocaleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Error");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h2 className="mb-2 text-2xl font-semibold text-navy">{t("title")}</h2>
        <p className="mb-6 text-muted-foreground">{t("description")}</p>
        <button
          onClick={reset}
          className="rounded-xl bg-navy px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t("retry")}
        </button>
      </div>
    </div>
  );
}
