"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, SearchX, ChevronRight, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GlobalSearchResponse } from "@/features/search/types";
import { CATEGORY_VISUALS, DEFAULT_CATEGORY_VISUAL } from "./category-icons";

const DEBOUNCE_MS = 250;

function KeyHint({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
      <kbd
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "1.25rem",
          height: "1.25rem",
          padding: "0 0.25rem",
          borderRadius: "0.25rem",
          border: "1px solid #e5e8eb",
          backgroundColor: "#fff",
          color: "#75859f",
        }}
      >
        {children}
      </kbd>
      <span style={{ color: "#9aa3af" }}>{label}</span>
    </span>
  );
}

export function GlobalSearch({ fullWidth = false }: { fullWidth?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<GlobalSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const runSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const json = (await res.json()) as { data: GlobalSearchResponse };
        setResult(json.data);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    runSearch(value);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setResult(null);
      setLoading(false);
    }
  }

  function handleSelect(href: string) {
    handleOpenChange(false);
    router.push(href as never);
  }

  const trimmed = query.trim();
  const showEmptyHint = trimmed.length < 2;
  const showNoResults = !showEmptyHint && !loading && (!result || result.categories.length === 0);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          width: fullWidth ? "100%" : "16rem",
          height: "2.25rem",
          padding: "0 0.875rem",
          borderRadius: "9999px",
          border: "1px solid #e5e8eb",
          backgroundColor: "#f7fafd",
          color: "#75859f",
          cursor: "pointer",
          fontSize: "0.8125rem",
        }}
      >
        <Search size={16} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: "start" }}>Search AutoIQ</span>
        <kbd
          style={{
            flexShrink: 0,
            fontSize: "0.6875rem",
            padding: "0.0625rem 0.375rem",
            borderRadius: "0.25rem",
            border: "1px solid #e5e8eb",
            backgroundColor: "#fff",
            color: "#9aa3af",
          }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Explicit inline width/height on DialogContent — this repo's shadcn/
       * Tailwind v4 setup has a known issue where class-driven sizing (e.g.
       * sm:max-w-lg) can collapse in some contexts (see CLAUDE.md's
       * Card/@container note); inline style always wins the cascade
       * regardless of that quirk. */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="overflow-hidden p-0"
          style={{
            width: "calc(100vw - 2rem)",
            maxWidth: "38rem",
            top: "12%",
            translate: "-50% 0",
            borderRadius: "1rem",
            boxShadow: "0 24px 60px rgba(8,26,47,0.25)",
          }}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Search AutoIQ</DialogTitle>
            <DialogDescription>Search your vehicles, bookings, orders, and more</DialogDescription>
          </DialogHeader>

          <Command style={{ width: "100%" }} shouldFilter={false}>
            <div style={{ position: "relative" }}>
              <CommandInput
                placeholder="Search vehicles, bookings, orders, repair orders..."
                value={query}
                onValueChange={handleQueryChange}
              />
              {loading && (
                <div style={{ position: "absolute", insetInlineEnd: "1.25rem", top: "50%", translate: "0 -50%" }}>
                  <InlineSpinner color="#00b8d9" size={16} />
                </div>
              )}
            </div>

            <CommandList style={{ maxHeight: "24rem", padding: "0.5rem" }}>
              {showEmptyHint && (
                <CommandEmpty>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", padding: "1.5rem 1rem" }}>
                    <div
                      style={{
                        width: "2.75rem",
                        height: "2.75rem",
                        borderRadius: "9999px",
                        backgroundColor: "rgba(0,184,217,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Search size={20} color="#00b8d9" />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ margin: 0, fontWeight: 600, color: "#181c1e" }}>Search AutoIQ</p>
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "#75859f" }}>
                        Type at least 2 characters to find your vehicles, bookings, orders, and more.
                      </p>
                    </div>
                  </div>
                </CommandEmpty>
              )}

              {showNoResults && (
                <CommandEmpty>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", padding: "1.5rem 1rem" }}>
                    <div
                      style={{
                        width: "2.75rem",
                        height: "2.75rem",
                        borderRadius: "9999px",
                        backgroundColor: "#f1f4f7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <SearchX size={20} color="#9aa3af" />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ margin: 0, fontWeight: 600, color: "#181c1e" }}>
                        No results for &quot;{trimmed}&quot;
                      </p>
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "#75859f" }}>
                        Try a different spelling or a shorter keyword.
                      </p>
                    </div>
                  </div>
                </CommandEmpty>
              )}

              {result?.categories.map((cat) => {
                const visual = CATEGORY_VISUALS[cat.key] ?? DEFAULT_CATEGORY_VISUAL;
                return (
                  <CommandGroup key={cat.key} heading={cat.label}>
                    {cat.items.map((item) => {
                      const Icon = visual.icon;
                      return (
                        <CommandItem
                          key={`${cat.key}-${item.id}`}
                          value={`${cat.key}-${item.id}-${item.title}`}
                          onSelect={() => handleSelect(item.href)}
                          className="gap-3 rounded-lg py-2.5"
                        >
                          <div
                            style={{
                              width: "2.25rem",
                              height: "2.25rem",
                              borderRadius: "0.5rem",
                              backgroundColor: visual.bg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={16} color={visual.color} />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                            <span style={{ fontWeight: 600, color: "#181c1e" }}>{item.title}</span>
                            {item.subtitle && (
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  color: "#75859f",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.subtitle}
                              </span>
                            )}
                          </div>
                          <ChevronRight size={15} color="#c4c6cd" style={{ flexShrink: 0 }} />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              })}
            </CommandList>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.625rem 1.25rem",
                borderTop: "1px solid #eef1f4",
                backgroundColor: "#f7fafd",
                fontSize: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1.125rem" }}>
                <KeyHint label="Navigate">
                  <span style={{ display: "flex", gap: "0.125rem" }}>
                    <ArrowUp size={11} />
                    <ArrowDown size={11} />
                  </span>
                </KeyHint>
                <KeyHint label="Select">
                  <CornerDownLeft size={11} />
                </KeyHint>
              </div>
              <KeyHint label="Close">esc</KeyHint>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
