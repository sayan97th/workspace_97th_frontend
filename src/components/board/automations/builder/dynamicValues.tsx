"use client";
import React, { useState } from "react";
import type { BoardAutomationCondition, BoardAutomationDynamicSource, BoardAutomationDynamicValue } from "@/types/board-automation";
import {
  DYNAMIC_EXCLUDED_OPERATORS,
  DYNAMIC_FAMILY_BY_FIELD,
  DYNAMIC_KINDS_BY_FAMILY,
  DYNAMIC_SOURCES_BY_FAMILY,
  DYNAMIC_SOURCE_LABELS,
  dynamicFamilyOfKind,
  type AutomationBuilderContext,
  type DynamicFamily,
} from "./automationCatalog";
import { PickerList, PopoverFooter, POPOVER_INPUT, POPOVER_LABEL, Segmented, WorkingDaysToggle } from "./builderUi";

/**
 * Dynamic values: a value read on every run instead of a fixed one, "the person who made the
 * change", "the item creator", "today + 3 days" or "the value of Cost". The API resolves them in
 * `AutomationDynamicValueResolver`, this file offers them in the builder's value popovers.
 */

/** The family a condition field compares as, undefined when a dynamic value cannot stand in for it. */
export function conditionDynamicFamily(context: AutomationBuilderContext, field_id: string): DynamicFamily | undefined {
  if (DYNAMIC_FAMILY_BY_FIELD[field_id]) return DYNAMIC_FAMILY_BY_FIELD[field_id];
  const column = context.columns.find((entry) => entry.id === field_id);
  return column ? dynamicFamilyOfKind(column.kind) : undefined;
}

/** Whether a condition may compare with a dynamic value, by its field and operator. */
export function canUseDynamicCondition(context: AutomationBuilderContext, condition: Pick<BoardAutomationCondition, "column_id" | "condition">): boolean {
  return Boolean(condition.column_id && condition.condition && conditionDynamicFamily(context, condition.column_id)) && !DYNAMIC_EXCLUDED_OPERATORS.includes(condition.condition);
}

export type DynamicValueEditorProps = {
  context: AutomationBuilderContext;
  family: DynamicFamily;
  value: BoardAutomationDynamicValue | null | undefined;
  /** Column scopes the "value of a column" source may read. */
  scopes?: ("item" | "subitem")[];
  /** Offer "the mentioned person", only a mention trigger knows one. */
  allow_mentioned?: boolean;
  /** Conditions never know the mentioned person, and the automation owner rarely makes sense there. */
  exclude?: BoardAutomationDynamicSource[];
  onApply: (value: BoardAutomationDynamicValue) => void;
};

/** Picks where a dynamic value comes from, and the days to add for a date. */
export function DynamicValueEditor({ context, family, value, scopes = ["item"], allow_mentioned = false, exclude = [], onApply }: DynamicValueEditorProps) {
  const sources = DYNAMIC_SOURCES_BY_FAMILY[family].filter((source) => (source !== "mentioned" || allow_mentioned) && !exclude.includes(source));
  const [source, setSource] = useState<BoardAutomationDynamicSource | null>(value?.source && sources.includes(value.source) ? value.source : sources[0] ?? null);
  const [column_id, setColumnId] = useState<string | null>(value?.column_id != null ? String(value.column_id) : null);
  const [offset, setOffset] = useState(String(value?.offset_days ?? 0));
  const [working_days, setWorkingDays] = useState(Boolean(value?.use_working_days));

  const columns = context.columns.filter((column) => scopes.includes(column.scope) && DYNAMIC_KINDS_BY_FAMILY[family].includes(column.kind));
  const offset_days = Math.round(Number(offset));
  const has_offset = family === "date";
  const is_valid = source !== null && (source !== "column" || column_id !== null) && (!has_offset || (Number.isFinite(offset_days) && Math.abs(offset_days) <= 3650));

  if (sources.length === 0) return <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">This field has no dynamic value to compare with.</div>;

  const apply = () => {
    if (!source) return;
    onApply({
      source,
      ...(source === "column" ? { column_id: Number(column_id) } : {}),
      ...(has_offset && offset_days !== 0 ? { offset_days, ...(working_days ? { use_working_days: true } : {}) } : {}),
    });
  };

  return (
    <>
      <div className={POPOVER_LABEL}>Read on every run</div>
      <PickerList
        is_searchable={false}
        max_height={170}
        sections={[{ entries: sources.map((entry) => ({ id: entry, label: DYNAMIC_SOURCE_LABELS[entry] })) }]}
        selected={source}
        onPick={(id) => setSource(id)}
      />
      {source === "column" && (
        <div className="mt-2 border-t border-boardtree-border-soft pt-2">
          <div className={POPOVER_LABEL}>Column</div>
          {columns.length === 0 ? (
            <div className="px-2 py-2 text-[12.5px] text-boardtree-text-faint">This table has no column of the right kind.</div>
          ) : (
            <PickerList
              max_height={150}
              sections={[{ entries: columns.map((column) => ({ id: column.id, label: column.scope === "subitem" ? `subitem ${column.title}` : column.title, hint: column.kind.replace("_", " ") })) }]}
              selected={column_id}
              onPick={setColumnId}
              placeholder="Search columns"
            />
          )}
        </div>
      )}
      {has_offset && (
        <div className="mt-2 border-t border-boardtree-border-soft pt-2">
          <div className={POPOVER_LABEL}>Days to add, negative to go back</div>
          <input type="number" min={-3650} max={3650} value={offset} onChange={(event) => setOffset(event.target.value)} aria-label="Days to add" className={`${POPOVER_INPUT} w-28`} />
          {offset_days !== 0 && <WorkingDaysToggle checked={working_days} onChange={setWorkingDays} />}
        </div>
      )}
      <PopoverFooter onDone={apply} is_disabled={!is_valid} />
    </>
  );
}

/**
 * A value popover with a "Fixed value" and a "Dynamic value" tab. The fixed tab is the column's
 * own editor, passed as `children`.
 */
export function FixedOrDynamic({ is_dynamic, children, dynamic }: { is_dynamic: boolean; children: React.ReactNode; dynamic: React.ReactNode }) {
  const [tab, setTab] = useState<"fixed" | "dynamic">(is_dynamic ? "dynamic" : "fixed");
  return (
    <>
      <div className="mb-2">
        <Segmented label="Kind of value" options={[{ id: "fixed", label: "Fixed value" }, { id: "dynamic", label: "Dynamic value" }]} value={tab} onChange={setTab} />
      </div>
      {tab === "fixed" ? children : dynamic}
    </>
  );
}
