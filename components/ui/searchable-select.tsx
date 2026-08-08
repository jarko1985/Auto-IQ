"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SharedProps {
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  className?: string;
}

type SearchableSelectProps =
  | (SharedProps & {
      multiple: true;
      value: string[];
      onChange: (value: string[]) => void;
    })
  | (SharedProps & {
      multiple?: false;
      value: string;
      onChange: (value: string) => void;
      /** Label for the "no filter" option, e.g. "All Statuses". Omit to hide it. */
      allLabel?: string;
    });

/** Trigger-button + searchable dropdown list, built on the same Popover/
 * Command primitives as GlobalSearch/DropdownMenu — this app's mobile
 * replacement for a row of filter "pills" that doesn't fit a phone-width
 * viewport (see CLAUDE.md's marketplace/garage-search notes). Supports both
 * a single choice (radio-style, e.g. order status) and multiple choices
 * (checkbox-style, e.g. garage service types) via the `multiple` flag. */
export function SearchableSelect(props: SearchableSelectProps) {
  const { options, placeholder, searchPlaceholder = "Search...", className } = props;
  const [open, setOpen] = useState(false);

  const selectedValues = props.multiple ? props.value : props.value ? [props.value] : [];
  const selectedLabels = options
    .filter((o) => selectedValues.includes(o.value))
    .map((o) => o.label);

  const triggerLabel = props.multiple
    ? selectedValues.length === 0
      ? placeholder
      : selectedValues.length === 1
        ? selectedLabels[0]
        : `${selectedValues.length} selected`
    : (selectedLabels[0] ?? placeholder);

  function toggle(value: string) {
    if (props.multiple) {
      const next = props.value.includes(value)
        ? props.value.filter((v) => v !== value)
        : [...props.value, value];
      props.onChange(next);
    } else {
      props.onChange(props.value === value ? "" : value);
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-[0.8125rem]",
            className,
          )}
          style={{
            borderColor: "var(--border)",
            backgroundColor: "#fff",
            color: selectedValues.length > 0 ? "#081a2f" : "#8a92a6",
          }}
        >
          <span className="truncate">{triggerLabel}</span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexShrink: 0 }}>
            {selectedValues.length > 0 && (
              <X
                size={14}
                color="#8a92a6"
                onClick={(e) => {
                  e.stopPropagation();
                  props.multiple ? props.onChange([]) : props.onChange("");
                }}
              />
            )}
            <ChevronDown size={14} color="#8a92a6" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="min-w-[240px] p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList style={{ maxHeight: "16rem" }}>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {!props.multiple && (
                <CommandItem
                  value={props.allLabel ?? placeholder}
                  onSelect={() => {
                    props.onChange("");
                    setOpen(false);
                  }}
                >
                  <Check
                    size={15}
                    className={cn("me-2", props.value === "" ? "opacity-100" : "opacity-0")}
                  />
                  {props.allLabel ?? placeholder}
                </CommandItem>
              )}
              {options.map((option) => {
                const selected = selectedValues.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggle(option.value)}
                  >
                    {props.multiple ? (
                      <span
                        style={{
                          width: "1rem",
                          height: "1rem",
                          borderRadius: "0.25rem",
                          border: `1px solid ${selected ? "#00b8d9" : "var(--border)"}`,
                          backgroundColor: selected ? "#00b8d9" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginInlineEnd: "0.5rem",
                          flexShrink: 0,
                        }}
                      >
                        {selected && <Check size={11} color="#fff" />}
                      </span>
                    ) : (
                      <Check
                        size={15}
                        className={cn("me-2", selected ? "opacity-100" : "opacity-0")}
                      />
                    )}
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
