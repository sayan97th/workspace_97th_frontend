"use client";
import React from "react";
import { Bot, ChevronRight, Clock } from "lucide-react";
import PersonAvatar from "../PersonAvatar";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import type { BoardActivityEntry, BoardActivityValue } from "@/types/board-activity-log";
import { formatFullDate, formatLogTime, presentEvent, subjectOf, toAvatarPerson } from "./activityLogFormat";

export type ActivityLogEntryRowProps = {
  entry: BoardActivityEntry;
  is_undoing: boolean;
  onUndo: (entry: BoardActivityEntry) => void;
  onOpenItem: (item_id: number) => void;
};

/** Most avatars drawn for one side of a People change, the rest become "+N". */
const MAX_PEOPLE = 3;

/** One side of a change: a colored label chip, people avatars, or plain text. Empty draws monday's gray bar. */
const ValueChip: React.FC<{ value: BoardActivityValue | null; is_label: boolean }> = ({ value, is_label }) => {
  const text = value?.text ?? null;

  if (value?.people && value.people.length > 0) {
    const shown = value.people.slice(0, MAX_PEOPLE);
    const names = value.people.map((person) => person.full_name).join(", ");
    return (
      <span className="activity-log__value activity-log__value--people" title={names}>
        <span className="activity-log__people-stack">
          {shown.map((person) => (
            <PersonAvatar key={person.id} person={toAvatarPerson(person)} size={22} />
          ))}
          {value.people.length > MAX_PEOPLE && <span className="activity-log__people-more">+{value.people.length - MAX_PEOPLE}</span>}
        </span>
        {value.people.length === 1 && <span className="activity-log__value-text">{shown[0].full_name}</span>}
      </span>
    );
  }

  if (is_label) {
    return (
      <span
        className="activity-log__value activity-log__value--label"
        data-empty={text ? undefined : true}
        style={text && value?.color ? { background: value.color } : undefined}
        title={text ?? "Empty"}
      >
        {text ?? ""}
      </span>
    );
  }

  if (!text) return <span className="activity-log__value activity-log__value--blank" title="Empty" aria-label="Empty" />;

  return (
    <span className="activity-log__value activity-log__value--text" title={text}>
      {text}
    </span>
  );
};

/** The right side of a row: old value › new value, or what the event did. */
const ChangeDetail: React.FC<{ entry: BoardActivityEntry }> = ({ entry }) => {
  if (entry.action === "item_group_changed") {
    return (
      <span className="activity-log__sentence">
        {entry.old_value?.text && (
          <>
            From group{" "}
            <strong style={{ color: entry.old_value.color ?? undefined }} title={entry.old_value.text}>
              {entry.old_value.text}
            </strong>{" "}
          </>
        )}
        to{" "}
        <strong style={{ color: entry.new_value?.color ?? undefined }} title={entry.new_value?.text ?? ""}>
          {entry.new_value?.text ?? "another group"}
        </strong>
      </span>
    );
  }

  if (entry.source === "cell" || entry.old_value || entry.new_value) {
    const is_label = entry.column?.type === "status" || entry.column?.type === "label";
    return (
      <span className="activity-log__change">
        <ValueChip value={entry.old_value} is_label={is_label} />
        <ChevronRight size={14} className="activity-log__change-arrow" aria-label="changed to" />
        <ValueChip value={entry.new_value} is_label={is_label} />
      </span>
    );
  }

  const group = entry.item?.group ?? entry.group;
  if (entry.item && group?.name) {
    const preposition = entry.action === "item_created" || entry.action === "item_duplicated" || entry.action === "item_restored" ? "In group" : "From group";
    return (
      <span className="activity-log__sentence">
        {preposition}{" "}
        <strong style={{ color: group.color ?? undefined }} title={group.name}>
          {group.name}
        </strong>
      </span>
    );
  }

  return (
    <span className="activity-log__sentence activity-log__sentence--muted" title={entry.description ?? ""}>
      {entry.description}
    </span>
  );
};

/**
 * One row of the board Activity log, laid out like monday.com's: when, who,
 * which item, which column or event, the value before and after, and Undo.
 */
const ActivityLogEntryRow: React.FC<ActivityLogEntryRowProps> = ({ entry, is_undoing, onUndo, onOpenItem }) => {
  const event = presentEvent(entry);
  const subject = subjectOf(entry);
  const actor_name = entry.automation ? `Automation: ${entry.automation.name}` : entry.user?.full_name ?? "Someone";
  const can_open_item = subject.is_item && entry.item !== null && !entry.item.is_deleted;

  return (
    <li className="activity-log__row" data-undone={entry.undone_at ? true : undefined}>
      <span className="activity-log__time" title={formatFullDate(entry.created_at)}>
        <Clock size={13} strokeWidth={1.8} aria-hidden="true" />
        {formatLogTime(entry.created_at)}
      </span>

      <span className="activity-log__actor" title={actor_name}>
        {entry.automation ? (
          <span className="activity-log__bot" aria-label={actor_name}>
            <Bot size={16} strokeWidth={1.8} />
          </span>
        ) : (
          <PersonAvatar person={toAvatarPerson(entry.user)} size={30} />
        )}
      </span>

      <span className="activity-log__subject">
        {can_open_item ? (
          <button type="button" className="activity-log__subject-link" onClick={() => onOpenItem(entry.item!.id)} title={`Open ${subject.name}`}>
            {subject.name}
          </button>
        ) : (
          <span
            className="activity-log__subject-text"
            data-deleted={entry.item?.is_deleted || undefined}
            style={subject.color ? { color: subject.color } : undefined}
            title={subject.name}
          >
            {subject.name}
          </span>
        )}
        <span className={`activity-log__actor-name ${getDeactivatedClass(entry.user?.is_deactivated)}`}>{actor_name}</span>
      </span>

      <span className="activity-log__event" title={event.label}>
        <span className="activity-log__event-icon" aria-hidden="true">
          {event.icon}
        </span>
        <span className="activity-log__event-label">{event.label}</span>
      </span>

      <span className="activity-log__detail">
        <ChangeDetail entry={entry} />
      </span>

      <span className="activity-log__undo-cell">
        {entry.undone_at ? (
          <span className="activity-log__undone" title={`Undone ${formatFullDate(entry.undone_at)}`}>
            Undone
          </span>
        ) : entry.can_undo ? (
          <button type="button" className="activity-log__undo" onClick={() => onUndo(entry)} disabled={is_undoing} aria-label={`Undo ${event.label} on ${subject.name}`}>
            {is_undoing ? "Undoing" : "Undo"}
          </button>
        ) : null}
      </span>
    </li>
  );
};

/** Memoized: appending a page or undoing one entry does not re-render the rows already shown. */
export default React.memo(ActivityLogEntryRow);
