"use client";
import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ColumnDef, PersonDef } from "../table/types";
import type { BoardAutomationActionParams, CreateBoardAutomationPayload } from "@/types/board-automation";
import type { SlackAutomationOptions } from "@/hooks/useSlackAutomationOptions";
import { spliceTextAtCursor } from "@/utils/insertTextAtCursor";
import { HINT, LABEL, ROW, Radio, SAVE_BUTTON, TEXT_FIELD } from "./automationFormParts";
import { CHANNEL_ACTION_TYPES, MESSAGE_TOKENS, type CommunicationTemplate } from "./communicationTemplates";

export type CommunicationRecipeFormProps = {
  template: CommunicationTemplate;
  columns: ColumnDef[];
  people: PersonDef[];
  slack: SlackAutomationOptions;
  is_saving: boolean;
  onSave: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => Promise<void>;
  /** Switches the host dialog to where Slack is connected; falls back to a link to Administration when omitted. */
  onGoToConnections?: () => void;
};

const MESSAGE_MAX_LENGTH = 1000;
const SUBJECT_MAX_LENGTH = 150;

/** Computed columns never receive a written value, so they can never "change". */
const READ_ONLY_KINDS: ColumnDef["kind"][] = ["formula", "mirror", "auto_number"];

/**
 * Builds one communication automation from a template: the trigger's own settings (which
 * column, which status), who or where it reaches (people, or a Slack channel), and an
 * optional message. One form covers every trigger and channel pairing, so adding a template
 * to `COMMUNICATION_TEMPLATES` needs no new component.
 */
export default function CommunicationRecipeForm({ template, columns, people, slack, is_saving, onSave, onGoToConnections }: CommunicationRecipeFormProps) {
  const { trigger, channel } = template;

  const trigger_columns = useMemo(() => {
    if (trigger === "status_changed") return columns.filter((c) => c.kind === "status" || c.kind === "label");
    if (trigger === "date_arrived") return columns.filter((c) => c.kind === "date");
    if (trigger === "person_assigned") return columns.filter((c) => c.kind === "people");
    if (trigger === "column_changed") return columns.filter((c) => !READ_ONLY_KINDS.includes(c.kind));
    return [];
  }, [columns, trigger]);
  const needs_trigger_column = ["status_changed", "date_arrived", "person_assigned", "column_changed"].includes(trigger);
  const people_columns = columns.filter((c) => c.kind === "people");

  const [column_id, setColumnId] = useState(trigger_columns[0]?.id ?? "");
  const trigger_column = trigger_columns.find((c) => c.id === column_id);
  const [option_id, setOptionId] = useState(trigger_column?.options?.[0]?.id ?? "");

  const [recipient_mode, setRecipientMode] = useState<"person" | "column">(people_columns.length > 0 ? "column" : "person");
  const [recipient_person_id, setRecipientPersonId] = useState(people[0]?.id ?? "");
  const [recipient_column_id, setRecipientColumnId] = useState(people_columns[0]?.id ?? "");

  const [channel_search, setChannelSearch] = useState("");
  const [slack_channel_id, setSlackChannelId] = useState("");

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const message_ref = useRef<HTMLTextAreaElement>(null);

  const reaches_people = channel === "email" || channel === "slack_person";
  const uses_slack = channel !== "email";
  const is_slack_connected = slack.status?.is_connected === true;
  const selected_channel = slack.channels.find((c) => c.id === slack_channel_id);
  const visible_channels = slack.channels.filter((c) => c.name.toLowerCase().includes(channel_search.trim().toLowerCase()));
  const available_tokens = MESSAGE_TOKENS.filter((t) => !t.triggers || t.triggers.includes(trigger));

  const has_trigger_settings = !needs_trigger_column || (!!column_id && (trigger !== "status_changed" || !!option_id));
  const has_destination = reaches_people
    ? recipient_mode === "person"
      ? !!recipient_person_id
      : !!recipient_column_id
    : !!slack_channel_id;
  const can_save = has_trigger_settings && has_destination && (!uses_slack || is_slack_connected);

  const insertToken = (token: string) => {
    const field = message_ref.current;
    const { next_text, next_cursor } = spliceTextAtCursor(message, token, field?.selectionStart ?? message.length);
    if (next_text.length > MESSAGE_MAX_LENGTH) return;
    setMessage(next_text);
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(next_cursor, next_cursor);
    });
  };

  const buildPayload = (): Omit<CreateBoardAutomationPayload, "view_id"> => {
    const action_params: BoardAutomationActionParams = {};

    if (reaches_people) {
      if (recipient_mode === "person") action_params.notify_user_id = Number(recipient_person_id);
      else action_params.notify_from_people_column_id = Number(recipient_column_id);
    } else {
      action_params.slack_channel_id = slack_channel_id;
      action_params.slack_channel_name = selected_channel?.name ?? null;
    }

    if (channel === "email" && subject.trim()) action_params.subject = subject.trim();
    if (message.trim()) action_params.message = message.trim();

    return {
      trigger_type: trigger,
      trigger_column_id: needs_trigger_column ? Number(column_id) : null,
      trigger_value: trigger === "status_changed" ? option_id : null,
      action_type: CHANNEL_ACTION_TYPES[channel],
      action_params,
    };
  };

  return (
    <>
      {uses_slack && !slack.is_loading && !is_slack_connected && (
        <div className="mb-3 rounded-[8px] border border-boardtree-border-soft bg-boardtree-panel-alt px-3 py-2.5 text-[12.5px] leading-relaxed text-boardtree-text-muted">
          Slack is not connected yet.{" "}
          {onGoToConnections ? (
            <button type="button" onClick={onGoToConnections} className="font-semibold text-boardtree-accent hover:underline">
              Connect it in Connections
            </button>
          ) : slack.status?.can_manage ? (
            <Link href="/administration?section=integrations" className="font-semibold text-boardtree-accent hover:underline">
              Connect it from Administration
            </Link>
          ) : (
            "Ask an administrator to connect it from Administration."
          )}
        </div>
      )}

      {needs_trigger_column && (
        <>
          <div className={LABEL}>{trigger === "person_assigned" ? "When someone is assigned in" : trigger === "date_arrived" ? "When date column" : "When column"}</div>
          <div className="flex max-h-40 flex-col gap-0.5 overflow-y-auto">
            {trigger_columns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setColumnId(c.id);
                  setOptionId(c.options?.[0]?.id ?? "");
                }}
                className={ROW}
              >
                <Radio checked={column_id === c.id} />
                <span className="flex-1 truncate">{c.title}</span>
              </button>
            ))}
            {trigger_columns.length === 0 && <div className={HINT}>This table has no matching column yet.</div>}
          </div>
        </>
      )}

      {trigger === "status_changed" && trigger_column && (
        <>
          <div className={LABEL}>Changes to</div>
          <div className="flex max-h-36 flex-col gap-0.5 overflow-y-auto">
            {(trigger_column.options ?? []).map((option) => (
              <button key={option.id} type="button" onClick={() => setOptionId(option.id)} className={ROW}>
                <Radio checked={option_id === option.id} />
                <span className="h-3 w-3 flex-none rounded-full" style={{ background: option.color }} />
                <span className="flex-1 truncate">{option.label || "(blank)"}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {reaches_people ? (
        <>
          <div className={LABEL}>{channel === "email" ? "Send the email to" : "Send a Slack message to"}</div>
          <div className="flex flex-col gap-0.5">
            <button type="button" onClick={() => setRecipientMode("column")} disabled={people_columns.length === 0} className={`${ROW} disabled:opacity-40`}>
              <Radio checked={recipient_mode === "column"} />
              <span className="flex-1">Whoever is assigned</span>
            </button>
            {recipient_mode === "column" && (
              <div className="ml-6 flex flex-col gap-0.5">
                {people_columns.map((c) => (
                  <button key={c.id} type="button" onClick={() => setRecipientColumnId(c.id)} className={ROW}>
                    <Radio checked={recipient_column_id === c.id} />
                    <span className="flex-1 truncate">in &quot;{c.title}&quot;</span>
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setRecipientMode("person")} className={ROW}>
              <Radio checked={recipient_mode === "person"} />
              <span className="flex-1">A specific person</span>
            </button>
            {recipient_mode === "person" && (
              <div className="ml-6 flex max-h-36 flex-col gap-0.5 overflow-y-auto">
                {people.map((p) => (
                  <button key={p.id} type="button" onClick={() => setRecipientPersonId(p.id)} className={ROW}>
                    <Radio checked={recipient_person_id === p.id} />
                    <span className="flex-1 truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {channel === "slack_person" && (
            <div className="mt-1 px-2.5 text-[12px] text-boardtree-text-faint">People who have not connected their Slack account in My Profile are skipped.</div>
          )}
        </>
      ) : (
        <>
          <div className={LABEL}>Post in Slack channel</div>
          {slack.error && <div className={HINT}>{slack.error}</div>}
          {is_slack_connected && (
            <>
              <input
                value={channel_search}
                onChange={(e) => setChannelSearch(e.target.value)}
                placeholder="Search channels"
                className={`${TEXT_FIELD} mb-1 h-9`}
              />
              <div className="flex max-h-40 flex-col gap-0.5 overflow-y-auto">
                {visible_channels.map((c) => (
                  <button key={c.id} type="button" onClick={() => setSlackChannelId(c.id)} className={ROW}>
                    <Radio checked={slack_channel_id === c.id} />
                    <span className="flex-1 truncate">
                      # {c.name}
                    </span>
                    {c.is_private && <span className="flex-none text-[11.5px] text-boardtree-text-faint">Private</span>}
                  </button>
                ))}
                {visible_channels.length === 0 && (
                  <div className={HINT}>{slack.is_loading ? "Loading channels..." : "No channels found. Invite the app to a private channel to see it here."}</div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {channel === "email" && (
        <>
          <div className={LABEL}>Subject (optional)</div>
          <input
            value={subject}
            maxLength={SUBJECT_MAX_LENGTH}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={'Update on "{item_name}"'}
            className={`${TEXT_FIELD} h-9`}
          />
        </>
      )}

      <div className={LABEL}>Message (optional)</div>
      <textarea
        ref={message_ref}
        value={message}
        maxLength={MESSAGE_MAX_LENGTH}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="Leave empty to use the default message for this trigger"
        className={`${TEXT_FIELD} resize-none py-2`}
      />
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {available_tokens.map((t) => (
          <button
            key={t.token}
            type="button"
            onClick={() => insertToken(t.token)}
            className="rounded-full border border-boardtree-border-soft px-2.5 py-0.5 text-[11.5px] text-boardtree-text-muted hover:bg-boardtree-hover"
          >
            {t.label}
          </button>
        ))}
      </div>

      <button type="button" disabled={!can_save || is_saving} onClick={() => void onSave(buildPayload())} className={SAVE_BUTTON}>
        Create automation
      </button>
    </>
  );
}
