"use client";
import React, { useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "@/icons/workspace-icons";
import { calendarTitleOf, MY_WORK_CALENDAR_MODE_LABELS, MY_WORK_CALENDAR_MODES } from "./myWorkCalendar";
import type { MyWorkCalendarMode } from "./myWorkPreferences";

type MyWorkCalendarToolbarProps = {
  cursor: Date;
  mode: MyWorkCalendarMode;
  onToday: () => void;
  onShift: (direction: 1 | -1) => void;
  onModeChange: (mode: MyWorkCalendarMode) => void;
};

/** Right side of the toolbar on the Calendar tab: Today, previous and next, the period title and the Month/Week/Day picker. */
const MyWorkCalendarToolbar: React.FC<MyWorkCalendarToolbarProps> = ({ cursor, mode, onToday, onShift, onModeChange }) => {
  const [is_mode_open, setIsModeOpen] = useState(false);
  const mode_ref = useRef<HTMLButtonElement>(null);
  const period_label = MY_WORK_CALENDAR_MODE_LABELS[mode].toLowerCase();

  return (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
      <button type="button" onClick={onToday} className="my-work-outline-button text-board-cell">
        Today
      </button>
      <button type="button" onClick={() => onShift(-1)} aria-label={`Previous ${period_label}`} className="my-work-icon-button">
        <ChevronLeftIcon size={16} />
      </button>
      <button type="button" onClick={() => onShift(1)} aria-label={`Next ${period_label}`} className="my-work-icon-button">
        <ChevronRightIcon size={16} />
      </button>
      <h2 className="px-1 text-center text-board-nav sm:min-w-[132px]" aria-live="polite">
        {calendarTitleOf(cursor, mode)}
      </h2>

      <button
        ref={mode_ref}
        type="button"
        onClick={() => setIsModeOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={is_mode_open}
        aria-label={`Calendar view, ${MY_WORK_CALENDAR_MODE_LABELS[mode]}`}
        className="my-work-outline-button my-work-select-button text-board-cell"
      >
        {MY_WORK_CALENDAR_MODE_LABELS[mode]}
        <ChevronDownIcon size={12} />
      </button>
      <BoardPopover anchor_el={mode_ref.current} is_open={is_mode_open} onClose={() => setIsModeOpen(false)} width={150}>
        <ul role="listbox" aria-label="Calendar view" className="my-work-theme flex flex-col rounded-lg p-1.5 text-board-cell">
          {MY_WORK_CALENDAR_MODES.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={mode === option}
                onClick={() => {
                  onModeChange(option);
                  setIsModeOpen(false);
                }}
                className="flex h-8 w-full items-center justify-between rounded px-2 text-left hover:bg-[var(--mw-hover)]"
              >
                {MY_WORK_CALENDAR_MODE_LABELS[option]}
                {mode === option && <CheckIcon size={14} className="text-[var(--mw-accent)]" />}
              </button>
            </li>
          ))}
        </ul>
      </BoardPopover>
    </div>
  );
};

export default MyWorkCalendarToolbar;
