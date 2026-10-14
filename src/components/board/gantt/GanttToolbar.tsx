"use client";
import React, { useEffect, useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import ActionMenu, { type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import { CalendarViewIcon, DragHandleIcon, FilterIcon, ImageIcon } from "@/icons/board-icons";
import { SettingsGearIcon } from "@/icons/board-options-icons";
import { ChevronDownIcon, MinusIcon, MoreDotsIcon, PlusIcon } from "@/icons/workspace-icons";
import { GANTT_SCALES, type GanttScale } from "./ganttDate";

/** Two stacked bars, the icon of monday.com's "Baseline" button. */
const BaselineIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
    <rect x="3" y="4" width="14" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="3" y="11" width="14" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export type GanttToolbarProps = {
  title: string;
  scale: GanttScale;
  onScaleChange: (scale: GanttScale) => void;
  can_zoom_in: boolean;
  can_zoom_out: boolean;
  onZoom: (direction: 1 | -1) => void;
  onToday: () => void;
  onAutoFit: () => void;
  /** Lights the funnel up while some groups are hidden. */
  is_filter_active: boolean;
  /** The group filter panel, rendered inside the funnel's popover. */
  filter_panel: React.ReactNode;
  /** Lights the Baseline button up while a baseline is drawn. */
  is_baseline_active: boolean;
  /** The baseline panel, rendered inside the Baseline button's popover. */
  baseline_panel: React.ReactNode;
  onOpenSettings: (anchor_el: HTMLElement) => void;
  onExportImage: () => void;
};

/**
 * The Gantt view's header, laid out like monday.com's Gantt widget: a grip,
 * the view's name and its filter funnel on the left, then Baseline, Today and
 * Auto Fit, the scale picker with zoom out and in, and a "..." menu.
 */
const GanttToolbar: React.FC<GanttToolbarProps> = ({
  title,
  scale,
  onScaleChange,
  can_zoom_in,
  can_zoom_out,
  onZoom,
  onToday,
  onAutoFit,
  is_filter_active,
  filter_panel,
  is_baseline_active,
  baseline_panel,
  onOpenSettings,
  onExportImage,
}) => {
  const filter_button_ref = useRef<HTMLButtonElement | null>(null);
  const baseline_button_ref = useRef<HTMLButtonElement | null>(null);
  const scale_button_ref = useRef<HTMLButtonElement | null>(null);
  const more_button_ref = useRef<HTMLButtonElement | null>(null);
  const scale_list_ref = useRef<HTMLDivElement | null>(null);
  const [is_filter_open, setIsFilterOpen] = useState(false);
  const [is_baseline_open, setIsBaselineOpen] = useState(false);
  const [is_scale_open, setIsScaleOpen] = useState(false);
  const [is_more_open, setIsMoreOpen] = useState(false);

  // The popover is hidden on its first frame while it measures itself, so the selected option is focused on the next one.
  useEffect(() => {
    if (!is_scale_open) return;
    const frame = requestAnimationFrame(() =>
      scale_list_ref.current?.querySelector<HTMLButtonElement>("[aria-selected='true']")?.focus({ preventScroll: true })
    );
    return () => cancelAnimationFrame(frame);
  }, [is_scale_open]);

  const selectScale = (next_scale: GanttScale) => {
    onScaleChange(next_scale);
    setIsScaleOpen(false);
    scale_button_ref.current?.focus({ preventScroll: true });
  };

  const handleScaleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
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
        {
          key: "settings",
          label: "Gantt settings",
          icon: <SettingsGearIcon size={16} />,
          onClick: () => {
            if (more_button_ref.current) onOpenSettings(more_button_ref.current);
          },
        },
        { key: "export", label: "Export as image", icon: <ImageIcon size={16} />, onClick: onExportImage },
      ],
    },
  ];

  const scale_label = GANTT_SCALES.find((option) => option.id === scale)?.label ?? "Weeks";

  return (
    <div className="board-gantt__header">
      <div className="board-gantt__header-start">
        <span className="board-gantt__grip" aria-hidden>
          <DragHandleIcon size={9} />
        </span>
        <h2 className="board-gantt__title font-heading" title={title}>
          {title}
        </h2>
        <Tooltip content="Filter Gantt" placement="bottom">
          <button
            ref={filter_button_ref}
            type="button"
            aria-label="Filter Gantt"
            aria-haspopup="dialog"
            aria-expanded={is_filter_open}
            data-active={is_filter_active || undefined}
            onClick={() => setIsFilterOpen((open) => !open)}
            className="board-gantt__icon-button board-gantt__filter-button"
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
      </div>

      <div className="board-gantt__header-end">
        <Tooltip content="Compare planned dates with the current ones" placement="bottom">
          <button
            ref={baseline_button_ref}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={is_baseline_open}
            data-active={is_baseline_active || undefined}
            onClick={() => setIsBaselineOpen((open) => !open)}
            className="board-gantt__button board-gantt__button--ghost"
          >
            <BaselineIcon />
            Baseline
          </button>
        </Tooltip>
        <BoardPopover
          anchor_el={baseline_button_ref.current}
          is_open={is_baseline_open}
          onClose={() => setIsBaselineOpen(false)}
          width={300}
          align="end"
          unstyled
        >
          {baseline_panel}
        </BoardPopover>

        <div className="board-gantt__segmented">
          <Tooltip content="Today" placement="bottom">
            <button type="button" aria-label="Scroll to today" onClick={onToday} className="board-gantt__segment board-gantt__segment--icon">
              <CalendarViewIcon size={18} />
            </button>
          </Tooltip>
          <Tooltip content="Fit all items to the screen" placement="bottom">
            <button type="button" onClick={onAutoFit} className="board-gantt__segment">
              Auto Fit
            </button>
          </Tooltip>
        </div>

        <div className="board-gantt__segmented">
          <button
            ref={scale_button_ref}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={is_scale_open}
            data-open={is_scale_open || undefined}
            onClick={() => setIsScaleOpen((open) => !open)}
            className="board-gantt__segment board-gantt__select"
          >
            <span>{scale_label}</span>
            <span className="board-gantt__select-chevron" aria-hidden>
              <ChevronDownIcon size={14} />
            </span>
          </button>
          <Tooltip content="Zoom out" placement="bottom">
            <button
              type="button"
              aria-label="Zoom out"
              disabled={!can_zoom_out}
              onClick={() => onZoom(-1)}
              className="board-gantt__segment board-gantt__segment--icon"
            >
              <MinusIcon size={14} />
            </button>
          </Tooltip>
          <Tooltip content="Zoom in" placement="bottom">
            <button
              type="button"
              aria-label="Zoom in"
              disabled={!can_zoom_in}
              onClick={() => onZoom(1)}
              className="board-gantt__segment board-gantt__segment--icon"
            >
              <PlusIcon size={14} />
            </button>
          </Tooltip>
        </div>
        <BoardPopover
          anchor_el={scale_button_ref.current}
          is_open={is_scale_open}
          onClose={() => setIsScaleOpen(false)}
          width={100}
          align="start"
          unstyled
        >
          <div
            ref={scale_list_ref}
            role="listbox"
            aria-label="Timeline scale"
            className="board-gantt-popover board-gantt__scale-menu"
            onKeyDown={handleScaleKeyDown}
          >
            {GANTT_SCALES.map((option) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={option.id === scale}
                onClick={() => selectScale(option.id)}
                className="board-gantt__scale-option"
              >
                {option.label}
              </button>
            ))}
          </div>
        </BoardPopover>

        <Tooltip content="More actions" placement="bottom">
          <button
            ref={more_button_ref}
            type="button"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={is_more_open}
            onClick={() => setIsMoreOpen((open) => !open)}
            className="board-gantt__icon-button"
          >
            <MoreDotsIcon size={18} />
          </button>
        </Tooltip>
        <ActionMenu
          anchor_el={more_button_ref.current}
          is_open={is_more_open}
          onClose={() => setIsMoreOpen(false)}
          sections={more_sections}
          aria_label="Gantt options"
          width={220}
          align="end"
        />
      </div>
    </div>
  );
};

export default GanttToolbar;
