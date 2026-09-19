"use client";
import React, { useState } from "react";
import { ClockIcon, ChevronDownIcon } from "@/icons/workspace-icons";
import RichTextContent from "./RichTextContent";
import { formatScheduledTime, toDateTimeLocalValue } from "./scheduleFormat";
import type { DrawerScheduledComment } from "./types";

export type ScheduledCommentsPanelProps = {
  scheduled_comments: DrawerScheduledComment[];
  onReschedule: (comment_id: string, scheduled_at: string) => Promise<void>;
  onSendNow: (comment_id: string) => Promise<void>;
  onCancel: (comment_id: string) => Promise<void>;
};

const ACTION_CLASS =
  "rounded-[7px] px-2 py-1 text-[12px] font-semibold text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text disabled:cursor-not-allowed disabled:opacity-40";

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
    <section aria-label="Scheduled updates" className="mt-3 rounded-[12px] border border-shell-border bg-shell-hover">
      <button
        type="button"
        onClick={() => setIsExpanded((previous) => !previous)}
        aria-expanded={is_expanded}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-semibold text-shell-text-secondary"
      >
        <ClockIcon size={14} className="text-[#7fb2ff]" />
        {scheduled_comments.length} scheduled {scheduled_comments.length === 1 ? "update" : "updates"}
        <ChevronDownIcon size={11} className={`ml-auto transition-transform ${is_expanded ? "rotate-180" : ""}`} />
      </button>

      {is_expanded && (
        <ul className="flex flex-col divide-y divide-shell-border border-t border-shell-border">
          {scheduled_comments.map((entry) => {
            const is_editing = editing_id === entry.id;
            const is_busy = busy_id === entry.id;
            return (
              <li key={entry.id} className="px-3 py-2.5">
                <div className="flex items-center gap-2 text-[11.5px] text-shell-text-faint">
                  <span className="font-semibold text-[#7fb2ff]">Sends {formatScheduledTime(entry.scheduled_at)}</span>
                  {entry.parent_id !== null && <span className="rounded-[5px] bg-shell-hover-strong px-[5px] py-px text-[9.5px] font-bold uppercase tracking-wide">Reply</span>}
                </div>
                <div className="mt-1 max-h-[72px] overflow-hidden">
                  <RichTextContent html={entry.body} className="text-[12.5px] leading-[1.5] text-shell-text-secondary" />
                </div>

                {is_editing ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      type="datetime-local"
                      value={edit_value}
                      min={toDateTimeLocalValue(new Date())}
                      onChange={(event) => setEditValue(event.target.value)}
                      aria-label="New send time"
                      className="rounded-[8px] border border-shell-border bg-shell-panel-alt px-2.5 py-1.5 text-[12.5px] text-shell-text focus:border-brand-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => saveReschedule(entry.id)}
                      className="rounded-[8px] bg-brand-500 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600"
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
                    <button type="button" disabled={is_busy} onClick={() => void runFor(entry.id, () => onCancel(entry.id))} className={`${ACTION_CLASS} hover:!text-[#e2445c]`}>
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
