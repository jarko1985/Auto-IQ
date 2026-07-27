import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { routing } from "@/i18n/routing";
import "@/app/globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "LocaleLayout" });

  return {
    title: {
      template: `%s | ${t("title")}`,
      default: t("title"),
    },
    description:
      "AI-powered vehicle diagnostics, spare-parts marketplace, garage booking, and repair management for the UAE.",
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "en" | "ar")) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} bg-background font-sans text-foreground antialiased`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster
            position={dir === "rtl" ? "top-left" : "top-right"}
            dir={dir}
            richColors
            closeButton
            toastOptions={{
              style: {
                fontFamily: "var(--font-plus-jakarta-sans)",
                borderRadius: "0.75rem",
              },
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
