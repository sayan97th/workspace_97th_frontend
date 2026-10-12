import React from "react";
import Link from "next/link";
import NavItemIcon from "@/components/workspace-nav/NavItemIcon";
import { buildBoardPath } from "@/components/workspace-nav/helpers";
import WorkspaceMonogram from "@/components/personal/WorkspaceMonogram";
import { StarIcon } from "@/icons/workspace-icons";
import type { RecentBoardDto, RecentBoardPreview } from "@/types/personal";
import { relativeTime } from "./homeSummary";

/** Rows the thumbnail has room for, shared between the groups it draws. */
const THUMB_ROW_BUDGET = 6;

/** Drawn when a board has no groups yet, so the card never looks broken. */
const PLACEHOLDER_GROUPS = [
  { id: -1, color: "#579bfc", rows: 2, is_placeholder: true },
  { id: -2, color: "#a25ddc", rows: 1, is_placeholder: true },
];

/**
 * Turns the board's groups into thumbnail blocks: every group gets at least
 * one row, the rest of the budget follows each group's item count.
 */
const thumbnailGroups = (preview: RecentBoardPreview | null) => {
  const groups = preview?.groups ?? [];
  if (groups.length === 0) return PLACEHOLDER_GROUPS;

  const visible_groups = groups.slice(0, 3);
  let rows_left = THUMB_ROW_BUDGET - visible_groups.length;
  return visible_groups.map((group) => {
    const extra_rows = Math.min(rows_left, Math.max(0, Math.min(group.item_count, 3) - 1));
    rows_left -= extra_rows;
    return { id: group.id, color: group.color || "#c4c4c4", rows: 1 + extra_rows, is_placeholder: group.item_count === 0 };
  });
};

/** A mini board drawn from the board's real groups, colors and item counts. */
const BoardThumbnail: React.FC<{ preview: RecentBoardPreview | null }> = ({ preview }) => (
  <div className="home-board-thumb" aria-hidden="true">
    {thumbnailGroups(preview).map((group) => (
      <div key={group.id} className="flex flex-col gap-[3px]" style={{ "--home-thumb-color": group.color } as React.CSSProperties}>
        <span className="home-thumb-group-title w-[38%]" />
        {Array.from({ length: group.rows }, (_, index) => (
          <span key={index} className="home-thumb-row" data-placeholder={group.is_placeholder}>
            <span />
            <span />
            <span />
          </span>
        ))}
      </div>
    ))}
  </div>
);

const itemCountLabel = (preview: RecentBoardPreview | null): string | null => {
  if (!preview) return null;
  return `${preview.item_count} ${preview.item_count === 1 ? "item" : "items"}`;
};

type RecentBoardCardProps = {
  board: RecentBoardDto;
  onToggleFavorite: (board: RecentBoardDto) => void;
};

/** One "Recently visited" board: a live thumbnail, its name, workspace and when it was opened. */
const RecentBoardCard: React.FC<RecentBoardCardProps> = ({ board, onToggleFavorite }) => {
  const item_count_label = itemCountLabel(board.preview);

  return (
    <li className="home-board-card">
      <Link href={buildBoardPath(board.id)} className="flex flex-1 flex-col outline-none" title={board.label}>
        <BoardThumbnail preview={board.preview} />
        <span className="home-board-meta">
          <span className="home-board-name">
            <NavItemIcon source={{ ...board, type: "leaf" }} size={16} className="text-[var(--home-text-secondary)]" />
            <span className="truncate">{board.label}</span>
          </span>
          <span className="home-board-sub">
            <WorkspaceMonogram workspace={board.workspace} size={16} />
            <span className="truncate">{board.workspace?.name ?? "Workspace"}</span>
          </span>
          <span className="home-board-sub text-[var(--home-text-faint)]">
            {item_count_label && <span className="flex-none">{item_count_label}</span>}
            {item_count_label && <span aria-hidden="true">·</span>}
            <span className="truncate">Visited {relativeTime(board.visited_at)}</span>
          </span>
        </span>
      </Link>
      <button
        type="button"
        className="home-icon-button"
        onClick={() => onToggleFavorite(board)}
        aria-pressed={board.is_favorite}
        aria-label={board.is_favorite ? `Remove ${board.label} from favorites` : `Add ${board.label} to favorites`}
      >
        <StarIcon filled={board.is_favorite} size={15} />
      </button>
    </li>
  );
};

export default RecentBoardCard;
