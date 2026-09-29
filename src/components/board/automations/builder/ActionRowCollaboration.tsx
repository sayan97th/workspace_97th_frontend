"use client";
import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import type { BoardAutomationActionParams, BoardAutomationRecipientSource, BoardAutomationTriggerType } from "@/types/board-automation";
import { RECIPIENT_SOURCE_LABELS, TRIGGER_MESSAGE_TOKENS, recipientSourcesFor, type ActionPickerId, type AutomationBuilderContext } from "./automationCatalog";
import { columnLabel, digestFilterLabel, groupLabel, peopleSelectionLabel } from "./automationSentence";
import { emptyCondition, isConditionComplete, type ActionDraft, type ConditionDraft } from "./builderDraft";
import { MiniAvatar, PickerList, PopoverFooter, POPOVER_INPUT, POPOVER_LABEL, Segmented, Token, type PickerEntry } from "./builderUi";
import ConditionRow from "./ConditionRow";
import { GroupPicker, MessageEditor } from "./valueEditors";

/**
 * The sentences of the actions about people and lists: subscribe or unsubscribe people, notify
 * the item's subscribers, archive or delete every subitem, turn a subitem into an item, and email a
 * digest of the items that pass a filter. `ActionRow` hands each one its verb token.
 */

export const COLLABORATION_ACTION_IDS: ActionPickerId[] = ["subscribe_people", "unsubscribe_people", "notify_subscribers", "clear_subitems", "convert_subitem", "send_digest"];

const Words = ({ children }: { children: React.ReactNode }) => <span className="text-boardtree-text">{children}</span>;

const truncate = (text: string, length = 34): string => (text.length > length ? `${text.slice(0, length - 1).trimEnd()}...` : text);

/** Most people and columns one pick list holds, mirrors the API. */
const MAX_PEOPLE = 50;
const MAX_DIGEST_COLUMNS = 8;
const MAX_DIGEST_RULES = 10;

export type CollaborationActionRowProps = {
  action: ActionDraft;
  context: AutomationBuilderContext;
  lead: "Then" | "and" | "Otherwise";
  has_trigger_item: boolean;
  trigger_type: BoardAutomationTriggerType | null;
  renderSwitch: (label: string) => React.ReactNode;
  onPatch: (next: BoardAutomationActionParams) => void;
};

type PeopleMode = "people" | "column" | "team" | "source";

/**
 * Who a subscribe, unsubscribe or digest action names, any mix of: people picked by name, whoever
 * a people column holds, a team, and someone known only on the run. `modes` narrows the tabs, a
 * digest only takes people and teams.
 */
function PeopleSelectionEditor({ params, context, has_trigger_item, trigger_type, modes, with_everyone = false, onApply }: {
  params: BoardAutomationActionParams;
  context: AutomationBuilderContext;
  has_trigger_item: boolean;
  trigger_type: BoardAutomationTriggerType | null;
  modes: PeopleMode[];
  with_everyone?: boolean;
  onApply: (patch: BoardAutomationActionParams) => void;
}) {
  const [tab, setTab] = useState<PeopleMode>(modes[0]);
  const [user_ids, setUserIds] = useState<number[]>(params.user_ids ?? []);
  const [column_id, setColumnId] = useState<number | null>(params.notify_from_people_column_id ?? null);
  const [team_id, setTeamId] = useState<number | null>(params.team_id ?? null);
  const [source, setSource] = useState<BoardAutomationRecipientSource | null>(params.recipient_source ?? null);
  const [everyone, setEveryone] = useState(Boolean(params.everyone));

  const people_columns = context.columns.filter((column) => column.kind === "people");
  const teams = context.teams ?? [];
  const sources = recipientSourcesFor(trigger_type, has_trigger_item, false);
  const tab_labels: Record<PeopleMode, string> = { people: "People", column: "Column", team: "Team", source: "On the run" };
  const toggleUser = (id: number) => setUserIds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id].slice(0, MAX_PEOPLE)));
  const has_pick = everyone || user_ids.length > 0 || column_id !== null || team_id !== null || source !== null;

  return (
    <>
      {with_everyone && (
        <label className="mb-2 flex items-center gap-2 text-[12.5px] text-boardtree-text-secondary">
          <input type="checkbox" checked={everyone} onChange={(event) => setEveryone(event.target.checked)} className="accent-boardtree-accent" />
          Everyone subscribed to the item
        </label>
      )}
      {!everyone && (
        <>
          {modes.length > 1 && (
            <div className="mb-2">
              <Segmented label="Pick people by" options={modes.map((mode) => ({ id: mode, label: tab_labels[mode] }))} value={tab} onChange={setTab} />
            </div>
          )}
          {tab === "people" && (
            <PickerList
              sections={[{ entries: context.people.map((person): PickerEntry<string> => ({ id: person.id, label: person.name, leading: <MiniAvatar initials={person.initials} color={person.color} /> })) }]}
              selected={user_ids.map(String)}
              onPick={(id) => toggleUser(Number(id))}
              placeholder="Search people"
              max_height={200}
            />
          )}
          {tab === "column" &&
            (people_columns.length === 0 ? (
              <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">Add a People column to this table first.</div>
            ) : (
              <PickerList
                sections={[{ entries: [{ id: "__none__", label: "No people column" }] }, { title: "Whoever it holds on the item", entries: people_columns.map((column) => ({ id: column.id, label: column.title })) }]}
                selected={column_id ? String(column_id) : "__none__"}
                onPick={(id) => setColumnId(id === "__none__" ? null : Number(id))}
              />
            ))}
          {tab === "team" &&
            (teams.length === 0 ? (
              <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">There are no teams yet. An administrator creates them on the Teams page.</div>
            ) : (
              <PickerList
                sections={[{ entries: [{ id: "__none__", label: "No team" }] }, { title: "Every member of", entries: teams.map((team) => ({ id: String(team.id), label: team.name, hint: `${team.member_count}` })) }]}
                selected={team_id ? String(team_id) : "__none__"}
                onPick={(id) => setTeamId(id === "__none__" ? null : Number(id))}
                placeholder="Search teams"
              />
            ))}
          {tab === "source" && (
            <PickerList
              is_searchable={false}
              sections={[{ entries: [{ id: "__none__", label: "Nobody" }, ...sources.map((entry) => ({ id: entry, label: RECIPIENT_SOURCE_LABELS[entry] }))] }]}
              selected={source ?? "__none__"}
              onPick={(id) => setSource(id === "__none__" ? null : (id as BoardAutomationRecipientSource))}
            />
          )}
        </>
      )}
      <PopoverFooter
        is_disabled={!has_pick}
        onDone={() =>
          onApply({
            user_ids,
            notify_from_people_column_id: column_id ?? undefined,
            team_id: team_id ?? undefined,
            recipient_source: source,
            ...(with_everyone ? { everyone } : {}),
          })
        }
      />
    </>
  );
}

/**
 * Which items a digest lists: filter rules (the same rules as the conditions), how they combine
 * and an optional group.
 */
function DigestFilterEditor({ params, context, onApply }: { params: BoardAutomationActionParams; context: AutomationBuilderContext; onApply: (patch: BoardAutomationActionParams) => void }) {
  const [rules, setRules] = useState<ConditionDraft[]>((params.digest_rules ?? []).map((rule) => ({ ...emptyCondition(), ...rule, values: rule.values ?? [], value: rule.value ?? "" })));
  const [operator, setOperator] = useState<"and" | "or">(params.digest_operator === "or" ? "or" : "and");
  const [group_id, setGroupId] = useState<number | null>(params.target_group_id ?? null);
  const is_complete = rules.every(isConditionComplete);

  return (
    <>
      <div className={POPOVER_LABEL}>Group</div>
      <select value={group_id ?? ""} onChange={(event) => setGroupId(event.target.value ? Number(event.target.value) : null)} aria-label="Group" className={`${POPOVER_INPUT} mb-2.5`}>
        <option value="">Every group</option>
        {context.groups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
      </select>
      <div className="mb-1 flex items-center justify-between">
        <span className={POPOVER_LABEL}>Only items where</span>
        {rules.length > 1 && (
          <select value={operator} onChange={(event) => setOperator(event.target.value === "or" ? "or" : "and")} aria-label="How the rules combine" className="h-7 rounded-[6px] border border-boardtree-border bg-boardtree-surface px-1.5 text-[12px] text-boardtree-text">
            <option value="and">every rule matches</option>
            <option value="or">one rule matches</option>
          </select>
        )}
      </div>
      {rules.length === 0 && <div className="mb-1 text-[12.5px] text-boardtree-text-faint">No rule, the digest lists every item.</div>}
      <div className="flex flex-col gap-1.5">
        {rules.map((rule, index) => (
          <div key={rule.key} className="flex items-start gap-1.5 rounded-[6px] border border-boardtree-border-soft px-2 py-1.5 text-[13px] leading-[1.7]">
            <div className="min-w-0 flex-1">
              <ConditionRow
                condition={rule}
                is_first={false}
                lead={<span className="text-boardtree-text">{index === 0 ? "" : operator === "or" ? "or " : "and "}</span>}
                scope="item"
                context={context}
                dynamic_exclude={["actor", "mentioned"]}
                exclude_fields={["__actor__", "__subitems__"]}
                onChange={(next) => setRules((current) => current.map((entry) => (entry.key === next.key ? next : entry)))}
              />
            </div>
            <button type="button" onClick={() => setRules((current) => current.filter((entry) => entry.key !== rule.key))} aria-label={`Remove rule ${index + 1}`} className="flex h-7 w-7 flex-none items-center justify-center rounded-[6px] text-boardtree-text-faint hover:bg-boardtree-hover hover:text-boardtree-danger">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      {rules.length < MAX_DIGEST_RULES && (
        <button type="button" onClick={() => setRules((current) => [...current, emptyCondition()])} className="mt-1.5 rounded-[6px] px-2 py-1 text-[12.5px] text-boardtree-accent hover:bg-boardtree-hover">
          + Add a rule
        </button>
      )}
      {!is_complete && <div className="mt-1 text-[11.5px] text-boardtree-danger">Finish or remove the rules in gray.</div>}
      <PopoverFooter
        is_disabled={!is_complete}
        onDone={() => onApply({ digest_rules: rules.map(({ column_id, condition, value, values, dynamic }) => ({ column_id, condition, value, values, ...(dynamic ? { dynamic } : {}) })), digest_operator: operator, target_group_id: group_id ?? undefined })}
      />
    </>
  );
}

/** The columns a digest shows after the item name, at most eight. */
function DigestColumnsEditor({ params, context, onApply }: { params: BoardAutomationActionParams; context: AutomationBuilderContext; onApply: (column_ids: number[]) => void }) {
  const [ids, setIds] = useState<number[]>(params.column_ids ?? []);
  const columns = context.columns.filter((column) => column.scope === "item" && column.kind !== "button");
  const toggle = (id: number) => setIds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : current.length >= MAX_DIGEST_COLUMNS ? current : [...current, id]));
  return (
    <>
      <PickerList
        sections={[{ title: `Up to ${MAX_DIGEST_COLUMNS} columns, in board order`, entries: columns.map((column) => ({ id: column.id, label: column.title, hint: column.kind.replace("_", " ") })) }]}
        selected={ids.map(String)}
        onPick={(id) => toggle(Number(id))}
        placeholder="Search columns"
        max_height={220}
      />
      <PopoverFooter onDone={() => onApply(columns.filter((column) => ids.includes(Number(column.id))).map((column) => Number(column.id)))} />
    </>
  );
}

/** How many rows a digest shows at most, and whether it is sent when nothing matches. */
function DigestLimitEditor({ params, onApply }: { params: BoardAutomationActionParams; onApply: (patch: BoardAutomationActionParams) => void }) {
  const [max_items, setMaxItems] = useState(String(params.max_items ?? 50));
  const [send_when_empty, setSendWhenEmpty] = useState(Boolean(params.send_when_empty));
  const number = Math.round(Number(max_items));
  const is_valid = Number.isFinite(number) && number >= 1 && number <= 200;
  return (
    <>
      <div className={POPOVER_LABEL}>Most items listed</div>
      <input type="number" min={1} max={200} value={max_items} onChange={(event) => setMaxItems(event.target.value)} aria-label="Most items listed" className={`${POPOVER_INPUT} w-24`} />
      <div className="mt-1 text-[11.5px] text-boardtree-text-faint">The email says how many more there are.</div>
      <label className="mt-2.5 flex items-center gap-2 text-[12.5px] text-boardtree-text-secondary">
        <input type="checkbox" checked={send_when_empty} onChange={(event) => setSendWhenEmpty(event.target.checked)} className="accent-boardtree-accent" />
        Send it even when no item matches
      </label>
      <PopoverFooter is_disabled={!is_valid} onDone={() => onApply({ max_items: number, send_when_empty })} />
    </>
  );
}

export default function ActionRowCollaboration({ action, context, lead, has_trigger_item, trigger_type, renderSwitch, onPatch }: CollaborationActionRowProps) {
  const params = action.params;
  const extra_tokens = trigger_type ? TRIGGER_MESSAGE_TOKENS[trigger_type] ?? [] : [];

  const messageToken = (with_subject = false) => {
    const message = (params.message ?? "").trim();
    return (
      <Token label={message ? `"${truncate(message, 28)}"` : "default message"} is_placeholder={!message} aria_label="Message" popover_width={360}>
        {(close) => (
          <MessageEditor
            context={context}
            message={params.message ?? ""}
            subject={params.subject ?? ""}
            with_subject={with_subject}
            extra_tokens={extra_tokens}
            onApply={(next_message, next_subject) => {
              onPatch({ message: next_message.trim() || null, ...(with_subject ? { subject: next_subject.trim() || null } : {}) });
              close();
            }}
          />
        )}
      </Token>
    );
  };

  const peopleToken = (options: { modes: PeopleMode[]; with_everyone?: boolean; aria_label: string }) => {
    const label = options.with_everyone && params.everyone ? "everyone" : peopleSelectionLabel(context, params);
    const is_set = Boolean((options.with_everyone && params.everyone) || params.user_ids?.length || params.notify_from_people_column_id || params.team_id || params.recipient_source);
    return (
      <Token label={truncate(label)} is_placeholder={!is_set} aria_label={options.aria_label} popover_width={330}>
        {(close) => (
          <PeopleSelectionEditor
            params={params}
            context={context}
            has_trigger_item={has_trigger_item}
            trigger_type={trigger_type}
            modes={options.modes}
            with_everyone={options.with_everyone}
            onApply={(next) => { onPatch(next); close(); }}
          />
        )}
      </Token>
    );
  };

  switch (action.picker_id) {
    case "subscribe_people":
      return <><Words>{lead} </Words>{renderSwitch("subscribe")} {peopleToken({ modes: ["people", "column", "team", "source"], aria_label: "Who to subscribe" })} <Words>to the item</Words></>;
    case "unsubscribe_people":
      return <><Words>{lead} </Words>{renderSwitch("unsubscribe")} {peopleToken({ modes: ["people", "column", "team", "source"], with_everyone: true, aria_label: "Who to unsubscribe" })} <Words>from the item</Words></>;
    case "notify_subscribers":
      return (
        <>
          <Words>{lead} </Words>{renderSwitch("notify")} <Words>the item&apos;s subscribers </Words>
          <Token label={params.include_actor ? "including the person who made the change" : "except the person who made the change"} aria_label="The person who made the change" popover_width={300}>
            {(close) => (
              <PickerList
                is_searchable={false}
                sections={[{ entries: [{ id: "skip", label: "Leave out the person who made the change" }, { id: "include", label: "Notify them too" }] }]}
                selected={params.include_actor ? "include" : "skip"}
                onPick={(id) => { onPatch({ include_actor: id === "include" }); close(); }}
              />
            )}
          </Token>{" "}
          <Words>with </Words>{messageToken()}
        </>
      );
    case "clear_subitems":
      return (
        <>
          <Words>{lead} </Words>
          <Token label={params.operation === "delete" ? "delete" : "archive"} aria_label="Archive or delete" popover_width={240}>
            {(close) => (
              <PickerList
                is_searchable={false}
                sections={[{ entries: [{ id: "archive", label: "Archive them", hint: "restorable" }, { id: "delete", label: "Delete them" }] }]}
                selected={params.operation === "delete" ? "delete" : "archive"}
                onPick={(id) => { onPatch({ operation: id === "delete" ? "delete" : "archive" }); close(); }}
              />
            )}
          </Token>{" "}
          {renderSwitch("every subitem")}
        </>
      );
    case "convert_subitem": {
      const is_invalid = params.target_group_id != null && !context.groups.some((group) => group.id === String(params.target_group_id));
      return (
        <>
          <Words>{lead} </Words>{renderSwitch("turn the subitem into an item")} <Words>of </Words>
          <Token label={is_invalid ? "deleted group" : params.target_group_id ? groupLabel(context, params.target_group_id) : "its parent's group"} is_placeholder={!params.target_group_id} is_invalid={is_invalid} aria_label="Which group">
            {(close) => (
              <GroupPicker
                groups={context.groups}
                selected={params.target_group_id ? String(params.target_group_id) : "__parent__"}
                extra_entries={[{ id: "__parent__", label: "Its parent's group" }]}
                onPick={(id) => { onPatch({ target_group_id: id === "__parent__" ? undefined : Number(id) }); close(); }}
              />
            )}
          </Token>
        </>
      );
    }
    case "send_digest": {
      const shown = (params.column_ids ?? []).map((id) => columnLabel(context, id)).join(", ");
      return (
        <>
          <Words>{lead} </Words>{renderSwitch("email a digest")} <Words>of </Words>
          <Token label={truncate(digestFilterLabel(context, params), 40)} aria_label="Which items" popover_width={420}>
            {(close) => <DigestFilterEditor params={params} context={context} onApply={(next) => { onPatch(next); close(); }} />}
          </Token>{" "}
          <Words>showing </Words>
          <Token label={shown ? truncate(shown, 30) : "only the names"} is_placeholder={!shown} aria_label="Columns shown" popover_width={300}>
            {(close) => <DigestColumnsEditor params={params} context={context} onApply={(column_ids) => { onPatch({ column_ids }); close(); }} />}
          </Token>{" "}
          <Words>to </Words>{peopleToken({ modes: ["people", "team"], aria_label: "Who receives the digest" })}{" "}
          <Words>with </Words>{messageToken(true)}<Words>, </Words>
          <Token label={`up to ${params.max_items ?? 50} items${params.send_when_empty ? ", even when empty" : ""}`} aria_label="Digest limits" popover_width={280}>
            {(close) => <DigestLimitEditor params={params} onApply={(next) => { onPatch(next); close(); }} />}
          </Token>
          {trigger_type !== "recurring" && (
            <span className="ml-2 align-middle text-[13px] text-boardtree-text-faint">Tip: start it with &quot;every time period&quot; to send it on a schedule.</span>
          )}
        </>
      );
    }
    default:
      return <><Words>{lead} </Words>{renderSwitch("do this")}</>;
  }
}
