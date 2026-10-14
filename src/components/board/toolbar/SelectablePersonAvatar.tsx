"use client";
import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon } from "@/icons/board-icons";
import { StarIcon } from "@/icons/workspace-icons";
import PersonAvatar from "../PersonAvatar";
import type { BoardPersonOption } from "./types";

export type SelectablePersonAvatarProps = {
  person: BoardPersonOption;
  is_selected: boolean;
  onToggle: () => void;
  /** Diameter in pixels. Defaults to 44. */
  size?: number;
  /** Matches the surrounding popover background so the inner avatar and badges appear inset. Defaults to the shared board popover color. */
  ring_color?: string;
  /** Selected ring and check badge color. Defaults to the board accent. */
  accent_color?: string;
  /**
   * Shows the person's name in a hover bubble portaled to `document.body` (styled by `toolbar-panel.css`), so a
   * scrolling list never clips it. Without it the name is a native `title`.
   */
  has_name_tooltip?: boolean;
};

type TooltipPosition = { left: number; top: number };

/**
 * Avatar button used by person-picker popovers (e.g. the toolbar's Person filter):
 * shows a colored ring + checkmark badge when selected, and a small guest badge
 * for external collaborators. Reusable by any future "assign/filter by person" UI.
 */
const SelectablePersonAvatar: React.FC<SelectablePersonAvatarProps> = ({
  person,
  is_selected,
  onToggle,
  size = 44,
  ring_color = "var(--color-boardtree-surface)",
  accent_color = "var(--color-boardtree-accent)",
  has_name_tooltip = false,
}) => {
  const button_ref = useRef<HTMLButtonElement>(null);
  const [tooltip_position, setTooltipPosition] = useState<TooltipPosition | null>(null);

  const showTooltip = () => {
    const rect = button_ref.current?.getBoundingClientRect();
    if (has_name_tooltip && rect) setTooltipPosition({ left: rect.left + rect.width / 2, top: rect.top - 8 });
  };
  const hideTooltip = () => setTooltipPosition(null);
  const tooltip_label = person.is_guest ? `${person.name} (Guest)` : person.name;

  return (
    <>
      <button
        ref={button_ref}
        type="button"
        title={has_name_tooltip ? undefined : person.name}
        aria-label={tooltip_label}
        aria-pressed={is_selected}
        onClick={onToggle}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="relative flex-none rounded-full p-[2px] transition-transform hover:scale-[1.06]"
        style={{
          width: size,
          height: size,
          background: is_selected ? accent_color : "transparent",
        }}
      >
        <PersonAvatar person={person} size={size - 4} className="border-2" style={{ borderColor: ring_color }} />
        {person.is_guest ? (
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-[5px] border-2 bg-[#7e5bef]"
            style={{ borderColor: ring_color }}
          >
            <StarIcon filled size={8} className="text-white" />
          </span>
        ) : null}
        {is_selected ? (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2"
            style={{ borderColor: ring_color, background: accent_color }}
          >
            <CheckIcon size={9} className="text-white" />
          </span>
        ) : null}
      </button>
      {tooltip_position && typeof document !== "undefined"
        ? createPortal(
            <span role="tooltip" className="toolbar-panel-tooltip" style={{ left: tooltip_position.left, top: tooltip_position.top }}>
              {tooltip_label}
            </span>,
            document.body
          )
        : null}
    </>
  );
};

export default SelectablePersonAvatar;
