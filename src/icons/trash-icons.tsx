import React from "react";

type IconProps = {
  className?: string;
  size?: number;
};

/**
 * Icons specific to the account Trash / Archive dialogs (`@/components/trash`) — the
 * "type" glyph shown per deleted entry (item/subitem/column/group/dashboard/board) plus
 * the restore action glyph. Generic workspace-shell icons live in `@/icons/workspace-icons`;
 * "doc" reuses that module's `FileIcon` rather than duplicating it here.
 */

export const ItemTypeIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3.5" width="12" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
    <line x1="4.4" y1="8" x2="11.6" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const SubitemTypeIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M4 2.5 V9 a1.6 1.6 0 0 0 1.6 1.6 H10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <rect x="10.2" y="8.6" width="3.8" height="3.8" rx="1" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const ColumnTypeIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2.8" width="12" height="10.4" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
    <rect x="6.2" y="2.8" width="3.6" height="10.4" fill="currentColor" opacity="0.35" />
  </svg>
);

export const GroupTypeIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3" width="12" height="3" rx="1.2" fill="currentColor" opacity="0.55" />
    <rect x="2" y="7.4" width="12" height="2.1" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <rect x="2" y="10.9" width="12" height="2.1" rx="1" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export const DashboardTypeIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2.8" width="12" height="10.4" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4.6 10.4 V7.6 M8 10.4 V5.4 M11.4 10.4 V8.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const BoardTypeIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.8" y="1.8" width="5.4" height="5.4" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <rect x="8.8" y="1.8" width="5.4" height="5.4" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <rect x="1.8" y="8.8" width="5.4" height="5.4" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <rect x="8.8" y="8.8" width="5.4" height="5.4" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

/** Circular-arrow "restore" glyph used by the Trash/Archive row menu and bulk-action bar. */
export const RestoreIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M3.2 6.2 A5.4 5.4 0 1 1 3 9.6"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    <path d="M3.2 2.6 V6.2 H6.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
