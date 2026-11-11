"use client";
import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
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

/** Smallest space kept between the bubble and the window edges. */
const VIEWPORT_MARGIN = 8;
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
  const bubble_ref = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const showTooltip = useCallback(() => {
    const rect = trigger_ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      top: placement === "top" ? rect.top - GAP : rect.bottom + GAP,
      left: rect.left + rect.width / 2,
    });
  }, [placement]);

  // The bubble sits centered over its trigger. Only when that would cross a window edge is it
  // slid back inside, measured with its real width, and the arrow moves the other way so it
  // keeps pointing at the trigger. Runs before paint, so the bubble never jumps.
  useLayoutEffect(() => {
    const bubble = bubble_ref.current;
    if (!position || !bubble) return;
    const half_width = bubble.offsetWidth / 2;
    const min_left = VIEWPORT_MARGIN + half_width;
    const max_left = Math.max(min_left, window.innerWidth - VIEWPORT_MARGIN - half_width);
    const shift = Math.min(Math.max(position.left, min_left), max_left) - position.left;
    bubble.style.left = `${position.left + shift}px`;
    bubble.style.setProperty("--portal-tooltip-arrow-shift", `${-shift}px`);
  }, [position]);

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
              ref={bubble_ref}
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
