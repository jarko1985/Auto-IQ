import Image from "next/image";
import { Link } from "@/i18n/routing";
import Counter from "@/components/reactbits/counter";
import { SiteHeader } from "./_components/site-header";
import { ScrollLink } from "./_components/scroll-link";

const garages = [
  {
    name: "Al Quoz Precision",
    location: "Al Quoz, Dubai",
    specialty: "Engine & Transmission",
    rating: 4.9,
    reviews: 234,
    image: "/images/landing/garage-al-quoz-precision.jpg",
  },
  {
    name: "Yas Performance Center",
    location: "Yas Island, Abu Dhabi",
    specialty: "Performance & Tuning",
    rating: 4.8,
    reviews: 187,
    image: "/images/landing/garage-yas-performance.jpg",
  },
  {
    name: "Sharjah AutoHub",
    location: "Industrial Area, Sharjah",
    specialty: "Multi-brand Service",
    rating: 4.7,
    reviews: 312,
    image: "/images/landing/garage-sharjah-autohub.jpg",
  },
  {
    name: "Eco-Drive Garage",
    location: "Jumeirah, Dubai",
    specialty: "Electric & Hybrid",
    rating: 4.9,
    reviews: 156,
    image: "/images/landing/garage-eco-drive.jpg",
  },
];

// Windows renders 🇦🇪 as the literal letters "AE" instead of a flag — an actual
// SVG is the only reliable cross-platform way to show the UAE flag.
function UaeFlagIcon() {
  return (
    <svg viewBox="0 0 30 20" width="22" height="15" className="rounded-[2px] shadow-sm">
      <rect width="30" height="20" fill="#00732f" />
      <rect y="6.667" width="30" height="6.667" fill="#fff" />
      <rect y="13.333" width="30" height="6.667" fill="#000" />
      <rect width="9" height="20" fill="#ff0000" />
    </svg>
  );
}

const capabilities = [
  {
    icon: <span style={{ fontSize: "1.125rem" }}>🔮</span>,
    title: "Predictive Health",
    desc: "Anticipate failures before they happen. AI monitors patterns across your vehicle's history to flag issues before they leave you stranded.",
    bg: "#081a2f",
  },
  {
    icon: <UaeFlagIcon />,
    title: "UAE Compliance",
    desc: "Built for UAE regulations. Fully compliant with RTA & ESMA standards, supporting UAE plate formats and local service requirements.",
    bg: "#102a43",
  },
];

export default function HomePage() {
  return (
    <div style={{ backgroundColor: "#f7fafd", minHeight: "100vh" }}>
      <SiteHeader />

      {/* ── Hero ── */}
      <section
        style={{
          backgroundColor: "#081a2f",
          position: "relative",
          overflow: "hidden",
        }}
        className="px-4 py-16 sm:px-6 sm:py-20 md:py-24 lg:px-10"
      >
        <Image
          src="/images/landing/hero.jpg"
          alt="Premium vehicle interior and workshop"
          fill
          priority
          style={{ objectFit: "cover", opacity: 0.92 }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(8,26,47,0.8) 0%, rgba(8,26,47,0.94) 100%)",
          }}
        />
        <div
          style={{
            maxWidth: "72rem",
            margin: "0 auto",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              backgroundColor: "rgba(0,184,217,0.12)",
              border: "1px solid rgba(0,184,217,0.25)",
              borderRadius: "9999px",
              padding: "0.375rem 1rem",
              marginBottom: "2rem",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#00b8d9",
                flexShrink: 0,
              }}
            />
            <span
              className="text-[0.75rem] sm:text-[0.8125rem]"
              style={{ fontWeight: 600, color: "#00b8d9" }}
            >
              AI-Powered Vehicle Diagnostics · UAE
            </span>
          </div>

          <h1
            className="text-3xl sm:text-4xl md:text-5xl"
            style={{
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              maxWidth: "48rem",
              margin: "0 auto 1.5rem",
            }}
          >
            Understand the problem. <span style={{ color: "#00b8d9" }}>Find the solution.</span> Get
            back on the road.
          </h1>

          <p
            className="text-base sm:text-lg"
            style={{
              color: "rgba(255,255,255,0.6)",
              maxWidth: "36rem",
              margin: "0 auto 2.5rem",
              lineHeight: 1.7,
            }}
          >
            AutoIQ leverages advanced AI to diagnose vehicle issues instantly, connecting you with
            Dubai and Abu Dhabi&apos;s most trusted certified garages.
          </p>

          {/* Stat metrics */}
          <div
            className="flex flex-wrap justify-center gap-6 sm:gap-8 md:gap-12"
            style={{ alignItems: "center", marginBottom: "2.5rem" }}
          >
            <StatItem value={15} suffix="k+" label="Active Users" />
            <div
              className="hidden sm:block"
              style={{ width: "1px", height: "2rem", backgroundColor: "rgba(255,255,255,0.12)" }}
            />
            <StatItem value={250} suffix="+" label="Verified Garages" />
            <div
              className="hidden sm:block"
              style={{ width: "1px", height: "2rem", backgroundColor: "rgba(255,255,255,0.12)" }}
            />
            <StatItem value={89} suffix="%" label="AI Accuracy" />
          </div>

          {/* CTAs */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Link
              href="/sign-up"
              className="w-full text-center sm:w-auto"
              style={{
                padding: "0.875rem 2rem",
                backgroundColor: "#00b8d9",
                color: "#fff",
                borderRadius: "0.75rem",
                fontWeight: 600,
                fontSize: "0.9375rem",
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              Start New Diagnostic
            </Link>
            <ScrollLink
              targetId="garages"
              className="w-full text-center sm:w-auto"
              style={{
                padding: "0.875rem 2rem",
                backgroundColor: "rgba(255,255,255,0.08)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "0.75rem",
                fontWeight: 600,
                fontSize: "0.9375rem",
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              Browse Marketplace
            </ScrollLink>
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section id="how-it-works" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
        <div style={{ maxWidth: "72rem", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <p
              style={{
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "#00b8d9",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: "0 0 0.5rem",
              }}
            >
              Seamless Intelligence
            </p>
            <h2
              className="text-2xl sm:text-3xl"
              style={{
                fontWeight: 700,
                color: "#081a2f",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              How AutoIQ Works
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                image: "/images/landing/scan_detect.png",
                alt: "Scan and detect vehicle issues with AI",
                desc: "Point your phone at dashboard warning lights or describe symptoms in plain language.",
              },
              {
                image: "/images/landing/ai_diagnostic.png",
                alt: "AI diagnosis identifying the root cause",
                desc: "Our AI cross-references millions of repair records to identify the most likely root cause.",
              },
              {
                image: "/images/landing/expert_repair.png",
                alt: "Certified mechanic performing expert repair",
                desc: "Choose from pre-vetted certified service centers near you with transparent pricing.",
              },
            ].map(({ image, alt, desc }) => (
              <div
                key={image}
                className="group overflow-hidden border border-[#c4c6cd] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-cyan/40 hover:shadow-[0_20px_40px_-16px_rgba(8,26,47,0.25)]"
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "1rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "3 / 2",
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src={image}
                    alt={alt}
                    fill
                    className="transition-transform duration-500 ease-out group-hover:scale-105"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div className="px-5 py-5 sm:px-6 sm:py-6">
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "#44474d",
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Advanced Capabilities ── */}
      <section id="diagnostics" className="scroll-mt-20 px-4 pb-16 sm:px-6 sm:pb-20 lg:px-10">
        <div style={{ maxWidth: "72rem", margin: "0 auto" }}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {capabilities.map(({ icon, title, desc, bg }, i) => (
              <div
                key={title}
                className={`group relative animate-in overflow-hidden border border-cyan/15 px-6 py-8 transition-all duration-300 ease-out fade-in-0 slide-in-from-bottom-6 hover:-translate-y-1.5 hover:border-cyan/40 hover:shadow-[0_24px_48px_-20px_rgba(0,184,217,0.4)] sm:px-8 sm:py-10 ${
                  i === 1 ? "delay-150" : ""
                }`}
                style={{
                  backgroundColor: bg,
                  borderRadius: "1rem",
                  animationDuration: "700ms",
                }}
              >
                {/* Decorative glow — hidden by default, blooms in on hover */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-cyan/0 opacity-0 blur-3xl transition-all duration-500 ease-out group-hover:bg-cyan/25 group-hover:opacity-100"
                />

                <div className="relative">
                  <div
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan/15 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-cyan/25"
                    style={{ boxShadow: "inset 0 0 0 1px rgba(0,184,217,0.15)" }}
                  >
                    {icon}
                  </div>
                  <h3
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      color: "#fff",
                      margin: "0 0 0.625rem",
                    }}
                  >
                    {title}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "rgba(255,255,255,0.65)",
                      margin: 0,
                      lineHeight: 1.7,
                    }}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Garage Partners ── */}
      <section
        id="garages"
        className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 lg:px-10"
        style={{ backgroundColor: "#fff" }}
      >
        <div style={{ maxWidth: "72rem", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <p
              style={{
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "#00b8d9",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: "0 0 0.5rem",
              }}
            >
              Trusted Partners
            </p>
            <h2
              className="text-2xl sm:text-3xl"
              style={{
                fontWeight: 700,
                color: "#081a2f",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Verified Garage Network
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {garages.map((g) => (
              <div
                key={g.name}
                style={{
                  backgroundColor: "#f7fafd",
                  border: "1px solid #c4c6cd",
                  borderRadius: "1rem",
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "relative", height: "160px", width: "100%" }}>
                  <Image src={g.image} alt={g.name} fill style={{ objectFit: "cover" }} />
                </div>
                <div className="p-5 sm:p-6">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: "1rem",
                          fontWeight: 700,
                          color: "#081a2f",
                          margin: "0 0 0.25rem",
                        }}
                      >
                        {g.name}
                      </h3>
                      <p style={{ fontSize: "0.8125rem", color: "#44474d", margin: 0 }}>
                        {g.location}
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                        backgroundColor: "rgba(0,184,217,0.08)",
                        borderRadius: "9999px",
                        padding: "0.25rem 0.625rem",
                        flexShrink: 0,
                        marginInlineStart: "0.75rem",
                      }}
                    >
                      <span style={{ fontSize: "0.75rem" }}>⭐</span>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#081a2f" }}>
                        {g.rating}
                      </span>
                      <span style={{ fontSize: "0.6875rem", color: "#44474d" }}>({g.reviews})</span>
                    </div>
                  </div>
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      backgroundColor: "rgba(8,26,47,0.07)",
                      color: "#081a2f",
                      padding: "0.2rem 0.625rem",
                      borderRadius: "9999px",
                    }}
                  >
                    {g.specialty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="px-4 pt-12 pb-8 sm:px-6 sm:pt-16 lg:px-10"
        style={{ backgroundColor: "#081a2f" }}
      >
        <div style={{ maxWidth: "72rem", margin: "0 auto" }}>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-12">
            <div style={{ marginBottom: 0 }}>
              {/* Brand column */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    width: "1.75rem",
                    height: "1.75rem",
                    borderRadius: "0.5rem",
                    backgroundColor: "#00b8d9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}>A</span>
                </div>
                <span style={{ fontWeight: 700, color: "#fff", fontSize: "0.9375rem" }}>
                  AutoIQ UAE
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "rgba(255,255,255,0.45)",
                  margin: "0 0 1.5rem",
                  lineHeight: 1.7,
                  maxWidth: "20rem",
                }}
              >
                Transforming vehicle maintenance in the UAE through AI-powered diagnostics and a
                trusted garage network.
              </p>
              <div className="flex flex-wrap gap-2">
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.4)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "0.375rem",
                    padding: "0.25rem 0.625rem",
                  }}
                >
                  🇬🇧 English (UAE)
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.4)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "0.375rem",
                    padding: "0.25rem 0.625rem",
                  }}
                >
                  🇦🇪 العربية
                </span>
              </div>
            </div>

            {/* Links columns */}
            <FooterColumn
              title="Platform"
              links={["AI Diagnostics", "Marketplace", "Fleet Management", "Pricing"]}
            />
            <FooterColumn
              title="UAE Support"
              links={["Dubai Office", "Abu Dhabi", "Sharjah", "Partner Program"]}
            />
            <FooterColumn
              title="Legal"
              links={["Privacy Policy", "Terms of Service", "Cookie Policy", "RTA Compliance"]}
            />
          </div>

          <div
            className="mt-12 flex flex-col items-center gap-2 text-center sm:mt-12 sm:flex-row sm:justify-between sm:text-left"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1.5rem" }}
          >
            <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.3)", margin: 0 }}>
              © 2026 AutoIQ UAE. All rights reserved.
            </p>
            <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.3)", margin: 0 }}>
              RTA Approved · ESMA Compliant
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatItem({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          color: "#00b8d9",
          margin: "0 0 0.125rem",
        }}
      >
        <Counter
          value={value}
          fontSize={30}
          padding={2}
          gap={0}
          horizontalPadding={0}
          borderRadius={0}
          textColor="#00b8d9"
          fontWeight={700}
          gradientHeight={6}
          gradientFrom="#081a2f"
          gradientTo="transparent"
        />
        <span
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "#00b8d9",
            position: "relative",
          }}
        >
          {suffix}
        </span>
      </p>
      <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.45)", margin: 0 }}>{label}</p>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4
        style={{
          fontSize: "0.8125rem",
          fontWeight: 700,
          color: "#fff",
          margin: "0 0 1rem",
          letterSpacing: "0.03em",
        }}
      >
        {title}
      </h4>
      {links.map((l) => (
        <p
          key={l}
          style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.45)", margin: "0 0 0.5rem" }}
        >
          {l}
        </p>
      ))}
    </div>
  );
}
