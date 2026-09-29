"use client";
import React, { useState } from "react";
import { CalendarOff, PauseCircle, X } from "lucide-react";
import type { BoardAutomationSettingsDto, UpdateBoardAutomationSettingsPayload } from "@/types/board-automation";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { ToggleSwitch } from "../../automations/automationFormParts";
import { WEEKDAY_LABELS } from "../../automations/builder/automationCatalog";
import { FIELD, InlineAlert } from "./manageUi";
import { formatDateTime } from "./manageFormat";

export type AutomationSettingsTabProps = {
  settings: BoardAutomationSettingsDto | null;
  is_loading: boolean;
  onSave: (payload: UpdateBoardAutomationSettingsPayload) => Promise<void>;
};

const SECTION = "rounded-[10px] border border-boardtree-border-soft bg-boardtree-surface p-5";

/**
 * Manage > Settings. "Pause all automations" for the whole board, and the working calendar that
 * date triggers and date actions use when they are told to count working days only.
 */
export default function AutomationSettingsTab({ settings, is_loading, onSave }: AutomationSettingsTabProps) {
  const [error, setError] = useState<string | null>(null);
  const [is_saving, setIsSaving] = useState(false);
  const [holiday_draft, setHolidayDraft] = useState("");

  if (is_loading || !settings) {
    return <div className="py-10 text-center text-[13px] text-boardtree-text-muted">{is_loading ? "Loading settings..." : "The settings could not be loaded."}</div>;
  }

  const save = async (payload: UpdateBoardAutomationSettingsPayload) => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(payload);
    } catch (failure) {
      setError(apiErrorMessage(failure, "The settings could not be saved."));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    const next = settings.workdays.includes(day) ? settings.workdays.filter((entry) => entry !== day) : [...settings.workdays, day].sort();
    if (next.length > 0) void save({ workdays: next });
  };

  const addHoliday = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(holiday_draft) || settings.holidays.includes(holiday_draft)) return;
    void save({ holidays: [...settings.holidays, holiday_draft].sort() });
    setHolidayDraft("");
  };

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      {error && <InlineAlert message={error} onDismiss={() => setError(null)} />}

      <section aria-label="Pause all automations" className={SECTION}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-boardtree-text">
              <PauseCircle size={17} className="text-boardtree-text-muted" />
              Pause all automations
            </h3>
            <p className="mt-1 text-[13px] leading-snug text-boardtree-text-secondary">
              No automation of this board runs while paused, buttons included. Runs that were waiting keep waiting, and scheduled automations continue with their next occurrence once resumed.
            </p>
            {settings.is_paused && (
              <p className="mt-2 text-[12.5px] text-boardtree-danger">
                Paused {settings.paused_by ? `by ${settings.paused_by.name} ` : ""}on {formatDateTime(settings.paused_at)}.
              </p>
            )}
          </div>
          <ToggleSwitch checked={settings.is_paused} disabled={is_saving} onToggle={() => void save({ is_paused: !settings.is_paused })} />
        </div>
      </section>

      <section aria-label="Working days" className={SECTION}>
        <h3 className="text-[15px] font-semibold text-boardtree-text">Working days</h3>
        <p className="mt-1 text-[13px] leading-snug text-boardtree-text-secondary">
          Used by &quot;date arrives&quot; triggers, &quot;push date&quot;, &quot;set date&quot;, &quot;set timeline&quot; and &quot;shift dependent items&quot; whenever they count working days only.
        </p>
        <div role="group" aria-label="Working weekdays" className="mt-3 flex flex-wrap gap-1.5">
          {WEEKDAY_LABELS.map((day) => {
            const is_on = settings.workdays.includes(day.id);
            return (
              <button
                key={day.id}
                type="button"
                aria-pressed={is_on}
                disabled={is_saving || (is_on && settings.workdays.length === 1)}
                onClick={() => toggleDay(day.id)}
                title={is_on && settings.workdays.length === 1 ? "Keep at least one working day" : day.label}
                className={`h-8 min-w-[52px] rounded-[6px] border px-2 text-[12.5px] ${is_on ? "border-boardtree-accent bg-boardtree-accent-surface font-medium text-boardtree-accent" : "border-boardtree-border text-boardtree-text-secondary hover:bg-boardtree-hover"} disabled:opacity-60`}
              >
                {day.short}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Holidays" className={SECTION}>
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-boardtree-text">
          <CalendarOff size={16} className="text-boardtree-text-muted" />
          Holidays
        </h3>
        <p className="mt-1 text-[13px] text-boardtree-text-secondary">Dates that count as non working days, whatever the weekday.</p>
        <div className="mt-3 flex items-center gap-2">
          <input type="date" value={holiday_draft} onChange={(event) => setHolidayDraft(event.target.value)} aria-label="Holiday date" className={FIELD} />
          <button
            type="button"
            onClick={addHoliday}
            disabled={is_saving || !holiday_draft || settings.holidays.includes(holiday_draft) || settings.holidays.length >= 100}
            className="h-9 rounded-[6px] border border-boardtree-border px-3 text-[13px] text-boardtree-text hover:bg-boardtree-hover disabled:opacity-40"
          >
            Add holiday
          </button>
        </div>
        {settings.holidays.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {settings.holidays.map((date) => (
              <li key={date} className="flex h-7 items-center gap-1 rounded-full bg-boardtree-hover pl-2.5 pr-1 text-[12.5px] text-boardtree-text-secondary">
                {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                <button type="button" disabled={is_saving} onClick={() => void save({ holidays: settings.holidays.filter((entry) => entry !== date) })} aria-label={`Remove holiday ${date}`} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-boardtree-hover-strong">
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 text-[12.5px] text-boardtree-text-faint">No holidays yet.</div>
        )}
      </section>
    </div>
  );
}
