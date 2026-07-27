"use client";

import { useRef } from "react";

const LENGTH = 6;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

/** 6-digit code entry — auto-advance/backspace/paste. Used by the sign-up wizard's
 * verify-code step; reusable for any future email/phone OTP UI. */
export function OtpInput({ value, onChange, disabled, hasError, autoFocus }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(LENGTH, " ").split("").slice(0, LENGTH);

  function setDigit(index: number, char: string) {
    const next = digits.slice();
    next[index] = char;
    onChange(next.join("").trimEnd());
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) {
      setDigit(index, " ");
      return;
    }
    setDigit(index, digit);
    if (index < LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index]?.trim() && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setDigit(index - 1, " ");
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  return (
    <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center" }}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit.trim()}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${index + 1}`}
          style={{
            width: "3rem",
            height: "3.25rem",
            textAlign: "center",
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#181c1e",
            border: hasError ? "1.5px solid #ba1a1a" : "1px solid #c4c6cd",
            borderRadius: "0.75rem",
            outline: "none",
            backgroundColor: disabled ? "#f1f4f7" : "#fff",
            boxSizing: "border-box",
          }}
        />
      ))}
    </div>
  );
}
