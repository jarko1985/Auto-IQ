"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "@/i18n/routing";
import { ScrollLink } from "./scroll-link";

const NAV_ITEMS = [
  { targetId: "how-it-works", label: "How it Works" },
  { targetId: "diagnostics", label: "AI Diagnostics" },
  { targetId: "garages", label: "Verified Garages" },
];

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);

  // Lock background scroll while the drawer is open, and let Escape close it.
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <header
      style={{
        backgroundColor: "#fff",
        borderBottom: "1px solid #c4c6cd",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-10">
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "0.5rem",
              backgroundColor: "#081a2f",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#00b8d9", fontWeight: 700, fontSize: "0.875rem" }}>A</span>
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: "1.0625rem",
              color: "#081a2f",
              letterSpacing: "-0.01em",
            }}
          >
            AutoIQ UAE
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map(({ targetId, label }) => (
            <ScrollLink
              key={targetId}
              targetId={targetId}
              className="text-sm font-medium text-[#44474d] no-underline transition-colors duration-200 hover:text-[#00b8d9]"
            >
              {label}
            </ScrollLink>
          ))}
        </nav>

        {/* Desktop auth actions */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/sign-in"
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#081a2f",
              textDecoration: "none",
              padding: "0.5rem 1rem",
            }}
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#fff",
              backgroundColor: "#00b8d9",
              padding: "0.5rem 1.25rem",
              borderRadius: "0.625rem",
              textDecoration: "none",
            }}
          >
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger toggle */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[#081a2f] transition-colors hover:bg-[#f1f4f7] md:hidden"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        aria-hidden
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Slide-in drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`fixed inset-y-0 right-0 z-[70] flex w-[80%] max-w-[320px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#c4c6cd] px-5">
          <span style={{ fontWeight: 700, fontSize: "1rem", color: "#081a2f" }}>Menu</span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#081a2f] transition-colors hover:bg-[#f1f4f7]"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map(({ targetId, label }) => (
            <ScrollLink
              key={targetId}
              targetId={targetId}
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-3 py-3 text-[0.9375rem] font-medium text-[#181c1e] no-underline transition-colors hover:bg-[#f1f4f7]"
            >
              {label}
            </ScrollLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3 border-t border-[#c4c6cd] p-5">
          <Link
            href="/sign-in"
            onClick={() => setIsOpen(false)}
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              textAlign: "center",
              border: "1px solid #c4c6cd",
              borderRadius: "0.75rem",
              padding: "0.75rem",
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "#081a2f",
              textDecoration: "none",
            }}
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            onClick={() => setIsOpen(false)}
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              textAlign: "center",
              backgroundColor: "#00b8d9",
              borderRadius: "0.75rem",
              padding: "0.75rem",
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "#fff",
              textDecoration: "none",
            }}
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
