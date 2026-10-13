import type { ReactNode } from "react";
import type { ColumnKind } from "../types";

/** A short label drawn as the glyph, for kinds monday.com marks with characters (Numbers, Formula). */
function TextMark({ value, font_size, is_italic = false }: { value: string; font_size: number; is_italic?: boolean }) {
  return (
    <text
      x="8"
      y="8"
      dominantBaseline="central"
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
      fontSize={font_size}
      fontWeight={700}
      fontStyle={is_italic ? "italic" : undefined}
      fontFamily="inherit"
      letterSpacing={is_italic ? 0 : -0.3}
    >
      {value}
    </text>
  );
}

/**
 * White outline glyphs drawn on a 16px grid, one per column kind, in the
 * spirit of monday.com's column type icons. The colored chip behind them
 * comes from the type's `accent` (see `COLUMN_TYPE_GALLERY`).
 */
/** A kind, or a preset drawn with its own glyph (Priority is a Status column with priority labels). */
export type ColumnGlyphId = ColumnKind | "priority";

const GLYPHS: Record<ColumnGlyphId, ReactNode> = {
  status: (
    <>
      <rect x="3" y="3" width="10" height="10" rx="1.5" />
      <path d="M5.5 6h5M5.5 8h5M5.5 10h5" />
    </>
  ),
  dropdown: (
    <>
      <rect x="2.5" y="5" width="11" height="6" rx="1.5" />
      <path d="M9.5 7.3 10.75 8.6 12 7.3" />
    </>
  ),
  text: <path d="M4 4h8M8 4v8.5" strokeWidth="1.8" />,
  date: (
    <>
      <rect x="3" y="3.75" width="10" height="9" rx="1.5" />
      <path d="M3 6.75h10M5.75 2.5v2.25M10.25 2.5v2.25" />
    </>
  ),
  people: (
    <>
      <circle cx="8" cy="5.75" r="2.25" />
      <path d="M3.75 12.75c.5-2.25 2.25-3.5 4.25-3.5s3.75 1.25 4.25 3.5" />
    </>
  ),
  number: <TextMark value="123" font_size={8.5} />,
  files: (
    <>
      <path d="M4.5 2.75h4.75l2.25 2.25v8.25h-7z" />
      <path d="M9 2.75v2.5h2.5" />
    </>
  ),
  timeline: <path d="M3.5 4.5h5M5.5 8h7M3.5 11.5h6" strokeWidth="1.8" />,
  tags: (
    <>
      <path d="M2.75 3.5v4l5 5 4.75-4.75-5-5h-4z" />
      <circle cx="5.5" cy="6" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  checkbox: (
    <>
      <rect x="3" y="3" width="10" height="10" rx="1.5" />
      <path d="M5.5 8.1 7.2 9.75 10.5 6.4" />
    </>
  ),
  connect_board: (
    <>
      <rect x="2.5" y="3" width="5" height="5" rx="1" />
      <rect x="8.5" y="8" width="5" height="5" rx="1" />
      <path d="M7.5 5.5h1.75a1.25 1.25 0 0 1 1.25 1.25V8" />
    </>
  ),
  formula: <TextMark value="fx" font_size={11} is_italic />,
  link: (
    <>
      <path d="M7 9a2.5 2.5 0 0 0 3.55 0l1.95-1.95a2.5 2.5 0 0 0-3.55-3.55l-.7.7" />
      <path d="M9 7a2.5 2.5 0 0 0-3.55 0L3.5 8.95a2.5 2.5 0 0 0 3.55 3.55l.7-.7" />
    </>
  ),
  mirror: (
    <>
      <rect x="2.75" y="2.75" width="7" height="7" rx="1.25" />
      <path d="M6.25 13.25h5.5a1.5 1.5 0 0 0 1.5-1.5v-5.5" />
    </>
  ),
  label: (
    <>
      <rect x="2.5" y="4.75" width="11" height="6.5" rx="3.25" />
      <path d="M6 8h4" />
    </>
  ),
  progress: (
    <>
      <rect x="2.5" y="5.5" width="11" height="5" rx="2.5" />
      <path d="M5 8h3.5" strokeWidth="2.2" />
    </>
  ),
  longtext: <path d="M3.5 4.5h9M3.5 7h9M3.5 9.5h9M3.5 12h5.5" />,
  phone: (
    <path d="M5.4 2.9 6.6 5.5 5.4 6.6c.6 1.5 2.5 3.4 4 4l1.1-1.2 2.6 1.2-.4 2c-.1.5-.5.8-1 .8C6.9 13.2 2.8 9.1 2.6 4.3c0-.5.3-.9.8-1z" />
  ),
  email: (
    <>
      <rect x="2.5" y="4" width="11" height="8" rx="1.5" />
      <path d="M3 4.75 8 8.5l5-3.75" />
    </>
  ),
  rating: <path d="m8 2.75 1.6 3.3 3.6.5-2.6 2.5.65 3.6L8 10.95l-3.25 1.7.65-3.6-2.6-2.5 3.6-.5z" />,
  vote: (
    <>
      <path d="M5 7v6H3V7z" />
      <path d="M5 12.5h5.9c.6 0 1.1-.4 1.25-1l.85-3.4c.2-.8-.4-1.6-1.25-1.6H9.5l.45-2.2c.15-.75-.4-1.55-1.2-1.55L5 7" />
    </>
  ),
  time_tracking: (
    <>
      <circle cx="8" cy="8.75" r="4.75" />
      <path d="M8 6.25v2.5l1.75 1.25M6.5 2.5h3" />
    </>
  ),
  auto_number: <path d="M6.25 3 5 13M11 3 9.75 13M3.25 6h10M2.75 10h10" />,
  dependency: (
    <>
      <circle cx="4.25" cy="4.75" r="1.75" />
      <circle cx="11.75" cy="11.25" r="1.75" />
      <path d="M6 4.75h2.75a1.5 1.5 0 0 1 1.5 1.5v3.25M8.75 8.25l1.5 1.5 1.5-1.5" />
    </>
  ),
  checklist: (
    <>
      <path d="M2.75 4.5l1 1 1.75-1.9M2.75 9.5l1 1 1.75-1.9" />
      <path d="M7.5 4.75h5.75M7.5 9.75h5.75" />
    </>
  ),
  button: (
    <>
      <rect x="2.5" y="4.5" width="11" height="7" rx="2" />
      <path d="M7 6.5v3l2.5-1.5z" fill="currentColor" />
    </>
  ),
  priority: (
    <>
      <path d="M8 2.75 13.25 12.5H2.75z" />
      <path d="M5.4 9.5h5.2M6.7 6.6h2.6" />
    </>
  ),
  doc: (
    <>
      <path d="M4.25 2.75h5l2.5 2.5v8h-7.5z" />
      <path d="M6.25 8h3.5M6.25 10.5h3.5" />
    </>
  ),
  world_clock: (
    <>
      <circle cx="8" cy="8" r="5.25" />
      <path d="M2.75 8h10.5M8 2.75c-1.75 1.5-2.5 3.25-2.5 5.25s.75 3.75 2.5 5.25c1.75-1.5 2.5-3.25 2.5-5.25S9.75 4.25 8 2.75z" />
    </>
  ),
  location: (
    <>
      <path d="M8 13.5s4-3.6 4-7a4 4 0 0 0-8 0c0 3.4 4 7 4 7z" />
      <circle cx="8" cy="6.5" r="1.4" />
    </>
  ),
  creation_log: (
    <>
      <circle cx="6.5" cy="5.75" r="2.25" />
      <path d="M2.5 12.75c.45-2.1 2-3.4 4-3.4 1 0 1.9.3 2.6.85M11.75 8.75v4M9.75 10.75h4" />
    </>
  ),
  last_updated: (
    <>
      <path d="M3.4 9.25A4.75 4.75 0 1 0 4.5 4.6" />
      <path d="M3.25 2.75v2.5h2.5M8 5.75V8.5l1.75 1.25" />
    </>
  ),
  item_number: (
    <>
      <path d="M3 3.75 4 3.25v3.5M3 6.75h2" />
      <path d="M3 9.6c.3-.55 1.75-.6 1.75.3 0 .7-1.75 1.35-1.75 2.6h1.85" />
      <path d="M7.5 5h5.5M7.5 11h5.5" />
    </>
  ),
  week: (
    <>
      <rect x="3" y="3.75" width="10" height="9" rx="1.5" />
      <path d="M3 6.75h10M5.75 2.5v2.25M10.25 2.5v2.25" />
      <path d="M5.25 8.5l.8 2.75.95-2.25.95 2.25.8-2.75" strokeWidth="1.2" transform="translate(.5 0)" />
    </>
  ),
  country: (
    <>
      <path d="M4 13.25V3" />
      <path d="M4 3.5c2.75-1.4 4.75 1.4 8 0v5.75c-3.25 1.4-5.25-1.4-8 0" />
    </>
  ),
  color_picker: (
    <>
      <path d="M8 2.75a5.25 5.25 0 0 0 0 10.5c.9 0 1.25-.6 1.25-1.15 0-.75-.6-1-.6-1.75 0-.6.5-1.1 1.1-1.1h1.25a2.25 2.25 0 0 0 2.25-2.25c0-2.35-2.35-4.25-5.25-4.25z" />
      <circle cx="5.5" cy="7" r=".8" fill="currentColor" stroke="none" />
      <circle cx="8" cy="5.25" r=".8" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="6.5" r=".8" fill="currentColor" stroke="none" />
    </>
  ),
  hour: (
    <>
      <circle cx="8" cy="8" r="5.25" />
      <path d="M8 5v3.25l2.25 1.25" />
    </>
  ),
  progress_tracking: (
    <>
      <rect x="2.25" y="5" width="10.5" height="6" rx="1.5" />
      <path d="M14 7v2" />
      <path d="M4.5 8h4" strokeWidth="2.4" />
    </>
  ),
};

interface ColumnTypeIconProps {
  kind: ColumnKind;
  /** Draws another glyph than the kind's own, for presets like Priority. */
  glyph?: ColumnGlyphId;
  accent: string;
  /** Chip size in pixels, 20 by default like monday.com's pickers. */
  size?: number;
  className?: string;
}

/** Colored rounded square with the column kind's glyph, shared by every column type list. */
export default function ColumnTypeIcon({ kind, glyph, accent, size = 20, className = "" }: ColumnTypeIconProps) {
  return (
    <span
      aria-hidden="true"
      className={`column-type-icon inline-flex flex-none items-center justify-center rounded-[4px] text-white ${className}`}
      style={{ width: size, height: size, background: accent }}
    >
      <svg
        viewBox="0 0 16 16"
        width={Math.round(size * 0.7)}
        height={Math.round(size * 0.7)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {GLYPHS[glyph ?? kind]}
      </svg>
    </span>
  );
}
