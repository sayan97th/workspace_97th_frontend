"use client";
import React from "react";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export type TooltipProps = {
  /** Bubble text/content, shown on hover/focus of `children`. */
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: TooltipPlacement;
  /** Skips rendering the bubble (and its hover wiring) entirely — e.g. when a caller only wants the tooltip for a specific state. */
  disabled?: boolean;
  /** Extra classes on the trigger wrapper, e.g. to control its display type. */
  className?: string;
};

const BUBBLE_PLACEMENT_CLASSES: Record<TooltipPlacement, string> = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
};

const ARROW_PLACEMENT_CLASSES: Record<TooltipPlacement, string> = {
  top: "top-full left-1/2 -mt-[3px] -translate-x-1/2",
  bottom: "bottom-full left-1/2 -mb-[3px] -translate-x-1/2",
  left: "left-full top-1/2 -ml-[3px] -translate-y-1/2",
  right: "right-full top-1/2 -mr-[3px] -translate-y-1/2",
};

/**
 * Small dark hover bubble anchored to whatever it wraps — the shared
 * "why is this disabled" affordance (e.g. Manage Workspace's disabled
 * Permissions tab), built to work over a `disabled` trigger: the bubble
 * reacts to `:hover`/`:focus-within` on the wrapping `span`, not on the
 * (possibly non-interactive) child itself, so it still shows over a
 * `<button disabled>`.
 *
 * CSS-only (no portal, no JS state) so it stays cheap to sprinkle anywhere;
 * reach for a positioned popover instead (see `BoardPopover`/`InfoDropdown`)
 * when the content needs to escape a clipping/overflow ancestor.
 */
const Tooltip: React.FC<TooltipProps> = ({ content, children, placement = "top", disabled = false, className = "" }) => {
  if (disabled) return <>{children}</>;

  return (
    <span className={`group/tooltip relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 w-max max-w-[220px] rounded-lg bg-gray-900 px-3 py-2 text-center text-[12.5px] font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 ${BUBBLE_PLACEMENT_CLASSES[placement]}`}
      >
        {content}
        <span
          aria-hidden
          className={`absolute h-[7px] w-[7px] rotate-45 bg-gray-900 ${ARROW_PLACEMENT_CLASSES[placement]}`}
        />
      </span>
    </span>
  );
};

export default Tooltip;
