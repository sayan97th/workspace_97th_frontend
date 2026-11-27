import React from "react";
import { PRODUCT_NAME } from "@/lib/product";

type BlueprintMarkProps = {
  /** Width and height of the mark in pixels. */
  size?: number;
  className?: string;
  /** Read out by screen readers. Leave empty when a visible product name sits next to the mark. */
  label?: string;
};

/**
 * The Blueprint product mark: a "B" drafted on a faint grid with a pin in the corner, on the
 * brand color tile. It follows the organization brand color (`--color-brand-500`), so it stays
 * on brand when an administrator changes it. The company mark (`BrandLogo`, `OrganizationLogo`)
 * is separate and still belongs to the organization.
 */
export const BlueprintMark: React.FC<BlueprintMarkProps> = ({ size = 24, className = "", label = "" }) => (
  <svg
    viewBox="0 0 32 32"
    width={size}
    height={size}
    className={`flex-none ${className}`}
    role={label ? "img" : undefined}
    aria-label={label || undefined}
    aria-hidden={label ? undefined : true}
  >
    <rect width="32" height="32" rx="8" className="fill-brand-500" />
    {/* Drafting grid, every line stays inside the rounded corners. */}
    <path d="M8 0V32M16 0V32M24 0V32M0 8H32M0 16H32M0 24H32" stroke="#fff" strokeOpacity="0.14" strokeWidth="0.75" />
    {/* The "B": two bowls on one spine, the lower one slightly wider. */}
    <path
      d="M11 8.5H16.25a3.75 3.75 0 0 1 0 7.5H11ZM11 16H17.5a3.75 3.75 0 0 1 0 7.5H11Z"
      fill="none"
      stroke="#fff"
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
    <circle cx="24" cy="8" r="1.6" fill="#fff" fillOpacity="0.9" />
  </svg>
);

type BlueprintWordmarkProps = {
  /** Size of the mark in pixels, the name scales with it. */
  size?: number;
  className?: string;
  /** Class for the product name, e.g. its color. */
  name_class_name?: string;
};

/** The mark with the product name next to it, for footers and brand corners. */
export const BlueprintWordmark: React.FC<BlueprintWordmarkProps> = ({ size = 20, className = "", name_class_name = "" }) => (
  <span className={`inline-flex items-center ${className}`} style={{ gap: Math.round(size * 0.4) }}>
    <BlueprintMark size={size} />
    <span
      className={`font-semibold leading-none tracking-[-0.015em] ${name_class_name}`}
      style={{ fontSize: Math.round(size * 0.7) }}
    >
      {PRODUCT_NAME}
    </span>
  </span>
);

export default BlueprintMark;
