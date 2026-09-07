import React from "react";
import type { IconProps } from "./workspace-icons";

/** Icons specific to {@link import("@/components/board/BoardOptionsMenu").default} — the board header's "..." options menu — not otherwise covered by `workspace-icons`/`board-icons`. */

export const PowerUpsIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M6.2 2.6 V4.6 M9.8 2.6 V4.6 M4.4 4.6 H11.6 V6.8 A3.6 3.6 0 0 1 8 10.4 A3.6 3.6 0 0 1 4.4 6.8 V4.6 Z M8 10.4 V13.4 M6 13.4 H10"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ConvertProjectIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2.2" y="2.6" width="5.6" height="5.6" rx="1.1" stroke="currentColor" strokeWidth="1.3" />
    <rect x="8.2" y="7.8" width="5.6" height="5.6" rx="1.1" stroke="currentColor" strokeWidth="1.3" />
    <path d="M7.8 5.4 H10 A1.4 1.4 0 0 1 11.4 6.8 V7.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const SettingsGearIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M8 2.6 V3.9 M8 12.1 V13.4 M13.4 8 H12.1 M3.9 8 H2.6 M11.7 4.3 L10.8 5.2 M5.2 10.8 L4.3 11.7 M11.7 11.7 L10.8 10.8 M5.2 5.2 L4.3 4.3"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

export const ReportIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2.4" y="2.4" width="11.2" height="11.2" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5.4 10.4 V7.6 M8 10.4 V5.4 M10.6 10.4 V8.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const FullscreenIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2.6 5.8 V3.4 A0.8 0.8 0 0 1 3.4 2.6 H5.8 M10.2 2.6 H12.6 A0.8 0.8 0 0 1 13.4 3.4 V5.8 M13.4 10.2 V12.6 A0.8 0.8 0 0 1 12.6 13.4 H10.2 M5.8 13.4 H3.4 A0.8 0.8 0 0 1 2.6 12.6 V10.2"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ImportIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M8 2.6 V9.4 M8 9.4 L5.4 6.8 M8 9.4 L10.6 6.8 M3 11 V12.4 A1 1 0 0 0 4 13.4 H12 A1 1 0 0 0 13 12.4 V11"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const FeedbackIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2.6 3.6 A1 1 0 0 1 3.6 2.6 H12.4 A1 1 0 0 1 13.4 3.6 V9.4 A1 1 0 0 1 12.4 10.4 H6.6 L4 12.8 V10.4 H3.6 A1 1 0 0 1 2.6 9.4 Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <circle cx="5.6" cy="6.5" r="0.7" fill="currentColor" />
    <circle cx="8" cy="6.5" r="0.7" fill="currentColor" />
    <circle cx="10.4" cy="6.5" r="0.7" fill="currentColor" />
  </svg>
);

export const ActivityLogIcon: React.FC<IconProps> = ({ className, size = 15 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 8 A5 5 0 1 1 4.6 11.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M3 5 V8 H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 5.4 V8 L9.8 9.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
