import React from "react";

type IconProps = {
  className?: string;
  size?: number;
};

/** Icons specific to the admin "Websocket test" screen (`@/components/websocket-test`). */

export const PlugIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path
      d="M4 5h8v2.5A4 4 0 0 1 8 11.5 4 4 0 0 1 4 7.5V5Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <path d="M8 11.5V14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const ServerIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2.5" width="12" height="4.2" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <rect x="2" y="9.3" width="12" height="4.2" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="4.4" cy="4.6" r="0.9" fill="currentColor" />
    <circle cx="4.4" cy="11.4" r="0.9" fill="currentColor" />
  </svg>
);

export const RadarIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
    <circle cx="8" cy="8" r="1" fill="currentColor" />
  </svg>
);

export const RefreshIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v3.4h-3.4"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SendIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="m2.2 8 11.4-5.4L10.5 14l-2.1-4.4L2.2 8Zm0 0 6.2 1.6"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CheckCircleIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5.4 8.2 7.2 10 10.6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const XCircleIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5.8 5.8 10.2 10.2M10.2 5.8 5.8 10.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 4.6V8l2.4 1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 4.5h10M6.2 4.5V3a1 1 0 0 1 1-1h1.6a1 1 0 0 1 1 1v1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M4.2 4.5 4.8 13a1.2 1.2 0 0 0 1.2 1.1h4a1.2 1.2 0 0 0 1.2-1.1l.6-8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
