"use client";
import React, { useEffect, useRef, useState } from "react";
import type { BoardAutomationActionParams } from "@/types/board-automation";
import type { BoardColumnDto } from "@/types/board-content";
import { boardContentService } from "@/services/board-content.service";
import type { ColumnKind } from "../../table/types";
import { MESSAGE_TOKENS, MULTI_VALUE_KINDS, READ_ONLY_KINDS, SETTABLE_KINDS, type ActionPickerId, type AutomationBuilderContext, type AutomationColumn } from "./automationCatalog";
import { columnLabel, columnTokensFromDisplay, columnTokensToDisplay, findColumn, groupLabel, optionLabel, personLabel, valueLabel } from "./automationSentence";
import type { ActionDraft } from "./builderDraft";
import { MiniAvatar, PickerList, PopoverFooter, POPOVER_INPUT, POPOVER_LABEL, Token, type PickerEntry } from "./builderUi";
import { ColumnPicker, ColumnValueEditor, GroupPicker, MultiPick } from "./valueEditors";

/**
 * The sentences of the actions that reach past one cell: rename the item, add or remove a label
 * or person, change the items a connect boards column links to, and change every item of a group.
 * `ActionRow` hands each one its verb token.
 */

export const BULK_ACTION_IDS: ActionPickerId[] = ["rename_item", "change_values", "update_connected_items", "group_items"];

const Words = ({ children }: { children: React.ReactNode }) => <span className="text-boardtree-text">{children}</span>;

const truncate = (text: string, length = 30): string => (text.length > length ? `${text.slice(0, length - 1).trimEnd()}...` : text);

export type BulkActionRowProps = {
  action: ActionDraft;
  context: AutomationBuilderContext;
  lead: "Then" | "and" | "Otherwise";
  /** Whether the trigger has an item, so "the item's group" can be offered. */
  has_trigger_item: boolean;
  renderSwitch: (label: string) => React.ReactNode;
  onPatch: (next: BoardAutomationActionParams) => void;
};

/** A board column from the API as the builder reads it. */
export function toAutomationColumn(dto: BoardColumnDto): AutomationColumn {
  return {
    id: String(dto.id),
    title: dto.label,
    kind: (dto.type === "long_text" ? "longtext" : dto.type) as ColumnKind,
    width: dto.width,
    scope: dto.scope,
    options: (dto.config?.options ?? []).map((option) => ({ id: option.id, label: option.label, color: option.color })),
    linked_board_id: dto.config?.linked_board_id != null ? String(dto.config.linked_board_id) : undefined,
  };
}

/** The item columns of the board a connect boards column links to, loaded once per board. */
function useConnectedColumns(linked_board_id: string | undefined): { columns: AutomationColumn[]; is_loading: boolean } {
  const [state, setState] = useState<{ board_id: string | null; columns: AutomationColumn[] }>({ board_id: null, columns: [] });
  const is_loading = Boolean(linked_board_id) && state.board_id !== linked_board_id;

  useEffect(() => {
    if (!linked_board_id || state.board_id === linked_board_id) return;
    let cancelled = false;
    boardContentService
      .getColumns(Number(linked_board_id))
      .then((columns) => {
        if (!cancelled) setState({ board_id: linked_board_id, columns: columns.filter((column) => column.scope !== "subitem").map(toAutomationColumn) });
      })
      .catch(() => {
        if (!cancelled) setState({ board_id: linked_board_id, columns: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [linked_board_id, state.board_id]);

  return { columns: state.board_id === linked_board_id ? state.columns : [], is_loading };
}

/** The new name of "rename item", with tokens and column values. */
function NameTemplateEditor({ context, template, onApply }: { context: AutomationBuilderContext; template: string; onApply: (template: string) => void }) {
  const [draft, setDraft] = useState(columnTokensToDisplay(template, context));
  const [is_column_list_open, setIsColumnListOpen] = useState(false);
  const input_ref = useRef<HTMLInputElement | null>(null);
  const token_columns = context.columns.filter((column) => column.scope === "item" && column.kind !== "button" && column.kind !== "formula");
  const tokens = MESSAGE_TOKENS.filter((entry) => ["{item_name}", "{actor_name}", "{new_value}", "{date}", "{week}", "{month}"].includes(entry.token));

  const insert = (token: string) => {
    const element = input_ref.current;
    const start = element?.selectionStart ?? draft.length;
    const end = element?.selectionEnd ?? draft.length;
    setDraft(`${draft.slice(0, start)}${token}${draft.slice(end)}`);
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + token.length, start + token.length);
    });
  };
  const apply = () => onApply(columnTokensFromDisplay(draft.trim(), context));

  return (
    <>
      <div className={POPOVER_LABEL}>New name</div>
      <input
        ref={input_ref}
        autoFocus
        value={draft}
        maxLength={255}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && draft.trim()) {
            event.preventDefault();
            apply();
          }
        }}
        placeholder="{item_name} (done)"
        aria-label="New name"
        className={POPOVER_INPUT}
      />
      <div className="mt-1.5 flex flex-wrap gap-1">
        {tokens.map((entry) => (
          <button key={entry.token} type="button" onClick={() => insert(entry.token)} title={entry.token} className="rounded-full border border-boardtree-border px-2 py-0.5 text-[11.5px] text-boardtree-text-secondary hover:border-boardtree-accent hover:text-boardtree-accent">
            {entry.label}
          </button>
        ))}
        {token_columns.length > 0 && (
          <button type="button" onClick={() => setIsColumnListOpen((open) => !open)} aria-expanded={is_column_list_open} className="rounded-full border border-dashed border-boardtree-accent/60 px-2 py-0.5 text-[11.5px] text-boardtree-accent hover:bg-boardtree-accent-surface">
            + Column value
          </button>
        )}
      </div>
      {is_column_list_open && (
        <div className="mt-1.5 rounded-[6px] border border-boardtree-border-soft p-1">
          <PickerList
            sections={[{ entries: token_columns.map((column) => ({ id: column.id, label: column.title, hint: column.kind.replace("_", " ") })) }]}
            selected={null}
            max_height={150}
            placeholder="Search columns"
            onPick={(id) => {
              const column = token_columns.find((entry) => entry.id === id);
              if (column) insert(`{#${column.title}}`);
              setIsColumnListOpen(false);
            }}
          />
        </div>
      )}
      <div className="mt-1.5 text-[11.5px] text-boardtree-text-faint">Renaming sets off &quot;item name changes&quot; automations too.</div>
      <PopoverFooter onDone={apply} is_disabled={!draft.trim()} />
    </>
  );
}

/** The labels or people "add or remove" changes, people can also be whoever made the change or the item creator. */
function ValuesPicker({ context, column, values, onApply }: { context: AutomationBuilderContext; column: AutomationColumn; values: string[]; onApply: (values: string[]) => void }) {
  const is_people = column.kind === "people" || column.kind === "vote";
  const entries: PickerEntry<string>[] = is_people
    ? [
        { id: "__actor__", label: "Person who made the change" },
        { id: "__creator__", label: "Item creator" },
        ...context.people.map((person) => ({ id: person.id, label: person.name, leading: <MiniAvatar initials={person.initials} color={person.color} /> })),
      ]
    : (column.options ?? []).map((option) => ({ id: option.id, label: option.label, color: option.color }));
  return <MultiPick entries={entries} initial={values} onApply={(next) => onApply(next.slice(0, 50))} placeholder={is_people ? "Search people" : "Search labels"} />;
}

function valuesLabel(context: AutomationBuilderContext, column: AutomationColumn | undefined, values: string[]): string {
  if (values.length === 0) return "values";
  const names = values.map((id) => (id === "__actor__" ? "the person who made the change" : id === "__creator__" ? "the item creator" : column && (column.kind === "people" || column.kind === "vote") ? personLabel(context, id) : optionLabel(column, id)));
  return truncate(names.join(", "), 36);
}

/** A column token of this tab, drawn in red once the column it names was deleted. */
function OwnColumnToken({ context, column_id, kinds, fallback, onPick }: { context: AutomationBuilderContext; column_id: number | null | undefined; kinds: ColumnKind[]; fallback: string; onPick: (column_id: string) => void }) {
  const column = findColumn(context, column_id);
  const is_invalid = column_id != null && !column;
  return (
    <Token label={is_invalid ? "deleted column" : columnLabel(context, column_id, fallback)} is_placeholder={!column} is_invalid={is_invalid} aria_label="Choose a column">
      {(close) => (
        <ColumnPicker
          context={context}
          kinds={kinds}
          selected={column_id != null ? String(column_id) : null}
          onPick={(id) => {
            onPick(id);
            close();
          }}
        />
      )}
    </Token>
  );
}

function UpdateConnectedRow({ context, action, lead, renderSwitch, onPatch }: BulkActionRowProps) {
  const params = action.params;
  const connect_column = findColumn(context, params.connect_column_id);
  const { columns, is_loading } = useConnectedColumns(connect_column?.linked_board_id);
  const writable = columns.filter((column) => SETTABLE_KINDS.includes(column.kind) && !READ_ONLY_KINDS.includes(column.kind));
  const linked_column = columns.find((column) => column.id === String(params.linked_column_id ?? ""));
  const linked_label = linked_column ? linked_column.title : params.linked_column_id ? (is_loading ? "loading..." : "a column") : "column";
  const linked_context = { ...context, columns };

  return (
    <>
      <Words>{lead} </Words>
      {renderSwitch("set")}{" "}
      <Token label={linked_label} is_placeholder={!linked_column} disabled={!connect_column?.linked_board_id} aria_label="Column of the connected board">
        {(close) =>
          is_loading ? (
            <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">Loading columns...</div>
          ) : writable.length === 0 ? (
            <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">The connected board has no column this action can set.</div>
          ) : (
            <PickerList
              sections={[{ entries: writable.map((column) => ({ id: column.id, label: column.title, hint: column.kind.replace("_", " ") })) }]}
              selected={params.linked_column_id ? String(params.linked_column_id) : null}
              onPick={(id) => {
                onPatch({ linked_column_id: Number(id), value: undefined });
                close();
              }}
              placeholder="Search columns"
            />
          )
        }
      </Token>{" "}
      <Words>to </Words>
      <Token label={valueLabel(linked_context, linked_column, params.value)} is_placeholder={params.value === undefined || params.value === null || params.value === ""} disabled={!linked_column} aria_label="Value">
        {(close) => (linked_column ? <ColumnValueEditor context={linked_context} column={linked_column} value={params.value} mode="set" onApply={(value) => { onPatch({ value }); close(); }} /> : null)}
      </Token>{" "}
      <Words>on the items connected in </Words>
      <OwnColumnToken context={context} column_id={params.connect_column_id} kinds={["connect_board"]} fallback="connect boards" onPick={(id) => onPatch({ connect_column_id: Number(id), linked_column_id: undefined, value: undefined })} />
      {connect_column && !connect_column.linked_board_id && <span className="ml-2 align-middle text-[13px] text-boardtree-text-faint">Connect this column to a board first.</span>}
    </>
  );
}

const GROUP_OPERATIONS: { id: NonNullable<BoardAutomationActionParams["operation"]>; label: string }[] = [
  { id: "archive", label: "Archive every item" },
  { id: "set_column_value", label: "Set a column on every item" },
  { id: "clear_column", label: "Clear a column on every item" },
  { id: "move_to_group", label: "Move every item to another group" },
];

function GroupItemsRow({ context, action, lead, has_trigger_item, renderSwitch, onPatch }: BulkActionRowProps) {
  const params = action.params;
  const operation = params.operation ?? "archive";
  const target_column = findColumn(context, params.target_column_id);
  const group_invalid = !params.from_item_group && params.target_group_id != null && !context.groups.some((group) => group.id === String(params.target_group_id));
  const group_label = params.from_item_group ? "the item's group" : group_invalid ? "deleted group" : groupLabel(context, params.target_group_id);
  const verb = operation === "archive" ? "archive" : operation === "clear_column" ? "clear" : operation === "move_to_group" ? "move" : "set";

  return (
    <>
      <Words>{lead} </Words>
      {renderSwitch("change every item")}
      <Words>: </Words>
      <Token label={verb} aria_label="What happens to every item" popover_width={280}>
        {(close) => (
          <PickerList
            is_searchable={false}
            sections={[{ entries: GROUP_OPERATIONS }]}
            selected={operation}
            onPick={(id) => {
              onPatch({ operation: id, value: undefined, ...(id === "move_to_group" || id === "archive" ? { target_column_id: undefined } : {}) });
              close();
            }}
          />
        )}
      </Token>{" "}
      {(operation === "set_column_value" || operation === "clear_column") && (
        <>
          <OwnColumnToken context={context} column_id={params.target_column_id} kinds={SETTABLE_KINDS} fallback="column" onPick={(id) => onPatch({ target_column_id: Number(id), value: undefined })} />{" "}
          {operation === "set_column_value" && (
            <>
              <Words>to </Words>
              <Token label={valueLabel(context, target_column, params.value)} is_placeholder={params.value === undefined || params.value === null || params.value === ""} disabled={!target_column} aria_label="Value">
                {(close) => (target_column ? <ColumnValueEditor context={context} column={target_column} value={params.value} mode="set" onApply={(value) => { onPatch({ value }); close(); }} /> : null)}
              </Token>{" "}
            </>
          )}
          <Words>on </Words>
        </>
      )}
      <Words>every item of </Words>
      <Token label={group_label} is_placeholder={!params.from_item_group && !params.target_group_id} is_invalid={group_invalid} aria_label="Choose a group">
        {(close) => (
          <GroupPicker
            groups={context.groups}
            selected={params.from_item_group ? "__item__" : params.target_group_id ? String(params.target_group_id) : null}
            extra_entries={has_trigger_item ? [{ id: "__item__", label: "The item's group" }] : []}
            onPick={(id) => {
              onPatch(id === "__item__" ? { from_item_group: true, target_group_id: null } : { from_item_group: false, target_group_id: Number(id) });
              close();
            }}
          />
        )}
      </Token>
      {operation === "move_to_group" && (
        <>
          {" "}
          <Words>to </Words>
          <Token label={params.destination_group_id ? groupLabel(context, params.destination_group_id) : "group"} is_placeholder={!params.destination_group_id} aria_label="Where the items go">
            {(close) => <GroupPicker groups={context.groups} selected={params.destination_group_id ? String(params.destination_group_id) : null} onPick={(id) => { onPatch({ destination_group_id: Number(id) }); close(); }} />}
          </Token>
        </>
      )}
    </>
  );
}

export default function ActionRowBulk(props: BulkActionRowProps) {
  const { action, context, lead, renderSwitch, onPatch } = props;
  const params = action.params;

  switch (action.picker_id) {
    case "rename_item": {
      const template = columnTokensToDisplay(params.name_template ?? "", context);
      return (
        <>
          <Words>{lead} </Words>
          {renderSwitch("rename item")} <Words>to </Words>
          <Token label={template ? `"${truncate(template)}"` : "a new name"} is_placeholder={!template} aria_label="New name" popover_width={360}>
            {(close) => <NameTemplateEditor context={context} template={params.name_template ?? ""} onApply={(name_template) => { onPatch({ name_template }); close(); }} />}
          </Token>
        </>
      );
    }
    case "change_values": {
      const column = findColumn(context, params.target_column_id);
      const is_remove = params.mode === "remove";
      return (
        <>
          <Words>{lead} </Words>
          {renderSwitch(is_remove ? "remove" : "add")}{" "}
          <Token label={valuesLabel(context, column, params.values ?? [])} is_placeholder={!params.values?.length} disabled={!column} aria_label="Which values" popover_width={300}>
            {(close) => (column ? <ValuesPicker context={context} column={column} values={params.values ?? []} onApply={(values) => { onPatch({ values }); close(); }} /> : null)}
          </Token>{" "}
          <Token label={is_remove ? "from" : "to"} aria_label="Add or remove" popover_width={200}>
            {(close) => (
              <PickerList is_searchable={false} sections={[{ entries: [{ id: "add", label: "Add them" }, { id: "remove", label: "Remove them" }] }]} selected={is_remove ? "remove" : "add"} onPick={(id) => { onPatch({ mode: id === "remove" ? "remove" : "add" }); close(); }} />
            )}
          </Token>{" "}
          <OwnColumnToken context={context} column_id={params.target_column_id} kinds={MULTI_VALUE_KINDS} fallback="column" onPick={(id) => onPatch({ target_column_id: Number(id), values: [] })} />
          <Words>, keeping the rest</Words>
        </>
      );
    }
    case "update_connected_items":
      return <UpdateConnectedRow {...props} />;
    case "group_items":
      return <GroupItemsRow {...props} />;
    default:
      return null;
  }
}
