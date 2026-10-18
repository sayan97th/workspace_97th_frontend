import React from "react";
import type { IconProps } from "@/icons/workspace-icons";

/*
 * Outline icons for the board table's group "..." menu that have no shared
 * counterpart in `@/icons/workspace-icons` or `./row-menu-icons`, drawn on
 * the same 16px grid and 1.3 stroke as monday.com's own group menu.
 */

/** "Collapse this group": a circle with two chevrons pointing at its center. */
export const CollapseGroupIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5.7" stroke="currentColor" strokeWidth="1.3" />
    <path d="M6 4.9 L8 6.7 L10 4.9 M6 11.1 L8 9.3 L10 11.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** "Expand this group": the same circle with the chevrons pointing out. */
export const ExpandGroupIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5.7" stroke="currentColor" strokeWidth="1.3" />
    <path d="M6 6.4 L8 4.6 L10 6.4 M6 9.6 L8 11.4 L10 9.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** "Collapse all groups": two chevrons closing in on each other. */
export const CollapseAllIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M5 2.5 L8 5.5 L11 2.5 M5 13.5 L8 10.5 L11 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** "Expand all groups": two chevrons moving apart. */
export const ExpandAllIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M5 5.5 L8 2.5 L11 5.5 M5 10.5 L8 13.5 L11 10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** "Select all items in group": a rounded checkbox with a check mark. */
export const SelectAllIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5.3 8.2 L7.2 10 L10.8 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** "Expand all subitems" and "Collapse all subitems": a parent box with a branch into a child box. */
export const SubitemsTreeIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2.5" y="2.2" width="5.4" height="3.6" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4.6 5.8 V10.6 A1 1 0 0 0 5.6 11.6 H8.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <rect x="8.6" y="9.8" width="4.9" height="3.6" rx="1" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

/** "Add group": a circled plus. */
export const AddGroupIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5.7" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 5.4 V10.6 M5.4 8 H10.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

/** "Rename group": a pencil. */
export const PencilIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2.8 13.2 L3.4 10.6 L10.6 3.4 A1.5 1.5 0 0 1 12.7 5.5 L5.5 12.7 Z M9.4 4.6 L11.5 6.7"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** "Change group color": a tilted paint bucket with a drop. */
export const PaintBucketIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M6.3 2.5 L11.8 8 L7.6 12.2 A1 1 0 0 1 6.2 12.2 L2.6 8.6 A1 1 0 0 1 2.6 7.2 Z M3 8 H11.4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M13.3 10.2 C13.3 10.2 14.3 11.5 14.3 12.2 A1 1 0 0 1 12.3 12.2 C12.3 11.5 13.3 10.2 13.3 10.2 Z" fill="currentColor" />
  </svg>
);

/** "Export to Excel": a spreadsheet sheet with an X badge. */
export const ExcelIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M6.5 2.5 H12.5 A1 1 0 0 1 13.5 3.5 V12.5 A1 1 0 0 1 12.5 13.5 H6.5 M9.5 5.5 H11.5 M9.5 8 H11.5 M9.5 10.5 H11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <rect x="2.5" y="4.5" width="5.5" height="7" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4.3 6.6 L6.2 9.4 M6.2 6.6 L4.3 9.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

/** "Move to top" and "Move to bottom": an arrow ending on a bar. Pass `className` with a rotation for the bottom variant. */
export const MoveToEdgeIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3.5 2.8 H12.5 M8 13.2 V5.8 M5 8.6 L8 5.6 L11 8.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
