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
 * Circular avatar for a single {@link BoardPersonOption}, shared by every person
 * picker in the board toolbar (Person filter popover, quick-filter facets, comment
 * threads, etc.). Renders the person's real uploaded photo when `avatar_url` is set,
 * falling back to the initials-on-gradient treatment otherwise.
 */
const PersonAvatar: React.FC<PersonAvatarProps> = ({ person, size = 20, className, style }) => {
  if (person.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.avatar_url}
        alt={person.name}
        className={`flex-none rounded-full object-cover ${className ?? ""}`}
        style={{ width: size, height: size, ...style }}
      />
    );
  }

  return (
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
};

export default PersonAvatar;
