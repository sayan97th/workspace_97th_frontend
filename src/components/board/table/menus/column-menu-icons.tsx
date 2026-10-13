import React from "react";
import type { IconProps } from "@/icons/workspace-icons";

/*
 * Outline icons for the column header menu that the shared icon set does not
 * have yet. Same 16px grid and 1.5 stroke as `workspace-icons`, so they sit
 * next to its Filter, Duplicate or Delete icons without looking different.
 */

const STROKE = { stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;

export const SettingsGearIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2" {...STROKE} />
    <path
      d="M6.9 1.8h2.2l.35 1.6 1.2.7 1.55-.5 1.1 1.9-1.2 1.1v1.4l1.2 1.1-1.1 1.9-1.55-.5-1.2.7-.35 1.6H6.9l-.35-1.6-1.2-.7-1.55.5-1.1-1.9 1.2-1.1V7.3l-1.2-1.1 1.1-1.9 1.55.5 1.2-.7z"
      {...STROKE}
    />
  </svg>
);

export const CollapseColumnIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M4.5 2.5 8 6l3.5-3.5M4.5 13.5 8 10l3.5 3.5" {...STROKE} />
  </svg>
);

export const GroupByIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" {...STROKE} />
    <rect x="4.5" y="8" width="4" height="3" rx=".5" fill="currentColor" />
  </svg>
);

export const ExtensionsIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M3 5.5h2.5V4a1.5 1.5 0 0 1 3 0v1.5H11V8h1.5a1.5 1.5 0 0 1 0 3H11v2.5H8.5V12a1.5 1.5 0 0 0-3 0v1.5H3V11h1a1.5 1.5 0 0 0 0-3H3z"
      {...STROKE}
    />
  </svg>
);

export const CustomizeColumnIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" {...STROKE} />
    <path d="M2 6.2h12M2 9.8h12" {...STROKE} />
  </svg>
);

export const DescriptionIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M2.5 4h11M2.5 8h11M2.5 12h7" {...STROKE} />
  </svg>
);

export const RequiredIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2.5" width="9" height="11" rx="1.5" {...STROKE} />
    <path d="M4.5 6h4M4.5 9h2.5M13 4v3.6M11.4 4.9l3.2 1.8M14.6 4.9l-3.2 1.8" {...STROKE} />
  </svg>
);

export const ValidationIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" {...STROKE} />
    <path d="m4.5 6 1 1 1.7-1.8M4.5 10l1 1 1.7-1.8M9.5 6.2h2M9.5 10.2h2" {...STROKE} />
  </svg>
);

export const ColumnOptionsIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6" {...STROKE} />
    <circle cx="10" cy="4.5" r="1.5" {...STROKE} />
    <circle cx="6" cy="11.5" r="1.5" {...STROKE} />
  </svg>
);

export const SummaryIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="9.5" width="12" height="4" rx="1" {...STROKE} />
    <path d="M2.5 3h11M2.5 6h11" {...STROKE} />
  </svg>
);

export const AutomateIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M9.2 1.8 3.6 9h4l-.8 5.2L12.4 7h-4z" {...STROKE} />
  </svg>
);

export const ButtonColumnIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="4" width="13" height="8" rx="4" {...STROKE} />
    <path d="M6.8 6.4v3.2L9.6 8z" {...STROKE} />
  </svg>
);

export const DependencyIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.8" y="2.5" width="5" height="3.5" rx="1" {...STROKE} />
    <rect x="9.2" y="10" width="5" height="3.5" rx="1" {...STROKE} />
    <path d="M4.3 6v5.7h4.9M7.8 10.3l1.4 1.4-1.4 1.4" {...STROKE} />
  </svg>
);

export const BoardCopyIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.8" y="4.8" width="8" height="8.5" rx="1.3" {...STROKE} />
    <path d="M6 2.7h6.7c.7 0 1.3.6 1.3 1.3v6.5M5 9h3.6M7.2 7.2 9 9l-1.8 1.8" {...STROKE} />
  </svg>
);
