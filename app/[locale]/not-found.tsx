import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="mb-2 text-6xl font-bold text-accent">404</p>
        <h2 className="mb-2 text-2xl font-semibold text-navy">{t("title")}</h2>
        <p className="mb-6 text-muted-foreground">{t("description")}</p>
        <Link
          href="/"
          className="rounded-xl bg-navy px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t("home")}
        </Link>
      </div>
    </div>
  );
}
