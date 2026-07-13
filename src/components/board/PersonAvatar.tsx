import React from "react";
import type { BoardPersonOption } from "./toolbar/types";
import { AVATAR_GRADIENTS } from "./TeamAvatars";

export type PersonAvatarProps = {
  person: BoardPersonOption;
  /** Diameter in pixels. Defaults to 20. */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Circular initials avatar for a single {@link BoardPersonOption}, shared by every
 * person picker in the board toolbar (Person filter popover, quick-filter facets, etc.)
 * so they all render the same gradient + initials treatment.
 */
const PersonAvatar: React.FC<PersonAvatarProps> = ({ person, size = 20, className, style }) => (
  <span
    className={`flex flex-none items-center justify-center rounded-full font-bold text-white ${className ?? ""}`}
    style={{
      width: size,
      height: size,
      fontSize: Math.max(9, Math.round(size * 0.42)),
      background: AVATAR_GRADIENTS[person.avatar_seed % AVATAR_GRADIENTS.length],
      ...style,
    }}
  >
    {person.initials}
  </span>
);

export default PersonAvatar;
