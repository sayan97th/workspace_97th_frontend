import React from "react";

/**
 * Gradient palette reused for stacked team avatars and person pickers across the board.
 * Ordered to match the approved design's account people list (one distinct gradient per
 * person), so a person's avatar color is stable everywhere they appear.
 */
export const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#E5623E,#8A2018)",
  "linear-gradient(135deg,#5B7C99,#2E4257)",
  "linear-gradient(135deg,#7E5BEF,#4A2F9A)",
  "linear-gradient(135deg,#6B9C8A,#347A5A)",
  "linear-gradient(135deg,#C6913B,#7A5A34)",
  "linear-gradient(135deg,#9C6BA0,#5A347A)",
  "linear-gradient(135deg,#6B7C9C,#34477A)",
  "linear-gradient(135deg,#D13B7D,#8A1E4E)",
  "linear-gradient(135deg,#3BB0C2,#1E6E7A)",
  "linear-gradient(135deg,#E0913B,#8A4A18)",
  "linear-gradient(135deg,#4A8FE0,#1E4C8A)",
  "linear-gradient(135deg,#E05B8A,#8A1E4E)",
  "linear-gradient(135deg,#5BB88A,#2E7A4A)",
  "linear-gradient(135deg,#8A6BE0,#4A2F9A)",
  "linear-gradient(135deg,#C25B5B,#7A2E2E)",
  "linear-gradient(135deg,#3B9C8A,#1E6E5A)",
  "linear-gradient(135deg,#B0713B,#7A4A18)",
  "linear-gradient(135deg,#5B7CE0,#2E447A)",
  "linear-gradient(135deg,#E0713B,#8A3A18)",
];

/**
 * Flat, solid-color counterpart to {@link AVATAR_GRADIENTS} — matches the
 * client-approved "Table board tree subitems" design's avatar treatment
 * (see `design/desing_3/Table_board_tree_subitems.dc.html`), which uses flat
 * per-person hex fills rather than diagonal gradients. Same length and
 * seed/hash indexing scheme as {@link AVATAR_GRADIENTS} so callers can swap
 * palettes without changing how a person's color is picked.
 */
export const AVATAR_COLORS = [
  "#4f6bed",
  "#7b52c9",
  "#2f9e78",
  "#e0723f",
  "#c94f7c",
  "#3a8fc9",
  "#b0393f",
  "#5b7c99",
  "#6b9c8a",
  "#c6913b",
  "#9c6ba0",
  "#6b7c9c",
  "#d13b7d",
  "#3bb0c2",
  "#e0913b",
  "#4a8fe0",
  "#5bb88a",
  "#8a6be0",
  "#c25b5b",
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
  ringColor = "var(--color-shell-bg)",
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
      <span className="flex h-[27px] w-[27px] flex-none items-center justify-center rounded-full bg-shell-panel-alt text-[10px] font-semibold text-shell-text-secondary">
        +{extra}
      </span>
    ) : null}
  </div>
);

export default TeamAvatars;
