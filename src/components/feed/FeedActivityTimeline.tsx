"use client";
import React, { useState } from "react";
import PersonAvatar from "@/components/board/PersonAvatar";
import { ChevronDownIcon } from "@/icons/workspace-icons";
import { getUserInitials } from "@/lib/user";
import type { FeedActivityEntry } from "@/data/update-feed-data";

export type FeedActivityTimelineProps = {
  /** The changes made to the item since the previous update on it, newest first. */
  entries: FeedActivityEntry[];
  /** How many changes there were in total, which can exceed the entries shown. */
  total: number;
};

/** The sentence for one change, e.g. "changed Status from Working on it to Done". */
function describeChange(entry: FeedActivityEntry): React.ReactNode {
  const strong = (text: string) => <strong className="font-semibold text-shell-text-secondary">{text}</strong>;

  if (entry.old_display && entry.new_display) {
    return (
      <>
        changed {strong(entry.column_label)} from {strong(entry.old_display)} to {strong(entry.new_display)}
      </>
    );
  }
  if (entry.new_display) {
    return (
      <>
        set {strong(entry.column_label)} to {strong(entry.new_display)}
      </>
    );
  }
  return (
    <>
      cleared {strong(entry.column_label)}
      {entry.old_display ? <> (was {strong(entry.old_display)})</> : null}
    </>
  );
}

/**
 * The item changes woven into a feed update: a collapsed line saying how many
 * cells changed on the item since the previous update, which opens into a
 * timeline of who changed what and when. Shows nothing for an update with no
 * changes behind it.
 */
const FeedActivityTimeline: React.FC<FeedActivityTimelineProps> = ({ entries, total }) => {
  const [is_expanded, setIsExpanded] = useState(false);

  if (total === 0 || entries.length === 0) return null;

  const hidden_count = total - entries.length;

  return (
    <div className="mt-3.5 rounded-[10px] border border-shell-border bg-shell-hover">
      <button
        type="button"
        onClick={() => setIsExpanded((previous) => !previous)}
        aria-expanded={is_expanded}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-semibold text-shell-text-muted transition-colors hover:text-shell-text"
      >
        <ChevronDownIcon size={11} className={`flex-none transition-transform ${is_expanded ? "rotate-180" : ""}`} />
        {total} {total === 1 ? "change" : "changes"} to this item before this update
      </button>

      {is_expanded && (
        <ol className="flex flex-col gap-2 border-t border-shell-border px-3 py-2.5">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-2 text-[12px] leading-[1.5] text-shell-text-muted">
              {entry.actor ? (
                <PersonAvatar
                  person={{
                    id: entry.actor.id ?? "0",
                    name: entry.actor.name,
                    initials: getUserInitials({ full_name: entry.actor.name }),
                    avatar_seed: Number(entry.actor.id) || 0,
                    avatar_url: entry.actor.avatar_url,
                  }}
                  size={18}
                  className="mt-px flex-none"
                />
              ) : (
                <span className="mt-px h-[18px] w-[18px] flex-none rounded-full bg-shell-hover-strong" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1">
                <strong className="font-semibold text-shell-text-secondary">{entry.actor?.name ?? "Automation"}</strong>{" "}
                {describeChange(entry)}
              </span>
              <span className="flex-none text-[11px] text-shell-text-faint">{entry.time_label}</span>
            </li>
          ))}
          {hidden_count > 0 && (
            <li className="pl-[26px] text-[11.5px] text-shell-text-faint">
              and {hidden_count} earlier {hidden_count === 1 ? "change" : "changes"}
            </li>
          )}
        </ol>
      )}
    </div>
  );
};

export default FeedActivityTimeline;
