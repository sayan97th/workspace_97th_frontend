import type { CSSProperties } from "react";
import { CommentIcon } from "./icons";

interface CommentCountButtonProps {
  comment_count: number;
  onClick?: () => void;
  /** Matches each caller's own accent color (e.g. `TreeGroupTable`'s per-group color, `FlatGroupTable`'s fixed green) rather than a single hardcoded hover/badge color. */
  accent_color?: string;
}

/**
 * The row chat icon shared by `ItemRow`/`SubitemRow`/`FlatGroupTable` — opens
 * the item's comment thread and, once it has any comments, shows a small
 * count badge on the icon's corner (mirrors the Kanban card's own
 * `comment_count` badge in `workspace-nav/TableBoardView.tsx`).
 */
const CommentCountButton = ({ comment_count, onClick, accent_color = "#4f6bed" }: CommentCountButtonProps) => {
  const has_comments = comment_count > 0;
  const button_style: CSSProperties & Record<"--comment-accent", string> = {
    "--comment-accent": accent_color,
    color: has_comments ? accent_color : undefined,
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={has_comments ? `${comment_count} comment${comment_count === 1 ? "" : "s"}` : "Add comment"}
      style={button_style}
      className="relative flex h-[26px] w-[26px] items-center justify-center rounded-[5px] text-[#a4aac2] hover:bg-[#eef1f9] hover:text-[var(--comment-accent)]"
    >
      <CommentIcon />
      {has_comments && (
        <span
          className="absolute -right-1 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-[3px] text-[9px] font-bold leading-none text-white"
          style={{ background: accent_color }}
        >
          {comment_count}
        </span>
      )}
    </button>
  );
};

export default CommentCountButton;
