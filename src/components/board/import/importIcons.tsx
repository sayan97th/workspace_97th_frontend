import React from "react";
import type { BoardColumnType } from "@/types/board-content";
import ColumnTypeIcon from "../table/menus/ColumnTypeIcon";
import { COLUMN_TYPE_GALLERY, TABLE_KIND_TO_ENGINE_KIND } from "../table/constants";
import type { ColumnKind } from "../table/types";

/** The table kind each API column type is drawn with (the table names Long text `longtext`). */
const ENGINE_TYPE_TO_TABLE_KIND = new Map<BoardColumnType, ColumnKind>(
  (Object.entries(TABLE_KIND_TO_ENGINE_KIND) as [ColumnKind, BoardColumnType][]).map(([kind, type]) => [type, kind])
);

/** Chip color per kind, from the column gallery. Presets (Priority) come after their base kind and never override it. */
const KIND_ACCENTS = new Map<ColumnKind, string>();
for (const entry of COLUMN_TYPE_GALLERY) {
  if (!entry.glyph && !KIND_ACCENTS.has(entry.kind)) KIND_ACCENTS.set(entry.kind, entry.accent);
}

/** The item name's chip, monday.com's yellow "T". */
const ITEM_NAME_ACCENT = "#fdab3d";

/** A column type's colored icon, the same one the board's "+ Add column" gallery shows. */
export function ImportColumnIcon({ type, size = 20 }: { type: BoardColumnType; size?: number }) {
  const kind = ENGINE_TYPE_TO_TABLE_KIND.get(type) ?? "text";
  return <ColumnTypeIcon kind={kind} accent={KIND_ACCENTS.get(kind) ?? "#579bfc"} size={size} />;
}

/** The item name's icon. */
export function ImportItemNameIcon({ size = 20 }: { size?: number }) {
  return <ColumnTypeIcon kind="text" accent={ITEM_NAME_ACCENT} size={size} />;
}

type IconProps = { size?: number; className?: string };

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const InfoIcon = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true" {...strokeProps}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="M8 7.25v3.75M8 5h.01" />
  </svg>
);

export const ChevronDownIcon = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true" {...strokeProps}>
    <path d="M4.5 6.25 8 9.75l3.5-3.5" />
  </svg>
);

export const ChevronLeftIcon = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true" {...strokeProps}>
    <path d="M9.75 4.5 6.25 8l3.5 3.5" />
  </svg>
);

export const CloseIcon = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true" {...strokeProps}>
    <path d="m4 4 8 8M12 4l-8 8" />
  </svg>
);

export const ArrowRightIcon = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true" {...strokeProps}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

export const CheckIcon = ({ size = 12, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true" {...strokeProps} strokeWidth={2.2}>
    <path d="m3.5 8.5 3 3 6-7" />
  </svg>
);

export const CheckCircleIcon = ({ size = 18, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true" {...strokeProps}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="m5.5 8.25 1.75 1.75 3.25-3.75" />
  </svg>
);

export const PlusCircleIcon = ({ size = 18, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true" {...strokeProps}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="M8 5.25v5.5M5.25 8h5.5" />
  </svg>
);

export const XCircleIcon = ({ size = 18, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true" {...strokeProps}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="m6 6 4 4M10 6l-4 4" />
  </svg>
);

export const PlusIcon = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true" {...strokeProps}>
    <path d="M8 3v10M3 8h10" />
  </svg>
);

export const RefreshIcon = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true" {...strokeProps}>
    <path d="M13 8a5 5 0 1 1-1.46-3.54" />
    <path d="M13 3v2.5h-2.5" />
  </svg>
);

export const WarningIcon = ({ size = 14, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true" {...strokeProps}>
    <path d="M8 6.25v3M8 11.5h.01M7.13 2.5 1.6 12a1 1 0 0 0 .87 1.5h11.06a1 1 0 0 0 .87-1.5L8.87 2.5a1 1 0 0 0-1.74 0Z" />
  </svg>
);

export const FeedbackIcon = ({ size = 18, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true" {...strokeProps}>
    <path d="M8 13.5a5.5 5.5 0 1 0-4.83-2.87L2.5 13.5l2.92-.66A5.47 5.47 0 0 0 8 13.5Z" />
    <path d="M5.75 7.25c.25.9 1.1 1.5 2.25 1.5s2-.6 2.25-1.5" />
  </svg>
);

export const ResetIcon = ({ size = 14, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true" {...strokeProps}>
    <path d="M3 8a5 5 0 1 0 1.46-3.54" />
    <path d="M3 3v2.5h2.5" />
  </svg>
);

export const ColumnsIcon = ({ size = 14, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true" {...strokeProps}>
    <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
    <path d="M6.25 3v10M9.75 3v10" />
  </svg>
);

/** A tiny inline spinner. */
export const Spinner = () => <span className="iw-spinner" aria-hidden="true" />;

