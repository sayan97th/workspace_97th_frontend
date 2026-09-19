"use client";
import React, { useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { ClockIcon } from "@/icons/workspace-icons";
import { notification_snooze_presets, resolveSnoozeDate, type NotificationSnoozePresetId } from "@/data/notifications-data";
import { formatScheduledTime, toDateTimeLocalValue } from "./scheduleFormat";

export type ComposerScheduleMenuProps = {
  /** ISO time the update will be sent at, null when it is posted right away. */
  value: string | null;
  onChange: (scheduled_at: string | null) => void;
  icon_size?: number;
};

const OPTION_CLASS =
  "flex w-full items-center rounded-lg px-3 py-2 text-left text-[12.5px] font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover hover:text-shell-text";

/**
 * The composer's "Schedule send" button. Opens a small menu with the usual
 * presets (in an hour, this afternoon, tomorrow morning, next week) and a
 * custom date and time. The chosen time is shown as a chip by the composer,
 * and the send button then schedules the update instead of posting it.
 */
const ComposerScheduleMenu: React.FC<ComposerScheduleMenuProps> = ({ value, onChange, icon_size = 16 }) => {
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const [is_open, setIsOpen] = useState(false);
  const [custom_value, setCustomValue] = useState("");

  const pickPreset = (preset: NotificationSnoozePresetId) => {
    onChange(resolveSnoozeDate(preset).toISOString());
    setIsOpen(false);
  };

  const applyCustom = () => {
    const date = new Date(custom_value);
    if (!custom_value || Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return;
    onChange(date.toISOString());
    setIsOpen(false);
  };

  const min_value = toDateTimeLocalValue(new Date());
  const is_custom_valid = custom_value !== "" && new Date(custom_value).getTime() > Date.now();

  return (
    <span className="relative">
      <button
        ref={trigger_ref}
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label="Schedule send"
        aria-haspopup="dialog"
        aria-expanded={is_open}
        title={value ? `Scheduled for ${formatScheduledTime(value)}` : "Schedule send"}
        className={`flex h-[30px] w-[30px] items-center justify-center rounded-lg hover:bg-shell-hover hover:text-shell-text ${
          value || is_open ? "bg-shell-hover text-[#7fb2ff]" : "text-shell-text-muted"
        }`}
      >
        <ClockIcon size={icon_size} />
      </button>
      <BoardPopover anchor_el={trigger_ref.current} is_open={is_open} onClose={() => setIsOpen(false)} width={264} align="start">
        <div role="dialog" aria-label="Schedule send" className="p-1.5">
          <div className="px-3 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-wide text-shell-text-faint">Send later</div>
          {notification_snooze_presets.map((preset) => (
            <button key={preset.id} type="button" onClick={() => pickPreset(preset.id)} className={OPTION_CLASS}>
              {preset.label}
            </button>
          ))}
          <div className="mt-1 border-t border-shell-border px-3 pb-2 pt-2.5">
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-shell-text-faint" htmlFor="composer-schedule-custom">
              Pick a date and time
            </label>
            <input
              id="composer-schedule-custom"
              type="datetime-local"
              min={min_value}
              value={custom_value}
              onChange={(event) => setCustomValue(event.target.value)}
              className="w-full rounded-[8px] border border-shell-border bg-shell-panel-alt px-2.5 py-1.5 text-[12.5px] text-shell-text focus:border-brand-500 focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              {value ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setIsOpen(false);
                  }}
                  className="text-[12px] font-semibold text-shell-text-muted hover:text-shell-text"
                >
                  Send right away
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={applyCustom}
                disabled={!is_custom_valid}
                className="rounded-[8px] bg-brand-500 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      </BoardPopover>
    </span>
  );
};

export default ComposerScheduleMenu;
