"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, MessagesSquare, ThumbsUp } from "lucide-react";
import PersonAvatar from "../PersonAvatar";
import RichTextContent from "../drawer/RichTextContent";
import { boardOptionsService } from "@/services/board-options.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import type { BoardActivityUpdate } from "@/types/board-activity-log";
import { formatFullDate, formatLogTime, toAvatarPerson } from "./activityLogFormat";

export type ActivityLogUpdatesTabProps = {
  board_id: number;
  onOpenItem: (item_id: number) => void;
};

/**
 * The "Updates" tab: the updates posted on the board's items, newest first.
 * Each card names its item, which opens the item to read the whole thread.
 */
const ActivityLogUpdatesTab: React.FC<ActivityLogUpdatesTabProps> = ({ board_id, onOpenItem }) => {
  const [updates, setUpdates] = useState<BoardActivityUpdate[] | null>(null);
  const [page, setPage] = useState(1);
  const [has_more, setHasMore] = useState(false);
  const [is_loading, setIsLoading] = useState(false);
  const [load_error, setLoadError] = useState<string | null>(null);
  const request_id_ref = useRef(0);

  const loadPage = useCallback(
    async (next_page: number) => {
      const request_id = ++request_id_ref.current;
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await boardOptionsService.getActivityUpdates(board_id, next_page);
        if (request_id !== request_id_ref.current) return;
        setUpdates((current) => (next_page === 1 || !current ? response.data : [...current, ...response.data]));
        setPage(response.meta.current_page);
        setHasMore(response.meta.has_more);
      } catch (error) {
        if (request_id === request_id_ref.current) setLoadError(getApiErrorMessage(error, "We couldn't load the updates. Please try again."));
      } finally {
        if (request_id === request_id_ref.current) setIsLoading(false);
      }
    },
    [board_id]
  );

  useEffect(() => {
    void loadPage(1);
  }, [loadPage]);

  return (
    <div className="activity-log__tab-body">
      <div className="activity-log__scroll shell-scrollbar">
        {load_error && (
          <div role="alert" className="activity-log__error">
            {load_error}
            <button type="button" className="activity-log__text-button" onClick={() => void loadPage(1)}>
              Try again
            </button>
          </div>
        )}

        {updates === null && !load_error && <p className="activity-log__status">Loading...</p>}

        {updates !== null && updates.length === 0 && (
          <div className="activity-log__empty">
            <span className="activity-log__empty-icon">
              <MessagesSquare size={24} />
            </span>
            <h3 className="activity-log__empty-title">No updates yet</h3>
            <p className="activity-log__empty-text">Updates written on this board&apos;s items will show up here.</p>
          </div>
        )}

        {updates !== null && updates.length > 0 && (
          <ul className="activity-log__updates">
            {updates.map((update) => {
              const author_name = update.is_from_automations ? update.automation_name ?? "Automations" : update.author?.full_name ?? "Someone";
              return (
                <li key={update.id} className="activity-log__update">
                  <header className="activity-log__update-head">
                    {update.is_from_automations ? (
                      <span className="activity-log__bot">
                        <Bot size={16} strokeWidth={1.8} />
                      </span>
                    ) : (
                      <PersonAvatar person={toAvatarPerson(update.author)} size={32} />
                    )}
                    <span className="activity-log__update-meta">
                      <span className={`activity-log__update-author ${getDeactivatedClass(update.author?.is_deactivated)}`}>{author_name}</span>
                      <button type="button" className="activity-log__update-item" onClick={() => onOpenItem(update.item.id)} title={`Open ${update.item.name}`}>
                        {update.item.group && (
                          <span className="activity-log__group-dot" style={{ background: update.item.group.color ?? "#c4c4c4" }} aria-hidden="true" />
                        )}
                        <span className="activity-log__update-item-name">{update.item.name}</span>
                      </button>
                    </span>
                    <span className="activity-log__update-time" title={formatFullDate(update.created_at)}>
                      {formatLogTime(update.created_at)}
                      {update.edited_at && <span className="activity-log__update-edited"> (edited)</span>}
                    </span>
                  </header>
                  <div className="activity-log__update-body">
                    <RichTextContent html={update.body} />
                  </div>
                  <footer className="activity-log__update-foot">
                    <span title="Likes">
                      <ThumbsUp size={13} aria-hidden="true" /> {update.likes_count}
                    </span>
                    <button type="button" className="activity-log__text-button" onClick={() => onOpenItem(update.item.id)}>
                      <MessageCircle size={13} aria-hidden="true" />
                      {update.replies_count === 0 ? "Reply" : update.replies_count === 1 ? "1 reply" : `${update.replies_count} replies`}
                    </button>
                  </footer>
                </li>
              );
            })}
          </ul>
        )}

        {updates !== null && has_more && (
          <div className="activity-log__more">
            <button type="button" className="activity-log__secondary-button" onClick={() => void loadPage(page + 1)} disabled={is_loading}>
              {is_loading ? "Loading..." : "Load older updates"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogUpdatesTab;
