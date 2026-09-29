"use client";
import React, { useEffect, useState } from "react";
import type { BoardAutomationActionParams, BoardAutomationFieldMapping } from "@/types/board-automation";
import { boardContentService } from "@/services/board-content.service";
import type { ColumnKind } from "../../table/types";
import {
  CLEARABLE_KINDS,
  COPYABLE_SOURCE_KINDS,
  DATE_KINDS,
  NUMERIC_KINDS,
  READ_ONLY_KINDS,
  SETTABLE_KINDS,
  actionSections,
  type ActionPickerId,
  type AutomationBuilderContext,
} from "./automationCatalog";
import {
  amountLabel,
  boardGroupLabel,
  boardLabel,
  columnLabel,
  findColumn,
  groupLabel,
  personLabel,
  recipientLabel,
  columnTokensToDisplay,
  relativeDayLabel,
  teamLabel,
  urlHost,
  valueLabel,
} from "./automationSentence";
import { ActionIcon } from "./actionIcons";
import ActionRowExtras, { EXTRA_ACTION_IDS, EmailRecipientEditor } from "./ActionRowExtras";
import { actionFromPicker, type ActionDraft } from "./builderDraft";
import { PickerList, PopoverFooter, POPOVER_INPUT, POPOVER_LABEL, Segmented, Token, WorkingDaysToggle, type PickerEntry } from "./builderUi";
import { ColumnPicker, ColumnValueEditor, GroupPicker, MessageEditor, PersonPicker } from "./valueEditors";

export type ActionRowProps = {
  action: ActionDraft;
  context: AutomationBuilderContext;
  /** A recurring automation before any "create item" action has no item, so only itemless actions are offered. */
  only_itemless: boolean;
  /** Column scopes the actions may write, subitem triggers can also write subitem columns. */
  scopes: ("item" | "subitem")[];
  /** Whether the "copy values" choice makes sense, it needs a triggering item. */
  has_trigger_item: boolean;
  is_loading_boards: boolean;
  /** "Then" for the first action, "Otherwise" for the first one of the else branch, "and" for the ones after. */
  lead: "Then" | "and" | "Otherwise";
  /** The trigger is a webhook, so messages and new item columns can read `{payload.*}`. */
  is_webhook?: boolean;
  onChange: (next: ActionDraft) => void;
};

const Words = ({ children }: { children: React.ReactNode }) => <span className="text-boardtree-text">{children}</span>;

const truncate = (text: string, length = 28): string => (text.length > length ? `${text.slice(0, length - 1).trimEnd()}...` : text);

/** The verb of the sentence. Picking another entry swaps the whole action. */
function ActionSwitch({ label, action, context, only_itemless, onChange, is_placeholder = false }: Pick<ActionRowProps, "action" | "context" | "only_itemless" | "onChange"> & { label: string; is_placeholder?: boolean }) {
  const sections = actionSections({ only_itemless, is_slack_connected: context.is_slack_connected }).map((section) => ({
    title: section.title,
    entries: section.entries.map((entry): PickerEntry<ActionPickerId> => ({ ...entry, leading: <ActionIcon id={entry.id} /> })),
  }));

  return (
    <Token label={label} is_placeholder={is_placeholder} aria_label="Choose an action" popover_width={290}>
      {(close) => (
        <PickerList
          sections={sections}
          selected={action.picker_id}
          onPick={(picker_id) => {
            onChange(actionFromPicker(picker_id, context, action.key));
            close();
          }}
          placeholder="Search"
          max_height={320}
        />
      )}
    </Token>
  );
}

/** Who a notify, email or Slack action reaches: a person, or whoever a people column holds on the item. */
function RecipientEditor({ params, context, has_trigger_item, onApply }: { params: BoardAutomationActionParams; context: AutomationBuilderContext; has_trigger_item: boolean; onApply: (patch: BoardAutomationActionParams) => void }) {
  const [mode, setMode] = useState<"person" | "column">(params.notify_from_people_column_id && has_trigger_item ? "column" : "person");
  return (
    <>
      {has_trigger_item && (
        <div className="mb-2">
          <Segmented label="Who" options={[{ id: "person", label: "A person" }, { id: "column", label: "People column" }]} value={mode} onChange={setMode} />
        </div>
      )}
      {mode === "person" ? (
        <PersonPicker context={context} selected={params.notify_user_id ? String(params.notify_user_id) : null} onPick={(id) => onApply({ notify_user_id: Number(id), notify_from_people_column_id: undefined })} />
      ) : (
        <ColumnPicker
          context={context}
          kinds={["people"]}
          selected={params.notify_from_people_column_id ? String(params.notify_from_people_column_id) : null}
          onPick={(id) => onApply({ notify_from_people_column_id: Number(id), notify_user_id: undefined })}
          empty_text="Add a People column to this table first."
        />
      )}
    </>
  );
}

function SubitemNamesEditor({ names, onApply }: { names: string[]; onApply: (names: string[]) => void }) {
  const [draft, setDraft] = useState(names.filter(Boolean).join("\n"));
  const parsed = draft.split("\n").map((name) => name.trim()).filter(Boolean);
  return (
    <>
      <div className={POPOVER_LABEL}>One subitem per line</div>
      <textarea
        autoFocus
        rows={5}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={"Plan\nBuild\nReview"}
        aria-label="Subitem names"
        className="w-full resize-none rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2.5 py-2 text-[13px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint focus:border-boardtree-accent"
      />
      <PopoverFooter onDone={() => onApply(parsed.slice(0, 20))} is_disabled={parsed.length === 0} />
    </>
  );
}

function TextParamEditor({ value, label, placeholder, onApply, hint }: { value: string; label: string; placeholder: string; onApply: (value: string) => void; hint?: string }) {
  const [draft, setDraft] = useState(value);
  return (
    <>
      <div className={POPOVER_LABEL}>{label}</div>
      <input
        autoFocus
        value={draft}
        maxLength={255}
        placeholder={placeholder}
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onApply(draft);
          }
        }}
        className={POPOVER_INPUT}
      />
      {hint && <div className="mt-1.5 text-[11.5px] text-boardtree-text-faint">{hint}</div>}
      <PopoverFooter onDone={() => onApply(draft)} />
    </>
  );
}

function NumberParamEditor({ value, label, onApply, allow_zero = false, presets = [] }: { value: number; label: string; onApply: (value: number) => void; allow_zero?: boolean; presets?: { value: number; label: string }[] }) {
  const [draft, setDraft] = useState(String(value));
  const number = Number(draft);
  const is_valid = draft.trim() !== "" && Number.isFinite(number) && (allow_zero || number !== 0);
  return (
    <>
      {presets.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {presets.map((preset) => (
            <button key={preset.label} type="button" onClick={() => onApply(preset.value)} className="rounded-full border border-boardtree-border px-2.5 py-1 text-[12px] text-boardtree-text-secondary hover:border-boardtree-accent hover:text-boardtree-accent">
              {preset.label}
            </button>
          ))}
        </div>
      )}
      <div className={POPOVER_LABEL}>{label}</div>
      <input
        autoFocus
        type="number"
        value={draft}
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && is_valid) {
            event.preventDefault();
            onApply(number);
          }
        }}
        className={POPOVER_INPUT}
      />
      <PopoverFooter onDone={() => onApply(number)} is_disabled={!is_valid} />
    </>
  );
}

/** Days, weeks or months forward or back, for "push date". Days can count working days only. */
function ShiftEditor({ amount, unit, use_working_days, onApply }: { amount: number; unit: "days" | "weeks" | "months"; use_working_days: boolean; onApply: (amount: number, unit: "days" | "weeks" | "months", use_working_days: boolean) => void }) {
  const [direction, setDirection] = useState<"later" | "earlier">(amount < 0 ? "earlier" : "later");
  const [value, setValue] = useState(String(Math.abs(amount) || 1));
  const [next_unit, setNextUnit] = useState(unit);
  const [working_days, setWorkingDays] = useState(use_working_days);
  const number = Math.round(Number(value));
  const is_valid = Number.isFinite(number) && number > 0 && number <= 3650;
  return (
    <>
      <Segmented label="Direction" options={[{ id: "later", label: "Later" }, { id: "earlier", label: "Earlier" }]} value={direction} onChange={setDirection} />
      <div className="mt-2 flex items-center gap-2">
        <input type="number" min={1} max={3650} value={value} onChange={(event) => setValue(event.target.value)} aria-label="How much" className={`${POPOVER_INPUT} w-20`} />
        <select value={next_unit} onChange={(event) => setNextUnit(event.target.value as "days" | "weeks" | "months")} aria-label="Unit" className={`${POPOVER_INPUT} flex-1`}>
          <option value="days">days</option>
          <option value="weeks">weeks</option>
          <option value="months">months</option>
        </select>
      </div>
      {next_unit === "days" && <WorkingDaysToggle checked={working_days} onChange={setWorkingDays} />}
      <PopoverFooter onDone={() => onApply(direction === "earlier" ? -number : number, next_unit, working_days)} is_disabled={!is_valid} />
    </>
  );
}

/** Where a new timeline starts and how long it lasts. */
function TimelineEditor({ start_offset_days, duration_days, onApply }: { start_offset_days: number; duration_days: number; onApply: (start_offset_days: number, duration_days: number) => void }) {
  const [start, setStart] = useState(String(start_offset_days));
  const [duration, setDuration] = useState(String(duration_days));
  const is_valid = Number.isFinite(Number(start)) && Number(duration) >= 1 && Number(duration) <= 3650;
  return (
    <>
      <div className={POPOVER_LABEL}>Starts, days from today</div>
      <input type="number" value={start} onChange={(event) => setStart(event.target.value)} aria-label="Starts, days from today" className={`${POPOVER_INPUT} mb-2`} />
      <div className={POPOVER_LABEL}>Lasts, in days</div>
      <input type="number" min={1} value={duration} onChange={(event) => setDuration(event.target.value)} aria-label="Lasts, in days" className={POPOVER_INPUT} />
      <PopoverFooter onDone={() => onApply(Math.round(Number(start)), Math.round(Number(duration)))} is_disabled={!is_valid} />
    </>
  );
}

/** A URL and an optional signing secret, for "send a webhook". */
function WebhookEditor({ url, secret, onApply }: { url: string; secret: string; onApply: (url: string, secret: string) => void }) {
  const [url_draft, setUrlDraft] = useState(url);
  const [secret_draft, setSecretDraft] = useState(secret);
  const is_valid = /^https?:\/\/\S+$/i.test(url_draft.trim());
  return (
    <>
      <div className={POPOVER_LABEL}>URL</div>
      <input autoFocus type="url" value={url_draft} onChange={(event) => setUrlDraft(event.target.value)} placeholder="https://hooks.example.com/..." aria-label="Webhook URL" className={`${POPOVER_INPUT} mb-2`} />
      <div className={POPOVER_LABEL}>Signing secret (optional)</div>
      <input value={secret_draft} onChange={(event) => setSecretDraft(event.target.value)} placeholder="Used to sign every request" aria-label="Signing secret" className={POPOVER_INPUT} />
      <div className="mt-1.5 text-[11.5px] leading-snug text-boardtree-text-faint">
        The item, its columns and what set the automation off are sent as JSON. With a secret, the header X-Automation-Signature carries sha256 and the HMAC of the body.
      </div>
      <PopoverFooter onDone={() => onApply(url_draft.trim(), secret_draft.trim())} is_disabled={!is_valid} />
    </>
  );
}

/** Columns of a new item filled from text templates, such as `{payload.email}`. */
function FieldMappingEditor({ context, mappings, onApply }: { context: AutomationBuilderContext; mappings: BoardAutomationFieldMapping[]; onApply: (mappings: BoardAutomationFieldMapping[]) => void }) {
  const writable = context.columns.filter((column) => column.scope === "item" && !READ_ONLY_KINDS.includes(column.kind) && column.kind !== "connect_board" && column.kind !== "dependency");
  const [rows, setRows] = useState<BoardAutomationFieldMapping[]>(mappings.length ? mappings : [{ column_id: null, source: "" }]);
  const update = (index: number, next: Partial<BoardAutomationFieldMapping>) => setRows((current) => current.map((row, row_index) => (row_index === index ? { ...row, ...next } : row)));
  return (
    <>
      <div className={POPOVER_LABEL}>Fill these columns</div>
      <div className="flex max-h-[240px] flex-col gap-1.5 overflow-y-auto">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <select value={row.column_id ?? ""} onChange={(event) => update(index, { column_id: event.target.value ? Number(event.target.value) : null })} aria-label={`Column ${index + 1}`} className={`${POPOVER_INPUT} w-[140px] flex-none`}>
              <option value="">Column</option>
              {writable.map((column) => <option key={column.id} value={column.id}>{column.title}</option>)}
            </select>
            <input value={row.source} onChange={(event) => update(index, { source: event.target.value })} placeholder="{payload.email}" aria-label={`Value ${index + 1}`} className={`${POPOVER_INPUT} min-w-0 flex-1`} />
            <button type="button" onClick={() => setRows((current) => current.filter((_, row_index) => row_index !== index))} aria-label={`Remove row ${index + 1}`} className="h-8 w-8 flex-none rounded-[6px] text-boardtree-text-faint hover:bg-boardtree-hover hover:text-boardtree-danger">
              ×
            </button>
          </div>
        ))}
      </div>
      {rows.length < 30 && (
        <button type="button" onClick={() => setRows((current) => [...current, { column_id: null, source: "" }])} className="mt-1.5 rounded-[6px] px-2 py-1 text-[12.5px] text-boardtree-accent hover:bg-boardtree-hover">
          + Add a column
        </button>
      )}
      <div className="mt-1 text-[11.5px] leading-snug text-boardtree-text-faint">Values are read like an imported spreadsheet: a status by its label, a person by name or email, a date as 2026-10-05.</div>
      <PopoverFooter onDone={() => onApply(rows.filter((row) => row.column_id && row.source.trim()))} />
    </>
  );
}

/** Loads the columns of the board a connect boards column points at, for matching items. */
function useLinkedBoardColumns(linked_board_id: string | undefined, is_open: boolean): { columns: { id: string; label: string }[]; is_loading: boolean } {
  const [state, setState] = useState<{ board_id: string | null; columns: { id: string; label: string }[] }>({ board_id: null, columns: [] });
  const [is_loading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!is_open || !linked_board_id || state.board_id === linked_board_id) return;
    let cancelled = false;
    setIsLoading(true);
    boardContentService
      .getColumns(Number(linked_board_id))
      .then((columns) => {
        if (!cancelled) setState({ board_id: linked_board_id, columns: columns.filter((column) => column.scope !== "subitem").map((column) => ({ id: String(column.id), label: column.label })) });
      })
      .catch(() => {
        if (!cancelled) setState({ board_id: linked_board_id, columns: [] });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [is_open, linked_board_id, state.board_id]);

  return { columns: state.board_id === linked_board_id ? state.columns : [], is_loading };
}

function LinkedColumnPicker({ linked_board_id, selected, onPick }: { linked_board_id: string | undefined; selected: string | null; onPick: (id: string) => void }) {
  const { columns, is_loading } = useLinkedBoardColumns(linked_board_id, true);
  if (!linked_board_id) return <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">Connect the column to a board first.</div>;
  if (is_loading) return <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">Loading columns...</div>;
  return <PickerList sections={[{ entries: [{ id: "name", label: "Item name" }] }, { title: "Columns", entries: columns }]} selected={selected} onPick={onPick} placeholder="Search columns" />;
}

/** One "Then ..." sentence. Each action type lays out its own tokens. */
export default function ActionRow({ action, context, only_itemless, scopes, has_trigger_item, is_loading_boards, lead, is_webhook = false, onChange }: ActionRowProps) {
  const params = action.params;
  const patch = (next: BoardAutomationActionParams) => onChange({ ...action, params: { ...params, ...next } });
  const switchProps = { action, context, only_itemless, onChange };
  const target_column = findColumn(context, params.target_column_id);

  if (!action.type || !action.picker_id) {
    if (lead === "and") return <><Words>and </Words><ActionSwitch {...switchProps} label="do this" is_placeholder /></>;
    return <ActionSwitch {...switchProps} label={`${lead} do this`} is_placeholder />;
  }

  if (EXTRA_ACTION_IDS.includes(action.picker_id)) {
    return <ActionRowExtras action={action} context={context} lead={lead} renderSwitch={(label) => <ActionSwitch {...switchProps} label={label} />} onPatch={patch} />;
  }

  /** "counting every day" or "counting working days", for the date actions that can skip weekends and holidays. */
  const workingDaysToken = (
    <Token label={params.use_working_days ? "counting working days" : "counting every day"} aria_label="Working days" popover_width={260}>
      {(close) => (
        <PickerList is_searchable={false} sections={[{ entries: [{ id: "all", label: "Count every day" }, { id: "working", label: "Count working days only" }] }]} selected={params.use_working_days ? "working" : "all"} onPick={(id) => { patch({ use_working_days: id === "working" }); close(); }} />
      )}
    </Token>
  );

  /** A column token for `param`, drawn in red once the column it names was deleted. */
  const columnParamToken = (param: "target_column_id" | "source_column_id" | "number_column_id", kinds: ColumnKind[], fallback: string, on_pick?: (column_id: string) => BoardAutomationActionParams, extra_entries?: PickerEntry<string>[]) => {
    const column_id = params[param];
    const column = findColumn(context, column_id);
    const is_invalid = column_id != null && !column;
    return (
      <Token label={is_invalid ? "deleted column" : columnLabel(context, column_id, fallback)} is_placeholder={!column} is_invalid={is_invalid} aria_label="Choose a column">
        {(close) =>
          extra_entries?.length ? (
            <PickerList
              sections={[
                { entries: extra_entries },
                { title: "Columns", entries: context.columns.filter((entry) => scopes.includes(entry.scope) && kinds.includes(entry.kind)).map((entry) => ({ id: entry.id, label: entry.title })) },
              ]}
              selected={column_id ? String(column_id) : "__none__"}
              onPick={(id) => {
                patch(on_pick ? on_pick(id) : { [param]: id === "__none__" ? null : Number(id) });
                close();
              }}
              placeholder="Search columns"
            />
          ) : (
            <ColumnPicker
              context={context}
              kinds={kinds}
              scopes={scopes}
              selected={column_id ? String(column_id) : null}
              onPick={(picked) => {
                patch(on_pick ? on_pick(picked) : { [param]: Number(picked) });
                close();
              }}
            />
          )
        }
      </Token>
    );
  };

  const columnToken = (kinds: ColumnKind[], fallback: string, on_pick?: (column_id: string) => BoardAutomationActionParams) => columnParamToken("target_column_id", kinds, fallback, on_pick);

  /** A group of this tab, or the item's own group when the trigger has an item. */
  const ownGroupToken = (param: "target_group_id" | "source_group_id") => {
    const group_id = params[param];
    const is_invalid = !params.from_item_group && group_id != null && !context.groups.some((group) => group.id === String(group_id));
    const label = params.from_item_group ? "the item's group" : is_invalid ? "deleted group" : groupLabel(context, group_id);
    return (
      <Token label={label} is_placeholder={!params.from_item_group && !group_id} is_invalid={is_invalid} aria_label="Choose a group">
        {(close) => (
          <GroupPicker
            groups={context.groups}
            selected={params.from_item_group ? "__item__" : group_id ? String(group_id) : null}
            extra_entries={has_trigger_item ? [{ id: "__item__", label: "The item's group" }] : []}
            onPick={(id) => {
              patch(id === "__item__" ? { from_item_group: true, [param]: null } : { from_item_group: false, [param]: Number(id) });
              close();
            }}
          />
        )}
      </Token>
    );
  };

  const groupToken = (board_id: number | null | undefined) => {
    const is_other_board = board_id != null && board_id !== context.board_id;
    const groups = is_other_board
      ? (context.board_targets.find((board) => board.id === board_id)?.groups ?? []).map((group) => ({ id: String(group.id), label: group.name }))
      : context.groups;
    const is_invalid = !is_other_board && params.target_group_id != null && !context.groups.some((group) => group.id === String(params.target_group_id));
    return (
      <Token label={is_invalid ? "deleted group" : boardGroupLabel(context, board_id, params.target_group_id)} is_placeholder={!params.target_group_id} is_invalid={is_invalid} disabled={is_other_board ? !board_id : false} aria_label="Choose a group">
        {(close) => <GroupPicker groups={groups} selected={params.target_group_id ? String(params.target_group_id) : null} onPick={(id) => { patch({ target_group_id: Number(id) }); close(); }} />}
      </Token>
    );
  };

  const boardToken = (include_this_board: boolean) => {
    const entries: PickerEntry<string>[] = context.board_targets.map((board) => ({ id: String(board.id), label: board.label }));
    const label = params.target_board_id && params.target_board_id !== context.board_id ? boardLabel(context, params.target_board_id) : include_this_board ? "this board" : "board";
    return (
      <Token label={label} is_placeholder={!include_this_board && !params.target_board_id} aria_label="Choose a board">
        {(close) =>
          is_loading_boards ? (
            <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">Loading boards...</div>
          ) : (
            <PickerList
              sections={[...(include_this_board ? [{ entries: [{ id: "__this__", label: "This board" }] }] : []), { title: include_this_board ? "Other boards" : undefined, entries }]}
              selected={params.target_board_id ? String(params.target_board_id) : include_this_board ? "__this__" : null}
              empty_text="There is no other board you can add items to."
              onPick={(id) => {
                patch({ target_board_id: id === "__this__" ? null : Number(id), target_group_id: undefined, ...(id === "__this__" ? {} : { copy_values: params.copy_values }) });
                close();
              }}
              placeholder="Search boards"
            />
          )
        }
      </Token>
    );
  };

  const messageToken = (options: { is_required?: boolean; with_subject?: boolean } = {}) => {
    const message = (params.message ?? "").trim();
    return (
      <Token label={message ? `"${truncate(columnTokensToDisplay(message, context))}"` : options.is_required ? "message" : "default message"} is_placeholder={!message} aria_label="Message" popover_width={360}>
        {(close) => (
          <MessageEditor
            context={context}
            message={params.message ?? ""}
            subject={params.subject ?? ""}
            with_subject={options.with_subject}
            is_required={options.is_required}
            with_payload={is_webhook}
            onApply={(next_message, next_subject) => {
              patch({ message: next_message.trim() || null, ...(options.with_subject ? { subject: next_subject.trim() || null } : {}) });
              close();
            }}
          />
        )}
      </Token>
    );
  };

  const recipientToken = (
    <Token label={recipientLabel(context, params)} is_placeholder={!params.notify_user_id && !params.notify_from_people_column_id} aria_label="Who to reach">
      {(close) => <RecipientEditor params={params} context={context} has_trigger_item={has_trigger_item} onApply={(next) => { patch(next); close(); }} />}
    </Token>
  );

  switch (action.picker_id) {
    case "move_to_group":
      return <><Words>{lead} </Words><ActionSwitch {...switchProps} label="move item" /> <Words>to </Words>{groupToken(null)}</>;
    case "move_to_board":
      return <><Words>{lead} </Words><ActionSwitch {...switchProps} label="move item" /> <Words>to </Words>{boardToken(false)} <Words>in </Words>{groupToken(params.target_board_id)}</>;
    case "create_item": {
      const name = (params.item_name ?? "").trim();
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="create an item" /> <Words>named </Words>
          <Token label={name ? `"${truncate(name)}"` : "New item"} is_placeholder={!name} aria_label="Item name" popover_width={320}>
            {(close) => <TextParamEditor value={params.item_name ?? ""} label="Item name" placeholder="New item" hint="Tokens such as {item_name} and {date} are filled in." onApply={(item_name) => { patch({ item_name }); close(); }} />}
          </Token>{" "}
          <Words>in </Words>{groupToken(params.target_board_id)} <Words>on </Words>{boardToken(true)}
          {!params.target_board_id && (
            <>
              {" "}
              <Token
                label={params.field_mappings?.length ? `filling ${params.field_mappings.length} ${params.field_mappings.length === 1 ? "column" : "columns"}` : "filling no columns"}
                is_placeholder={!params.field_mappings?.length}
                aria_label="Fill columns"
                popover_width={420}
              >
                {(close) => <FieldMappingEditor context={context} mappings={params.field_mappings ?? []} onApply={(field_mappings) => { patch({ field_mappings }); close(); }} />}
              </Token>
            </>
          )}
          {has_trigger_item && (
            <>
              {" "}
              <Token label={params.copy_values ? "copying its values" : "without values"} is_placeholder={!params.copy_values} aria_label="Copy values" popover_width={260}>
                {(close) => (
                  <PickerList
                    is_searchable={false}
                    sections={[{ entries: [{ id: "no", label: "Without values" }, { id: "yes", label: "Copy values to matching columns" }] }]}
                    selected={params.copy_values ? "yes" : "no"}
                    onPick={(id) => { patch({ copy_values: id === "yes" }); close(); }}
                  />
                )}
              </Token>
            </>
          )}
        </>
      );
    }
    case "create_subitem": {
      const names = (params.subitem_names ?? []).filter((name) => name.trim());
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="create subitems" />{" "}
          <Token label={names.length ? truncate(names.join(", "), 36) : "names"} is_placeholder={!names.length} aria_label="Subitem names" popover_width={300}>
            {(close) => <SubitemNamesEditor names={params.subitem_names ?? []} onApply={(subitem_names) => { patch({ subitem_names }); close(); }} />}
          </Token>
        </>
      );
    }
    case "duplicate_item":
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="duplicate item" />{" "}
          <Token label={params.with_subitems === false ? "without subitems" : "with subitems"} aria_label="Subitems" popover_width={220}>
            {(close) => (
              <PickerList is_searchable={false} sections={[{ entries: [{ id: "yes", label: "With subitems" }, { id: "no", label: "Without subitems" }] }]} selected={params.with_subitems === false ? "no" : "yes"} onPick={(id) => { patch({ with_subitems: id === "yes" }); close(); }} />
            )}
          </Token>
        </>
      );
    case "archive_item":
      return <><Words>{lead} </Words><ActionSwitch {...switchProps} label="archive item" /></>;
    case "delete_item":
      return <><Words>{lead} </Words><ActionSwitch {...switchProps} label="delete item" /></>;
    case "post_update":
      return <><Words>{lead} </Words><ActionSwitch {...switchProps} label="create an update" /> <Words>saying </Words>{messageToken({ is_required: true })}</>;
    case "change_status":
    case "set_column_value": {
      const kinds: ColumnKind[] = action.picker_id === "change_status" ? ["status", "label"] : SETTABLE_KINDS;
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label={action.picker_id === "change_status" ? "change status" : "change"} />{" "}
          {columnToken(kinds, action.picker_id === "change_status" ? "status" : "column", (column_id) => ({ target_column_id: Number(column_id), value: undefined }))} <Words>to </Words>
          <Token label={valueLabel(context, target_column, params.value)} is_placeholder={params.value === undefined || params.value === null || params.value === ""} disabled={!target_column} aria_label="Value">
            {(close) => (target_column ? <ColumnValueEditor context={context} column={target_column} value={params.value} mode="set" onApply={(value) => { patch({ value }); close(); }} /> : null)}
          </Token>
        </>
      );
    }
    case "clear_column":
      return <><Words>{lead} </Words><ActionSwitch {...switchProps} label="clear" /> {columnToken(CLEARABLE_KINDS, "column")}</>;
    case "adjust_number": {
      const amount = params.amount ?? 1;
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label={amount < 0 ? "decrease" : "increase"} /> {columnToken(NUMERIC_KINDS, "number")} <Words>by </Words>
          <Token label={String(Math.abs(amount))} aria_label="Amount" popover_width={240}>
            {(close) => (
              <>
                <div className="mb-2">
                  <Segmented label="Direction" options={[{ id: "up", label: "Increase" }, { id: "down", label: "Decrease" }]} value={amount < 0 ? "down" : "up"} onChange={(direction) => patch({ amount: direction === "down" ? -Math.abs(amount) : Math.abs(amount) })} />
                </div>
                <NumberParamEditor value={Math.abs(amount)} label="By" onApply={(value) => { patch({ amount: (amount < 0 ? -1 : 1) * Math.abs(value) }); close(); }} />
              </>
            )}
          </Token>
        </>
      );
    }
    case "assign_person": {
      const who = params.assign_mode === "creator" ? "item creator" : params.assign_mode === "actor" ? "person who made the change" : personLabel(context, params.user_id);
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="assign" />{" "}
          <Token label={who} is_placeholder={params.assign_mode === "user" && !params.user_id} aria_label="Who to assign">
            {(close) => (
              <PersonPicker
                context={context}
                selected={params.assign_mode === "user" ? (params.user_id ? String(params.user_id) : null) : `__${params.assign_mode}__`}
                extra_entries={[{ id: "__creator__", label: "Item creator" }, ...(has_trigger_item ? [{ id: "__actor__", label: "Person who made the change" }] : [])]}
                onPick={(id) => {
                  patch(id === "__creator__" ? { assign_mode: "creator", user_id: null } : id === "__actor__" ? { assign_mode: "actor", user_id: null } : { assign_mode: "user", user_id: Number(id) });
                  close();
                }}
              />
            )}
          </Token>{" "}
          <Words>in </Words>{columnToken(["people"], "people")}{" "}
          <Token label={params.replace ? "replacing others" : "keeping others"} aria_label="Existing assignees" popover_width={240}>
            {(close) => (
              <PickerList is_searchable={false} sections={[{ entries: [{ id: "keep", label: "Keep the people already assigned" }, { id: "replace", label: "Replace them" }] }]} selected={params.replace ? "replace" : "keep"} onPick={(id) => { patch({ replace: id === "replace" }); close(); }} />
            )}
          </Token>
        </>
      );
    }
    case "unassign_people":
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="remove" />{" "}
          <Token label={params.user_id ? personLabel(context, params.user_id) : "everyone"} aria_label="Who to remove">
            {(close) => (
              <PersonPicker context={context} selected={params.user_id ? String(params.user_id) : "__all__"} extra_entries={[{ id: "__all__", label: "Everyone" }]} onPick={(id) => { patch({ user_id: id === "__all__" ? null : Number(id) }); close(); }} />
            )}
          </Token>{" "}
          <Words>from </Words>{columnToken(["people"], "people")}
        </>
      );
    case "set_date":
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="set date" /> {columnToken(["date"], "date")} <Words>to </Words>
          <Token label={relativeDayLabel(params.offset_days)} aria_label="Date" popover_width={260}>
            {(close) => (
              <NumberParamEditor
                value={params.offset_days ?? 0}
                label="Days from today"
                allow_zero
                presets={[{ value: 0, label: "Today" }, { value: 1, label: "Tomorrow" }, { value: 7, label: "In a week" }, { value: 30, label: "In 30 days" }]}
                onApply={(offset_days) => { patch({ offset_days: Math.round(offset_days) }); close(); }}
              />
            )}
          </Token>
          {params.offset_days ? <><Words>, </Words>{workingDaysToken}</> : null}
        </>
      );
    case "notify_person":
      return <><Words>{lead} </Words><ActionSwitch {...switchProps} label="notify" /> {recipientToken} <Words>with </Words>{messageToken()}</>;
    case "send_email": {
      const has_recipient = Boolean(params.notify_user_id || params.notify_from_people_column_id || params.email_column_id || params.email_addresses?.length);
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="send an email" /> <Words>to </Words>
          <Token label={recipientLabel(context, params)} is_placeholder={!has_recipient} aria_label="Who to email" popover_width={340}>
            {(close) => <EmailRecipientEditor params={params} context={context} has_trigger_item={has_trigger_item} onApply={(next) => { patch(next); close(); }} />}
          </Token>{" "}
          <Words>with </Words>{messageToken({ with_subject: true })}
        </>
      );
    }
    case "slack_notify_person":
      return <><Words>{lead} </Words><ActionSwitch {...switchProps} label="send a Slack message" /> <Words>to </Words>{recipientToken} <Words>with </Words>{messageToken()}</>;
    case "slack_notify_channel":
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="post to Slack" />{" "}
          <Token label={params.slack_channel_id ? `#${params.slack_channel_name || params.slack_channel_id}` : "channel"} is_placeholder={!params.slack_channel_id} aria_label="Slack channel">
            {(close) =>
              context.slack_channels.length === 0 ? (
                <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">{context.is_slack_connected ? "No channel found. Invite the app to a channel in Slack first." : "Connect Slack in Integrations first."}</div>
              ) : (
                <PickerList
                  sections={[{ entries: context.slack_channels.map((channel) => ({ id: channel.id, label: `#${channel.name}` })) }]}
                  selected={params.slack_channel_id ?? null}
                  onPick={(id) => { patch({ slack_channel_id: id, slack_channel_name: context.slack_channels.find((channel) => channel.id === id)?.name ?? null }); close(); }}
                  placeholder="Search channels"
                />
              )
            }
          </Token>{" "}
          <Words>with </Words>{messageToken()}
        </>
      );
    case "shift_date": {
      const amount = params.amount ?? 1;
      const shift_unit = params.unit === "weeks" || params.unit === "months" ? params.unit : "days";
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label={amount < 0 ? "pull" : "push"} /> {columnToken(DATE_KINDS, "date")} <Words>{amount < 0 ? "earlier by " : "by "}</Words>
          <Token label={`${amountLabel(amount, shift_unit)}${params.use_working_days && shift_unit === "days" ? " (working days)" : ""}`} aria_label="How far" popover_width={260}>
            {(close) => (
              <ShiftEditor
                amount={amount}
                unit={shift_unit}
                use_working_days={Boolean(params.use_working_days)}
                onApply={(next_amount, unit, use_working_days) => { patch({ amount: next_amount, unit, use_working_days: unit === "days" && use_working_days }); close(); }}
              />
            )}
          </Token>
        </>
      );
    }
    case "set_date_from_column": {
      const offset = params.offset_days ?? 0;
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="set" /> {columnToken(["date"], "date")} <Words>to </Words>
          {columnParamToken("source_column_id", DATE_KINDS, "another date")}{" "}
          <Token label={offset === 0 ? "on the day" : `${offset > 0 ? "+" : "-"} ${amountLabel(offset)}`} aria_label="Days to add" popover_width={260}>
            {(close) => <NumberParamEditor value={offset} label="Days to add, negative to subtract" allow_zero onApply={(offset_days) => { patch({ offset_days: Math.round(offset_days) }); close(); }} />}
          </Token>{" "}
          <Token label={params.number_sign === -1 ? "minus" : "plus"} aria_label="Add or subtract the number" popover_width={200}>
            {(close) => (
              <PickerList is_searchable={false} sections={[{ entries: [{ id: "1", label: "Plus the days in" }, { id: "-1", label: "Minus the days in" }] }]} selected={params.number_sign === -1 ? "-1" : "1"} onPick={(id) => { patch({ number_sign: id === "-1" ? -1 : 1 }); close(); }} />
            )}
          </Token>{" "}
          {columnParamToken("number_column_id", NUMERIC_KINDS, "no number column", undefined, [{ id: "__none__", label: "No number column" }])}
        </>
      );
    }
    case "ensure_date_after":
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="keep" /> {columnToken(DATE_KINDS, "this date")} <Words>at least </Words>
          <Token label={amountLabel(params.gap_days ?? 1)} aria_label="Days between the dates" popover_width={240}>
            {(close) => <NumberParamEditor value={params.gap_days ?? 1} label="Days between the dates" allow_zero onApply={(gap_days) => { patch({ gap_days: Math.max(0, Math.min(365, Math.round(gap_days))) }); close(); }} />}
          </Token>{" "}
          <Words>after </Words>{columnParamToken("source_column_id", DATE_KINDS, "that date")}
        </>
      );
    case "set_timeline":
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="set" /> {columnToken(["timeline"], "timeline")} <Words>to start </Words>
          <Token label={`${relativeDayLabel(params.start_offset_days)} for ${amountLabel(params.duration_days ?? 7)}`} aria_label="Timeline" popover_width={260}>
            {(close) => <TimelineEditor start_offset_days={params.start_offset_days ?? 0} duration_days={params.duration_days ?? 7} onApply={(start_offset_days, duration_days) => { patch({ start_offset_days, duration_days }); close(); }} />}
          </Token>
          <Words>, </Words>{workingDaysToken}
        </>
      );
    case "create_group": {
      const name = (params.group_name ?? "").trim();
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="create a group" /> <Words>named </Words>
          <Token label={name ? `"${truncate(name)}"` : "group name"} is_placeholder={!name} aria_label="Group name" popover_width={320}>
            {(close) => <TextParamEditor value={params.group_name ?? ""} label="Group name" placeholder="Week {week}" hint="Tokens such as {week}, {month} and {date} are filled in." onApply={(group_name) => { patch({ group_name }); close(); }} />}
          </Token>{" "}
          <Words>at the </Words>
          <Token label={params.position === "bottom" ? "bottom" : "top"} aria_label="Where" popover_width={200}>
            {(close) => (
              <PickerList is_searchable={false} sections={[{ entries: [{ id: "top", label: "Top of the board" }, { id: "bottom", label: "Bottom of the board" }] }]} selected={params.position ?? "top"} onPick={(id) => { patch({ position: id === "bottom" ? "bottom" : "top" }); close(); }} />
            )}
          </Token>
        </>
      );
    }
    case "duplicate_group": {
      const name = (params.group_name ?? "").trim();
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="duplicate" /> {ownGroupToken("source_group_id")} <Words>as </Words>
          <Token label={name ? `"${truncate(name)}"` : "a copy"} is_placeholder={!name} aria_label="New group name" popover_width={320}>
            {(close) => <TextParamEditor value={params.group_name ?? ""} label="New group name" placeholder="Leave empty for the group name plus copy" hint="Tokens such as {week}, {month} and {date} are filled in." onApply={(group_name) => { patch({ group_name }); close(); }} />}
          </Token>{" "}
          <Token label={params.with_items ? "with its items" : "without items"} aria_label="Items" popover_width={220}>
            {(close) => (
              <PickerList is_searchable={false} sections={[{ entries: [{ id: "no", label: "Without items" }, { id: "yes", label: "With its items" }] }]} selected={params.with_items ? "yes" : "no"} onPick={(id) => { patch({ with_items: id === "yes" }); close(); }} />
            )}
          </Token>
        </>
      );
    }
    case "archive_group":
      return <><Words>{lead} </Words><ActionSwitch {...switchProps} label="archive" /> {ownGroupToken("target_group_id")}</>;
    case "copy_column_value":
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="copy" /> {columnParamToken("source_column_id", COPYABLE_SOURCE_KINDS, "a column")} <Words>to </Words>
          {columnToken(SETTABLE_KINDS, "another column")}
        </>
      );
    case "time_tracking":
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="time tracking" /><Words>, </Words>
          <Token label={params.mode === "stop" ? "stop" : "start"} aria_label="Start or stop" popover_width={200}>
            {(close) => (
              <PickerList is_searchable={false} sections={[{ entries: [{ id: "start", label: "Start the timer" }, { id: "stop", label: "Stop the timer" }] }]} selected={params.mode ?? "start"} onPick={(id) => { patch({ mode: id === "stop" ? "stop" : "start" }); close(); }} />
            )}
          </Token>{" "}
          <Words>the timer in </Words>{columnToken(["time_tracking"], "time tracking")}
        </>
      );
    case "connect_items": {
      const linked_board_id = target_column?.linked_board_id;
      const match_label = params.match_column_id && params.match_column_id !== "name" ? columnLabel(context, params.match_column_id) : "name";
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="connect" /> <Words>the item in </Words>{columnToken(["connect_board"], "connect boards")}{" "}
          <Words>to items whose </Words>
          <Token label={params.linked_match_column_id && params.linked_match_column_id !== "name" ? "matching column" : "name"} disabled={!linked_board_id} aria_label="Column on the connected board" popover_width={280}>
            {(close) => <LinkedColumnPicker linked_board_id={linked_board_id} selected={params.linked_match_column_id ?? "name"} onPick={(id) => { patch({ linked_match_column_id: id }); close(); }} />}
          </Token>{" "}
          <Words>matches its </Words>
          <Token label={match_label} aria_label="Column of this item" popover_width={280}>
            {(close) => (
              <PickerList
                sections={[{ entries: [{ id: "name", label: "Item name" }] }, { title: "Columns", entries: context.columns.filter((column) => column.scope === "item").map((column) => ({ id: column.id, label: column.title })) }]}
                selected={params.match_column_id ?? "name"}
                onPick={(id) => { patch({ match_column_id: id }); close(); }}
                placeholder="Search columns"
              />
            )}
          </Token>
        </>
      );
    }
    case "notify_team": {
      const teams = context.teams ?? [];
      const is_invalid = params.team_id != null && teams.length > 0 && !teams.some((team) => team.id === params.team_id);
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="notify" /> <Words>the team </Words>
          <Token label={is_invalid ? "deleted team" : teamLabel(context, params.team_id)} is_placeholder={!params.team_id} is_invalid={is_invalid} aria_label="Choose a team">
            {(close) =>
              teams.length === 0 ? (
                <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">There are no teams yet. An administrator creates them on the Teams page.</div>
              ) : (
                <PickerList sections={[{ entries: teams.map((team) => ({ id: String(team.id), label: team.name, hint: `${team.member_count} ${team.member_count === 1 ? "person" : "people"}` })) }]} selected={params.team_id ? String(params.team_id) : null} onPick={(id) => { patch({ team_id: Number(id) }); close(); }} placeholder="Search teams" />
              )
            }
          </Token>{" "}
          <Words>with </Words>{messageToken()}
        </>
      );
    }
    case "send_webhook":
      return (
        <>
          <Words>{lead} </Words><ActionSwitch {...switchProps} label="send a webhook" /> <Words>to </Words>
          <Token label={urlHost(params.url)} is_placeholder={!params.url} aria_label="Webhook URL" popover_width={380}>
            {(close) => <WebhookEditor url={params.url ?? ""} secret={params.secret ?? ""} onApply={(url, secret) => { patch({ url, secret: secret || null }); close(); }} />}
          </Token>
        </>
      );
    default:
      return <><Words>{lead} </Words><ActionSwitch {...switchProps} label="do this" is_placeholder /></>;
  }
}
