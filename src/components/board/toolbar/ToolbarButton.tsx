import React, { forwardRef } from "react";
import type { IconComponent } from "@/icons/workspace-icons";

export type ToolbarButtonProps = {
  label: string;
  Icon: IconComponent;
  is_open?: boolean;
  has_selection?: boolean;
  badge_count?: number;
  /** Filter uses the brand accent when open, matching the "New item" button. Other controls use a neutral highlight. */
  variant?: "neutral" | "accent";
  /** Defaults to `label` when set; required when `label` is empty (e.g. the icon-only overflow button). */
  aria_label?: string;
  onClick: () => void;
};

/** Shared toolbar button for Person/Filter/Sort/Hide/Group by/"...". `forwardRef` so callers can anchor a popover to it. */
const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ label, Icon, is_open, has_selection, badge_count, variant = "neutral", aria_label, onClick }, ref) => {
    const is_active = is_open || has_selection;
    const active_class =
      variant === "accent"
        ? "bg-brand-500 text-white"
        : "bg-white/[0.12] text-[#e9eded]";

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-label={aria_label ?? label}
        className={`flex items-center gap-[7px] rounded-lg px-[11px] py-2 text-[13px] font-medium transition-colors ${
          is_active ? active_class : "text-[#c7d0d0] hover:bg-white/[0.07]"
        }`}
      >
        <Icon />
        {label}
        {badge_count ? (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#0a1717] px-1 text-[11px] font-semibold text-white">
            {badge_count}
          </span>
        ) : null}
      </button>
    );
  }
);

ToolbarButton.displayName = "ToolbarButton";

export default ToolbarButton;
