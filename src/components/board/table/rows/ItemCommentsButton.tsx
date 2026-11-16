"use client";
import React from "react";
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
      <svg className="item-comments-button__icon" viewBox="0 0 18 18" aria-hidden="true">
        <path
          d="M2.2 8.1 a6.4 5.4 0 1 1 3.4 4.8 L2.4 13.9 l1 -3 a5.2 5.2 0 0 1 -1.2 -2.8 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        {!has_comments && <path d="M9 5.9 V10.1 M6.9 8 H11.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />}
      </svg>
      {has_comments && (
        <span className="item-comments-button__count" aria-hidden="true">
          {formatCount(comment_count)}
        </span>
      )}
      <ItemDraftBadge item_id={item_id} />
    </button>
  );
};

export default ItemCommentsButton;
