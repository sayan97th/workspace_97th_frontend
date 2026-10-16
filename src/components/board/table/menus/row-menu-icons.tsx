import React from "react";
import type { IconProps } from "@/icons/workspace-icons";

/*
 * Outline icons for the board table's row "..." menu that have no shared
 * counterpart in `@/icons/workspace-icons`, drawn on the same 16px grid and
 * 1.3 stroke as monday.com's own row menu.
 */

/** "Open item": two diagonal arrows pointing out, the expand glyph monday shows on the row. */
export const OpenItemIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M9.5 2.5 H13.5 V6.5 M13.5 2.5 L9.2 6.8 M6.5 13.5 H2.5 V9.5 M2.5 13.5 L6.8 9.2"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** "Open in new tab": a window with a plus badge in its corner. */
export const NewTabIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M13.5 8 V3.8 A1.3 1.3 0 0 0 12.2 2.5 H3.8 A1.3 1.3 0 0 0 2.5 3.8 V12.2 A1.3 1.3 0 0 0 3.8 13.5 H8 M2.5 5.5 H13.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    <path d="M12 10 V14 M10 12 H14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

/** "Add subitem": an L shaped branch ending in a small item box. */
export const AddSubitemIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2.5" y="2.2" width="6" height="3.6" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5 5.8 V10.6 A1 1 0 0 0 6 11.6 H8.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <rect x="8.6" y="9.8" width="5" height="3.6" rx="1" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

/** "Convert to subitem": a line bending down and right into an arrow. */
export const ConvertToSubitemIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M3.5 2.5 V8.5 A2 2 0 0 0 5.5 10.5 H12.5 M10 8 L12.5 10.5 L10 13"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** "Convert to item": the subitem arrow pointing back up. */
export const ConvertToItemIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M12.5 13.5 V7.5 A2 2 0 0 0 10.5 5.5 H3.5 M6 3 L3.5 5.5 L6 8"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** "Apps": a puzzle piece. */
export const AppsPuzzleIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M3 5 H5.6 A1.6 1.6 0 1 1 8.8 5 H11.4 V7.6 A1.6 1.6 0 1 1 11.4 10.8 V13.4 H8.8 A1.6 1.6 0 1 0 5.6 13.4 H3 V10.8 A1.6 1.6 0 1 0 3 7.6 Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

/** "Set recurring": two arrows chasing each other around a circle. */
export const RecurringIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M3 8 A5 5 0 0 1 11.5 4.5 M13 2.8 V5.6 H10.2 M13 8 A5 5 0 0 1 4.5 11.5 M3 13.2 V10.4 H5.8"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** "Automations" inside the Apps submenu: a lightning bolt. */
export const AutomationBoltIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M9 1.8 L3.6 9 H7.6 L7 14.2 L12.4 7 H8.4 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

/** "Integrations" inside the Apps submenu: a plug. */
export const IntegrationPlugIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M5.6 1.8 V4.6 M10.4 1.8 V4.6 M3.4 4.6 H12.6 V7.2 A4.6 4.6 0 0 1 3.4 7.2 Z M8 11.8 V14.2"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
