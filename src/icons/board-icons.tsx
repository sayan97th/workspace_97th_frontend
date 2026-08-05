import React from "react";

type IconProps = {
  className?: string;
  size?: number;
};

/**
 * Board-specific icons for the Client Hub (and future) board views.
 * Generic workspace-shell icons live in `@/icons/workspace-icons`; these are
 * only the extra glyphs the board header, toolbar and rows need.
 */

export const TableViewIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
    <line x1="1.8" y1="6.2" x2="14.2" y2="6.2" stroke="currentColor" strokeWidth="1.3" />
    <line x1="6" y1="6.2" x2="6" y2="13.2" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

/** Three lanes with cards — the "Kanban" board view type. */
export const KanbanViewIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.8" y="2.4" width="12.4" height="11.2" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
    <line x1="5.9" y1="2.4" x2="5.9" y2="13.6" stroke="currentColor" strokeWidth="1.3" />
    <line x1="10" y1="2.4" x2="10" y2="13.6" stroke="currentColor" strokeWidth="1.3" />
    <rect x="2.9" y="4.3" width="2" height="2.4" rx="0.5" fill="currentColor" />
    <rect x="7" y="4.3" width="2" height="4" rx="0.5" fill="currentColor" />
    <rect x="11.1" y="4.3" width="2" height="1.6" rx="0.5" fill="currentColor" />
  </svg>
);

/** Staggered horizontal bars — the "Gantt" board view type. */
export const GanttViewIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3" width="6" height="2.2" rx="0.6" fill="currentColor" />
    <rect x="5.5" y="6.9" width="7" height="2.2" rx="0.6" fill="currentColor" />
    <rect x="3.5" y="10.8" width="8.5" height="2.2" rx="0.6" fill="currentColor" />
  </svg>
);

/** Ring with a rising slice — the "Chart" board view type. */
export const ChartViewIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 8 L8 2.5 A5.5 5.5 0 0 1 12.9 10.3 Z" fill="currentColor" />
  </svg>
);

/** Grid with a marked date — the "Calendar" board view type. */
export const CalendarViewIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.8" y="3.2" width="12.4" height="10.4" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
    <line x1="1.8" y1="6.4" x2="14.2" y2="6.4" stroke="currentColor" strokeWidth="1.3" />
    <line x1="5" y1="1.8" x2="5" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <line x1="11" y1="1.8" x2="11" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <rect x="6.4" y="8.3" width="3.2" height="3" rx="0.6" fill="currentColor" />
  </svg>
);

/** Freeform pen stroke on a frame — the "Canvas" board view type. */
export const CanvasViewIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4 10.5 C 6 6.5, 8 12.5, 10 8.5 S 13 5, 13 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

/** Lines with a checkbox — the "Form" board view type. */
export const FormViewIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.8" y="2.4" width="12.4" height="11.2" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
    <rect x="4" y="5.3" width="2" height="2" rx="0.4" stroke="currentColor" strokeWidth="1.2" />
    <line x1="7.6" y1="6.3" x2="12.2" y2="6.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <rect x="4" y="9.3" width="2" height="2" rx="0.4" stroke="currentColor" strokeWidth="1.2" />
    <line x1="7.6" y1="10.3" x2="12.2" y2="10.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const IntegrateIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M6 8 a3 3 0 0 1 3-3 h2 a3 3 0 0 1 0 6 h-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M10 8 a3 3 0 0 1-3 3 H5 a3 3 0 0 1 0-6 h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const AutomateIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M9 2 L4 9 H8 L7 14 L12 7 H8 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

export const AgentsIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5.4" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="8" cy="8" r="1.6" fill="currentColor" />
  </svg>
);

export const CommentIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2.5 4 A1.5 1.5 0 0 1 4 2.5 H12 A1.5 1.5 0 0 1 13.5 4 V10 A1.5 1.5 0 0 1 12 11.5 H6 L3 14 V11.5 H4 A1.5 1.5 0 0 1 2.5 10 Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

export const LinkIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M6.5 9.5 L9.5 6.5 M7 5 l1.6-1.6 a2.4 2.4 0 0 1 3.4 3.4 L10.4 8.4 M9 11 l-1.6 1.6 a2.4 2.4 0 0 1-3.4-3.4 L5.6 7.6"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

export const CollapseTableIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M4 10 L8 6 L12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const RowChatIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2.5 4 A1.5 1.5 0 0 1 4 2.5 H12 A1.5 1.5 0 0 1 13.5 4 V9.5 A1.5 1.5 0 0 1 12 11 H6 L3.2 13.3 V11 H4 A1.5 1.5 0 0 1 2.5 9.5 Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

export const FilterIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2.5 3.5 H13.5 L9.2 8.4 V12.5 L6.8 13.7 V8.4 Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

export const SortIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <line x1="3.5" y1="4.5" x2="12.5" y2="4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <line x1="3.5" y1="8" x2="10" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <line x1="3.5" y1="11.5" x2="7.5" y2="11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const HideIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M1.5 8 C3 4.8 5.3 3.2 8 3.2 S13 4.8 14.5 8 C13 11.2 10.7 12.8 8 12.8 S3 11.2 1.5 8Z" stroke="currentColor" strokeWidth="1.3" />
    <line x1="3" y1="13" x2="13" y2="3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const PinIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M9.5 1.8 14.2 6.5 M11.2 4.7 8.1 5.5 4.9 8.7 7.3 11.1 10.5 7.9 11.3 4.8 M6.1 9.9 2.6 13.4"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const GroupByIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2.5" y="2.8" width="11" height="3.4" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <rect x="4.5" y="9" width="9" height="3.4" rx="1" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const TuneIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <line x1="3" y1="4" x2="13" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <line x1="3" y1="12" x2="13" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="6.5" cy="4" r="1.4" fill="#152726" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="10" cy="8" r="1.4" fill="#152726" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="5.5" cy="12" r="1.4" fill="#152726" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ className, size = 11 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 12 12" fill="none">
    <path d="M2.5 6.2 5 8.7 9.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ className, size = 13 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const PlusIcon: React.FC<IconProps> = ({ className, size = 13 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/** 6-dot grip used as the drag affordance on reorderable rows (e.g. Sort rules). */
export const DragHandleIcon: React.FC<IconProps> = ({ className, size = 10 }) => (
  <svg className={className} width={size} height={size * 1.6} viewBox="0 0 10 16" fill="currentColor">
    <circle cx="3" cy="4" r="1.1" />
    <circle cx="7" cy="4" r="1.1" />
    <circle cx="3" cy="8" r="1.1" />
    <circle cx="7" cy="8" r="1.1" />
    <circle cx="3" cy="12" r="1.1" />
    <circle cx="7" cy="12" r="1.1" />
  </svg>
);

/** Paint-drop glyph for the "Conditional coloring" overflow-menu entry. */
export const ColorFillIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M8 2.4c2.6 2.9 4.2 4.9 4.2 6.9a4.2 4.2 0 0 1-8.4 0c0-2 1.6-4 4.2-6.9Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

/** Pencil glyph for the (disabled) "Default item values" overflow-menu entry. */
export const EditPencilIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M10.6 2.6 13.4 5.4 5.4 13.4 2.6 13.4 2.6 10.6 10.6 2.6Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

/** Vertical ruler glyph for the "Item height" overflow-menu entry. */
export const ItemHeightIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M8 2.2v11.6 M8 2.2 6 4.4 M8 2.2 10 4.4 M8 13.8 6 11.6 M8 13.8 10 11.6 M2.8 5h1.6 M11.6 5h1.6 M2.8 11h1.6 M11.6 11h1.6"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Ruler + `lines` text-bar glyph identifying a row-height preset (Single/Double/Triple) in the Item height submenu. */
export const RowHeightIcon: React.FC<IconProps & { lines?: 1 | 2 | 3 }> = ({ className, size = 16, lines = 1 }) => {
  const bar_ys = lines === 1 ? [8] : lines === 2 ? [5.5, 10.5] : [4, 8, 12];
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M3 2.4v11.2 M3 2.4 1.6 4 M3 2.4 4.4 4 M3 13.6 1.6 12 M3 13.6 4.4 12"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {bar_ys.map((y) => (
        <line key={y} x1="7" y1={y} x2="14" y2={y} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      ))}
    </svg>
  );
};

export const SortAscendingIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2.5 4.5h8M2.5 8h5.5M2.5 11.5h3M13 3.5v9M13 12.5l-1.8-1.8M13 12.5l1.8-1.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SortDescendingIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2.5 4.5h3M2.5 8h5.5M2.5 11.5h8M13 12.5v-9M13 3.5l-1.8 1.8M13 3.5l1.8 1.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
