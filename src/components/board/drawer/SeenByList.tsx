"use client";
import React, { useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import PersonAvatar from "../PersonAvatar";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import { formatRelativeTime } from "./commentMapping";
import type { DrawerSeenBy } from "./types";

export type SeenByListProps = {
  seen_by: DrawerSeenBy[];
};

/** How many avatars the stack shows before it collapses into "+N". */
const MAX_STACKED_AVATARS = 3;

const formatSeenTime = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

/**
 * The "seen by" avatar stack under an update. It is a button: opening it lists
 * everyone who has seen the update, newest first, each with when they did, so a
 * poster can tell who still has to catch up.
 */
const SeenByList: React.FC<SeenByListProps> = ({ seen_by }) => {
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const [is_open, setIsOpen] = useState(false);

  if (seen_by.length === 0) return null;

  // People with a known time first, newest seen on top.
  const ordered = [...seen_by].sort((a, b) => Date.parse(b.seen_at ?? "") - Date.parse(a.seen_at ?? "") || 0);

  return (
    <>
      <button
        ref={trigger_ref}
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-haspopup="dialog"
        aria-expanded={is_open}
        aria-label={`Seen by ${seen_by.length} ${seen_by.length === 1 ? "person" : "people"}`}
        title="See who has seen this update"
        className="flex items-center -space-x-1.5 rounded-full"
      >
        {seen_by.slice(0, MAX_STACKED_AVATARS).map((person) => (
          <PersonAvatar key={person.id} person={person} size={19} className="ring-2 ring-shell-panel-alt" />
        ))}
        {seen_by.length > MAX_STACKED_AVATARS && (
          <span className="flex h-[19px] w-[19px] items-center justify-center rounded-full bg-shell-hover-strong text-[9px] font-bold text-shell-text-muted ring-2 ring-shell-panel-alt">
            +{seen_by.length - MAX_STACKED_AVATARS}
          </span>
        )}
      </button>
      <BoardPopover anchor_el={trigger_ref.current} is_open={is_open} onClose={() => setIsOpen(false)} width={272} align="end">
        <div role="dialog" aria-label="Seen by" className="p-3">
          <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-shell-text-faint">
            Seen by {seen_by.length} {seen_by.length === 1 ? "person" : "people"}
          </div>
          <ul className="shell-scrollbar flex max-h-[260px] flex-col gap-1 overflow-y-auto">
            {ordered.map((person) => (
              <li key={person.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
                <PersonAvatar person={person} size={24} />
                <span className={`min-w-0 flex-1 truncate text-[13px] font-medium text-shell-text ${getDeactivatedClass(person.is_deactivated)}`}>
                  {person.name}
                </span>
                {person.seen_at && (
                  <span className="flex-none text-[11px] text-shell-text-faint" title={formatSeenTime(person.seen_at)}>
                    {formatRelativeTime(person.seen_at)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </BoardPopover>
    </>
  );
};

export default SeenByList;
