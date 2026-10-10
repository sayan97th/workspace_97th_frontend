"use client";
import React, { useRef, useState } from "react";
import Link from "next/link";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { fmtDateShort, fmtRange } from "@/components/board/table/dateUtils";
import UserAvatar from "@/components/common/UserAvatar";
import { CloseIcon, LinkIcon, MoreDotsIcon, OpenInNewTabIcon, PersonIcon, WarningTriangleIcon } from "@/icons/workspace-icons";
import { getDeactivatedClass, getPersonTitle } from "@/lib/deactivated-user";
import type { MyWorkItemDto, MyWorkPerson, MyWorkStatus } from "@/types/personal";
import { EMPTY_LABEL_COLOR } from "./myWorkBuckets";
import { UpdateBubbleIcon } from "./myWorkIcons";
import type { MyWorkColumn } from "./myWorkPreferences";

export type MyWorkRowProps = {
  item: MyWorkItemDto;
  columns: MyWorkColumn[];
  status_options: MyWorkStatus[];
  priority_options: MyWorkStatus[];
  /** `YYYY-MM-DD` of today, so an overdue date can be flagged. */
  today_key: string;
  onStatusChange: (status: MyWorkStatus | null) => void;
  onPriorityChange: (priority: MyWorkStatus | null) => void;
  onDateChange: (date: string | null) => void;
  onCopyLink: (href: string) => void;
};

/** Where an item opens: its board with the item drawer on top (a subitem opens its parent). */
export const itemHrefOf = (item: MyWorkItemDto): string => `/boards/${item.board.id}/pulses/${item.parent?.id ?? item.id}`;

/** One assigned item, a 36px row with monday.com's cells. */
const MyWorkRow: React.FC<MyWorkRowProps> = ({
  item,
  columns,
  status_options,
  priority_options,
  today_key,
  onStatusChange,
  onPriorityChange,
  onDateChange,
  onCopyLink,
}) => {
  const item_href = itemHrefOf(item);

  const renderCell = (column: MyWorkColumn) => {
    switch (column.key) {
      case "updates":
        return <UpdatesCell item={item} href={item_href} />;
      case "group":
        return (
          <span className="flex min-w-0 items-center gap-2.5 px-4" title={item.group.name}>
            <span className="h-2 w-2 flex-none rounded-full" style={{ background: item.group.color }} aria-hidden="true" />
            <span className="truncate">{item.group.name}</span>
          </span>
        );
      case "board":
        return (
          <Link href={`/boards/${item.board.id}`} className="block min-w-0 truncate px-4 hover:underline" title={item.board.label}>
            {item.board.label}
          </Link>
        );
      case "people":
        return <PeopleCell people={item.people} />;
      case "date":
        return <DateCell item={item} today_key={today_key} onChange={onDateChange} />;
      case "status":
        return (
          <LabelCell
            label="Status"
            item_name={item.name}
            value={item.status}
            options={status_options}
            is_available={item.status_column_id !== null}
            can_edit={item.can_edit}
            onChange={onStatusChange}
          />
        );
      case "priority":
        return (
          <LabelCell
            label="Priority"
            item_name={item.name}
            value={item.priority}
            options={priority_options}
            is_available={item.priority_column_id !== null}
            can_edit={item.can_edit}
            onChange={onPriorityChange}
          />
        );
    }
  };

  return (
    <div role="row" className="my-work-row my-work-grid-row">
      <RowMenu item_href={item_href} board_href={`/boards/${item.board.id}`} onCopyLink={() => onCopyLink(item_href)} />
      <div role="cell" className="my-work-cell">
        <Link
          href={item_href}
          className="flex min-w-0 flex-1 items-center gap-2 pl-3 pr-4"
          title={item.parent ? `Subitem of ${item.parent.name}` : item.name}
        >
          <span className="truncate">{item.name}</span>
          {item.parent && <span className="flex-none truncate text-board-caption text-[var(--mw-text-faint)]">in {item.parent.name}</span>}
        </Link>
      </div>
      {columns.map((column) => (
        <div key={column.key} role="cell" className="my-work-cell justify-center">
          {renderCell(column)}
        </div>
      ))}
    </div>
  );
};

/** The row's "..." menu, shown on hover just left of the colored bar. */
const RowMenu: React.FC<{ item_href: string; board_href: string; onCopyLink: () => void }> = ({ item_href, board_href, onCopyLink }) => {
  const button_ref = useRef<HTMLButtonElement>(null);
  const [is_open, setIsOpen] = useState(false);
  const menu_item_class = "flex h-8 w-full items-center gap-2.5 rounded px-2 text-left text-board-cell text-[var(--mw-text)] hover:bg-[var(--mw-hover)]";

  return (
    <>
      <button
        ref={button_ref}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Item actions"
        aria-haspopup="menu"
        aria-expanded={is_open}
        className="my-work-row-menu"
      >
        <MoreDotsIcon size={16} />
      </button>
      <BoardPopover anchor_el={button_ref.current} is_open={is_open} onClose={() => setIsOpen(false)} width={200} align="start">
        <div role="menu" className="my-work-theme flex flex-col p-1.5">
          <Link role="menuitem" href={item_href} className={menu_item_class} onClick={() => setIsOpen(false)}>
            <OpenInNewTabIcon size={15} />
            Open item
          </Link>
          <Link role="menuitem" href={board_href} className={menu_item_class} onClick={() => setIsOpen(false)}>
            <OpenInNewTabIcon size={15} />
            Go to board
          </Link>
          <button
            role="menuitem"
            type="button"
            className={menu_item_class}
            onClick={() => {
              onCopyLink();
              setIsOpen(false);
            }}
          >
            <LinkIcon size={15} />
            Copy item link
          </button>
        </div>
      </BoardPopover>
    </>
  );
};

/** monday.com's update bubble: a plus when the item has no updates yet, otherwise a count badge. */
const UpdatesCell: React.FC<{ item: MyWorkItemDto; href: string }> = ({ item, href }) => {
  const count = item.updates_count;
  const label = count === 0 ? `Add an update to ${item.name}` : `${count} ${count === 1 ? "update" : "updates"} on ${item.name}`;

  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="flex h-full w-full items-center justify-center text-[var(--mw-text-secondary)] transition-colors hover:text-[var(--mw-accent)]"
    >
      <span className="relative flex">
        <UpdateBubbleIcon size={22} with_plus={count === 0} />
        {count > 0 && <span className="my-work-updates-badge">{count > 99 ? "99+" : count}</span>}
      </span>
    </Link>
  );
};

/** Overlapping assignee photos, initials when a person has no photo. */
const PeopleCell: React.FC<{ people: MyWorkPerson[] }> = ({ people }) => {
  if (people.length === 0) {
    return <PersonIcon size={20} className="text-[var(--mw-text-faint)]" />;
  }

  const visible = people.slice(0, 2);
  const overflow = people.length - visible.length;

  return (
    <div className="flex items-center -space-x-1.5" title={people.map((person) => person.full_name).join(", ")}>
      {visible.map((person) => (
        <span key={person.id} className={`rounded-full ring-2 ring-[var(--mw-surface)] ${getDeactivatedClass(person.is_deactivated)}`}>
          <UserAvatar user={{ full_name: getPersonTitle(person.full_name, person.is_deactivated), profile_photo_url: person.profile_photo_url }} size={26} />
        </span>
      ))}
      {overflow > 0 && (
        <span className="flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-[var(--mw-text)] px-1 text-[11px] font-semibold text-[var(--mw-bg)] ring-2 ring-[var(--mw-surface)]">
          +{overflow}
        </span>
      )}
    </div>
  );
};

/**
 * The due date. Empty dates show monday.com's gray "-" pill, a Timeline
 * shows its range in a pill of the group color and a Date shows plain text,
 * with a warning when it is overdue. Clicking opens the native date picker.
 */
const DateCell: React.FC<{ item: MyWorkItemDto; today_key: string; onChange: (date: string | null) => void }> = ({ item, today_key, onChange }) => {
  const input_ref = useRef<HTMLInputElement>(null);

  if (item.date_column === null) {
    return <span className="text-board-caption text-[var(--mw-text-faint)]">No date column</span>;
  }

  const value = item.date?.value ?? "";
  const is_overdue = !!value && value < today_key && !item.is_done;
  const is_timeline = item.date_column.type === "timeline";

  const openPicker = () => {
    if (!item.can_edit) return;
    try {
      input_ref.current?.showPicker();
    } catch {
      input_ref.current?.focus();
    }
  };

  let content: React.ReactNode;
  if (!value) {
    content = <span className="my-work-date-pill">-</span>;
  } else if (is_timeline) {
    content = (
      <span className="my-work-date-pill" style={{ background: item.group.color }}>
        {!item.date?.start || item.date.start === value ? fmtDateShort(value) : fmtRange(item.date.start, value)}
      </span>
    );
  } else {
    content = (
      <span className={`flex items-center gap-1.5 ${is_overdue ? "text-[#d83a52]" : ""} ${item.is_done ? "line-through opacity-60" : ""}`}>
        {is_overdue && <WarningTriangleIcon size={14} />}
        {fmtDateShort(value)}
      </span>
    );
  }

  return (
    <div className="group/date relative flex h-full w-full items-center justify-center">
      <button
        type="button"
        onClick={openPicker}
        disabled={!item.can_edit}
        aria-label={value ? `Due date for ${item.name}, ${value}. Change date` : `Set a due date for ${item.name}`}
        className="flex h-full w-full items-center justify-center disabled:cursor-default"
      >
        {content}
      </button>
      {value && item.can_edit && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={`Clear the due date of ${item.name}`}
          className="absolute right-1.5 flex h-5 w-5 items-center justify-center rounded text-[var(--mw-text-secondary)] opacity-0 transition-opacity hover:bg-[var(--mw-header-active)] focus-visible:opacity-100 group-hover/date:opacity-100"
        >
          <CloseIcon size={10} />
        </button>
      )}
      <input
        ref={input_ref}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={(event) => onChange(event.target.value || null)}
        className="pointer-events-none absolute inset-0 opacity-0"
      />
    </div>
  );
};

type LabelCellProps = {
  label: string;
  item_name: string;
  value: MyWorkStatus | null;
  options: MyWorkStatus[];
  /** False when the item's board has no such column. */
  is_available: boolean;
  can_edit: boolean;
  onChange: (value: MyWorkStatus | null) => void;
};

/** A full color Status or Priority cell with its label picker. */
const LabelCell: React.FC<LabelCellProps> = ({ label, item_name, value, options, is_available, can_edit, onChange }) => {
  const button_ref = useRef<HTMLButtonElement>(null);
  const [is_open, setIsOpen] = useState(false);

  if (!is_available) {
    return <span className="h-full w-full bg-[var(--mw-hover)]" title={`This board has no ${label} column`} aria-label={`No ${label} column`} />;
  }

  const choose = (option: MyWorkStatus | null) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={button_ref}
        type="button"
        disabled={!can_edit}
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={is_open}
        aria-label={`${label} of ${item_name}: ${value?.label || "empty"}`}
        className="my-work-label-cell truncate px-2 text-board-cell disabled:cursor-default"
        style={{ background: value?.color ?? EMPTY_LABEL_COLOR }}
      >
        {value?.label ?? ""}
      </button>
      <BoardPopover anchor_el={button_ref.current} is_open={is_open} onClose={() => setIsOpen(false)} width={200} align="start">
        <ul role="listbox" aria-label={label} className="flex flex-col gap-1.5 p-2">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                aria-selected={value?.id === option.id}
                onClick={() => choose(option)}
                className="h-8 w-full truncate rounded px-2 text-board-cell text-white transition-[filter] hover:brightness-95"
                style={{ background: option.color }}
              >
                {option.label || "Blank"}
              </button>
            </li>
          ))}
          {value && (
            <li>
              <button
                type="button"
                onClick={() => choose(null)}
                className="h-8 w-full rounded border border-dashed border-shell-border-strong px-2 text-board-cell text-shell-text-muted hover:bg-shell-hover"
              >
                Clear
              </button>
            </li>
          )}
        </ul>
      </BoardPopover>
    </>
  );
};

export default MyWorkRow;
