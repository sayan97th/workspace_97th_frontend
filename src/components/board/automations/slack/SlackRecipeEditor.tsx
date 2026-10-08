"use client";
import React, { useMemo, useRef, useState } from "react";
import type { ColumnDef, PersonDef } from "../../table/types";
import type { BoardAutomationActionParams, CreateBoardAutomationPayload } from "@/types/board-automation";
import type { SlackConnectionDto } from "@/types/slack";
import { useSlackConnectionChannels } from "@/hooks/useSlackConnectionChannels";
import { useOutsideClick } from "../../table/useOutsideClick";
import { spliceTextAtCursor } from "@/utils/insertTextAtCursor";
import { PickerList, POPOVER_DONE, POPOVER_SECONDARY } from "../builder/builderUi";
import { CHANNEL_ACTION_TYPES } from "../communicationTemplates";
import { slackMessageFieldsFor, toDisplayMessage, toStoredMessage, type SlackMessageField } from "./slackMessageTokens";
import { COLUMNLESS_TRIGGERS, recipeChannel, type SlackRecipe, type SlackRecipeSlot } from "./slackRecipes";

export type SlackRecipeEditorProps = {
  recipe: SlackRecipe;
  columns: ColumnDef[];
  people: PersonDef[];
  /** The account a channel recipe posts through, null for direct message recipes. */
  connection: SlackConnectionDto | null;
  /** The active workspace direct messages go through, for the direct message recipes' note. */
  active_workspace_name: string | null;
  is_saving: boolean;
  save_error: string | null;
  /** Goes back to the account step, hidden for direct message recipes. */
  onChangeAccount?: () => void;
  onCreate: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => void;
};

const MESSAGE_MAX_LENGTH = 1000;

/** Computed columns never receive a written value, so they can never "change". */
const READ_ONLY_KINDS: ColumnDef["kind"][] = ["formula", "mirror", "auto_number"];

type Recipient = { mode: "column" | "person"; id: string } | null;

/** One insert button of the message popover. */
function FieldChip({ field, onInsert }: { field: SlackMessageField; onInsert: (field: SlackMessageField) => void }) {
  return (
    <button type="button" onClick={() => onInsert(field)} title={`Insert ${field.label}`} className="rounded-[4px] border border-boardtree-border px-3 py-1 text-[13px] text-boardtree-text hover:border-boardtree-accent hover:text-boardtree-accent">
      {field.label}
    </button>
  );
}

/** One clickable word of the purple sentence, its picker opens in a white popover right under it. */
function SentenceToken({ label, is_set, is_optional = false, aria_label, width = 280, onOpen, children }: { label: string; is_set: boolean; is_optional?: boolean; aria_label: string; width?: number; onOpen?: () => void; children: (close: () => void) => React.ReactNode }) {
  const [is_open, setIsOpen] = useState(false);
  const ref = useOutsideClick<HTMLSpanElement>(is_open, () => setIsOpen(false));
  const close = () => setIsOpen(false);

  const tone = is_open
    ? "border-[#4ba7ff] text-[#4ba7ff]"
    : is_set
      ? "border-white text-white hover:border-[#4ba7ff] hover:text-[#4ba7ff]"
      : is_optional
        ? "border-white/45 text-white/55 hover:border-[#4ba7ff] hover:text-[#4ba7ff]"
        : "border-white/80 text-white/80 hover:border-[#4ba7ff] hover:text-[#4ba7ff]";

  return (
    <span ref={ref} className="relative inline-block">
      <button type="button" aria-haspopup="dialog" aria-expanded={is_open} aria-label={`${aria_label}: ${label}`} onClick={() => {
          if (!is_open) onOpen?.();
          setIsOpen(!is_open);
        }} className={`border-b-2 pb-1 leading-[1.15] transition-colors ${tone}`}>
        {label}
      </button>
      {is_open && (
        <div
          role="dialog"
          aria-label={aria_label}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
          style={{ width }}
          className="absolute left-0 top-full z-40 mt-3 max-w-[86vw] rounded-[6px] bg-boardtree-surface p-2 text-left text-[13px] font-normal leading-normal text-boardtree-text shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
        >
          {children(close)}
        </div>
      )}
    </span>
  );
}

/**
 * Fills one Slack recipe, monday.com's purple sentence screen: every bold word is clicked to choose
 * it (which column, which status, which channel or person) and "notify" opens the message. Create
 * stays disabled until every required word is chosen.
 */
export default function SlackRecipeEditor({ recipe, columns, people, connection, active_workspace_name, is_saving, save_error, onChangeAccount, onCreate }: SlackRecipeEditorProps) {
  const { trigger, target } = recipe;
  const channels = useSlackConnectionChannels(target === "channel" ? connection?.id ?? null : null);

  const trigger_columns = useMemo(() => {
    if (trigger === "status_changed") return columns.filter((column) => column.kind === "status" || column.kind === "label");
    if (trigger === "date_arrived") return columns.filter((column) => column.kind === "date");
    if (trigger === "person_assigned") return columns.filter((column) => column.kind === "people");
    if (trigger === "column_changed") return columns.filter((column) => !READ_ONLY_KINDS.includes(column.kind));
    return [];
  }, [columns, trigger]);
  const people_columns = useMemo(() => columns.filter((column) => column.kind === "people"), [columns]);
  const needs_trigger_column = !COLUMNLESS_TRIGGERS.includes(trigger);

  const [column_id, setColumnId] = useState("");
  const [option_id, setOptionId] = useState("");
  const [channel_id, setChannelId] = useState("");
  const [recipient, setRecipient] = useState<Recipient>(null);
  const message_fields = useMemo(() => slackMessageFieldsFor(trigger, columns), [trigger, columns]);
  // `message` is stored in the API's token format, the draft is what the message box shows.
  const [message, setMessage] = useState(recipe.default_message);
  const [message_draft, setMessageDraft] = useState(() => toDisplayMessage(recipe.default_message, message_fields));
  const [show_private_hint, setShowPrivateHint] = useState(false);
  const message_ref = useRef<HTMLTextAreaElement>(null);

  const trigger_column = trigger_columns.find((column) => column.id === column_id);
  const trigger_option = trigger_column?.options?.find((option) => option.id === option_id);
  const channel = channels.channels.find((entry) => entry.id === channel_id);
  const stored_draft = toStoredMessage(message_draft, message_fields);
  const draft_error = stored_draft.trim() === "" ? "Write a message, or restore the template." : stored_draft.length > MESSAGE_MAX_LENGTH ? `The message is too long, keep it under ${MESSAGE_MAX_LENGTH} characters.` : null;

  const missing: string[] = [];
  if (needs_trigger_column && !trigger_column) missing.push(trigger === "date_arrived" ? "a date column" : trigger === "person_assigned" ? "a people column" : trigger === "status_changed" ? "a status column" : "a column");
  if (trigger === "status_changed" && trigger_column && !trigger_option) missing.push("the status value");
  if (target === "channel" && !channel_id) missing.push("a channel");
  if (target === "person" && !recipient) missing.push("who to notify");
  if (message.trim() === "") missing.push("a message");

  const recipientLabel = (): string => {
    if (!recipient) return "someone";
    if (recipient.mode === "person") return people.find((person) => person.id === recipient.id)?.name ?? "someone";
    const column = people_columns.find((entry) => entry.id === recipient.id);
    return column ? `people in ${column.title}` : "someone";
  };

  const insertField = ({ label }: SlackMessageField) => {
    const field = message_ref.current;
    const { next_text, next_cursor } = spliceTextAtCursor(message_draft, `{${label}}`, field?.selectionStart ?? message_draft.length);
    if (toStoredMessage(next_text, message_fields).length > MESSAGE_MAX_LENGTH) return;
    setMessageDraft(next_text);
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(next_cursor, next_cursor);
    });
  };

  const buildPayload = (): Omit<CreateBoardAutomationPayload, "view_id"> => {
    const action_params: BoardAutomationActionParams = {};

    if (target === "channel") {
      action_params.slack_channel_id = channel_id;
      action_params.slack_channel_name = channel?.name ?? null;
      action_params.slack_team_id = connection?.team_id ?? null;
      action_params.slack_connection_id = connection?.id ?? null;
    } else if (recipient?.mode === "person") {
      action_params.notify_user_id = Number(recipient.id);
    } else if (recipient) {
      action_params.notify_from_people_column_id = Number(recipient.id);
    }

    action_params.message = message.trim();

    return {
      trigger_type: trigger,
      trigger_column_id: needs_trigger_column ? Number(column_id) : null,
      trigger_value: trigger === "status_changed" ? option_id : null,
      action_type: CHANNEL_ACTION_TYPES[recipeChannel(recipe)],
      action_params,
    };
  };

  const renderSlot = (slot: SlackRecipeSlot, placeholder: string, index: number): React.ReactNode => {
    switch (slot) {
      case "trigger_column":
        if (!needs_trigger_column) return <span key={index} className="font-semibold">{placeholder}</span>;
        return (
          <SentenceToken key={index} label={trigger_column?.title ?? placeholder} is_set={!!trigger_column} aria_label="Column">
            {(close) =>
              trigger_columns.length === 0 ? (
                <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">This table has no matching column yet.</div>
              ) : (
                <PickerList
                  sections={[{ entries: trigger_columns.map((column) => ({ id: column.id, label: column.title })) }]}
                  selected={column_id || null}
                  onPick={(id) => {
                    setColumnId(id);
                    setOptionId("");
                    close();
                  }}
                />
              )
            }
          </SentenceToken>
        );
      case "trigger_value":
        return (
          <SentenceToken key={index} label={trigger_option ? trigger_option.label || "(blank)" : placeholder} is_set={!!trigger_option} aria_label="Status value">
            {(close) =>
              !trigger_column ? (
                <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">Choose the status column first.</div>
              ) : (
                <PickerList
                  sections={[{ entries: (trigger_column.options ?? []).map((option) => ({ id: option.id, label: option.label || "(blank)", color: option.color })) }]}
                  selected={option_id || null}
                  onPick={(id) => {
                    setOptionId(id);
                    close();
                  }}
                />
              )
            }
          </SentenceToken>
        );
      case "message":
        return (
          <SentenceToken key={index} label={placeholder} is_set={message.trim() !== ""} aria_label="Message" width={450} onOpen={() => setMessageDraft(toDisplayMessage(message, message_fields))}>
            {(close) => (
              <div className="-m-2 flex flex-col">
                <div className="border-b border-boardtree-border-soft px-4 py-3 text-[13px] text-boardtree-text-secondary">Type your message to personalize it with fields from your board</div>
                <textarea
                  ref={message_ref}
                  autoFocus
                  value={message_draft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  rows={6}
                  aria-label="Slack message"
                  aria-invalid={draft_error !== null}
                  className="w-full resize-none bg-transparent px-4 py-3 text-[13px] leading-relaxed text-boardtree-text outline-none"
                />
                <div className="max-h-[120px] overflow-y-auto border-t border-boardtree-border-soft px-4 py-3">
                  <div className="mb-2 text-[13px] text-boardtree-text-muted">Auto populate fields from board items</div>
                  <div className="flex flex-wrap gap-2">
                    {[...message_fields.general, ...message_fields.columns].map((field) => <FieldChip key={field.token} field={field} onInsert={insertField} />)}
                  </div>
                </div>
                {draft_error && <p role="alert" className="px-4 pb-2.5 text-[12px] text-boardtree-danger">{draft_error}</p>}
                <div className="flex items-center gap-1.5 border-t border-boardtree-border-soft px-4 py-3">
                  {stored_draft.trim() !== recipe.default_message && (
                    <button type="button" onClick={() => setMessageDraft(toDisplayMessage(recipe.default_message, message_fields))} className="text-[12.5px] text-boardtree-accent hover:underline">
                      Restore template
                    </button>
                  )}
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setMessageDraft(toDisplayMessage(message, message_fields));
                      close();
                    }}
                    className={POPOVER_SECONDARY}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={draft_error !== null}
                    onClick={() => {
                      setMessage(stored_draft.trim());
                      close();
                    }}
                    className={`${POPOVER_DONE} disabled:cursor-not-allowed`}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </SentenceToken>
        );
      case "channel":
        return (
          <SentenceToken key={index} label={channel ? channel.name : placeholder} is_set={!!channel} aria_label="Slack channel">
            {(close) => (
              <div>
                {channels.error && <div className="mb-1.5 rounded-[6px] bg-boardtree-danger-hover px-2 py-1.5 text-[12px] text-boardtree-danger">{channels.error}</div>}
                {channels.is_loading ? (
                  <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">Loading channels...</div>
                ) : (
                  <PickerList
                    sections={[{ entries: channels.channels.map((entry) => ({ id: entry.id, label: entry.name, hint: entry.is_private ? "Private" : undefined })) }]}
                    selected={channel_id || null}
                    placeholder="search"
                    empty_text={channels.channels.length === 0 ? "No channels found." : "No channel matches your search."}
                    onPick={(id) => {
                      setChannelId(id);
                      close();
                    }}
                    max_height={200}
                  />
                )}
                <div className="mt-1.5 border-t border-boardtree-border-soft pt-2 text-center text-[12.5px] text-boardtree-text-secondary">
                  <div>Can&apos;t find your private channel?</div>
                  <button type="button" onClick={() => setShowPrivateHint((shown) => !shown)} className="font-medium text-boardtree-accent hover:underline">
                    Learn more
                  </button>
                  {show_private_hint && (
                    <p className="mt-1.5 px-1 text-left text-[12px] leading-relaxed text-boardtree-text-muted">
                      Public channels are always listed. Invite the app to a private channel in Slack with /invite, then refresh the list.
                    </p>
                  )}
                  <button type="button" disabled={channels.is_refreshing} onClick={() => void channels.refresh()} className="mt-1.5 block w-full rounded-[6px] py-1 text-[12px] text-boardtree-text-muted hover:bg-boardtree-hover disabled:opacity-50">
                    {channels.is_refreshing ? "Refreshing..." : "Refresh channels"}
                  </button>
                </div>
              </div>
            )}
          </SentenceToken>
        );
      case "recipient":
        return (
          <SentenceToken key={index} label={recipientLabel()} is_set={!!recipient} aria_label="Who to notify" width={300}>
            {(close) => (
              <PickerList
                sections={[
                  { title: "Whoever is assigned in", entries: people_columns.map((column) => ({ id: `column:${column.id}`, label: column.title })) },
                  { title: "A specific person", entries: people.map((person) => ({ id: `person:${person.id}`, label: person.name })) },
                ]}
                selected={recipient ? `${recipient.mode}:${recipient.id}` : null}
                onPick={(id) => {
                  const [mode, value] = id.split(":") as ["column" | "person", string];
                  setRecipient({ mode, id: value });
                  close();
                }}
              />
            )}
          </SentenceToken>
        );
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center px-6 pb-10 pt-6">
      <div role="status" className="flex items-center gap-2 rounded-[6px] bg-[#1f3c88] px-5 py-3 text-[13.5px] text-white shadow-[0_6px_18px_rgba(0,0,0,0.25)]">
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M8 7.2 V11.2 M8 4.8 V5.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        This is a pre-built template.
      </div>

      <div className="mt-4 text-center text-[13px] text-white/80">
        {target === "channel" && connection ? (
          <>
            Posting with your <span className="font-semibold text-white">{connection.team_name}</span> Slack account
            {connection.slack_user_name ? ` (${connection.slack_user_name})` : ""}.{" "}
            {onChangeAccount && (
              <button type="button" onClick={onChangeAccount} className="font-medium text-white underline underline-offset-2 hover:text-[#4ba7ff]">Change account</button>
            )}
          </>
        ) : (
          <>Direct messages are sent from {active_workspace_name ?? "the active Slack workspace"}. People who have not connected Slack are skipped.</>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="max-w-[880px] text-center text-[32px] font-light leading-[1.6] text-white">
          {recipe.parts.map((part, index) => ("text" in part ? <span key={index}>{part.text}</span> : renderSlot(part.slot, part.placeholder, index)))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={missing.length > 0 || is_saving}
            onClick={() => onCreate(buildPayload())}
            className="h-10 rounded-[4px] bg-[#0073ea] px-4 text-[15px] text-white hover:bg-[#0060c2] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {is_saving ? "Creating..." : "Create automation"}
          </button>
          {missing.length > 0 && <p className="text-[12.5px] text-white/70">Choose {missing.join(", ")} to finish.</p>}
          {save_error && <p role="alert" className="max-w-[520px] rounded-[6px] bg-[#ffebeb] px-3 py-2 text-center text-[13px] text-[#9d1c1c]">{save_error}</p>}
        </div>
      </div>
    </div>
  );
}
