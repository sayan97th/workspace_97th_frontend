import React from "react";
import type { IconProps } from "@/icons/workspace-icons";

/** monday.com's "add update" glyph: a round speech bubble with a plus inside. */
export const UpdateBubbleIcon: React.FC<IconProps & { with_plus?: boolean }> = ({ className, size = 20, with_plus = true }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M10 3.2c3.9 0 6.8 2.7 6.8 6.1s-2.9 6.1-6.8 6.1c-.8 0-1.6-.1-2.3-.3L4 16.6l.9-3.1C3.8 12.4 3.2 10.9 3.2 9.3 3.2 5.9 6.1 3.2 10 3.2Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    {with_plus && <path d="M10 6.6v5.4M7.3 9.3h5.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />}
  </svg>
);

/** Sort direction arrow next to the sorted column header. Points up for ascending. */
export const SortArrowIcon: React.FC<IconProps & { direction: "asc" | "desc" }> = ({ className, size = 14, direction }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    style={{ transform: direction === "desc" ? "rotate(180deg)" : undefined }}
  >
    <path d="M8 13V3M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** "Customize" sliders. */
export const SlidersIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M3 5.5h8M15 5.5h2M3 10h2M9 10h8M3 14.5h6M13 14.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="13" cy="5.5" r="1.8" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="7" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="11" cy="14.5" r="1.8" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

/** Section caret, a plain chevron that points right when the section is folded. */
export const SectionChevronIcon: React.FC<IconProps & { is_open: boolean }> = ({ className, size = 18, is_open }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
    style={{ transform: is_open ? "rotate(90deg)" : undefined, transition: "transform 150ms ease" }}
  >
    <path d="M8 5l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
