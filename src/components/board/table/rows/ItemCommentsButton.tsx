"use client";
import React, { useState } from "react";
import ItemDraftBadge from "./ItemDraftBadge";
import "./item-comments-button.scss";

interface ItemCommentsButtonProps {
  item_id: string;
  /** Total updates and replies on the row. Zero shows monday's "start conversation" bubble with a plus. */
  comment_count?: number;
  /** The viewer is `@mentioned` in one of those updates, which turns the bubble and its count blue. */
  is_mentioned?: boolean;
  /** Subitem rows use a slightly smaller bubble, like monday. */
  size?: "item" | "subitem";
  onOpen: (item_id: string) => void;
}

const formatCount = (count: number) => (count > 99 ? "99+" : String(count));

/**
 * Round speech bubble with its tail on the lower left, drawn on a 20 unit grid
 * that renders 1:1 at 20px so the 1.5px stroke stays sharp. The bubble is a
 * 7.5 radius circle centered at (10, 10); both ends of the arc sit on that
 * circle, so the tail joins it without a kink.
 */
const BUBBLE_PATH = "M6.6 16.7 A7.5 7.5 0 1 0 3.3 13.4 L1.75 18.25 Z";

/** The "start conversation" plus, centered on the bubble with even space on every side. */
const PLUS_PATH = "M10 7v6M7 10h6";

/** The row conversation icon. Rows without updates add a plus inside the bubble. */
function ItemCommentsIcon({ show_plus }: { show_plus: boolean }) {
  return (
    <svg
      className="item-comments-button__icon"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      shapeRendering="geometricPrecision"
      aria-hidden="true"
    >
      <path d={BUBBLE_PATH} />
      {show_plus && <path d={PLUS_PATH} />}
    </svg>
  );
}

/**
 * The chat bubble in every table row's updates column, monday's conversation
 * icon. A gray count badge means the row has updates, a blue one means the
 * viewer is tagged (@) in at least one of them, so a mention is easy to spot
 * while scanning a long board.
 */
const ItemCommentsButton: React.FC<ItemCommentsButtonProps> = ({
  item_id,
  comment_count = 0,
  is_mentioned = false,
  size = "item",
  onOpen,
}) => {
  const has_comments = comment_count > 0;
  const tone = has_comments && is_mentioned ? "mentioned" : "default";

  // A count that goes up while the row is on screen (a live update from `useBoardCommentCounts`)
  // pops the badge once. Tracked during render, React's "adjust state on prop change" pattern, and
  // the new key remounts the badge so its animation plays again on every bump. A row mounting with
  // a count, or a count going down, never animates.
  const [last_count, setLastCount] = useState(comment_count);
  const [bump_id, setBumpId] = useState(0);
  if (comment_count !== last_count) {
    setLastCount(comment_count);
    if (comment_count > last_count) setBumpId((current) => current + 1);
  }

  const label = !has_comments
    ? "Start conversation"
    : `Open updates, ${comment_count} ${comment_count === 1 ? "update" : "updates"}${is_mentioned ? ", you are mentioned" : ""}`;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen(item_id);
      }}
      aria-label={label}
      title={tone === "mentioned" ? "You were mentioned in this conversation" : undefined}
      className="item-comments-button"
      data-size={size}
      data-tone={tone}
      data-has-comments={has_comments ? "true" : "false"}
    >
      <ItemCommentsIcon show_plus={!has_comments} />
      {has_comments && (
        <span
          key={bump_id}
          className="item-comments-button__count"
          data-bumped={bump_id > 0 ? "true" : undefined}
          aria-hidden="true"
        >
          {formatCount(comment_count)}
        </span>
      )}
      <ItemDraftBadge item_id={item_id} />
    </button>
  );
};

export default ItemCommentsButton;
