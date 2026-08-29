"use client";
import React from "react";
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
};

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
}) => (
  <button
    type="button"
    title={person.name}
    onClick={onToggle}
    className="relative flex-none rounded-full p-[2px] transition-transform hover:scale-[1.06]"
    style={{
      width: size,
      height: size,
      background: is_selected ? "var(--color-boardtree-accent)" : "transparent",
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
        className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-boardtree-accent"
        style={{ borderColor: ring_color }}
      >
        <CheckIcon size={9} className="text-white" />
      </span>
    ) : null}
  </button>
);

export default SelectablePersonAvatar;
