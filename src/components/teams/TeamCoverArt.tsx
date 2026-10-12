import React from "react";

/** Dot grid drawn in one corner of the default cover. */
const DotGrid: React.FC<{ x: number; y: number; columns: number; rows: number }> = ({ x, y, columns, rows }) => (
  <g fill="var(--teams-cover-dots)">
    {Array.from({ length: rows }).flatMap((_, row_index) =>
      Array.from({ length: columns }).map((__, column_index) => (
        <circle key={`${row_index}-${column_index}`} cx={x + column_index * 26} cy={y + row_index * 26} r={4} />
      ))
    )}
  </g>
);

/**
 * The cover shown above a team that has no cover image of its own: monday's light blue banner
 * with large shapes and white dot grids, drawn as SVG so it scales to any width and follows the
 * theme tokens.
 */
const TeamCoverArt: React.FC = () => (
  <svg viewBox="0 0 1200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="1200" height="200" fill="var(--teams-cover-sky)" />
    <circle cx="330" cy="-10" r="170" fill="var(--teams-cover-shape)" />
    <path d="M520 200 C 600 120, 760 60, 880 200 Z" fill="var(--teams-cover-shape)" />
    <circle cx="1140" cy="60" r="150" fill="var(--teams-cover-shape)" />
    <DotGrid x={300} y={20} columns={9} rows={4} />
    <DotGrid x={900} y={110} columns={9} rows={4} />
  </svg>
);

export default TeamCoverArt;
