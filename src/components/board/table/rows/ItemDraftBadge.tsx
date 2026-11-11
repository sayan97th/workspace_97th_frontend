"use client";
import React from "react";
import { useHasItemDraft } from "@/hooks/useCommentDrafts";
import "@/components/board/drawer/composer-draft.scss";

/**
 * The small amber pencil on a row's chat bubble while the item has an unsent
 * update or reply, Slack's "draft" marker on a channel, so a draft left
 * behind is easy to find again from the table.
 */
const ItemDraftBadge: React.FC<{ item_id: string }> = ({ item_id }) => {
  const has_draft = useHasItemDraft(item_id);
  if (!has_draft) return null;
  return (
    <span className="item-draft-badge" title="You have an unsent draft here" aria-label="Unsent draft">
      <svg width="8" height="8" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10.6 2.6a1.6 1.6 0 0 1 2.3 2.3L6 11.8l-3.4 1.6 1.6-3.4z" fill="currentColor" />
      </svg>
    </span>
  );
};

export default ItemDraftBadge;
