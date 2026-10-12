import React from "react";
import { UsersRound } from "lucide-react";

export type TeamAvatarProps = {
  name: string;
  picture_url: string | null;
  /** Diameter in pixels. */
  size?: number;
  /** White ring so stacked avatars read apart, used in the "All users" Teams column. */
  has_ring?: boolean;
  className?: string;
};

/**
 * A team's round picture, or monday's default "group of people" glyph when the team has none.
 */
const TeamAvatar: React.FC<TeamAvatarProps> = ({ name, picture_url, size = 32, has_ring = false, className = "" }) => (
  <span
    className={`teams-avatar${has_ring ? " teams-avatar-ringed" : ""} ${className}`}
    style={{ width: size, height: size }}
    title={has_ring ? name : undefined}
  >
    {picture_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={picture_url} alt={name} />
    ) : (
      <UsersRound size={Math.round(size * 0.55)} strokeWidth={1.75} aria-hidden="true" />
    )}
  </span>
);

export default TeamAvatar;
