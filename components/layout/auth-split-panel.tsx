"use client";

import { useState, useEffect, type ReactNode } from "react";
import Image from "next/image";

interface AuthSplitPanelProps {
  imageSrc: string;
  imageAlt: string;
  overlayTitle: string;
  overlaySubtitle: string;
  children: ReactNode;
}

export function AuthSplitPanel({
  imageSrc,
  imageAlt,
  overlayTitle,
  overlaySubtitle,
  children,
}: AuthSplitPanelProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Left image panel — hidden on mobile */}
      {!isMobile && (
        <div
          style={{
            position: "relative",
            width: "45%",
            minWidth: "400px",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={imageAlt}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(160deg, rgba(8,26,47,0.5) 0%, rgba(8,26,47,0.82) 100%)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "2.5rem",
            }}
          >
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <div
                style={{
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "0.5rem",
                  backgroundColor: "#00b8d9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.875rem" }}>A</span>
              </div>
              <span
                style={{
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "1rem",
                  letterSpacing: "-0.01em",
                }}
              >
                AutoIQ UAE
              </span>
            </div>

            {/* Bottom trust block */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1.25rem",
                }}
              >
                <div style={{ display: "flex" }}>
                  {[
                    "/images/testimonials/avatar-1.jpg",
                    "/images/testimonials/avatar-2.jpg",
                    "/images/testimonials/avatar-3.jpg",
                  ].map((src, i) => (
                    <div
                      key={src}
                      style={{
                        position: "relative",
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: "2px solid rgba(255,255,255,0.5)",
                        marginInlineStart: i === 0 ? 0 : "-0.5rem",
                        flexShrink: 0,
                      }}
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="32px"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  ))}
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#fff",
                    backgroundColor: "rgba(0,184,217,0.2)",
                    border: "1px solid rgba(0,184,217,0.4)",
                    borderRadius: "9999px",
                    padding: "0.25rem 0.75rem",
                  }}
                >
                  +15k Users
                </span>
              </div>

              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#fff",
                  margin: "0 0 0.75rem",
                  lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                }}
              >
                {overlayTitle}
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "rgba(255,255,255,0.62)",
                  margin: 0,
                  lineHeight: 1.65,
                }}
              >
                {overlaySubtitle}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form panel — full width on mobile, 55% on desktop */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? "2.5rem 1.25rem" : "3rem 2.5rem",
          background: "#ffffff",
          overflowY: "auto",
          minHeight: "100vh",
        }}
      >
        <div style={{ width: "100%", maxWidth: "26rem" }}>{children}</div>
      </div>
    </div>
  );
}
