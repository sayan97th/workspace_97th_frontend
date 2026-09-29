"use client";
import React, { useState } from "react";
import type { BoardAutomationSchedule, BoardAutomationThresholdOperator, BoardAutomationTriggerType } from "@/types/board-automation";
import { SCHEDULED_TRIGGERS, SUBITEM_AWARE_TRIGGERS, TRIGGER_BY_TYPE, TRIGGER_COLUMN_SCOPE, WEEKDAY_LABELS, triggerSections, type AutomationBuilderContext } from "./automationCatalog";
import { boardLabel, columnLabel, findColumn, formLabel, groupLabel, offsetLabel, optionLabel, personLabel, scheduleLabel, thresholdLabel, valueLabel } from "./automationSentence";
import type { AutomationDraft } from "./builderDraft";
import { PickerList, PopoverFooter, POPOVER_INPUT, POPOVER_LABEL, POPOVER_SECONDARY, Segmented, Token, WorkingDaysToggle } from "./builderUi";
import { ColumnPicker, ColumnValueEditor, GroupPicker, PersonPicker } from "./valueEditors";

export type TriggerRowProps = {
  draft: AutomationDraft;
  context: AutomationBuilderContext;
  onChange: (patch: Partial<AutomationDraft>) => void;
  /** Loads the other boards of the workspace, for "item is moved to this board". */
  is_loading_boards?: boolean;
};

/** Words of the trigger sentence that only label, not edit. */
const Words = ({ children }: { children: React.ReactNode }) => <span className="text-boardtree-text">{children}</span>;

/** Switches the trigger, resetting what belonged to the previous one and picking the first fitting column. */
function pickTrigger(type: BoardAutomationTriggerType, context: AutomationBuilderContext): Partial<AutomationDraft> {
  const def = TRIGGER_BY_TYPE[type];
  const scope = TRIGGER_COLUMN_SCOPE[type] ?? "item";
  const first_column = def.column_kinds ? context.columns.find((column) => column.scope === scope && def.column_kinds?.includes(column.kind)) : undefined;
  const schedule = type === "recurring"
    ? { frequency: "weekly" as const, weekdays: [1], time: "09:00" }
    : type === "item_scan" ? { frequency: "daily" as const, time: "09:00" } : null;
  return {
    trigger_type: type,
    trigger_column_id: first_column?.id ?? null,
    trigger_value: null,
    trigger_config: schedule ? { schedule } : type === "number_threshold" ? { operator: "above", threshold: null } : {},
  };
}

/** A status label picker, for triggers waiting for one label. */
function LabelPicker({ column, selected, onPick, with_any = false }: { column: ReturnType<typeof findColumn>; selected: string | null; onPick: (id: string | null) => void; with_any?: boolean }) {
  const options = (column?.options ?? []).map((option) => ({ id: option.id, label: option.label, color: option.color }));
  return (
    <PickerList
      sections={[...(with_any ? [{ entries: [{ id: "__any__", label: "Anything" }] }] : []), { title: with_any ? "Labels" : undefined, entries: options }]}
      selected={selected ?? (with_any ? "__any__" : null)}
      onPick={(id) => onPick(id === "__any__" ? null : id)}
      placeholder="Search labels"
    />
  );
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

function DateOffsetEditor({ offset_days, working_days_only, onApply }: { offset_days: number; working_days_only: boolean; onApply: (offset_days: number, working_days_only: boolean) => void }) {
  const [direction, setDirection] = useState<"before" | "on" | "after">(offset_days < 0 ? "before" : offset_days > 0 ? "after" : "on");
  const [days, setDays] = useState(String(Math.abs(offset_days) || 1));
  const [working_days, setWorkingDays] = useState(working_days_only);
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
          <span className="text-[12.5px] text-boardtree-text-secondary">{working_days ? (amount === 1 ? "working day" : "working days") : amount === 1 ? "day" : "days"} {direction} the date</span>
        </div>
      )}
      <WorkingDaysToggle checked={working_days} onChange={setWorkingDays} />
      {working_days && direction === "on" && <div className="mt-1 text-[11.5px] text-boardtree-text-faint">A date on a weekend or holiday fires on the working day before it.</div>}
      <PopoverFooter onDone={() => onApply(direction === "on" ? 0 : direction === "before" ? -amount : amount, working_days)} />
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

/** Above, below or equal to a number, for "number goes above or below". */
function ThresholdEditor({ operator, threshold, unit, onApply }: { operator: BoardAutomationThresholdOperator; threshold: number | null | undefined; unit: string; onApply: (operator: BoardAutomationThresholdOperator, threshold: number) => void }) {
  const [next_operator, setNextOperator] = useState(operator);
  const [value, setValue] = useState(threshold != null ? String(threshold) : "");
  const number = Number(value);
  const is_valid = value.trim() !== "" && Number.isFinite(number);
  return (
    <>
      <Segmented label="Direction" options={[{ id: "above", label: "Above" }, { id: "below", label: "Below" }, { id: "equals", label: "Equal to" }]} value={next_operator} onChange={setNextOperator} />
      <div className="mt-2 flex items-center gap-2">
        <input
          autoFocus
          type="number"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && is_valid) onApply(next_operator, number);
          }}
          aria-label="Threshold"
          className={`${POPOVER_INPUT} flex-1`}
        />
        {unit && <span className="text-[12.5px] text-boardtree-text-secondary">{unit}</span>}
      </div>
      <div className="mt-1.5 text-[11.5px] text-boardtree-text-faint">Fires once when the number crosses it, not again while it stays past it.</div>
      <PopoverFooter is_disabled={!is_valid} onDone={() => onApply(next_operator, number)} />
    </>
  );
}

/** The one task a "checklist task is checked" trigger waits for, empty for any task. */
function TaskNameEditor({ value, onApply }: { value: string; onApply: (value: string | null) => void }) {
  const [draft, setDraft] = useState(value);
  return (
    <>
      <div className={POPOVER_LABEL}>Task name</div>
      <input
        autoFocus
        value={draft}
        maxLength={255}
        placeholder="Leave empty for any task"
        aria-label="Task name"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onApply(draft.trim() || null);
        }}
        className={POPOVER_INPUT}
      />
      <div className="mt-1.5 text-[11.5px] text-boardtree-text-faint">Matched without case, the whole name.</div>
      <PopoverFooter onDone={() => onApply(draft.trim() || null)} extra={value ? <button type="button" onClick={() => onApply(null)} className={POPOVER_SECONDARY}>Any task</button> : undefined} />
    </>
  );
}

/** The trigger sentence: "When Status changes to Done", "When Due date is 2 days away at 09:00", "Every Monday at 09:00". */
export default function TriggerRow({ draft, context, onChange, is_loading_boards = false }: TriggerRowProps) {
  const type = draft.trigger_type;
  const column = findColumn(context, draft.trigger_column_id);
  const def = type ? TRIGGER_BY_TYPE[type] : null;
  const fixed_scope = type ? TRIGGER_COLUMN_SCOPE[type] : undefined;
  const scopes: ("item" | "subitem")[] = fixed_scope ? [fixed_scope] : type && SUBITEM_AWARE_TRIGGERS.includes(type) ? ["item", "subitem"] : ["item"];

  if (!type || !def) {
    return (
      <>
        <Words>When </Words>
        <TriggerSwitch label="this happens" is_placeholder draft={draft} context={context} onChange={onChange} />
      </>
    );
  }

  const columnToken = (fallback: string) => (
    <Token
      label={draft.trigger_column_id && !column ? "deleted column" : columnLabel(context, draft.trigger_column_id, fallback)}
      is_placeholder={!column}
      is_invalid={Boolean(draft.trigger_column_id) && !column}
      aria_label="Choose a column"
    >
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
  const switcher = <TriggerSwitch label={SCHEDULED_TRIGGERS.includes(type) ? "Every" : "When"} draft={draft} context={context} onChange={onChange} />;
  const scheduleToken = (
    <Token label={scheduleLabel(config.schedule)} aria_label="Schedule" popover_width={320}>
      {(close) => <ScheduleEditor schedule={config.schedule} onApply={(schedule) => { onChange({ trigger_config: { ...config, schedule } }); close(); }} />}
    </Token>
  );
  const labelToken = (
    <Token label={draft.trigger_value == null ? "something" : optionLabel(column, draft.trigger_value)} is_placeholder={draft.trigger_value == null} disabled={!column} aria_label="Choose a label">
      {(close) => <LabelPicker column={column} selected={draft.trigger_value == null ? null : String(draft.trigger_value)} onPick={(id) => { onChange({ trigger_value: id }); close(); }} />}
    </Token>
  );

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
          <Token label={offsetLabel(config.offset_days, config.working_days_only)} aria_label="When the date trigger fires" popover_width={300}>
            {(close) => (
              <DateOffsetEditor
                offset_days={config.offset_days ?? 0}
                working_days_only={Boolean(config.working_days_only)}
                onApply={(offset_days, working_days_only) => { onChange({ trigger_config: { ...config, offset_days, working_days_only } }); close(); }}
              />
            )}
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
      return <>{switcher} {scheduleToken}</>;
    case "item_scan":
      return (
        <>
          {switcher} {scheduleToken}<Words>, for each item that matches the conditions below</Words>
        </>
      );
    case "all_subitems_status":
      return (
        <>
          {switcher} <Words>all subitems have </Words>
          {columnToken("subitem status")} {labelToken}
        </>
      );
    case "all_group_items_status":
      return (
        <>
          {switcher} <Words>all items in </Words>
          <Token label={config.group_id ? groupLabel(context, config.group_id) : "any group"} is_placeholder={!config.group_id} is_invalid={Boolean(config.group_id) && !context.groups.some((group) => group.id === String(config.group_id))}>
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
          </Token>{" "}
          <Words>have </Words>
          {columnToken("status")} {labelToken}
        </>
      );
    case "date_changed":
      return <>{switcher} {columnToken("date")} <Words>changes</Words></>;
    case "form_submitted":
      return (
        <>
          {switcher}{" "}
          <Token label={config.form_view_id ? formLabel(context, config.form_view_id) : "any form"} is_placeholder={!config.form_view_id}>
            {(close) =>
              (context.forms ?? []).length === 0 ? (
                <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">This board has no form yet. Add a Form view from the board tabs, every form of the board can still trigger this.</div>
              ) : (
                <PickerList
                  sections={[{ entries: [{ id: "__any__", label: "Any form" }] }, { title: "Forms", entries: context.forms ?? [] }]}
                  selected={config.form_view_id ? String(config.form_view_id) : "__any__"}
                  onPick={(id) => {
                    onChange({ trigger_config: { ...config, form_view_id: id === "__any__" ? null : Number(id) } });
                    close();
                  }}
                  placeholder="Search forms"
                />
              )
            }
          </Token>{" "}
          <Words>is submitted</Words>
        </>
      );
    case "webhook_received":
      return (
        <>
          <Words>When a </Words>
          <TriggerSwitch label="webhook" draft={draft} context={context} onChange={onChange} />
          <Words> is received</Words>
        </>
      );
    case "button_clicked":
      return (
        <>
          {switcher} {columnToken("button")} <Words>is clicked</Words>
          {!context.columns.some((entry) => entry.kind === "button") && (
            <span className="ml-2 align-middle text-[13px] text-boardtree-text-faint">Add a Button column to the table first.</span>
          )}
        </>
      );
    case "number_threshold": {
      const unit = column?.kind === "time_tracking" ? "hours" : column?.kind === "progress" ? "%" : column?.kind === "rating" ? "stars" : "";
      return (
        <>
          {switcher} {columnToken("number")} <Words>goes </Words>
          <Token label={thresholdLabel(config, column)} is_placeholder={typeof config.threshold !== "number"} disabled={!column} aria_label="Threshold" popover_width={280}>
            {(close) => (
              <ThresholdEditor
                operator={config.operator ?? "above"}
                threshold={config.threshold}
                unit={unit}
                onApply={(operator, threshold) => { onChange({ trigger_config: { ...config, operator, threshold } }); close(); }}
              />
            )}
          </Token>
        </>
      );
    }
    case "checklist_completed":
      return <>{switcher} <Words>every task of </Words>{columnToken("checklist")} <Words>is done</Words></>;
    case "checklist_item_checked": {
      const task = typeof draft.trigger_value === "string" ? draft.trigger_value : "";
      return (
        <>
          {switcher}{" "}
          <Token label={task ? `"${task}"` : "any task"} is_placeholder={!task} aria_label="Which task" popover_width={280}>
            {(close) => <TaskNameEditor value={task} onApply={(value) => { onChange({ trigger_value: value }); close(); }} />}
          </Token>{" "}
          <Words>is checked in </Words>{columnToken("checklist")}
        </>
      );
    }
    case "item_moved_to_board":
      return (
        <>
          {switcher} <Words>an item is moved here from </Words>
          <Token label={config.from_board_id ? boardLabel(context, config.from_board_id) : "any board"} is_placeholder={!config.from_board_id} aria_label="Which board">
            {(close) =>
              is_loading_boards ? (
                <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">Loading boards...</div>
              ) : (
                <PickerList
                  sections={[{ entries: [{ id: "__any__", label: "Any board" }] }, { title: "Boards", entries: context.board_targets.map((board) => ({ id: String(board.id), label: board.label })) }]}
                  selected={config.from_board_id ? String(config.from_board_id) : "__any__"}
                  onPick={(id) => { onChange({ trigger_config: { ...config, from_board_id: id === "__any__" ? null : Number(id) } }); close(); }}
                  placeholder="Search boards"
                />
              )
            }
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
        name_changed: ["an ", "item name changes"],
        item_restored: ["an item is ", "restored"],
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
