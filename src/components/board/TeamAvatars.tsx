import React from "react";

/** Gradient palette reused for stacked team avatars across the board. */
export const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#E5623E,#8A2018)",
  "linear-gradient(135deg,#5B7C99,#2E4257)",
  "linear-gradient(135deg,#6B9C8A,#347A5A)",
  "linear-gradient(135deg,#9C6BA0,#5A347A)",
  "linear-gradient(135deg,#C6913B,#7A5A34)",
  "linear-gradient(135deg,#6B7C9C,#34477A)",
];

export type TeamAvatarsProps = {
  /** Number of avatars to render. */
  count: number;
  /** Optional "+N" overflow badge shown after the avatars. */
  extra?: number;
  /** Seed so different rows start from a different gradient. */
  seed?: number;
  /** Border colour matching the row background so avatars appear stacked. */
  ringColor?: string;
};

/** Circular, overlapping team avatars for the "Team" column. */
const TeamAvatars: React.FC<TeamAvatarsProps> = ({
  count,
  extra,
  seed = 0,
  ringColor = "#0c1b1a",
}) => (
  <div className="flex items-center gap-[3px]">
    {Array.from({ length: count }).map((_, index) => (
      <span
        key={index}
        className="h-[27px] w-[27px] flex-none rounded-full border-2"
        style={{
          background: AVATAR_GRADIENTS[(seed + index) % AVATAR_GRADIENTS.length],
          borderColor: ringColor,
        }}
      />
    ))}
    {extra ? (
      <span className="flex h-[27px] w-[27px] flex-none items-center justify-center rounded-full bg-[#233433] text-[10px] font-semibold text-[#c7d0d0]">
        +{extra}
      </span>
    ) : null}
  </div>
);

export default TeamAvatars;
