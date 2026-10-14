"use client";
import React, { useEffect, useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import ActionMenu, { type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import { DownloadIcon, DragHandleIcon, FilterIcon } from "@/icons/board-icons";
import { SettingsGearIcon } from "@/icons/board-options-icons";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, MoreDotsIcon } from "@/icons/workspace-icons";
import { CALENDAR_MODES, type BoardCalendarMode } from "./calendarConfig";

/** What the prev/next arrows step by in each mode, for their tooltips. */
const STEP_LABELS: Record<BoardCalendarMode, string> = { month: "month", week: "week", day: "day" };

export type CalendarToolbarProps = {
  title: string;
  /** "October 2026", "Oct 11 - 17, 2026" or "Tuesday, October 13, 2026". */
  range_label: string;
  mode: BoardCalendarMode;
  onModeChange: (mode: BoardCalendarMode) => void;
  onNavigate: (action: "TODAY" | "PREV" | "NEXT") => void;
  /** Lights the funnel up while some groups are hidden. */
  is_filter_active: boolean;
  /** The group filter panel, rendered inside the funnel's popover. Omit to hide the funnel. */
  filter_panel?: React.ReactNode;
  /** Opens the settings panel anchored to the given element. Omit to hide "Calendar settings". */
  onOpenSettings?: (anchor_el: HTMLElement) => void;
  onExport: () => void;
};

/**
 * The Calendar view's header, laid out like monday.com's calendar widget: a
 * grip, the view's name and its filter funnel on the left, then Today,
 * prev/next, the visible range, the Month/Week/Day switcher and a "..." menu
 * on the right.
 */
const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  title,
  range_label,
  mode,
  onModeChange,
  onNavigate,
  is_filter_active,
  filter_panel,
  onOpenSettings,
  onExport,
}) => {
  const filter_button_ref = useRef<HTMLButtonElement | null>(null);
  const mode_button_ref = useRef<HTMLButtonElement | null>(null);
  const more_button_ref = useRef<HTMLButtonElement | null>(null);
  const [is_filter_open, setIsFilterOpen] = useState(false);
  const [is_mode_open, setIsModeOpen] = useState(false);
  const [is_more_open, setIsMoreOpen] = useState(false);
  const mode_list_ref = useRef<HTMLDivElement | null>(null);

  // The popover is hidden on its first frame while it measures itself, so the selected option is focused on the next one.
  useEffect(() => {
    if (!is_mode_open) return;
    const frame = requestAnimationFrame(() =>
      mode_list_ref.current?.querySelector<HTMLButtonElement>("[aria-selected='true']")?.focus({ preventScroll: true })
    );
    return () => cancelAnimationFrame(frame);
  }, [is_mode_open]);

  const step_label = STEP_LABELS[mode];
  const mode_label = CALENDAR_MODES.find((option) => option.key === mode)?.label ?? "Month";

  const selectMode = (next_mode: BoardCalendarMode) => {
    onModeChange(next_mode);
    setIsModeOpen(false);
    mode_button_ref.current?.focus({ preventScroll: true });
  };

  const handleModeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const options = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[role='option']")];
    const current_index = options.indexOf(document.activeElement as HTMLButtonElement);
    const next_index =
      event.key === "ArrowDown" ? (current_index + 1) % options.length : (current_index - 1 + options.length) % options.length;
    options[next_index]?.focus();
  };

  const more_sections: ActionMenuSection[] = [
    {
      key: "main",
      items: [
        ...(onOpenSettings
          ? [
              {
                key: "settings",
                label: "Calendar settings",
                icon: <SettingsGearIcon size={16} />,
                onClick: () => {
                  if (more_button_ref.current) onOpenSettings(more_button_ref.current);
                },
              },
            ]
          : []),
        { key: "export", label: "Export to calendar (.ics)", icon: <DownloadIcon size={16} />, onClick: onExport },
      ],
    },
  ];

  return (
    <div className="board-calendar__header">
      <div className="board-calendar__header-start">
        <span className="board-calendar__grip" aria-hidden>
          <DragHandleIcon size={9} />
        </span>
        <h2 className="board-calendar__title font-heading" title={title}>
          {title}
        </h2>
        {filter_panel && (
          <>
            <Tooltip content="Filter calendar">
              <button
                ref={filter_button_ref}
                type="button"
                aria-label="Filter calendar"
                aria-haspopup="dialog"
                aria-expanded={is_filter_open}
                data-active={is_filter_active || undefined}
                onClick={() => setIsFilterOpen((open) => !open)}
                className="board-calendar__icon-button board-calendar__filter-button"
              >
                <FilterIcon size={17} />
              </button>
            </Tooltip>
            <BoardPopover
              anchor_el={filter_button_ref.current}
              is_open={is_filter_open}
              onClose={() => setIsFilterOpen(false)}
              width={280}
              align="start"
              unstyled
            >
              {filter_panel}
            </BoardPopover>
          </>
        )}
      </div>

      <div className="board-calendar__header-end">
        <button type="button" onClick={() => onNavigate("TODAY")} className="board-calendar__button">
          Today
        </button>
        <div className="board-calendar__arrows">
          <Tooltip content={`Previous ${step_label}`}>
            <button
              type="button"
              onClick={() => onNavigate("PREV")}
              aria-label={`Previous ${step_label}`}
              className="board-calendar__icon-button"
            >
              <ChevronLeftIcon size={16} />
            </button>
          </Tooltip>
          <Tooltip content={`Next ${step_label}`}>
            <button
              type="button"
              onClick={() => onNavigate("NEXT")}
              aria-label={`Next ${step_label}`}
              className="board-calendar__icon-button"
            >
              <ChevronRightIcon size={16} />
            </button>
          </Tooltip>
        </div>
        <span className="board-calendar__range" aria-live="polite">
          {range_label}
        </span>

        <button
          ref={mode_button_ref}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={is_mode_open}
          data-open={is_mode_open || undefined}
          onClick={() => setIsModeOpen((open) => !open)}
          className="board-calendar__select"
        >
          <span>{mode_label}</span>
          <span className="board-calendar__select-chevron" aria-hidden>
            <ChevronDownIcon size={14} />
          </span>
        </button>
        <BoardPopover
          anchor_el={mode_button_ref.current}
          is_open={is_mode_open}
          onClose={() => setIsModeOpen(false)}
          width={96}
          align="start"
          unstyled
        >
          <div
            ref={mode_list_ref}
            role="listbox"
            aria-label="Calendar mode"
            className="board-calendar-popover board-calendar__mode-menu"
            onKeyDown={handleModeKeyDown}
          >
            {CALENDAR_MODES.map((option) => (
              <button
                key={option.key}
                type="button"
                role="option"
                aria-selected={option.key === mode}
                onClick={() => selectMode(option.key)}
                className="board-calendar__mode-option"
              >
                {option.label}
              </button>
            ))}
          </div>
        </BoardPopover>

        <Tooltip content="More actions">
          <button
            ref={more_button_ref}
            type="button"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={is_more_open}
            onClick={() => setIsMoreOpen((open) => !open)}
            className="board-calendar__icon-button"
          >
            <MoreDotsIcon size={18} />
          </button>
        </Tooltip>
        <ActionMenu
          anchor_el={more_button_ref.current}
          is_open={is_more_open}
          onClose={() => setIsMoreOpen(false)}
          sections={more_sections}
          aria_label="Calendar options"
          width={240}
          align="end"
        />
      </div>
    </div>
  );
};

export default CalendarToolbar;
