"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { InlineSpinner } from "@/components/ui/inline-spinner";

export interface LiveResultItem {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  meta?: string;
}

interface Props {
  items: LiveResultItem[];
  loading: boolean;
  query: string;
  onSelect: () => void;
  fallbackIcon: ReactNode;
}

/** Type-ahead results panel shared by the marketplace and garage search
 * inputs — positioned absolutely by the caller's `position: relative`
 * wrapper (the same box the search icon already anchors to). Mirrors
 * GlobalSearch's result-row shape (thumbnail + title + subtitle) but as an
 * inline dropdown under a page search field rather than a ⌘K modal, since
 * these two live below a full results grid that keeps updating alongside it
 * rather than being the only search surface on the page. */
export function LiveResultsDropdown({ items, loading, query, onSelect, fallbackIcon }: Props) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 0.375rem)",
        insetInlineStart: 0,
        insetInlineEnd: 0,
        maxHeight: "22rem",
        overflowY: "auto",
        backgroundColor: "#fff",
        border: "1px solid var(--border)",
        borderRadius: "0.75rem",
        boxShadow: "0 16px 40px rgba(8,26,47,0.14)",
        zIndex: 30,
      }}
    >
      {loading && items.length === 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "1rem",
            fontSize: "0.8125rem",
            color: "#8a92a6",
          }}
        >
          <InlineSpinner size={14} /> Searching...
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: "1rem", fontSize: "0.8125rem", color: "#8a92a6" }}>
          No results for &quot;{trimmed}&quot;
        </div>
      ) : (
        items.map((item) => (
          <Link
            key={item.id}
            href={item.href as never}
            // Fires before the input's onBlur closes the dropdown.
            onMouseDown={(e) => e.preventDefault()}
            onClick={onSelect}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.625rem 0.875rem",
              textDecoration: "none",
              color: "inherit",
              borderBottom: "1px solid #f1f4f7",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "0.5rem",
                backgroundColor: "#f7fafd",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt="" fill sizes="40px" style={{ objectFit: "cover" }} />
              ) : (
                fallbackIcon
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "#081a2f",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#8a92a6",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.subtitle}
              </div>
            </div>
            {item.meta && (
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#081a2f", flexShrink: 0 }}>
                {item.meta}
              </div>
            )}
          </Link>
        ))
      )}
    </div>
  );
}
