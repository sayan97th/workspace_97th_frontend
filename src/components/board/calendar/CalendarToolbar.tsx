"use client";
import React, { useRef, useState } from "react";
import { Views, type ToolbarProps, type View } from "react-big-calendar";
import AnchoredMenu from "@/components/ui/dropdown/AnchoredMenu";
import { ChevronRightIcon } from "@/icons/workspace-icons";

/** Human label for each `react-big-calendar` view key this toolbar offers. */
const VIEW_LABELS: Record<string, string> = {
  [Views.MONTH]: "Month",
  [Views.AGENDA]: "Agenda",
};

/**
 * Monday-style calendar header — "Today" / prev / next / the current
 * month's label on the left, a Month↔Agenda switcher on the right — dropped
 * into `react-big-calendar` via its `components.toolbar` slot in place of
 * the library's own default toolbar, so it reads as shell chrome instead of
 * a themed-in widget (same idea as `BoardViewTabs`' tab bar).
 */
// Declared as a generic function (not `React.FC<ToolbarProps>`) so it type-checks
// against `Components<TEvent>.toolbar`, which expects a `ToolbarProps<TEvent>`
// consumer for whatever concrete event type the calendar it's plugged into
// uses — this toolbar only reads view-navigation fields, never the event
// itself, so it's compatible with any of them.
function CalendarToolbar<TEvent extends object>({ label, view, views, onNavigate, onView }: ToolbarProps<TEvent>) {
  const [is_view_menu_open, setIsViewMenuOpen] = useState(false);
  const view_button_ref = useRef<HTMLButtonElement | null>(null);

  // `views` is always the array form here — BoardCalendar only ever passes
  // `[Views.MONTH, Views.AGENDA]` — but the prop type also allows an
  // object-keyed form, so fall back to the label map's keys for that case.
  const available_views = (Array.isArray(views) ? views : (Object.keys(VIEW_LABELS) as View[]));

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onNavigate("TODAY")}
          className="rounded-[7px] border border-shell-border px-2.5 py-1.5 text-[12.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
        >
          Today
        </button>

        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onNavigate("PREV")}
            aria-label="Previous"
            className="flex h-7 w-7 items-center justify-center rounded-[7px] text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <ChevronRightIcon className="rotate-180" size={13} />
          </button>
          <button
            type="button"
            onClick={() => onNavigate("NEXT")}
            aria-label="Next"
            className="flex h-7 w-7 items-center justify-center rounded-[7px] text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <ChevronRightIcon size={13} />
          </button>
        </div>

        <span className="text-[15px] font-semibold text-shell-text">{label}</span>
      </div>

      <button
        ref={view_button_ref}
        type="button"
        onClick={() => setIsViewMenuOpen(true)}
        className="flex items-center gap-1.5 rounded-[7px] border border-shell-border px-2.5 py-1.5 text-[12.5px] font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover"
      >
        {VIEW_LABELS[view] ?? view}
        <ChevronRightIcon className="rotate-90" size={10} />
      </button>

      <AnchoredMenu
        anchor_el={view_button_ref.current}
        is_open={is_view_menu_open}
        onClose={() => setIsViewMenuOpen(false)}
        width={140}
        items={available_views.map((view_key) => ({
          key: view_key,
          label: VIEW_LABELS[view_key] ?? view_key,
          icon: null,
          onClick: () => onView(view_key),
        }))}
      />
    </div>
  );
}

export default CalendarToolbar;
