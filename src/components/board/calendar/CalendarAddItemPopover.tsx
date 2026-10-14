"use client";
import React, { useEffect, useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { formatEventTime, parseCalendarDate } from "./calendarConfig";

export type CalendarAddItemPopoverProps = {
  anchor_el: HTMLElement | null;
  /** `YYYY-MM-DD`, or `YYYY-MM-DDTHH:mm` when a Week/Day time slot was picked. `null` keeps it closed. */
  date: string | null;
  onClose: () => void;
  onSubmit: (date: string, name: string) => Promise<void> | void;
};

/** "Tue, Oct 13" or "Tue, Oct 13, 10:30 AM", the day the new item lands on. */
const formatTargetDate = (value: string): string => {
  const parsed = parseCalendarDate(value);
  if (!parsed) return value;
  const day_label = parsed.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return parsed.has_time ? `${day_label}, ${formatEventTime(parsed.date)}` : day_label;
};

/**
 * The small composer a calendar day's "+ Add" (or a Week/Day time slot)
 * opens: type a name, press Enter, and the item is created on that day.
 */
const CalendarAddItemPopover: React.FC<CalendarAddItemPopoverProps> = ({ anchor_el, date, onClose, onSubmit }) => {
  const [name, setName] = useState("");
  const [is_saving, setIsSaving] = useState(false);
  const input_ref = useRef<HTMLInputElement | null>(null);

  // The popover is hidden on its first frame while it measures itself, and hidden inputs can't take focus.
  useEffect(() => {
    if (!date) return;
    const frame = requestAnimationFrame(() => input_ref.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [date, anchor_el]);

  const close = () => {
    setName("");
    onClose();
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!date || !trimmed || is_saving) return;
    setIsSaving(true);
    try {
      await onSubmit(date, trimmed);
      close();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BoardPopover anchor_el={anchor_el} is_open={date !== null && anchor_el !== null} onClose={close} width={280} align="start" unstyled>
      <form
        className="board-calendar-popover board-calendar-panel board-calendar-add"
        aria-label="Add item"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="board-calendar-panel__heading">
          <span>New item</span>
          {date && <span className="board-calendar-panel__meta">{formatTargetDate(date)}</span>}
        </div>
        <input
          ref={input_ref}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Item name"
          aria-label="Item name"
          maxLength={255}
          className="board-calendar-add__input"
        />
        <div className="board-calendar-add__actions">
          <button type="button" onClick={close} className="board-calendar__button board-calendar__button--ghost">
            Cancel
          </button>
          <button type="submit" disabled={!name.trim() || is_saving} className="board-calendar__button board-calendar__button--primary">
            {is_saving ? "Adding..." : "Add item"}
          </button>
        </div>
      </form>
    </BoardPopover>
  );
};

export default CalendarAddItemPopover;
