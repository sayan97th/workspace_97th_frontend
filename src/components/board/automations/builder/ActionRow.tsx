"use client";
import React, { useState } from "react";
import type { BoardAutomationActionParams } from "@/types/board-automation";
import type { ColumnKind } from "../../table/types";
import { NUMERIC_KINDS, SETTABLE_KINDS, actionSections, type ActionPickerId, type AutomationBuilderContext } from "./automationCatalog";
import {
  boardGroupLabel,
  boardLabel,
  columnLabel,
  findColumn,
  personLabel,
  recipientLabel,
  relativeDayLabel,
  valueLabel,
} from "./automationSentence";
import { ActionIcon } from "./actionIcons";
import { actionFromPicker, type ActionDraft } from "./builderDraft";
import { PickerList, PopoverFooter, POPOVER_INPUT, POPOVER_LABEL, Segmented, Token, type PickerEntry } from "./builderUi";
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
  /** "Then" for the first action, "and" for the ones after it. */
  lead: "Then" | "and";
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

/** One "Then ..." sentence. Each action type lays out its own tokens. */
export default function ActionRow({ action, context, only_itemless, scopes, has_trigger_item, is_loading_boards, lead, onChange }: ActionRowProps) {
  const params = action.params;
  const patch = (next: BoardAutomationActionParams) => onChange({ ...action, params: { ...params, ...next } });
  const switchProps = { action, context, only_itemless, onChange };
  const target_column = findColumn(context, params.target_column_id);

  if (!action.type || !action.picker_id) {
    return lead === "Then" ? <ActionSwitch {...switchProps} label="Then do this" is_placeholder /> : <><Words>and </Words><ActionSwitch {...switchProps} label="do this" is_placeholder /></>;
  }

  const columnToken = (kinds: ColumnKind[], fallback: string, on_pick?: (column_id: string) => BoardAutomationActionParams) => (
    <Token label={columnLabel(context, params.target_column_id, fallback)} is_placeholder={!target_column} aria_label="Choose a column">
      {(close) => (
        <ColumnPicker
          context={context}
          kinds={kinds}
          scopes={scopes}
          selected={params.target_column_id ? String(params.target_column_id) : null}
          onPick={(column_id) => {
            patch(on_pick ? on_pick(column_id) : { target_column_id: Number(column_id) });
            close();
          }}
        />
      )}
    </Token>
  );

  const groupToken = (board_id: number | null | undefined) => {
    const is_other_board = board_id != null && board_id !== context.board_id;
    const groups = is_other_board
      ? (context.board_targets.find((board) => board.id === board_id)?.groups ?? []).map((group) => ({ id: String(group.id), label: group.name }))
      : context.groups;
    return (
      <Token label={boardGroupLabel(context, board_id, params.target_group_id)} is_placeholder={!params.target_group_id} disabled={is_other_board ? !board_id : false} aria_label="Choose a group">
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
      <Token label={message ? `"${truncate(message)}"` : options.is_required ? "message" : "default message"} is_placeholder={!message} aria_label="Message" popover_width={360}>
        {(close) => (
          <MessageEditor
            message={params.message ?? ""}
            subject={params.subject ?? ""}
            with_subject={options.with_subject}
            is_required={options.is_required}
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
      return <><Words>{lead} </Words><ActionSwitch {...switchProps} label="clear" /> {columnToken(SETTABLE_KINDS, "column")}</>;
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
        </>
      );
    case "notify_person":
      return <><Words>{lead} </Words><ActionSwitch {...switchProps} label="notify" /> {recipientToken} <Words>with </Words>{messageToken()}</>;
    case "send_email":
      return <><Words>{lead} </Words><ActionSwitch {...switchProps} label="send an email" /> <Words>to </Words>{recipientToken} <Words>with </Words>{messageToken({ with_subject: true })}</>;
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
    default:
      return <><Words>{lead} </Words><ActionSwitch {...switchProps} label="do this" is_placeholder /></>;
  }
}
