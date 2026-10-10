import React, { forwardRef } from "react";
import type { IconComponent } from "@/icons/workspace-icons";

export type ToolbarButtonProps = {
  label: string;
  Icon: IconComponent;
  is_open?: boolean;
  has_selection?: boolean;
  badge_count?: number;
  /** Filter uses the light accent surface while open or applied, as on monday. Other controls use a neutral highlight. */
  variant?: "neutral" | "accent";
  /** Defaults to `label` when set; required when `label` is empty (e.g. the icon-only overflow button). */
  aria_label?: string;
  /** Marks the button as an on/off toggle (e.g. "Starred") and reports its state to assistive tech. */
  is_pressed?: boolean;
  /** Native tooltip, for toggles whose effect the label alone doesn't spell out. */
  title?: string;
  onClick: () => void;
};

/** Shared toolbar button for Person/Filter/Sort/Hide/Group by/"...". `forwardRef` so callers can anchor a popover to it. */
const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ label, Icon, is_open, has_selection, badge_count, variant = "neutral", aria_label, is_pressed, title, onClick }, ref) => {
    const is_active = is_open || has_selection;
    const active_class =
      variant === "accent"
        ? "bg-boardtree-accent-surface text-boardtree-text"
        : "bg-boardtree-hover-strong text-boardtree-text";

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-label={aria_label ?? label}
        aria-pressed={is_pressed}
        title={title}
        className={`flex h-8 items-center gap-1.5 rounded-[4px] px-2 text-board-nav transition-colors ${
          is_active ? active_class : "text-boardtree-text hover:bg-boardtree-hover-strong"
        }`}
      >
        <Icon size={16} />
        {/* monday writes the count into the label, e.g. "Filter / 1". */}
        {label && (badge_count ? `${label} / ${badge_count}` : label)}
      </button>
    );
  }
);

ToolbarButton.displayName = "ToolbarButton";

export default ToolbarButton;
