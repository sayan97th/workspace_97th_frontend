import React from "react";
import Link from "next/link";
import NavItemIcon from "@/components/workspace-nav/NavItemIcon";
import { buildBoardPath } from "@/components/workspace-nav/helpers";
import WorkspaceMonogram from "@/components/personal/WorkspaceMonogram";
import { StarIcon } from "@/icons/workspace-icons";
import type { RecentBoardDto, RecentBoardPreview } from "@/types/personal";
import { relativeTime } from "./homeSummary";
import ViewPreview from "./view-preview/ViewPreview";

const plural = (count: number, word: string): string => `${count.toLocaleString("en-US")} ${count === 1 ? word : `${word}s`}`;

/** The size of what the card previews, in the unit that fits its kind. */
const sizeLabel = (preview: RecentBoardPreview | null): string | null => {
  if (!preview) return null;
  switch (preview.kind) {
    case "doc":
    case "doc_page":
      return plural(preview.doc?.word_count ?? 0, "word");
    case "workspace":
      return plural(preview.workspace?.board_count ?? 0, "board");
    case "form":
      return plural(preview.form?.question_count ?? 0, "question");
    case "file_gallery":
      return plural(preview.files?.file_count ?? 0, "file");
    default:
      return plural(preview.item_count, "item");
  }
};

type RecentBoardCardProps = {
  board: RecentBoardDto;
  onToggleFavorite: (board: RecentBoardDto) => void;
};

/** One "Recently visited" board: a live preview of its last opened tab, its name, workspace and when it was opened. */
const RecentBoardCard: React.FC<RecentBoardCardProps> = ({ board, onToggleFavorite }) => {
  const size_label = sizeLabel(board.preview);

  return (
    <li className="home-board-card">
      <Link href={buildBoardPath(board.id)} className="flex flex-1 flex-col outline-none" title={board.label}>
        <ViewPreview preview={board.preview} board_label={board.label} workspace={board.workspace} />
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
            {size_label && <span className="flex-none">{size_label}</span>}
            {size_label && <span aria-hidden="true">·</span>}
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
