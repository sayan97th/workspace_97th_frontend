"use client";
import React, { useEffect, useState } from "react";
import { Eye, Search } from "lucide-react";
import PersonAvatar from "../PersonAvatar";
import { boardOptionsService } from "@/services/board-options.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import type { BoardActivityViewer } from "@/types/board-activity-log";
import { formatFullDate, formatLogTime, toAvatarPerson } from "./activityLogFormat";

export type ActivityLogLastViewedTabProps = {
  board_id: number;
  current_user_id: number | null;
};

/** Visits this recent count as "viewing now" and get the green dot. */
const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

/**
 * The "Last viewed" tab: everyone who opened the board and when they last
 * did, most recent first, like monday.com's.
 */
const ActivityLogLastViewedTab: React.FC<ActivityLogLastViewedTabProps> = ({ board_id, current_user_id }) => {
  const [viewers, setViewers] = useState<BoardActivityViewer[] | null>(null);
  const [load_error, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let is_cancelled = false;
    setLoadError(null);
    boardOptionsService
      .getActivityViewers(board_id)
      .then((data) => {
        if (!is_cancelled) setViewers(data);
      })
      .catch((error) => {
        if (!is_cancelled) setLoadError(getApiErrorMessage(error, "We couldn't load who viewed this board. Please try again."));
      });
    return () => {
      is_cancelled = true;
    };
  }, [board_id]);

  const normalized_query = query.trim().toLowerCase();
  const visible = (viewers ?? []).filter((viewer) => !normalized_query || viewer.user.full_name.toLowerCase().includes(normalized_query));

  return (
    <div className="activity-log__tab-body">
      <div className="activity-log__toolbar">
        <label className="activity-log__search activity-log__search--wide">
          <Search size={15} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" aria-label="Search by name" />
        </label>
        {viewers && <span className="activity-log__toolbar-note">{viewers.length === 1 ? "1 person" : `${viewers.length} people`}</span>}
      </div>

      <div className="activity-log__scroll shell-scrollbar">
        {load_error && (
          <div role="alert" className="activity-log__error">
            {load_error}
          </div>
        )}

        {!load_error && viewers === null && <p className="activity-log__status">Loading...</p>}

        {viewers !== null && viewers.length === 0 && (
          <div className="activity-log__empty">
            <span className="activity-log__empty-icon">
              <Eye size={24} />
            </span>
            <h3 className="activity-log__empty-title">No views yet</h3>
            <p className="activity-log__empty-text">People who open this board will show up here.</p>
          </div>
        )}

        {visible.length > 0 && (
          <table className="activity-log__viewers">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Last viewed</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((viewer) => {
                const is_active = Date.now() - new Date(viewer.visited_at).getTime() < ACTIVE_WINDOW_MS;
                return (
                  <tr key={viewer.user.id}>
                    <td>
                      <span className="activity-log__viewer">
                        <span className="activity-log__viewer-avatar">
                          <PersonAvatar person={toAvatarPerson(viewer.user)} size={30} />
                          {is_active && <span className="activity-log__presence" aria-label="Viewing recently" />}
                        </span>
                        <span className={`activity-log__viewer-name ${getDeactivatedClass(viewer.user.is_deactivated)}`}>{viewer.user.full_name}</span>
                        {viewer.user.id === current_user_id && <span className="activity-log__option-hint">You</span>}
                      </span>
                    </td>
                    <td className="activity-log__viewer-time" title={formatFullDate(viewer.visited_at)}>
                      {formatLogTime(viewer.visited_at) === "now" ? "just now" : formatLogTime(viewer.visited_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {viewers !== null && viewers.length > 0 && visible.length === 0 && <p className="activity-log__status">Nobody matches &quot;{query}&quot;.</p>}
      </div>
    </div>
  );
};

export default ActivityLogLastViewedTab;
