import React from "react";

type BrandLogoProps = {
  /** Height of the mark in pixels, the width follows the wordmark. */
  size?: number;
  className?: string;
};

/**
 * The 97th Floor mark shown at the top of the app rail, the spot monday.com
 * reserves for its own logo. It never changes with the account branding, an
 * uploaded account logo is shown next to it instead (see `AppTopBar`).
 */
const BrandLogo: React.FC<BrandLogoProps> = ({ size = 32, className = "" }) => (
  <span
    role="img"
    aria-label="97th Floor"
    className={`inline-flex flex-none select-none items-center justify-center rounded-[9px] bg-brand-500 font-bold leading-none tracking-[-0.04em] text-white ${className}`}
    style={{ height: size, minWidth: size, paddingInline: size * 0.14, fontSize: size * 0.4 }}
  >
    97
    <span className="ml-px self-start pt-[22%] text-[0.55em] tracking-normal">th</span>
  </span>
);

export default BrandLogo;
