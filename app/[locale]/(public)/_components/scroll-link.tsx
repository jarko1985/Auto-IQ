"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

// Height of the sticky site header plus a little breathing room — without
// this, scrolling to a section lands with its top hidden underneath the
// fixed header instead of at the section's actual start.
const HEADER_SCROLL_OFFSET = 88;

interface ScrollLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  targetId: string;
  children: ReactNode;
}

/** Same-page anchor link that smooth-scrolls to #targetId with the sticky
 * header's height subtracted, instead of relying on the browser's native
 * (non-smooth, offset-unaware) hash jump. */
export function ScrollLink({ targetId, children, onClick, ...rest }: ScrollLinkProps) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - HEADER_SCROLL_OFFSET;
      window.scrollTo({ top, behavior: "smooth" });
      window.history.pushState(null, "", `#${targetId}`);
    }
    onClick?.(e);
  }

  return (
    <a href={`#${targetId}`} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
