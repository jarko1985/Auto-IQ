"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Share2, Copy, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { InlineSpinner } from "@/components/ui/inline-spinner";

interface Props {
  sessionId: string;
}

interface ShareLinkState {
  token: string;
  expiresAt: string;
}

/** Generates (or reuses) a public, token-based read-only link for this
 * session's result — anyone with the link can view it without signing in
 * (see features/diagnostics/service.ts's getOrCreateShareLink). Tries the
 * native Web Share API first so the OS share sheet gets the real public URL
 * directly; falls back to copying the link to the clipboard when
 * navigator.share is unavailable — same graceful-degradation posture as
 * every other browser-capability integration in this codebase. */
export function ShareResultsButton({ sessionId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<ShareLinkState | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const shareUrl = link ? `${window.location.origin}/shared/diagnostics/${link.token}` : null;

  const ensureLink = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/diagnostics/sessions/${sessionId}/share`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        data?: { token: string; expiresAt: string };
        error?: { message?: string };
      };
      if (!res.ok || !json.data) {
        toast.error(json.error?.message ?? "Failed to create share link.");
        return null;
      }
      setLink(json.data);
      return `${window.location.origin}/shared/diagnostics/${json.data.token}`;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  async function handleClick() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);

    // Prefer the native share sheet when available — shares the real public
    // URL directly rather than just opening our own popover.
    if (typeof navigator !== "undefined" && "share" in navigator) {
      const url = await ensureLink();
      if (!url) return;
      try {
        await navigator.share({ title: "AutoIQ Diagnostic Report", url });
        setOpen(false);
        return;
      } catch {
        // User cancelled the native share sheet, or it's unsupported at
        // runtime despite feature-detecting — fall through to the popover.
      }
    } else {
      void ensureLink();
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRevoke() {
    setRevoking(true);
    try {
      const res = await fetch(`/api/v1/diagnostics/sessions/${sessionId}/share`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        toast.error(json.error?.message ?? "Failed to revoke link.");
        return;
      }
      setLink(null);
      toast.success("Share link revoked.");
      setOpen(false);
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }} className="no-print">
      <button
        type="button"
        onClick={() => void handleClick()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          borderRadius: "0.625rem",
          border: "none",
          backgroundColor: "#00b8d9",
          color: "#fff",
          fontSize: "0.8125rem",
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <Share2 size={14} /> Share Results
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            insetInlineEnd: 0,
            top: "calc(100% + 0.5rem)",
            width: "320px",
            backgroundColor: "#fff",
            border: "1px solid #ebeef1",
            borderRadius: "0.875rem",
            boxShadow: "0 8px 24px rgba(8,26,47,0.14)",
            padding: "1rem",
            zIndex: 30,
          }}
        >
          <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#081a2f", margin: "0 0 0.375rem" }}>
            Shareable report link
          </p>
          <p style={{ fontSize: "0.75rem", color: "#74777d", margin: "0 0 0.75rem", lineHeight: 1.5 }}>
            Anyone with this link can view a read-only copy of this report — no sign-in required.
          </p>

          {loading && !link ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0" }}>
              <InlineSpinner />
              <span style={{ fontSize: "0.8125rem", color: "#74777d" }}>Generating link…</span>
            </div>
          ) : link && shareUrl ? (
            <>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.625rem" }}>
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "0.4375rem 0.625rem",
                    border: "1px solid #ebeef1",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                    color: "#44474d",
                    backgroundColor: "#f7fafd",
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  aria-label="Copy link"
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "2.125rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #ebeef1",
                    backgroundColor: copied ? "#dcfce7" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} color="#5b6472" />}
                </button>
              </div>
              <p style={{ fontSize: "0.6875rem", color: "#a1a5ab", margin: "0 0 0.75rem" }}>
                Expires {new Date(link.expiresAt).toLocaleDateString("en-AE", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <button
                type="button"
                onClick={() => void handleRevoke()}
                disabled={revoking}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#dc2626",
                  background: "none",
                  border: "none",
                  cursor: revoking ? "not-allowed" : "pointer",
                  padding: 0,
                }}
              >
                <Trash2 size={12} /> {revoking ? "Revoking…" : "Revoke link"}
              </button>
            </>
          ) : (
            <p style={{ fontSize: "0.8125rem", color: "#dc2626", margin: 0 }}>
              Something went wrong generating the link.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
