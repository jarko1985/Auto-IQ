const MAKE_LOGOS: Record<string, string> = {
  audi: "/logos/audi-logo.svg",
  bmw: "/logos/bmw-logo.svg",
  byd: "/logos/byd-logo.svg",
  cadillac: "/logos/cadillac-logo.svg",
  chevrolet: "/logos/chevrolet-logo.svg",
  ferrari: "/logos/ferrari-logo.svg",
  gmc: "/logos/gmc-logo.svg",
  honda: "/logos/honda-logo.svg",
  hyundai: "/logos/hyundai-logo.svg",
  jeep: "/logos/jeep-logo.svg",
  kia: "/logos/kia-logo.svg",
  lamborghini: "/logos/lamborghini-logo.svg",
  "mercedes-benz": "/logos/mercedes-benz-logo.svg",
  nissan: "/logos/nissan-logo.svg",
  porsche: "/logos/porsche-logo.svg",
  "rolls-royce": "/logos/rolls-royce-logo.svg",
  tesla: "/logos/tesla-logo.svg",
  toyota: "/logos/toyota-logo.svg",
  volvo: "/logos/volvo-logo.svg",
};

function slugifyMakeName(makeName: string): string {
  return makeName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Returns the public/logos/ path for a make name, or null if no logo is available. */
export function getMakeLogo(makeName: string): string | null {
  return MAKE_LOGOS[slugifyMakeName(makeName)] ?? null;
}
