"use client";
import React, { useState } from "react";
import type { BoardAutomationSchedule, BoardAutomationTriggerType } from "@/types/board-automation";
import { SUBITEM_AWARE_TRIGGERS, TRIGGER_BY_TYPE, WEEKDAY_LABELS, triggerSections, type AutomationBuilderContext } from "./automationCatalog";
import { columnLabel, findColumn, groupLabel, offsetLabel, optionLabel, personLabel, scheduleLabel, valueLabel } from "./automationSentence";
import type { AutomationDraft } from "./builderDraft";
import { PickerList, PopoverFooter, POPOVER_INPUT, POPOVER_LABEL, POPOVER_SECONDARY, Segmented, Token } from "./builderUi";
import { ColumnPicker, ColumnValueEditor, GroupPicker, PersonPicker } from "./valueEditors";

export type TriggerRowProps = {
  draft: AutomationDraft;
  context: AutomationBuilderContext;
  onChange: (patch: Partial<AutomationDraft>) => void;
};

/** Words of the trigger sentence that only label, not edit. */
const Words = ({ children }: { children: React.ReactNode }) => <span className="text-boardtree-text">{children}</span>;

/** Switches the trigger, resetting what belonged to the previous one and picking the first fitting column. */
function pickTrigger(type: BoardAutomationTriggerType, context: AutomationBuilderContext): Partial<AutomationDraft> {
  const def = TRIGGER_BY_TYPE[type];
  const first_column = def.column_kinds ? context.columns.find((column) => column.scope === "item" && def.column_kinds?.includes(column.kind)) : undefined;
  return {
    trigger_type: type,
    trigger_column_id: first_column?.id ?? null,
    trigger_value: null,
    trigger_config: type === "recurring" ? { schedule: { frequency: "weekly", weekdays: [1], time: "09:00" } } : {},
  };
}

/** "When" (or "Every"), itself a token that swaps the trigger. */
function TriggerSwitch({ label, draft, context, onChange, is_placeholder = false }: TriggerRowProps & { label: string; is_placeholder?: boolean }) {
  return (
    <Token label={label} is_placeholder={is_placeholder} aria_label="Choose a trigger">
      {(close) => (
        <PickerList
          sections={triggerSections()}
          selected={draft.trigger_type}
          onPick={(type) => {
            onChange(pickTrigger(type, context));
            close();
          }}
          placeholder="Search triggers"
        />
      )}
    </Token>
  );
}

function DateOffsetEditor({ offset_days, onApply }: { offset_days: number; onApply: (offset_days: number) => void }) {
  const [direction, setDirection] = useState<"before" | "on" | "after">(offset_days < 0 ? "before" : offset_days > 0 ? "after" : "on");
  const [days, setDays] = useState(String(Math.abs(offset_days) || 1));
  const amount = Math.max(1, Math.min(365, Math.round(Number(days) || 1)));

  return (
    <>
      <Segmented
        label="When the trigger fires"
        options={[{ id: "before", label: "Before" }, { id: "on", label: "On the day" }, { id: "after", label: "After" }]}
        value={direction}
        onChange={setDirection}
      />
      {direction !== "on" && (
        <div className="mt-2 flex items-center gap-2">
          <input type="number" min={1} max={365} value={days} onChange={(event) => setDays(event.target.value)} aria-label="Days" className={`${POPOVER_INPUT} w-20`} />
          <span className="text-[12.5px] text-boardtree-text-secondary">{amount === 1 ? "day" : "days"} {direction} the date</span>
        </div>
      )}
      <PopoverFooter onDone={() => onApply(direction === "on" ? 0 : direction === "before" ? -amount : amount)} />
    </>
  );
}

export function TimeEditor({ time, onApply, allow_clear = true }: { time: string | null | undefined; onApply: (time: string | null) => void; allow_clear?: boolean }) {
  const [draft, setDraft] = useState(time ?? "09:00");
  return (
    <>
      <div className={POPOVER_LABEL}>Time</div>
      <input type="time" value={draft} onChange={(event) => setDraft(event.target.value)} aria-label="Time" className={POPOVER_INPUT} />
      <PopoverFooter
        onDone={() => onApply(draft || null)}
        is_disabled={!/^\d{2}:\d{2}$/.test(draft)}
        extra={allow_clear && time ? <button type="button" onClick={() => onApply(null)} className={POPOVER_SECONDARY}>No set time</button> : undefined}
      />
    </>
  );
}

function ScheduleEditor({ schedule, onApply }: { schedule: BoardAutomationSchedule | null | undefined; onApply: (schedule: BoardAutomationSchedule) => void }) {
  const [frequency, setFrequency] = useState<BoardAutomationSchedule["frequency"]>(schedule?.frequency ?? "weekly");
  const [weekdays, setWeekdays] = useState<number[]>(schedule?.weekdays?.length ? schedule.weekdays : [1]);
  const [day_of_month, setDayOfMonth] = useState(String(schedule?.day_of_month ?? 1));
  const [time, setTime] = useState(schedule?.time ?? "09:00");

  const toggleDay = (day: number) => setWeekdays((current) => (current.includes(day) ? current.filter((entry) => entry !== day) : [...current, day].sort()));
  const can_apply = /^\d{2}:\d{2}$/.test(time) && (frequency !== "weekly" || weekdays.length > 0);

  return (
    <>
      <Segmented label="How often" options={[{ id: "daily", label: "Day" }, { id: "weekly", label: "Week" }, { id: "monthly", label: "Month" }]} value={frequency} onChange={setFrequency} />
      {frequency === "weekly" && (
        <div role="group" aria-label="Days of the week" className="mt-2 flex flex-wrap gap-1">
          {WEEKDAY_LABELS.map((day) => (
            <button
              key={day.id}
              type="button"
              aria-pressed={weekdays.includes(day.id)}
              onClick={() => toggleDay(day.id)}
              className={`h-7 min-w-[38px] rounded-[6px] border px-1.5 text-[12px] ${weekdays.includes(day.id) ? "border-boardtree-accent bg-boardtree-accent-surface text-boardtree-accent" : "border-boardtree-border text-boardtree-text-secondary hover:bg-boardtree-hover"}`}
            >
              {day.short}
            </button>
          ))}
        </div>
      )}
      {frequency === "monthly" && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[12.5px] text-boardtree-text-secondary">On day</span>
          <input type="number" min={1} max={31} value={day_of_month} onChange={(event) => setDayOfMonth(event.target.value)} aria-label="Day of the month" className={`${POPOVER_INPUT} w-20`} />
        </div>
      )}
      <div className={`${POPOVER_LABEL} mt-2`}>At</div>
      <input type="time" value={time} onChange={(event) => setTime(event.target.value)} aria-label="Time" className={POPOVER_INPUT} />
      <PopoverFooter
        is_disabled={!can_apply}
        onDone={() =>
          onApply({
            frequency,
            weekdays: frequency === "weekly" ? weekdays : [],
            day_of_month: frequency === "monthly" ? Math.max(1, Math.min(31, Math.round(Number(day_of_month) || 1))) : null,
            time,
          })
        }
      />
    </>
  );
}

/** The trigger sentence: "When Status changes to Done", "When Due date is 2 days away at 09:00", "Every Monday at 09:00". */
export default function TriggerRow({ draft, context, onChange }: TriggerRowProps) {
  const type = draft.trigger_type;
  const column = findColumn(context, draft.trigger_column_id);
  const def = type ? TRIGGER_BY_TYPE[type] : null;
  const scopes: ("item" | "subitem")[] = type && SUBITEM_AWARE_TRIGGERS.includes(type) ? ["item", "subitem"] : ["item"];

  if (!type || !def) {
    return (
      <>
        <Words>When </Words>
        <TriggerSwitch label="this happens" is_placeholder draft={draft} context={context} onChange={onChange} />
      </>
    );
  }

  const columnToken = (fallback: string) => (
    <Token label={columnLabel(context, draft.trigger_column_id, fallback)} is_placeholder={!column} aria_label="Choose a column">
      {(close) => (
        <ColumnPicker
          context={context}
          kinds={def.column_kinds ?? []}
          scopes={scopes}
          selected={draft.trigger_column_id}
          onPick={(column_id) => {
            onChange({ trigger_column_id: column_id, trigger_value: null, trigger_config: { ...draft.trigger_config, from_value: null } });
            close();
          }}
        />
      )}
    </Token>
  );

  const config = draft.trigger_config;
  const switcher = <TriggerSwitch label={type === "recurring" ? "Every" : "When"} draft={draft} context={context} onChange={onChange} />;

  switch (type) {
    case "status_changed": {
      const options = (column?.options ?? []).map((option) => ({ id: option.id, label: option.label, color: option.color }));
      return (
        <>
          {switcher} {columnToken("status")} <Words>changes from </Words>
          <Token label={config.from_value ? optionLabel(column, config.from_value) : "anything"} is_placeholder={!config.from_value} disabled={!column}>
            {(close) => (
              <PickerList
                sections={[{ entries: [{ id: "__any__", label: "Anything" }] }, { title: "Labels", entries: options }]}
                selected={config.from_value ?? "__any__"}
                onPick={(id) => {
                  onChange({ trigger_config: { ...config, from_value: id === "__any__" ? null : id } });
                  close();
                }}
                placeholder="Search labels"
              />
            )}
          </Token>{" "}
          <Words>to </Words>
          <Token label={draft.trigger_value == null ? "something" : optionLabel(column, draft.trigger_value)} is_placeholder={draft.trigger_value == null} disabled={!column}>
            {(close) => (
              <PickerList
                sections={[{ entries: [{ id: "__any__", label: "Anything" }] }, { title: "Labels", entries: options }]}
                selected={draft.trigger_value == null ? null : String(draft.trigger_value)}
                onPick={(id) => {
                  onChange({ trigger_value: id === "__any__" ? null : id });
                  close();
                }}
                placeholder="Search labels"
              />
            )}
          </Token>
        </>
      );
    }
    case "column_changed":
      return (
        <>
          {switcher} {columnToken("column")} <Words>changes to </Words>
          <Token label={draft.trigger_value == null ? "anything" : valueLabel(context, column, draft.trigger_value)} is_placeholder={draft.trigger_value == null} disabled={!column}>
            {(close) =>
              column ? (
                <>
                  <ColumnValueEditor context={context} column={column} value={draft.trigger_value} mode="match" onApply={(value) => { onChange({ trigger_value: value }); close(); }} />
                  {draft.trigger_value != null && (
                    <button type="button" onClick={() => { onChange({ trigger_value: null }); close(); }} className="mt-1 w-full rounded-[6px] px-2 py-1.5 text-left text-[12.5px] text-boardtree-accent hover:bg-boardtree-hover">
                      Any change
                    </button>
                  )}
                </>
              ) : null
            }
          </Token>
        </>
      );
    case "person_assigned":
      return (
        <>
          {switcher}{" "}
          <Token label={draft.trigger_value == null ? "someone" : personLabel(context, draft.trigger_value)} is_placeholder={draft.trigger_value == null}>
            {(close) => (
              <PersonPicker
                context={context}
                selected={draft.trigger_value == null ? "__any__" : String(draft.trigger_value)}
                extra_entries={[{ id: "__any__", label: "Anyone" }]}
                onPick={(id) => {
                  onChange({ trigger_value: id === "__any__" ? null : Number(id) });
                  close();
                }}
              />
            )}
          </Token>{" "}
          <Words>is assigned in </Words>
          {columnToken("people")}
        </>
      );
    case "date_arrived":
      return (
        <>
          {switcher} {columnToken("date")}{" "}
          <Token label={offsetLabel(config.offset_days)} aria_label="When the date trigger fires" popover_width={300}>
            {(close) => <DateOffsetEditor offset_days={config.offset_days ?? 0} onApply={(offset_days) => { onChange({ trigger_config: { ...config, offset_days } }); close(); }} />}
          </Token>{" "}
          <Words>at </Words>
          <Token label={config.time ?? "any time"} is_placeholder={!config.time} aria_label="Time of day" popover_width={240}>
            {(close) => <TimeEditor time={config.time} onApply={(time) => { onChange({ trigger_config: { ...config, time } }); close(); }} />}
          </Token>
        </>
      );
    case "item_moved_to_group":
      return (
        <>
          {switcher} <Words>an item is moved to </Words>
          <Token label={config.group_id ? groupLabel(context, config.group_id) : "any group"} is_placeholder={!config.group_id}>
            {(close) => (
              <GroupPicker
                groups={context.groups}
                selected={config.group_id ? String(config.group_id) : "__any__"}
                extra_entries={[{ id: "__any__", label: "Any group" }]}
                onPick={(id) => {
                  onChange({ trigger_config: { ...config, group_id: id === "__any__" ? null : Number(id) } });
                  close();
                }}
              />
            )}
          </Token>
        </>
      );
    case "recurring":
      return (
        <>
          {switcher}{" "}
          <Token label={scheduleLabel(config.schedule)} aria_label="Schedule" popover_width={320}>
            {(close) => <ScheduleEditor schedule={config.schedule} onApply={(schedule) => { onChange({ trigger_config: { ...config, schedule } }); close(); }} />}
          </Token>
        </>
      );
    default: {
      const phrases: Partial<Record<BoardAutomationTriggerType, [string, string]>> = {
        item_created: ["an ", "item is created"],
        subitem_created: ["a ", "subitem is created"],
        update_posted: ["an ", "update is posted"],
        item_archived: ["an item is ", "archived"],
        item_deleted: ["an item is ", "deleted"],
      };
      const [lead, phrase] = phrases[type] ?? ["", def.label];
      return (
        <>
          <Words>When {lead}</Words>
          <TriggerSwitch label={phrase} draft={draft} context={context} onChange={onChange} />
        </>
      );
    }
  }
}
