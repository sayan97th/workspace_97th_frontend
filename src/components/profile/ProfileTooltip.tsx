"use client";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./profile.scss";

export type ProfileTooltipProps = {
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
 * monday style dark tooltip for the My Profile page, shown on hover and keyboard focus. The
 * bubble is portaled to `document.body` with fixed coordinates, so the rounded cards, the
 * horizontally scrolling tables and the sticky rail never clip it. It hides on scroll because
 * its coordinates are measured once when it opens.
 */
const ProfileTooltip: React.FC<ProfileTooltipProps> = ({
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
      className={`profile-tooltip-trigger ${className}`}
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
              className="profile-tooltip"
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

export default ProfileTooltip;
