"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatRelativeTime } from "@/components/board/drawer/commentMapping";
import { markdownToPlainText } from "@/components/board/drawer/commentFilters";
import { buildBoardPath } from "@/components/workspace-nav/helpers";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useCommentDraftOwner, useCommentDraftsVersion } from "@/hooks/useCommentDrafts";
import { commentDraftStore } from "@/lib/comment-drafts";
import { commentDraftsService, type CommentDraftListDto } from "@/services/comment-drafts.service";
import "./feed-drafts.scss";

export type FeedDraftsListProps = {
  /** Sidebar board filter, the feed's `"all-boards"` (or unset) lists every board. */
  board_filter?: string;
  all_boards_id: string;
  /** Closes the inbox when a draft is opened. */
  onNavigate: () => void;
};

const PencilIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M10.6 2.6a1.6 1.6 0 0 1 2.3 2.3L6 11.8l-3 .8.8-3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M9.4 3.8l2.3 2.3M8.5 13.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

/** Where a draft opens: its item (or the board discussion), scrolled to the update a reply draft answers. */
const draftHref = (draft: CommentDraftListDto): string => {
  const board_path = buildBoardPath(draft.board_id);
  if (draft.item_id === null) return draft.parent_id === null ? `${board_path}?discussion=open` : `${board_path}?update=${draft.parent_id}`;
  const item_path = `${board_path}/pulses/${draft.item_id}`;
  return draft.parent_id === null ? item_path : `${item_path}?comment=${draft.parent_id}`;
};

/**
 * The Update feed's "Drafts" tab, Slack's Drafts list: every update and reply
 * the user started and did not send, newest first, with where it lives, a
 * preview, when it was last changed, a link that opens it right where it was
 * left, and Discard. Text typed in this browser and not synced yet shows its
 * newest version.
 */
const FeedDraftsList: React.FC<FeedDraftsListProps> = ({ board_filter, all_boards_id, onNavigate }) => {
  useCommentDraftOwner();
  useCommentDraftsVersion();
  const { info: toastInfo, error: toastError } = useToast();
  const [drafts, setDrafts] = useState<CommentDraftListDto[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [load_error, setLoadError] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    // Whatever is still waiting to save goes first, so the list is current.
    commentDraftStore.flushAll();
    setIsLoading(true);
    setLoadError(null);
    try {
      setDrafts(await commentDraftsService.listAllDrafts());
    } catch {
      setLoadError("Couldn't load your drafts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  // This browser's copy wins when it is newer (typed elsewhere on the page and not synced yet).
  const visible_drafts = useMemo(
    () =>
      drafts
        .filter((draft) => !board_filter || board_filter === all_boards_id || String(draft.board_id) === board_filter)
        .map((draft) => {
          const local = commentDraftStore.getDraft({ board_id: draft.board_id, item_id: draft.item_id, parent_id: draft.parent_id });
          const server_time = draft.updated_at ? Date.parse(draft.updated_at) : 0;
          return local && local.updated_at > server_time
            ? { ...draft, body: local.body, updated_at: new Date(local.updated_at).toISOString() }
            : draft;
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drafts, board_filter, all_boards_id, commentDraftStore.getVersion()]
  );

  const discard = async (draft: CommentDraftListDto) => {
    const previous = drafts;
    setDrafts((current) => current.filter((entry) => entry.id !== draft.id));
    commentDraftStore.forgetDraft({ board_id: draft.board_id, item_id: draft.item_id, parent_id: draft.parent_id });
    try {
      await commentDraftsService.discardDraftById(draft.id);
      toastInfo("Draft discarded");
    } catch {
      setDrafts(previous);
      toastError("Couldn't discard the draft. Please try again.");
    }
  };

  if (is_loading && drafts.length === 0) {
    return (
      <div className="uf-skeletons" aria-label="Loading drafts">
        {[0, 1].map((index) => (
          <div key={index} className="uf-skeleton feed-drafts__skeleton" />
        ))}
      </div>
    );
  }

  if (load_error) {
    return (
      <div className="uf-empty">
        <p className="uf-empty__title">{load_error}</p>
        <button type="button" onClick={() => void loadDrafts()} className="uf-empty__action">
          Try again
        </button>
      </div>
    );
  }

  if (visible_drafts.length === 0) {
    return (
      <div className="uf-empty">
        <span className="uf-empty__icon" aria-hidden="true">
          <PencilIcon size={26} />
        </span>
        <p className="uf-empty__title">No drafts</p>
        <p className="uf-empty__text">
          Anything you start writing in an update or a reply and do not send is saved here, so you can pick it up where you left off.
        </p>
      </div>
    );
  }

  return (
    <ul className="feed-drafts" aria-label="Drafts">
      {visible_drafts.map((draft) => {
        const href = draftHref(draft);
        const place = draft.item_id === null ? "Board updates" : draft.item_name ?? "Item";
        const preview = markdownToPlainText(draft.body) || "Image";
        return (
          <li key={draft.id} className="feed-draft">
            <span className="feed-draft__icon" aria-hidden="true">
              <PencilIcon />
            </span>
            <div className="feed-draft__body">
              <div className="feed-draft__meta">
                <span className="feed-draft__crumbs">
                  {draft.workspace_name && <span className="feed-draft__crumb">{draft.workspace_name}</span>}
                  <span className="feed-draft__crumb">{draft.board_name ?? "Board"}</span>
                  <span className="feed-draft__crumb feed-draft__crumb--strong">{place}</span>
                </span>
                <span className="feed-draft__time">{draft.updated_at ? formatRelativeTime(draft.updated_at) : ""}</span>
              </div>
              {draft.parent_id !== null && <span className="feed-draft__kind">Reply</span>}
              <Link href={href} onClick={onNavigate} className="feed-draft__preview" title="Open and keep writing">
                {preview}
              </Link>
              <div className="feed-draft__actions">
                <Link href={href} onClick={onNavigate} className="feed-draft__open">
                  Keep writing
                </Link>
                <button type="button" onClick={() => void discard(draft)} className="feed-draft__discard">
                  Discard
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default FeedDraftsList;
