"use client";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./portal-tooltip.css";

export type PortalTooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: "top" | "bottom";
  /** Renders only the children, for a tooltip that applies to a single state. */
  disabled?: boolean;
  className?: string;
};

/** Keeps the bubble's center this far from the window edges (half the 240px max width plus a gutter). */
const VIEWPORT_GUTTER = 128;
const GAP = 8;

type TooltipPosition = { top: number; left: number };

/**
 * monday style dark tooltip shown on hover and keyboard focus. Unlike the CSS only `Tooltip`,
 * the bubble is portaled to `document.body` with fixed coordinates, so rounded cards and
 * horizontally scrolling tables never clip it. It hides on scroll because its coordinates are
 * measured once when it opens.
 */
const PortalTooltip: React.FC<PortalTooltipProps> = ({
  content,
  children,
  placement = "top",
  disabled = false,
  className = "",
}) => {
  const trigger_ref = useRef<HTMLSpanElement>(null);
  const tooltip_id = useId();
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const showTooltip = useCallback(() => {
    const rect = trigger_ref.current?.getBoundingClientRect();
    if (!rect) return;
    const center = rect.left + rect.width / 2;
    const max_left = Math.max(VIEWPORT_GUTTER, window.innerWidth - VIEWPORT_GUTTER);
    setPosition({
      top: placement === "top" ? rect.top - GAP : rect.bottom + GAP,
      left: Math.min(Math.max(center, VIEWPORT_GUTTER), max_left),
    });
  }, [placement]);

  const hideTooltip = useCallback(() => setPosition(null), []);

  useEffect(() => {
    if (!position) return;
    window.addEventListener("scroll", hideTooltip, true);
    window.addEventListener("resize", hideTooltip);
    return () => {
      window.removeEventListener("scroll", hideTooltip, true);
      window.removeEventListener("resize", hideTooltip);
    };
  }, [position, hideTooltip]);

  if (disabled || !content) return <>{children}</>;

  return (
    <span
      ref={trigger_ref}
      className={`portal-tooltip-trigger ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      aria-describedby={position ? tooltip_id : undefined}
    >
      {children}
      {position
        ? createPortal(
            <span
              id={tooltip_id}
              role="tooltip"
              className="portal-tooltip"
              data-placement={placement}
              style={{ top: position.top, left: position.left }}
            >
              {content}
            </span>,
            document.body
          )
        : null}
    </span>
  );
};

export default PortalTooltip;
