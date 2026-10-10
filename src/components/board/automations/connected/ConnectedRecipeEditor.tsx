"use client";
import React, { useMemo, useRef, useState } from "react";
import type { ColumnDef, PersonDef } from "../../table/types";
import type { BoardAutomationActionParams, BoardAutomationRecipientSource, CreateBoardAutomationPayload } from "@/types/board-automation";
import type { ExternalAccountDto } from "@/types/external-account";
import { EXTERNAL_APPS } from "@/lib/externalApps";
import { spliceTextAtCursor } from "@/utils/insertTextAtCursor";
import type { NamedOption } from "../builder/automationCatalog";
import { EMAIL_UPDATE_TEMPLATE } from "../builder/automationTemplates";
import { PickerList, POPOVER_DONE, POPOVER_INPUT, POPOVER_LABEL, POPOVER_SECONDARY } from "../builder/builderUi";
import { CalendarPicker, EmailFilterEditor, emailFilterLabel } from "../builder/integrationEditors";
import { FieldChip, SentenceToken } from "../RecipeSentenceToken";
import { slackMessageFieldsFor, toDisplayMessage, toStoredMessage, type SlackMessageField, type SlackMessageFields } from "../slack/slackMessageTokens";
import { DEFAULT_EMAIL_MESSAGE, DEFAULT_EMAIL_SUBJECT, DEFAULT_EVENT_TITLE, type ConnectedRecipe, type ConnectedRecipeSlot } from "./connectedRecipes";

export type ConnectedRecipeEditorProps = {
  connected: ConnectedRecipe;
  /** Item columns of this tab. */
  columns: ColumnDef[];
  groups: NamedOption[];
  people: PersonDef[];
  account: ExternalAccountDto;
  is_saving: boolean;
  save_error: string | null;
  onChangeAccount: () => void;
  onCreate: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => void;
};

const MESSAGE_MAX_LENGTH = 1000;
const SUBJECT_MAX_LENGTH = 150;
const TITLE_MAX_LENGTH = 255;
const MAX_EMAIL_ADDRESSES = 10;

/** Who a "send an email" recipe reaches, the API's recipient params. */
type Recipient = { mode: "column" | "email_column" | "person" | "source" | "address"; id: string } | null;

const RECIPIENT_SOURCES: { id: BoardAutomationRecipientSource; label: string }[] = [
  { id: "actor", label: "The person who made the change" },
  { id: "creator", label: "The item creator" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A message box with "Auto populate fields" chips, shared by the email and the event title. */
function TemplateBox({ label, value, fields, rows, max_length, onChange }: { label: string; value: string; fields: SlackMessageFields; rows: number; max_length: number; onChange: (value: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const insert = ({ label: field_label }: SlackMessageField) => {
    const box = ref.current;
    const { next_text, next_cursor } = spliceTextAtCursor(value, `{${field_label}}`, box?.selectionStart ?? value.length);
    if (toStoredMessage(next_text, fields).length > max_length) return;
    onChange(next_text);
    requestAnimationFrame(() => {
      box?.focus();
      box?.setSelectionRange(next_cursor, next_cursor);
    });
  };

  return (
    <>
      <div className={POPOVER_LABEL}>{label}</div>
      <textarea ref={ref} value={value} rows={rows} aria-label={label} onChange={(event) => onChange(event.target.value)} className={`${POPOVER_INPUT} h-auto resize-none py-2 leading-relaxed`} />
      <div className="mt-2 max-h-[96px] overflow-y-auto">
        <div className="mb-1.5 text-[12px] text-boardtree-text-muted">Auto populate fields from board items</div>
        <div className="flex flex-wrap gap-1.5">
          {[...fields.general, ...fields.columns].map((field) => <FieldChip key={field.token} field={field} onInsert={insert} />)}
        </div>
      </div>
    </>
  );
}

/**
 * Fills one Gmail, Outlook or Google Calendar recipe, the same screen as the Slack one: every bold
 * word is clicked to choose it, and Create stays disabled until each required word is chosen.
 */
export default function ConnectedRecipeEditor({ connected, columns, groups, people, account, is_saving, save_error, onChangeAccount, onCreate }: ConnectedRecipeEditorProps) {
  const { kind, parts } = connected;
  const app = EXTERNAL_APPS[connected.app];

  const date_columns = useMemo(() => columns.filter((column) => column.kind === "date" || column.kind === "timeline"), [columns]);
  const status_columns = useMemo(() => columns.filter((column) => column.kind === "status" || column.kind === "label"), [columns]);
  const people_columns = useMemo(() => columns.filter((column) => column.kind === "people"), [columns]);
  const email_columns = useMemo(() => columns.filter((column) => column.kind === "email"), [columns]);

  // Google Calendar
  const [date_column_id, setDateColumnId] = useState(date_columns[0]?.id ?? "");
  const [calendar, setCalendar] = useState<{ id: string; name: string } | null>(null);
  const title_fields = useMemo(() => slackMessageFieldsFor("item_created", columns), [columns]);
  const [title, setTitle] = useState(DEFAULT_EVENT_TITLE);
  const [title_draft, setTitleDraft] = useState(() => toDisplayMessage(DEFAULT_EVENT_TITLE, title_fields));

  // Email to item
  const [from_filter, setFromFilter] = useState<string | null>(null);
  const [subject_filter, setSubjectFilter] = useState<string | null>(null);
  const [group_id, setGroupId] = useState("");

  // Status to email
  const [column_id, setColumnId] = useState("");
  const [option_id, setOptionId] = useState("");
  const [recipients, setRecipients] = useState<NonNullable<Recipient>[]>([]);
  const [address_draft, setAddressDraft] = useState("");
  const message_fields = useMemo(() => slackMessageFieldsFor("status_changed", columns), [columns]);
  const [subject, setSubject] = useState(DEFAULT_EMAIL_SUBJECT);
  const [message, setMessage] = useState(DEFAULT_EMAIL_MESSAGE);
  const [subject_draft, setSubjectDraft] = useState(() => toDisplayMessage(DEFAULT_EMAIL_SUBJECT, message_fields));
  const [message_draft, setMessageDraft] = useState(() => toDisplayMessage(DEFAULT_EMAIL_MESSAGE, message_fields));

  const date_column = date_columns.find((column) => column.id === date_column_id);
  const group = groups.find((entry) => entry.id === group_id);
  const trigger_column = status_columns.find((column) => column.id === column_id);
  const trigger_option = trigger_column?.options?.find((option) => option.id === option_id);

  const missing: string[] = [];
  if (kind === "calendar_sync") {
    if (!date_column) missing.push("the date column of the event");
    if (!calendar) missing.push("a calendar");
  } else if (kind === "email_to_item") {
    if (!group) missing.push("a group");
  } else {
    if (!trigger_column) missing.push("a status column");
    if (trigger_column && !trigger_option) missing.push("the status value");
    if (recipients.length === 0) missing.push("who gets the email");
  }

  const recipientWord = (entry: NonNullable<Recipient>): string => {
    if (entry.mode === "person") return people.find((person) => person.id === entry.id)?.name ?? "someone";
    if (entry.mode === "source") return RECIPIENT_SOURCES.find((source) => source.id === entry.id)?.label.toLowerCase() ?? "someone";
    if (entry.mode === "address") return entry.id;
    const column = [...people_columns, ...email_columns].find((item) => item.id === entry.id);
    return column ? (entry.mode === "column" ? `people in ${column.title}` : `the address in ${column.title}`) : "someone";
  };
  const recipient_label = recipients.length === 0 ? null : recipients.length === 1 ? recipientWord(recipients[0]) : `${recipientWord(recipients[0])} and ${recipients.length - 1} more`;

  const buildPayload = (): Omit<CreateBoardAutomationPayload, "view_id"> => {
    const account_params = { external_account_id: account.id, external_account_email: account.email };

    if (kind === "calendar_sync") {
      return {
        trigger_type: "item_created_or_updated",
        actions: [{ type: "google_calendar_sync", params: { ...account_params, calendar_id: calendar?.id ?? "", calendar_name: calendar?.name ?? null, date_column_id: Number(date_column_id), title_template: title.trim() || null } }],
      };
    }

    if (kind === "email_to_item") {
      return {
        trigger_type: "email_received",
        trigger_config: { ...account_params, from_filter, subject_filter },
        actions: [
          { type: "create_item", params: { target_group_id: Number(group_id), item_name: "{payload.subject}" } },
          { type: "post_update", params: { message: EMAIL_UPDATE_TEMPLATE } },
        ],
      };
    }

    // One fixed person, one people column, one source and any typed addresses, like the builder's "send an email".
    const params: BoardAutomationActionParams = { ...account_params, subject: subject.trim(), message: message.trim() };
    const addresses = recipients.filter((entry) => entry.mode === "address").map((entry) => entry.id);
    recipients.forEach((entry) => {
      if (entry.mode === "person") params.notify_user_id = Number(entry.id);
      if (entry.mode === "column") params.notify_from_people_column_id = Number(entry.id);
      if (entry.mode === "email_column") params.email_column_id = Number(entry.id);
      if (entry.mode === "source") params.recipient_source = entry.id as BoardAutomationRecipientSource;
    });
    if (addresses.length) params.email_addresses = addresses;

    return { trigger_type: "status_changed", trigger_column_id: Number(column_id), trigger_value: option_id, actions: [{ type: "send_email", params }] };
  };

  const toggleRecipient = (entry: NonNullable<Recipient>) => {
    setRecipients((current) => {
      if (current.some((item) => item.mode === entry.mode && item.id === entry.id)) return current.filter((item) => !(item.mode === entry.mode && item.id === entry.id));
      // The API takes one fixed person, one people column, one email column and one source.
      const kept = entry.mode === "address" ? current : current.filter((item) => item.mode !== entry.mode);
      return [...kept, entry];
    });
  };

  const addAddress = () => {
    const address = address_draft.trim();
    if (!EMAIL_PATTERN.test(address) || recipients.filter((entry) => entry.mode === "address").length >= MAX_EMAIL_ADDRESSES) return;
    toggleRecipient({ mode: "address", id: address });
    setAddressDraft("");
  };

  const renderSlot = (name: ConnectedRecipeSlot, placeholder: string, index: number): React.ReactNode => {
    switch (name) {
      case "event": {
        const stored_title = toStoredMessage(title_draft, title_fields);
        return (
          <SentenceToken key={index} label={placeholder} is_set={Boolean(date_column)} aria_label="Event" width={420} onOpen={() => setTitleDraft(toDisplayMessage(title, title_fields))}>
            {(close) => (
              <div className="p-1">
                <div className={POPOVER_LABEL}>Event date</div>
                {date_columns.length === 0 ? (
                  <div className="mb-3 text-[12.5px] text-boardtree-text-faint">Add a Date or Timeline column to the table first.</div>
                ) : (
                  <PickerList is_searchable={false} sections={[{ entries: date_columns.map((column) => ({ id: column.id, label: column.title, hint: column.kind === "timeline" ? "Timeline" : undefined })) }]} selected={date_column_id || null} onPick={setDateColumnId} max_height={140} />
                )}
                <div className="mt-3">
                  <TemplateBox label="Event title" value={title_draft} fields={title_fields} rows={2} max_length={TITLE_MAX_LENGTH} onChange={setTitleDraft} />
                </div>
                <div className="mt-3 flex justify-end gap-1.5">
                  <button type="button" onClick={close} className={POPOVER_SECONDARY}>Cancel</button>
                  <button type="button" disabled={stored_title.length > TITLE_MAX_LENGTH} onClick={() => { setTitle(stored_title.trim() || DEFAULT_EVENT_TITLE); close(); }} className={POPOVER_DONE}>Done</button>
                </div>
              </div>
            )}
          </SentenceToken>
        );
      }
      case "calendar":
        return (
          <SentenceToken key={index} label={calendar?.name ?? placeholder} is_set={Boolean(calendar)} aria_label="Google calendar" width={300}>
            {(close) => <CalendarPicker account_id={account.id} selected={calendar?.id ?? null} onPick={(picked) => { setCalendar(picked); close(); }} />}
          </SentenceToken>
        );
      case "email_filter":
        return (
          <SentenceToken key={index} label={from_filter || subject_filter ? `email ${emailFilterLabel(from_filter, subject_filter)}` : placeholder} is_set is_optional={!from_filter && !subject_filter} aria_label="Which emails" width={300}>
            {(close) => (
              <div className="p-1">
                <EmailFilterEditor from_filter={from_filter ?? ""} subject_filter={subject_filter ?? ""} onApply={(from, about) => { setFromFilter(from); setSubjectFilter(about); close(); }} />
              </div>
            )}
          </SentenceToken>
        );
      case "group":
        return (
          <SentenceToken key={index} label={group?.label ?? placeholder} is_set={Boolean(group)} aria_label="Group">
            {(close) => <PickerList sections={[{ entries: groups }]} selected={group_id || null} placeholder="Search groups" onPick={(id) => { setGroupId(id); close(); }} />}
          </SentenceToken>
        );
      case "trigger_column":
        return (
          <SentenceToken key={index} label={trigger_column?.title ?? placeholder} is_set={Boolean(trigger_column)} aria_label="Status column">
            {(close) =>
              status_columns.length === 0 ? (
                <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">This table has no status column yet.</div>
              ) : (
                <PickerList sections={[{ entries: status_columns.map((column) => ({ id: column.id, label: column.title })) }]} selected={column_id || null} onPick={(id) => { setColumnId(id); setOptionId(""); close(); }} />
              )
            }
          </SentenceToken>
        );
      case "trigger_value":
        return (
          <SentenceToken key={index} label={trigger_option ? trigger_option.label || "(blank)" : placeholder} is_set={Boolean(trigger_option)} aria_label="Status value">
            {(close) =>
              !trigger_column ? (
                <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">Choose the status column first.</div>
              ) : (
                <PickerList sections={[{ entries: (trigger_column.options ?? []).map((option) => ({ id: option.id, label: option.label || "(blank)", color: option.color })) }]} selected={option_id || null} onPick={(id) => { setOptionId(id); close(); }} />
              )
            }
          </SentenceToken>
        );
      case "email_message": {
        const stored_subject = toStoredMessage(subject_draft, message_fields);
        const stored_message = toStoredMessage(message_draft, message_fields);
        const draft_error = stored_subject.trim() === "" ? "Write a subject." : stored_message.trim() === "" ? "Write a message." : stored_subject.length > SUBJECT_MAX_LENGTH ? `Keep the subject under ${SUBJECT_MAX_LENGTH} characters.` : stored_message.length > MESSAGE_MAX_LENGTH ? `Keep the message under ${MESSAGE_MAX_LENGTH} characters.` : null;
        return (
          <SentenceToken
            key={index}
            label={placeholder}
            is_set
            aria_label="Email"
            width={460}
            onOpen={() => {
              setSubjectDraft(toDisplayMessage(subject, message_fields));
              setMessageDraft(toDisplayMessage(message, message_fields));
            }}
          >
            {(close) => (
              <div className="p-1">
                <div className={POPOVER_LABEL}>Subject</div>
                <input value={subject_draft} aria-label="Email subject" onChange={(event) => setSubjectDraft(event.target.value)} className={POPOVER_INPUT} />
                <div className="mt-3">
                  <TemplateBox label="Message" value={message_draft} fields={message_fields} rows={5} max_length={MESSAGE_MAX_LENGTH} onChange={setMessageDraft} />
                </div>
                {draft_error && <p role="alert" className="mt-2 text-[12px] text-boardtree-danger">{draft_error}</p>}
                <div className="mt-3 flex items-center gap-1.5">
                  {(stored_subject !== DEFAULT_EMAIL_SUBJECT || stored_message !== DEFAULT_EMAIL_MESSAGE) && (
                    <button type="button" onClick={() => { setSubjectDraft(toDisplayMessage(DEFAULT_EMAIL_SUBJECT, message_fields)); setMessageDraft(toDisplayMessage(DEFAULT_EMAIL_MESSAGE, message_fields)); }} className="text-[12.5px] text-boardtree-accent hover:underline">
                      Restore template
                    </button>
                  )}
                  <span className="flex-1" />
                  <button type="button" onClick={close} className={POPOVER_SECONDARY}>Cancel</button>
                  <button type="button" disabled={draft_error !== null} onClick={() => { setSubject(stored_subject.trim()); setMessage(stored_message.trim()); close(); }} className={`${POPOVER_DONE} disabled:cursor-not-allowed`}>Done</button>
                </div>
              </div>
            )}
          </SentenceToken>
        );
      }
      case "email_recipient": {
        const selected_keys = recipients.map((entry) => `${entry.mode}:${entry.id}`);
        const sections = [
          { title: "Whoever is assigned in", entries: people_columns.map((column) => ({ id: `column:${column.id}`, label: column.title })) },
          { title: "The address in", entries: email_columns.map((column) => ({ id: `email_column:${column.id}`, label: column.title })) },
          { title: "From the item", entries: RECIPIENT_SOURCES.map((source) => ({ id: `source:${source.id}`, label: source.label })) },
          { title: "A specific person", entries: people.map((person) => ({ id: `person:${person.id}`, label: person.name })) },
        ].filter((section) => section.entries.length > 0);
        return (
          <SentenceToken key={index} label={recipient_label ?? placeholder} is_set={recipients.length > 0} aria_label="Who gets the email" width={320}>
            {() => (
              <div>
                <PickerList
                  sections={sections.map((section) => ({ ...section, entries: section.entries.map((entry) => ({ ...entry, hint: selected_keys.includes(entry.id) ? "Selected" : undefined })) }))}
                  selected={null}
                  onPick={(id) => {
                    const [mode, value] = id.split(":") as [NonNullable<Recipient>["mode"], string];
                    toggleRecipient({ mode, id: value });
                  }}
                  max_height={200}
                />
                <div className="mt-2 border-t border-boardtree-border-soft pt-2">
                  <div className={POPOVER_LABEL}>Email address</div>
                  <div className="flex gap-1.5">
                    <input
                      value={address_draft}
                      placeholder="name@company.com"
                      aria-label="Email address"
                      onChange={(event) => setAddressDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") addAddress();
                      }}
                      className={POPOVER_INPUT}
                    />
                    <button type="button" disabled={!EMAIL_PATTERN.test(address_draft.trim())} onClick={addAddress} className={`${POPOVER_DONE} flex-none`}>Add</button>
                  </div>
                  {recipients.filter((entry) => entry.mode === "address").length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {recipients.filter((entry) => entry.mode === "address").map((entry) => (
                        <button key={entry.id} type="button" onClick={() => toggleRecipient(entry)} title="Remove" className="rounded-full bg-boardtree-hover px-2 py-0.5 text-[12px] text-boardtree-text-secondary hover:text-boardtree-danger">
                          {entry.id} ×
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </SentenceToken>
        );
      }
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center px-6 pb-10 pt-6">
      <div role="status" className="flex items-center gap-2 rounded-[6px] bg-[#1f3c88] px-5 py-3 text-[13.5px] text-white shadow-[0_6px_18px_rgba(0,0,0,0.25)]">
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M8 7.2 V11.2 M8 4.8 V5.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        This is a pre-built template.
      </div>

      <div className="mt-4 text-center text-[13px] text-white/80">
        {kind === "email_to_item" ? "Reading new emails of" : kind === "calendar_sync" ? "Adding events with" : "Sending from"} your <span className="font-semibold text-white">{account.email ?? app.label}</span> {app.label} account.{" "}
        <button type="button" onClick={onChangeAccount} className="font-medium text-white underline underline-offset-2 hover:text-[#4ba7ff]">Change account</button>
        {kind === "email_to_item" && <div className="mt-1 text-white/70">The subject names the item and the email is added as its first update. The inbox is checked every minute.</div>}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="max-w-[880px] text-center text-[32px] font-light leading-[1.6] text-white">
          {parts.map((part, index) => ("text" in part ? <span key={index}>{part.text}</span> : renderSlot(part.slot, part.placeholder, index)))}
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
