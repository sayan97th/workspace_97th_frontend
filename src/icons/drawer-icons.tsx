import React from "react";

type IconProps = {
  className?: string;
  size?: number;
};

/**
 * Icons for the Board Item Drawer (Updates / Files / Activity Log / Info Boxes)
 * and its comment thread action bar. Generic workspace-shell icons live in
 * `@/icons/workspace-icons`; row/toolbar icons live in `@/icons/board-icons`.
 */

export const UpdatesTabIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2.5 4 A1.5 1.5 0 0 1 4 2.5 H12 A1.5 1.5 0 0 1 13.5 4 V10 A1.5 1.5 0 0 1 12 11.5 H6 L3 14 V11.5 A1.5 1.5 0 0 1 2.5 10 Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

export const FilesTabIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2.5 4.5 A1.5 1.5 0 0 1 4 3 H6 L7.5 4.8 H12 A1.5 1.5 0 0 1 13.5 6.3 V11.5 A1.5 1.5 0 0 1 12 13 H4 A1.5 1.5 0 0 1 2.5 11.5 Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

export const ActivityLogTabIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5.8" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 5 V8 L10 9.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const InfoBoxesTabIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5.8" stroke="currentColor" strokeWidth="1.3" />
    <line x1="8" y1="7.2" x2="8" y2="11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="8" cy="5.2" r="0.8" fill="currentColor" />
  </svg>
);

export const LikeIcon: React.FC<IconProps & { filled?: boolean }> = ({ className, size = 15, filled }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M4 7 H2.5 V13 H4 Z M4 7 L7 1.8 C8 1.5 8.8 2.2 8.6 3.2 L8 6 H12.4 A1.3 1.3 0 0 1 13.6 7.6 L12.6 11.8 A1.3 1.3 0 0 1 11.3 13 H4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

export const ReactSmileyIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="6" cy="6.7" r="0.85" fill="currentColor" />
    <circle cx="10" cy="6.7" r="0.85" fill="currentColor" />
    <path d="M5.5 9.5 A3 3 0 0 0 10.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const ReplyIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M6.5 4 L2.5 8 L6.5 12 M3.2 8 H10 A3.3 3.3 0 0 1 13.3 11.3 V13"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SeenIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2 8.5 L5 11.5 L10 5 M8 9 L10.5 11.5 L14 6.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const AttachIcon: React.FC<IconProps> = ({ className, size = 17 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M11.5 5 L6.4 10.1 A1.9 1.9 0 0 0 9.1 12.8 L13.4 8.5 A3.2 3.2 0 0 0 8.9 4 L4.3 8.6 A4.4 4.4 0 0 0 10.5 14.8 L14 11.3"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ViewsIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M1.5 8 C3 4.8 5.3 3.5 8 3.5 s5 1.3 6.5 4.5 C13 11.2 10.7 12.5 8 12.5 S3 11.2 1.5 8Z"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <circle cx="8" cy="8" r="1.9" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export const DownloadFileIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M8 2.5 V10 M5 7.2 L8 10.2 L11 7.2 M3.5 12.5 H12.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Slack-style rich text toolbar icons, shared by `RichTextComposer`'s
 * formatting row. Kept in the same 16x16 `currentColor` stroke style as the
 * rest of this file rather than the glyph/emoji placeholders they replace.
 */

export const BoldIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M4.5 2.5 H8.6 A2.4 2.4 0 0 1 8.6 7.3 H4.5 Z M4.5 7.3 H9.2 A2.5 2.5 0 0 1 9.2 12.3 H4.5 Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

export const ItalicIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M7 2.5 H12 M4 12.3 H9 M9.6 2.5 L6.4 12.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const StrikethroughIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M4.2 4.4 C4.2 2.9 5.7 2.3 7.7 2.3 C9.5 2.3 10.9 3 11.2 4.3 M4.6 11.7 C5 12.8 6.3 13.5 7.9 13.5 C9.9 13.5 11.5 12.8 11.5 11.2 C11.5 10 10.7 9.2 9.3 8.8 M2.5 8 H13.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

export const LinkFormatIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M6.6 9.4 A2.6 2.6 0 0 0 10.2 9.3 L12.4 7.1 A2.7 2.7 0 0 0 8.6 3.3 L7.3 4.6"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    <path
      d="M9.4 6.6 A2.6 2.6 0 0 0 5.8 6.7 L3.6 8.9 A2.7 2.7 0 0 0 7.4 12.7 L8.7 11.4"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

export const BulletListIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="2.9" cy="4.2" r="1" fill="currentColor" />
    <circle cx="2.9" cy="8" r="1" fill="currentColor" />
    <circle cx="2.9" cy="11.8" r="1" fill="currentColor" />
    <path d="M6 4.2 H13.2 M6 8 H13.2 M6 11.8 H13.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const NumberedListIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <text x="1" y="5.6" fontSize="4.2" fontWeight="700" fill="currentColor">1.</text>
    <text x="1" y="9.4" fontSize="4.2" fontWeight="700" fill="currentColor">2.</text>
    <text x="1" y="13.2" fontSize="4.2" fontWeight="700" fill="currentColor">3.</text>
    <path d="M6 4.2 H13.2 M6 8 H13.2 M6 11.8 H13.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const QuoteIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M3 12.5 V9.8 A1.5 1.5 0 0 1 4.5 8.3 H5 A2 2 0 0 0 3.5 6 V3.5 A0.8 0.8 0 0 1 4.3 2.7 H5.7 A2.8 2.8 0 0 1 8.5 5.5 V9 A3.5 3.5 0 0 1 5 12.5 Z"
      fill="currentColor"
    />
    <path
      d="M9.5 12.5 V9.8 A1.5 1.5 0 0 1 11 8.3 H11.5 A2 2 0 0 0 10 6 V3.5 A0.8 0.8 0 0 1 10.8 2.7 H12.2 A2.8 2.8 0 0 1 15 5.5 V9 A3.5 3.5 0 0 1 11.5 12.5 Z"
      fill="currentColor"
    />
  </svg>
);

export const InlineCodeIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M5.5 4.5 L2 8 L5.5 11.5 M10.5 4.5 L14 8 L10.5 11.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Slack's own "Aa" affordance for showing/hiding the formatting toolbar. */
export const FormatToggleIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <text x="1.3" y="12" fontSize="10.5" fontWeight="700" fontFamily="sans-serif" fill="currentColor">Aa</text>
  </svg>
);

export const SendIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2 8 L13.5 2.5 L9.5 13.5 L7.3 8.7 Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    <path d="M7.3 8.7 L11 5" stroke="var(--color-shell-panel)" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

/** A person with a plus, the composer's "Assign" action. */
export const AssignPersonIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="6.5" cy="5.2" r="2.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M2 13 c0.4 -2.4 2.2 -3.8 4.5 -3.8 s4.1 1.4 4.5 3.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M12.5 4 v4 M10.5 6 h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
