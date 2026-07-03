import React from "react";

export type IconProps = {
  className?: string;
  size?: number;
};

/** Shared type for the SVG icon components exported from this module. */
export type IconComponent = React.FC<IconProps>;

export const MoreDotsIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16">
    <circle cx="3" cy="8" r="1.3" fill="currentColor" />
    <circle cx="8" cy="8" r="1.3" fill="currentColor" />
    <circle cx="13" cy="8" r="1.3" fill="currentColor" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="10.7" y1="10.7" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const CollapseSidebarIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M9 3 L4.5 8 L9 13 M13 3 L8.5 8 L13 13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ExpandSidebarIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M7 3 L11.5 8 L7 13 M3 3 L7.5 8 L3 13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PlusIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16">
    <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ className, size = 11 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 12 12" fill="none">
    <path d="M4.5 3 L7.5 6 L4.5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronDownIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 5.5 L8 10.5 L13 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Group-toggle chevron, rotates 90deg when its group is expanded. */
export const GroupToggleIcon: React.FC<IconProps> = ({ className, size = 11 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 12 12" fill="none">
    <path d="M4 2.5 L8 6 L4 9.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const HomeIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M2.5 7.5 L8 2.6 L13.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 7 V13 H12 V7" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

export const FolderIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.6" y="2.6" width="12.8" height="10.8" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <line x1="6" y1="2.6" x2="6" y2="13.4" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

export const FileIcon: React.FC<IconProps> = ({ className, size = 17 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M4 1.5 h6 l2.5 2.5 v10.5 h-8.5 z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M10 1.5 v2.5 h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

export const StarIcon: React.FC<IconProps & { filled?: boolean }> = ({
  className,
  size = 14,
  filled = false,
}) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16">
    <path
      d="M8 1.7 l1.8 3.9 4.3 .5 -3.2 2.9 .9 4.2 -3.8 -2.2 -3.8 2.2 .9 -4.2 -3.2 -2.9 4.3 -.5z"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={filled ? undefined : "1.2"}
      strokeLinejoin="round"
    />
  </svg>
);

export const ChatBubbleIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M2.5 3.5 h11 v7 h-6 l-3 2.5 v-2.5 h-2 z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

export const PersonIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="2.4" stroke="currentColor" strokeWidth="1.3" />
    <path d="M3.5 13 c0-2.6 2-4 4.5-4 s4.5 1.4 4.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
    <path d="M8 4.5 V8 L10.5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ContentTabIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <line x1="6" y1="2.5" x2="6" y2="13.5" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

export const CollaboratorsIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="5.5" r="2.2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M2.5 13 c0-2.4 1.7-3.6 3.5-3.6 s3.5 1.2 3.5 3.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M10.5 4 a2 2 0 0 1 0 3.6 M11 13 c0-1.8-.8-3-2-3.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const PermissionsIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="3.5" y="7" width="9" height="6.5" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5.5 7 V5 a2.5 2.5 0 0 1 5 0 V7" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const OpenInNewTabIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M7 3 H4 A1.5 1.5 0 0 0 2.5 4.5 V12 A1.5 1.5 0 0 0 4 13.5 H11.5 A1.5 1.5 0 0 0 13 12 V9.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    <path d="M9.5 2.5 H13.5 V6.5 M13.5 2.5 L7.8 8.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const RenameIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M10.5 2.4 l3.1 3.1 -8 8 -3.7 .6 .6 -3.7 z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <line x1="9" y1="4" x2="12" y2="7" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const MoveToIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2 4 a1 1 0 0 1 1 -1 h3 l1.5 1.5 h5 a1 1 0 0 1 1 1 v6 a1 1 0 0 1 -1 1 H3 a1 1 0 0 1 -1 -1 z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <path d="M6.5 9.5 H11 M9 7.5 L11 9.5 L9 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const DuplicateIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2.6" y="2.6" width="8" height="8" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5.4 5.4 H13 A1 1 0 0 1 14 6.4 V13 A1 1 0 0 1 13 14 H6.4 A1 1 0 0 1 5.4 13" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const ArchiveIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2.2" y="2.8" width="11.6" height="3.2" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <path d="M3.4 6 V12.5 A1 1 0 0 0 4.4 13.5 H11.6 A1 1 0 0 0 12.6 12.5 V6" stroke="currentColor" strokeWidth="1.3" />
    <line x1="6.4" y1="9" x2="9.6" y2="9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const DeleteIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M3 4.3 H13 M6 4.3 V3.2 A1 1 0 0 1 7 2.2 H9 A1 1 0 0 1 10 3.2 V4.3 M4.5 4.3 L5.1 12.6 A1 1 0 0 0 6.1 13.5 H9.9 A1 1 0 0 0 10.9 12.6 L11.5 4.3"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ className, size = 12 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Indeterminate (partial-selection) dash for a "select all" checkbox. */
export const MinusIcon: React.FC<IconProps> = ({ className, size = 12 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <line x1="4" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const FilterIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2 3.5 H14 L9.5 8.5 V12.5 L6.5 14 V8.5 Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

/** Crown glyph — marks the "Owner" membership tab in the browse modal. */
export const CrownIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2.5 5 L5.5 8 L8 3.5 L10.5 8 L13.5 5 L12.5 12 H3.5 Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

/** Single-person glyph used for the "Member" membership tab. */
export const MemberIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5.5" r="2.6" stroke="currentColor" strokeWidth="1.3" />
    <path d="M3 13 c0-2.8 2.2-4.3 5-4.3 s5 1.5 5 4.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

/** Chain-link glyph used by "Copy invite link" style controls. */
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

/** Close (X) glyph used by modal/dialog dismiss controls. */
export const CloseIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/**
 * Selection check used by the "Request to become a member" list. When
 * `selected` is true it renders the filled brand circle with a white tick;
 * otherwise it renders an empty outlined circle so rows read as toggleable.
 */
export const CheckCircleIcon: React.FC<IconProps & { selected?: boolean }> = ({
  className,
  size = 20,
  selected = false,
}) => (
  <svg className={className} width={size} height={size} viewBox="0 0 20 20" fill="none">
    <circle
      cx="10"
      cy="10"
      r="9"
      fill={selected ? "var(--color-brand-500)" : "none"}
      stroke={selected ? "none" : "currentColor"}
      strokeWidth="1.5"
    />
    {selected && (
      <path
        d="M6 10.5 L9 13 L14 7"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </svg>
);

export const InfoIcon: React.FC<IconProps> = ({ className, size = 13 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 7 V11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="8" cy="5" r="0.7" fill="currentColor" />
  </svg>
);

/** Per-row "generate AI summary" glyph (document with a small sparkle). */
export const AiSummaryIcon: React.FC<IconProps> = ({ className, size = 17 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 3.5 h7 v9 h-7 z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <line x1="4.6" y1="6" x2="8.4" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="4.6" y1="8" x2="8.4" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="4.6" y1="10" x2="7" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M11.5 8.5 V13 M9.3 10.7 H13.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

/** Folder glyph used in the "Folder" column (open-folder shape). */
export const FolderPathIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2 4 A1.2 1.2 0 0 1 3.2 2.8 H6 L7.4 4.3 H12.8 A1.2 1.2 0 0 1 14 5.5 V11.5 A1.2 1.2 0 0 1 12.8 12.7 H3.2 A1.2 1.2 0 0 1 2 11.5 Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

/** Small locked-badge glyph, overlaid on a locked asset's type icon. */
export const LockBadgeIcon: React.FC<IconProps> = ({ className, size = 9 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16">
    <rect x="3.5" y="7" width="9" height="6.5" rx="1.4" fill="currentColor" />
    <path d="M5.5 7 V5 a2.5 2.5 0 0 1 5 0 V7" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

/* ------------------------------------------------------------------ *
 * Top application bar icons (full-width dark header)
 * ------------------------------------------------------------------ */

export const EyeIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16">
    <path
      d="M1.5 8 C3 4.8 5.3 3.2 8 3.2 S13 4.8 14.5 8 C13 11.2 10.7 12.8 8 12.8 S3 11.2 1.5 8Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <circle cx="8" cy="8" r="2" fill="currentColor" />
  </svg>
);

export const BellIcon: React.FC<IconProps> = ({ className, size = 17 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M8 2 C5.8 2 4.3 3.6 4.3 5.8 V8.5 L3 11 H13 L11.7 8.5 V5.8 C11.7 3.6 10.2 2 8 2Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <path d="M6.5 12.5 a1.6 1.6 0 0 0 3 0" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const SunIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M8 1.8 v2 M8 12.2 v2 M1.8 8 h2 M12.2 8 h2 M3.6 3.6 l1.4 1.4 M11 11 l1.4 1.4 M12.4 3.6 l-1.4 1.4 M5 11 l-1.4 1.4"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

export const FeedIcon: React.FC<IconProps> = ({ className, size = 17 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2 4.5 A1.5 1.5 0 0 1 3.5 3 H12.5 A1.5 1.5 0 0 1 14 4.5 V11.5 A1.5 1.5 0 0 1 12.5 13 H3.5 A1.5 1.5 0 0 1 2 11.5 Z"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path d="M2 9 H5 L6.2 10.6 H9.8 L11 9 H14" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

export const InviteIcon: React.FC<IconProps> = ({ className, size = 17 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="5.2" r="2.4" stroke="currentColor" strokeWidth="1.3" />
    <path d="M1.8 13 c0-2.6 1.9-4 4.2-4 s4.2 1.4 4.2 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M12.5 5.5 V9.5 M10.5 7.5 H14.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const HelpIcon: React.FC<IconProps> = ({ className, size = 17 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M6.3 6.2 a1.8 1.8 0 0 1 3.4 .8 c0 1.2 -1.7 1.4 -1.7 2.6"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    <circle cx="8" cy="11.4" r="0.7" fill="currentColor" />
  </svg>
);

export const AppsGridIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
    <circle cx="4" cy="4" r="1.25" />
    <circle cx="8" cy="4" r="1.25" />
    <circle cx="12" cy="4" r="1.25" />
    <circle cx="4" cy="8" r="1.25" />
    <circle cx="8" cy="8" r="1.25" />
    <circle cx="12" cy="8" r="1.25" />
    <circle cx="4" cy="12" r="1.25" />
    <circle cx="8" cy="12" r="1.25" />
    <circle cx="12" cy="12" r="1.25" />
  </svg>
);

/** 2x2 grid glyph used by the "Browse all" workspace-switcher footer action. */
export const BrowseAllIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    <rect x="9" y="9" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

/**
 * Small house glyph used as the "home workspace" corner badge overlaid on a
 * WorkspaceBadge. Drawn on a 12x12 grid so it reads well at ~8px.
 */
export const WorkspaceHomeGlyphIcon: React.FC<IconProps> = ({ className, size = 8 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 12 12" fill="none">
    <path d="M2 6 L6 2.4 L10 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 5.4 V9.6 H9 V5.4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

/* ------------------------------------------------------------------ *
 * Update feed drawer icons
 * ------------------------------------------------------------------ */

/** "@" mention glyph used by the "I was mentioned" feed tab. */
export const MentionIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M8 5.5 v3.2 M9.8 6.5 a2.4 2.4 0 1 0 0 3"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

/** Ribbon/bookmark glyph used by the "Bookmarked" feed tab. */
export const BookmarkIcon: React.FC<IconProps & { filled?: boolean }> = ({
  className,
  size = 13,
  filled = false,
}) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M4 2.5 h8 v11 l-4 -2.6 -4 2.6 z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

/** Gear glyph used by the "Feed settings" link in the feed sidebar. */
export const FeedSettingsIcon: React.FC<IconProps> = ({ className, size = 13 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M8 1.8 v2 M8 12.2 v2 M1.8 8 h2 M12.2 8 h2"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

/** Thumbs-up glyph used by the feed "Like" action. */
export const ThumbsUpIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M4 7 h2 v6 H4 z M6 7 l3-5 c1.5 0 2 1 1.6 2.2 L10 7 h3.2 c1 0 1.4 .8 1.2 1.6 l-1 4 c-.2 .8-.8 1.2-1.6 1.2 H6"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

/** Reply/curved-arrow glyph used by the feed "Reply" action. */
export const ReplyIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M6 4 L2.5 7.5 L6 11 M3 7.5 H10 a3.5 3.5 0 0 1 3.5 3.5 V13"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Eye glyph used for the feed update read/view count. */
export const ViewsIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M8 3 C4 3 1.6 6 1.6 8 S4 13 8 13 s6.4-3 6.4-5 S12 3 8 3Z"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <circle cx="8" cy="8" r="1.8" fill="currentColor" />
  </svg>
);

export const HamburgerIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 12" fill="none">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
      fill="currentColor"
    />
  </svg>
);
