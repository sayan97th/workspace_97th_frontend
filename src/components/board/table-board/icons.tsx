import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export const ChevronDownIcon = ({ size = 12, ...rest }: IconProps) => (
  <svg viewBox="0 0 12 12" width={size} height={size} {...rest}>
    <path d="M3 4.5 L6 8 L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const ChevronRightIcon = ({ size = 12, ...rest }: IconProps) => (
  <svg viewBox="0 0 12 12" width={size} height={size} {...rest}>
    <path d="M4.5 3 L8 6 L4.5 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const DragHandleIcon = ({ size = 12, ...rest }: IconProps) => (
  <svg viewBox="0 0 6 14" width={size * 0.5} height={size} {...rest}>
    <circle cx="1.5" cy="3" r="1.1" fill="currentColor" />
    <circle cx="4.5" cy="3" r="1.1" fill="currentColor" />
    <circle cx="1.5" cy="7" r="1.1" fill="currentColor" />
    <circle cx="4.5" cy="7" r="1.1" fill="currentColor" />
    <circle cx="1.5" cy="11" r="1.1" fill="currentColor" />
    <circle cx="4.5" cy="11" r="1.1" fill="currentColor" />
  </svg>
);

export const PlusCircleIcon = ({ size = 13, ...rest }: IconProps) => (
  <svg viewBox="0 0 14 14" width={size} height={size} {...rest}>
    <circle cx="7" cy="7" r="5.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <path d="M7 4.6 V9.4 M4.6 7 H9.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const CheckIcon = ({ size = 10, ...rest }: IconProps) => (
  <svg viewBox="0 0 14 14" width={size} height={size} {...rest}>
    <path d="M2 7.4 L5.4 10.8 L12 3.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const SearchIcon = ({ size = 13, ...rest }: IconProps) => (
  <svg viewBox="0 0 14 14" width={size} height={size} {...rest}>
    <circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M9.2 9.2 L12.4 12.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const FilterIcon = ({ size = 14, ...rest }: IconProps) => (
  <svg viewBox="0 0 14 14" width={size} height={size} {...rest}>
    <path d="M1.5 3 H12.5 M3.5 7 H10.5 M5.5 11 H8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const SortIcon = ({ size = 14, ...rest }: IconProps) => (
  <svg viewBox="0 0 14 14" width={size} height={size} {...rest}>
    <path d="M4 2 V12 M4 12 L1.8 9.6 M10 12 V2 M10 2 L12.2 4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const GroupByIcon = ({ size = 14, ...rest }: IconProps) => (
  <svg viewBox="0 0 14 14" width={size} height={size} {...rest}>
    <rect x="1.6" y="2.4" width="10.8" height="3.2" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <rect x="1.6" y="8" width="10.8" height="3.2" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const CommentIcon = ({ size = 16, ...rest }: IconProps) => (
  <svg viewBox="0 0 18 18" width={size} height={size} {...rest}>
    <path
      d="M2.2 8.1 a6.4 5.4 0 1 1 3.4 4.8 L2.4 13.9 l1 -3 a5.2 5.2 0 0 1 -1.2 -2.8 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <path d="M9 5.9 V10.1 M6.9 8 H11.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const CloseIcon = ({ size = 11, ...rest }: IconProps) => (
  <svg viewBox="0 0 14 14" width={size} height={size} {...rest}>
    <path d="M2.6 2.6 L11.4 11.4 M11.4 2.6 L2.6 11.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const SparkleIcon = ({ size = 14, ...rest }: IconProps) => (
  <svg viewBox="0 0 16 16" width={size} height={size} {...rest}>
    <path d="M8 1.8 L9.5 6 L13.8 7.5 L9.5 9 L8 13.2 L6.5 9 L2.2 7.5 L6.5 6 Z" fill="#4f6bed" opacity="0.85" />
  </svg>
);

export const BellNotifyIcon = ({ size = 14, ...rest }: IconProps) => (
  <svg viewBox="0 0 16 16" width={size} height={size} {...rest}>
    <path
      d="M8 2.4 a3.6 3.6 0 0 1 3.6 3.6 v3 l1.2 1.8 H3.2 L4.4 9 V6 A3.6 3.6 0 0 1 8 2.4 Z M6.6 12.4 a1.5 1.5 0 0 0 2.8 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

export const EditPencilIcon = ({ size = 15, ...rest }: IconProps) => (
  <svg viewBox="0 0 16 16" width={size} height={size} {...rest}>
    <path
      d="M10.6 2.4 L13.6 5.4 L5.6 13.4 L2.4 13.6 L2.6 10.4 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

export const ChevronLeftIcon = ({ size = 12, ...rest }: IconProps) => (
  <svg viewBox="0 0 12 12" width={size} height={size} {...rest}>
    <path d="M7.5 3 L4 6 L7.5 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ClockIcon = ({ size = 14, ...rest }: IconProps) => (
  <svg viewBox="0 0 16 16" width={size} height={size} {...rest}>
    <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 4.6 V8 L10.4 9.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PlusIcon = ({ size = 14, ...rest }: IconProps) => (
  <svg viewBox="0 0 14 14" width={size} height={size} {...rest}>
    <path d="M7 2.5 V11.5 M2.5 7 H11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
