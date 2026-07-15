import React from "react";

export type ProductTagProps = {
  label: string;
};

/** Blue pill used for the "Product(s)" column tags (SEO, Ads, Content, …). */
const ProductTag: React.FC<ProductTagProps> = ({ label }) => (
  <span className="whitespace-nowrap rounded-md border border-[#5878ff]/[0.28] bg-[#5878ff]/[0.14] px-[9px] py-0.5 text-[11.5px] font-semibold text-[#9db8ff]">
    {label}
  </span>
);

/** Neutral "+N" overflow badge shown after a truncated tag/avatar list. */
export const OverflowBadge: React.FC<{ label: string }> = ({ label }) => (
  <span className="rounded-md bg-shell-hover px-1.5 py-0.5 text-[11px] font-semibold text-shell-text-muted">
    {label}
  </span>
);

export default ProductTag;
