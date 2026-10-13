"use client";
import React, { useState } from "react";
import { ClockIcon, ChevronDownIcon } from "@/icons/workspace-icons";
import RichTextContent from "./RichTextContent";
import { formatScheduledTime, toDateTimeLocalValue } from "./scheduleFormat";
import type { DrawerScheduledComment } from "./types";
import "./board-drawer.css";

export type ScheduledCommentsPanelProps = {
  scheduled_comments: DrawerScheduledComment[];
  onReschedule: (comment_id: string, scheduled_at: string) => Promise<void>;
  onSendNow: (comment_id: string) => Promise<void>;
  onCancel: (comment_id: string) => Promise<void>;
};

const ACTION_CLASS = "update-scheduled__action";

/**
 * The viewer's own comments and replies waiting to be sent, as a collapsible
 * strip above the thread. Each row shows when it goes out and offers to send it
 * now, move it to another time, or cancel it. Renders nothing when nothing is
 * scheduled.
 */
const ScheduledCommentsPanel: React.FC<ScheduledCommentsPanelProps> = ({ scheduled_comments, onReschedule, onSendNow, onCancel }) => {
  const [is_expanded, setIsExpanded] = useState(true);
  const [editing_id, setEditingId] = useState<string | null>(null);
  const [edit_value, setEditValue] = useState("");
  const [busy_id, setBusyId] = useState<string | null>(null);

  if (scheduled_comments.length === 0) return null;

  const runFor = async (comment_id: string, action: () => Promise<void>) => {
    setBusyId(comment_id);
    try {
      await action();
    } finally {
      setBusyId(null);
    }
  };

  const startRescheduling = (entry: DrawerScheduledComment) => {
    setEditingId(entry.id);
    setEditValue(toDateTimeLocalValue(new Date(entry.scheduled_at)));
  };

  const saveReschedule = (comment_id: string) => {
    const date = new Date(edit_value);
    if (!edit_value || Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return;
    setEditingId(null);
    void runFor(comment_id, () => onReschedule(comment_id, date.toISOString()));
  };

  return (
    <section aria-label="Scheduled updates" className="update-scheduled">
      <button
        type="button"
        onClick={() => setIsExpanded((previous) => !previous)}
        aria-expanded={is_expanded}
        className="update-scheduled__toggle"
      >
        <ClockIcon size={15} className="text-[var(--bd-link)]" />
        {scheduled_comments.length} scheduled {scheduled_comments.length === 1 ? "update" : "updates"}
        <ChevronDownIcon size={11} className={`ml-auto transition-transform ${is_expanded ? "rotate-180" : ""}`} />
      </button>

      {is_expanded && (
        <ul className="update-scheduled__list">
          {scheduled_comments.map((entry) => {
            const is_editing = editing_id === entry.id;
            const is_busy = busy_id === entry.id;
            return (
              <li key={entry.id} className="update-scheduled__item">
                <div className="flex items-center gap-2 text-[12px] text-[var(--bd-text-faint)]">
                  <span className="update-scheduled__when">Sends {formatScheduledTime(entry.scheduled_at)}</span>
                  {entry.parent_id !== null && <span className="update-card__badge">Reply</span>}
                </div>
                <div className="mt-1 max-h-[72px] overflow-hidden">
                  <RichTextContent html={entry.body} className="text-[13px] leading-[1.5] text-[var(--bd-text-secondary)]" />
                </div>

                {is_editing ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      type="datetime-local"
                      value={edit_value}
                      min={toDateTimeLocalValue(new Date())}
                      onChange={(event) => setEditValue(event.target.value)}
                      aria-label="New send time"
                      className="update-scheduled__input"
                    />
                    <button
                      type="button"
                      onClick={() => saveReschedule(entry.id)}
                      className="board-drawer__button board-drawer__button--primary board-drawer__button--small"
                    >
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className={ACTION_CLASS}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mt-1.5 flex flex-wrap items-center gap-0.5">
                    <button type="button" disabled={is_busy} onClick={() => void runFor(entry.id, () => onSendNow(entry.id))} className={ACTION_CLASS}>
                      Send now
                    </button>
                    <button type="button" disabled={is_busy} onClick={() => startRescheduling(entry)} className={ACTION_CLASS}>
                      Reschedule
                    </button>
                    <button type="button" disabled={is_busy} onClick={() => void runFor(entry.id, () => onCancel(entry.id))} className={ACTION_CLASS} data-tone="danger">
                      Cancel send
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default ScheduledCommentsPanel;
