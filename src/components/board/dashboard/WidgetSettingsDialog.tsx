"use client";
import React, { useEffect, useState } from "react";
import BoardDialog, { DialogPrimaryButton } from "../BoardDialog";
import { boardViewDataService } from "@/services/board-view-data.service";
import { CHART_TYPE_OPTIONS } from "../chart/chartableColumns";
import type { ChartDataDto } from "../chart/types";
import type { DashboardColumnOption, DashboardSourceBoard, DashboardWidget, DashboardWidgetResult, DashboardWidgetSettings, NumbersFunction } from "./types";
import { NUMBERS_FUNCTION_LABEL, widgetTypeOption } from "./widgetCatalog";

export type WidgetSettingsDialogProps = {
  board_id: number;
  widget: DashboardWidget | null;
  result: DashboardWidgetResult | undefined;
  onChange: (widget_id: string, partial: Partial<DashboardWidget>) => void;
  onClose: () => void;
};

const GROUPABLE_TYPES = ["status", "label", "tags", "dropdown", "people", "date", "checkbox"];
const OPTION_TYPES = ["status", "label", "dropdown"];
const TABLE_MAX_COLUMNS = 5;

const field_class = "w-full rounded-lg border border-shell-border-strong bg-shell-bg px-3 py-2 text-[13.5px] text-shell-text outline-none focus:border-brand-500";
const label_class = "mb-1.5 block text-[12.5px] font-medium text-shell-text-secondary";

/**
 * Settings of one Dashboard widget: its title, size, which board and table
 * it reads, and the options of its type. Every change is applied (and
 * saved) as it is made, so the widget behind the dialog updates live, like
 * the Chart tab's settings row.
 */
const WidgetSettingsDialog: React.FC<WidgetSettingsDialogProps> = ({ board_id, widget, result, onChange, onClose }) => {
  const [boards, setBoards] = useState<DashboardSourceBoard[]>([]);
  const [board_search, setBoardSearch] = useState("");
  const [title_draft, setTitleDraft] = useState("");

  useEffect(() => {
    setTitleDraft(widget?.title ?? "");
  }, [widget?.id, widget?.title]);

  useEffect(() => {
    if (!widget) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      boardViewDataService
        .getDashboardSources(board_id, board_search)
        .then((list) => !cancelled && setBoards(list))
        .catch(() => {});
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [board_id, board_search, widget]);

  if (!widget) return null;

  const settings = widget.config ?? {};
  const columns = result?.columns ?? [];
  const setSettings = (partial: DashboardWidgetSettings) => onChange(widget.id, { config: { ...settings, ...partial } });
  const columnsOf = (types: string[]) => columns.filter((column) => types.includes(column.type));
  const current_board_id = widget.source_board_id ?? board_id;
  // What the API resolved for a chart widget, so the pickers show the grouping actually drawn.
  const chart_config = widget.type === "chart" ? (result?.data as ChartDataDto | null)?.config : undefined;
  const board_options = boards.some((board) => board.id === current_board_id) || !result?.source_board
    ? boards
    : [{ id: result.source_board.id, label: result.source_board.label, workspace_name: null }, ...boards];

  return (
    <BoardDialog
      is_open
      title={`${widgetTypeOption(widget.type).label} widget`}
      subtitle="Changes are saved as you make them."
      onClose={onClose}
      width={520}
      footer={<DialogPrimaryButton onClick={onClose}>Done</DialogPrimaryButton>}
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className={label_class} htmlFor="widget-title">
            Title
          </label>
          <input
            id="widget-title"
            value={title_draft}
            maxLength={120}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={() => title_draft !== (widget.title ?? "") && onChange(widget.id, { title: title_draft.trim() || null })}
            className={field_class}
          />
        </div>

        <div>
          <span className={label_class}>Size</span>
          <div role="radiogroup" aria-label="Widget size" className="flex overflow-hidden rounded-lg border border-shell-border">
            {([1, 2, 3] as const).map((width) => (
              <button
                key={width}
                type="button"
                role="radio"
                aria-checked={(widget.width ?? 1) === width}
                onClick={() => onChange(widget.id, { width })}
                className={`flex-1 py-2 text-[13px] ${(widget.width ?? 1) === width ? "bg-shell-hover font-semibold text-shell-text" : "text-shell-text-muted hover:bg-shell-hover"}`}
              >
                {width === 1 ? "Small" : width === 2 ? "Medium" : "Full width"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={label_class} htmlFor="widget-board">
              Board
            </label>
            <input
              value={board_search}
              onChange={(event) => setBoardSearch(event.target.value)}
              placeholder="Search boards"
              aria-label="Search boards"
              className={`${field_class} mb-1.5`}
            />
            <select
              id="widget-board"
              value={String(current_board_id)}
              onChange={(event) => {
                const next = Number(event.target.value);
                onChange(widget.id, { source_board_id: next === board_id ? null : next, source_view_id: null, config: resetColumnSettings(settings) });
              }}
              className={field_class}
            >
              {board_options.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.id === board_id ? `${board.label} (this board)` : board.workspace_name ? `${board.label} · ${board.workspace_name}` : board.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={label_class} htmlFor="widget-view">
              Table
            </label>
            <select
              id="widget-view"
              value={String(result?.source_view_id ?? "")}
              onChange={(event) => onChange(widget.id, { source_view_id: Number(event.target.value), config: resetColumnSettings(settings) })}
              className={`${field_class} sm:mt-[42px]`}
            >
              {(result?.source_views ?? []).map((view) => (
                <option key={view.id} value={view.id}>
                  {view.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {widget.type === "numbers" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Show"
              value={settings.function ?? "count"}
              options={(Object.keys(NUMBERS_FUNCTION_LABEL) as NumbersFunction[]).map((fn) => ({ id: fn, label: NUMBERS_FUNCTION_LABEL[fn] }))}
              onChange={(value) =>
                setSettings({
                  function: value as NumbersFunction,
                  // A sum or average needs a number column, the first one is picked until the user changes it.
                  column_id: value === "count" ? settings.column_id ?? null : settings.column_id ?? columnsOf(["number"])[0]?.id ?? null,
                })
              }
            />
            {(settings.function ?? "count") !== "count" && (
              <ColumnSelect label="Number column" columns={columnsOf(["number"])} value={settings.column_id ?? null} onChange={(column_id) => setSettings({ column_id })} />
            )}
            <TextSetting label="Prefix" value={settings.prefix ?? ""} placeholder="$" onCommit={(prefix) => setSettings({ prefix })} />
            <TextSetting label="Unit" value={settings.suffix ?? ""} placeholder="hours" onCommit={(suffix) => setSettings({ suffix })} />
          </div>
        )}

        {(widget.type === "battery" || widget.type === "status_overview") && (
          <ColumnSelect
            label="Status column"
            columns={columnsOf(OPTION_TYPES)}
            value={settings.status_column_id ?? (result?.data as { status_column_id?: string | null } | null)?.status_column_id ?? null}
            onChange={(status_column_id) => setSettings({ status_column_id, done_option_ids: null })}
          />
        )}

        {widget.type === "chart" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Chart type"
              value={settings.chart_type ?? "bar"}
              options={CHART_TYPE_OPTIONS.map((option) => ({ id: option.kind, label: option.label }))}
              onChange={(value) => setSettings({ chart_type: value as DashboardWidgetSettings["chart_type"] })}
            />
            <SelectField
              label="Group by"
              value={settings.group_by_column_id ?? chart_config?.group_by_column_id ?? "__group__"}
              options={[{ id: "__group__", label: "Group" }, ...columnsOf(GROUPABLE_TYPES).map((column) => ({ id: column.id, label: column.label }))]}
              onChange={(group_by_column_id) => setSettings({ group_by_column_id, split_by_column_id: null })}
            />
            <SelectField
              label="Measure"
              value={
                (settings.aggregate_fn ?? chart_config?.aggregate_fn) && (settings.aggregate_fn ?? chart_config?.aggregate_fn) !== "count"
                  ? `${settings.aggregate_fn ?? chart_config?.aggregate_fn}:${settings.value_column_id ?? chart_config?.value_column_id}`
                  : "count"
              }
              options={[
                { id: "count", label: "Count of items" },
                ...columnsOf(["number"]).flatMap((column) => [
                  { id: `sum:${column.id}`, label: `Sum of ${column.label}` },
                  { id: `average:${column.id}`, label: `Average of ${column.label}` },
                ]),
              ]}
              onChange={(value) => {
                const [aggregate_fn, value_column_id] = value.split(":");
                setSettings({ aggregate_fn: aggregate_fn as DashboardWidgetSettings["aggregate_fn"], value_column_id: value_column_id ?? null });
              }}
            />
          </div>
        )}

        {widget.type === "table" && (
          <>
            <fieldset>
              <legend className={label_class}>Columns (up to {TABLE_MAX_COLUMNS})</legend>
              <div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-shell-border p-2 sm:grid-cols-2">
                {columns.map((column) => {
                  const selected = settings.column_ids ?? [];
                  const is_checked = selected.includes(column.id);
                  return (
                    <label key={column.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-[13px] text-shell-text-secondary hover:bg-shell-hover">
                      <input
                        type="checkbox"
                        checked={is_checked}
                        disabled={!is_checked && selected.length >= TABLE_MAX_COLUMNS}
                        onChange={() => setSettings({ column_ids: is_checked ? selected.filter((id) => id !== column.id) : [...selected, column.id] })}
                      />
                      <span className="truncate">{column.label}</span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-1 text-[12px] text-shell-text-faint">With none picked, the first columns of the table are shown.</p>
            </fieldset>
            <SelectField
              label="Items shown"
              value={String(settings.limit ?? 10)}
              options={[5, 10, 20, 50].map((limit) => ({ id: String(limit), label: `${limit} items` }))}
              onChange={(value) => setSettings({ limit: Number(value) })}
            />
          </>
        )}

        {widget.type === "workload" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ColumnSelect label="People column" columns={columnsOf(["people"])} value={settings.people_column_id ?? null} onChange={(people_column_id) => setSettings({ people_column_id })} />
            <SelectField
              label="Measure"
              value={settings.effort_column_id ?? ""}
              options={[{ id: "", label: "Count items" }, ...columnsOf(["number"]).map((column) => ({ id: column.id, label: `Sum of ${column.label}` }))]}
              onChange={(value) => setSettings({ effort_column_id: value || null })}
            />
          </div>
        )}
      </div>
    </BoardDialog>
  );
};

/** Settings that name a column of the table the widget reads. */
const COLUMN_SETTING_KEYS = [
  "column_id",
  "status_column_id",
  "done_option_ids",
  "group_by_column_id",
  "split_by_column_id",
  "value_column_id",
  "column_ids",
  "people_column_id",
  "effort_column_id",
] as const;

/** Column picks point at one table's columns, so they are dropped when the board or table changes. */
function resetColumnSettings(settings: DashboardWidgetSettings): DashboardWidgetSettings {
  const next: DashboardWidgetSettings = { ...settings };
  for (const key of COLUMN_SETTING_KEYS) delete next[key];
  if (next.aggregate_fn && next.aggregate_fn !== "count") next.aggregate_fn = "count";
  return next;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { id: string; label: string }[]; onChange: (value: string) => void }) {
  const id = `widget-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div>
      <label className={label_class} htmlFor={id}>
        {label}
      </label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={field_class}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ColumnSelect({ label, columns, value, onChange }: { label: string; columns: DashboardColumnOption[]; value: string | null; onChange: (value: string | null) => void }) {
  if (columns.length === 0) {
    return (
      <div>
        <span className={label_class}>{label}</span>
        <p className="rounded-lg border border-dashed border-shell-border px-3 py-2 text-[12.5px] text-shell-text-muted">This table has no matching column yet.</p>
      </div>
    );
  }
  return (
    <SelectField
      label={label}
      value={value ?? columns[0].id}
      options={columns.map((column) => ({ id: column.id, label: column.label }))}
      onChange={(next) => onChange(next || null)}
    />
  );
}

function TextSetting({ label, value, placeholder, onCommit }: { label: string; value: string; placeholder?: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const id = `widget-${label.toLowerCase()}`;
  return (
    <div>
      <label className={label_class} htmlFor={id}>
        {label}
      </label>
      <input id={id} value={draft} maxLength={12} placeholder={placeholder} onChange={(event) => setDraft(event.target.value)} onBlur={() => draft !== value && onCommit(draft)} className={field_class} />
    </div>
  );
}

export default WidgetSettingsDialog;
