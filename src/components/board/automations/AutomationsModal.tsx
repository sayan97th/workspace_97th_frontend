"use client";
import React, { useState } from "react";
import type { ColumnDef, PersonDef } from "../table/types";
import type { BoardAutomationDto, CreateBoardAutomationPayload } from "@/types/board-automation";
import { useSlackAutomationOptions } from "@/hooks/useSlackAutomationOptions";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { LABEL, ROW, Radio, SAVE_BUTTON } from "./automationFormParts";
import CommunicationRecipeForm from "./CommunicationRecipeForm";
import CommunicationTemplateCard from "./CommunicationTemplateCard";
import { CHANNEL_LABELS, COMMUNICATION_TEMPLATES, type CommunicationChannel, type CommunicationTemplate } from "./communicationTemplates";

export type AutomationsModalProps = {
  is_open: boolean;
  onClose: () => void;
  automations: BoardAutomationDto[];
  /** This tab's item-scope columns, for the trigger/notify-target pickers. */
  columns: ColumnDef[];
  groups: { id: string; label: string }[];
  people: PersonDef[];
  onCreate: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => Promise<void>;
  onToggle: (automation_id: number, is_enabled: boolean) => Promise<void>;
  onDelete: (automation_id: number) => Promise<void>;
};

type Recipe = "status_changed" | "date_arrived" | "item_created" | "person_assigned" | "status_archive" | "subitem_created" | "communication";
type Tab = "create" | "manage";
type ChannelFilter = "all" | "email" | "slack";

/** The board actions that sit under the "Board actions" category, ahead of the communication templates. */
const BOARD_RECIPES: { id: Exclude<Recipe, "communication">; label: string }[] = [
  { id: "status_changed", label: "When a Status/Label changes, move the item to a table" },
  { id: "date_arrived", label: "When a Date arrives, notify someone" },
  { id: "item_created", label: "When an item is created, notify someone" },
  { id: "person_assigned", label: "When someone is assigned, change the Status" },
  { id: "status_archive", label: "When a Status/Label changes to X, archive the item" },
  { id: "subitem_created", label: "When a subitem is created, create an item in another table" },
];

const CHANNEL_FILTERS: { id: ChannelFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "email", label: CHANNEL_LABELS.email },
  { id: "slack", label: CHANNEL_LABELS.slack_channel },
];

const channelMatchesFilter = (channel: CommunicationChannel, filter: ChannelFilter) =>
  filter === "all" || (filter === "email" ? channel === "email" : channel !== "email");

type NamedOption = { id: string; label: string };

function describeTrigger(automation: BoardAutomationDto, columns: ColumnDef[], people: PersonDef[]): string {
  const trigger_column = columns.find((c) => c.id === String(automation.trigger_column_id));
  const trigger_label = trigger_column?.title ?? "a column";

  switch (automation.trigger_type) {
    case "status_changed":
      return `When ${trigger_label} changes to "${trigger_column?.options?.find((o) => o.id === automation.trigger_value)?.label ?? automation.trigger_value}"`;
    case "date_arrived":
      return `When ${trigger_label} arrives`;
    case "item_created":
      return "When an item is created";
    case "subitem_created":
      return "When a subitem is created";
    case "column_changed":
      return `When ${trigger_label} changes`;
    case "update_posted":
      return "When an update is posted";
    default:
      return automation.trigger_value
        ? `When ${people.find((p) => p.id === String(automation.trigger_value))?.name ?? "someone"} is assigned in "${trigger_label}"`
        : `When someone is assigned in "${trigger_label}"`;
  }
}

/** "Amanda", or "whoever is assigned in "Owner"", whichever the action was configured with. */
function describeRecipient(automation: BoardAutomationDto, columns: ColumnDef[], people: PersonDef[]): string {
  if (automation.action_params.notify_user_id) {
    return people.find((p) => p.id === String(automation.action_params.notify_user_id))?.name ?? "a person";
  }
  return `whoever is assigned in "${columns.find((c) => c.id === String(automation.action_params.notify_from_people_column_id))?.title ?? "a column"}"`;
}

function describeAction(automation: BoardAutomationDto, columns: ColumnDef[], groups: NamedOption[], people: PersonDef[]): string {
  const group_label = groups.find((g) => g.id === String(automation.action_params.target_group_id))?.label ?? "a table";

  switch (automation.action_type) {
    case "move_to_group":
      return `move the item to "${group_label}"`;
    case "archive_item":
      return "archive the item";
    case "create_item":
      return `create "${automation.action_params.item_name || "New item"}" in "${group_label}"`;
    case "set_column_value": {
      const target_column = columns.find((c) => c.id === String(automation.action_params.target_column_id));
      const raw_value = automation.action_params.value;
      const resolved_value = target_column?.options?.find((o) => o.id === raw_value)?.label ?? String(raw_value ?? "");
      return `set "${target_column?.title ?? "a column"}" to "${resolved_value}"`;
    }
    case "send_email":
      return `send an email to ${describeRecipient(automation, columns, people)}`;
    case "slack_notify_person":
      return `send a Slack message to ${describeRecipient(automation, columns, people)}`;
    case "slack_notify_channel":
      return `post to Slack channel #${automation.action_params.slack_channel_name || automation.action_params.slack_channel_id}`;
    default:
      return `notify ${describeRecipient(automation, columns, people)}`;
  }
}

/** Describes one automation as a plain-English sentence for the list view. */
function describeAutomation(automation: BoardAutomationDto, columns: ColumnDef[], groups: NamedOption[], people: PersonDef[]): string {
  return `${describeTrigger(automation, columns, people)}, ${describeAction(automation, columns, groups, people)}.`;
}

/** Board header's "Automate" button. Create rule-based (no AI) automations from a template library, and enable, disable or delete this tab's existing ones. */
export default function AutomationsModal({ is_open, onClose, automations, columns, groups, people, onCreate, onToggle, onDelete }: AutomationsModalProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [template, setTemplate] = useState<CommunicationTemplate | null>(null);
  const [tab, setTab] = useState<Tab | null>(null);
  const [search, setSearch] = useState("");
  const [channel_filter, setChannelFilter] = useState<ChannelFilter>("all");
  const [is_saving, setIsSaving] = useState(false);
  const [save_error, setSaveError] = useState<string | null>(null);
  const slack = useSlackAutomationOptions(is_open);

  if (!is_open) return null;

  // Open on the list once there is something to manage, otherwise on the template library.
  const active_tab: Tab = tab ?? (automations.length > 0 ? "manage" : "create");
  const search_text = search.trim().toLowerCase();
  const visible_board_recipes = BOARD_RECIPES.filter((r) => r.label.toLowerCase().includes(search_text));
  const visible_templates = COMMUNICATION_TEMPLATES.filter((t) => channelMatchesFilter(t.channel, channel_filter) && t.search_text.includes(search_text));

  const close = () => {
    setRecipe(null);
    setTemplate(null);
    setSearch("");
    setSaveError(null);
    onClose();
  };

  const goBack = () => {
    setRecipe(null);
    setTemplate(null);
    setSaveError(null);
  };

  const save = async (payload: Omit<CreateBoardAutomationPayload, "view_id">) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onCreate(payload);
      setRecipe(null);
      setTemplate(null);
      setTab("manage");
    } catch (failure) {
      setSaveError(apiErrorMessage(failure, "The automation could not be created."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(30,34,55,0.35)]" onClick={close}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[85vh] max-w-[94vw] flex-col rounded-[14px] bg-boardtree-surface shadow-[0_24px_60px_rgba(30,34,55,0.30)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)] ${recipe ? "w-[520px]" : "w-[780px]"}`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-boardtree-border-soft px-5 py-4">
          <div className="flex items-center gap-2">
            {recipe && (
              <button type="button" onClick={goBack} aria-label="Back" className="flex h-6 w-6 items-center justify-center rounded-[5px] text-boardtree-text-muted hover:bg-boardtree-hover">
                <svg viewBox="0 0 12 12" width="10" height="10"><path d="M7.5 3 L4.3 6 L7.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            )}
            <div className="text-[15px] font-semibold text-boardtree-text">Automations</div>
          </div>

          {!recipe && (
            <div className="flex overflow-hidden rounded-[7px] border border-boardtree-border text-[12.5px]">
              {(["create", "manage"] as const).map((tab_id) => (
                <button
                  key={tab_id}
                  type="button"
                  onClick={() => setTab(tab_id)}
                  className={`px-3.5 py-1.5 capitalize ${active_tab === tab_id ? "bg-boardtree-accent-surface font-medium text-boardtree-accent" : "text-boardtree-text-muted hover:bg-boardtree-hover"}`}
                >
                  {tab_id}
                  {tab_id === "manage" && automations.length > 0 ? ` (${automations.length})` : ""}
                </button>
              ))}
            </div>
          )}

          <button type="button" onClick={close} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-[6px] text-boardtree-text-muted hover:bg-boardtree-hover">
            <svg viewBox="0 0 14 14" width="12" height="12"><path d="M2.6 2.6 L11.4 11.4 M11.4 2.6 L2.6 11.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!recipe && active_tab === "manage" && (
            <div className="flex flex-col gap-2">
              {automations.length === 0 && (
                <div className="text-[12.5px] text-boardtree-text-faint">
                  No automations on this table yet.{" "}
                  <button type="button" onClick={() => setTab("create")} className="font-medium text-boardtree-accent hover:underline">Browse templates</button>
                </div>
              )}
              {automations.map((automation) => (
                <div key={automation.id} className="flex items-start gap-2.5 rounded-[8px] border border-boardtree-border-soft px-3 py-2.5">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={automation.is_enabled}
                    aria-label="Enable automation"
                    onClick={() => void onToggle(automation.id, !automation.is_enabled)}
                    className={`mt-0.5 flex h-5 w-9 flex-none items-center rounded-full px-0.5 transition-colors ${automation.is_enabled ? "justify-end bg-boardtree-accent" : "justify-start bg-boardtree-track"}`}
                  >
                    <span className="h-4 w-4 rounded-full bg-white" />
                  </button>
                  <div className="min-w-0 flex-1 text-[13px] text-boardtree-text">{describeAutomation(automation, columns, groups, people)}</div>
                  <button type="button" onClick={() => void onDelete(automation.id)} aria-label="Delete automation" className="flex h-6 w-6 flex-none items-center justify-center rounded-[5px] text-boardtree-text-faint hover:bg-boardtree-danger-hover hover:text-boardtree-danger">
                    <svg viewBox="0 0 16 16" width="13" height="13"><path d="M3.4 5 H12.6 M6.4 5 V3.2 H9.6 V5 M4.8 5 L5.4 13.2 H10.6 L11.2 5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {!recipe && active_tab === "create" && (
            <>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search automations"
                aria-label="Search automations"
                className="mb-4 h-9 w-full rounded-[7px] border border-boardtree-border bg-boardtree-surface px-3 text-[13px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint focus:border-boardtree-accent"
              />

              <div className="mb-1 text-[15px] font-semibold text-boardtree-text">Communication</div>
              <div className="mb-3 text-[12.5px] text-boardtree-text-muted">Keep your team in the loop with notification and messaging templates.</div>
              <div className="mb-3 flex gap-1.5">
                {CHANNEL_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setChannelFilter(filter.id)}
                    className={`rounded-full border px-3 py-1 text-[12px] ${channel_filter === filter.id ? "border-boardtree-accent bg-boardtree-accent-surface text-boardtree-accent" : "border-boardtree-border-soft text-boardtree-text-muted hover:bg-boardtree-hover"}`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {visible_templates.map((t) => (
                  <CommunicationTemplateCard
                    key={t.id}
                    template={t}
                    onUse={(chosen) => {
                      setTemplate(chosen);
                      setRecipe("communication");
                    }}
                  />
                ))}
              </div>
              {visible_templates.length === 0 && <div className="text-[12.5px] text-boardtree-text-faint">No communication templates match your search.</div>}

              {visible_board_recipes.length > 0 && (
                <>
                  <div className="mb-2 mt-6 text-[15px] font-semibold text-boardtree-text">Board actions</div>
                  <div className="flex flex-col gap-1.5">
                    {visible_board_recipes.map((r) => (
                      <button key={r.id} type="button" onClick={() => setRecipe(r.id)} className={`${ROW} border border-boardtree-border-soft`}>
                        <span className="flex-1">{r.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {recipe && save_error && (
            <div role="alert" className="mb-3 rounded-[8px] border border-boardtree-danger/30 bg-boardtree-danger-hover px-3 py-2 text-[12.5px] text-boardtree-danger">
              {save_error}
            </div>
          )}

          {recipe === "communication" && template && (
            <CommunicationRecipeForm template={template} columns={columns} people={people} slack={slack} is_saving={is_saving} onSave={save} />
          )}

          {recipe === "status_changed" && <StatusChangedForm columns={columns} groups={groups} is_saving={is_saving} onSave={save} />}
          {recipe === "date_arrived" && <DateArrivedForm columns={columns} people={people} is_saving={is_saving} onSave={save} />}
          {recipe === "item_created" && <ItemCreatedNotifyForm people={people} is_saving={is_saving} onSave={save} />}
          {recipe === "person_assigned" && <PersonAssignedSetStatusForm columns={columns} is_saving={is_saving} onSave={save} />}
          {recipe === "status_archive" && <StatusArchiveForm columns={columns} is_saving={is_saving} onSave={save} />}
          {recipe === "subitem_created" && <SubitemCreatedCreateItemForm groups={groups} is_saving={is_saving} onSave={save} />}
        </div>
      </div>
    </div>
  );
}

function StatusChangedForm({
  columns, groups, is_saving, onSave,
}: {
  columns: ColumnDef[];
  groups: { id: string; label: string }[];
  is_saving: boolean;
  onSave: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => Promise<void>;
}) {
  const trigger_columns = columns.filter((c) => c.kind === "status" || c.kind === "label");
  const [column_id, setColumnId] = useState(trigger_columns[0]?.id ?? "");
  const trigger_column = trigger_columns.find((c) => c.id === column_id);
  const [option_id, setOptionId] = useState(trigger_column?.options?.[0]?.id ?? "");
  const [group_id, setGroupId] = useState(groups[0]?.id ?? "");

  const can_save = !!column_id && !!option_id && !!group_id;

  return (
    <>
      <div className={LABEL}>When column</div>
      <div className="flex flex-col gap-0.5">
        {trigger_columns.map((c) => (
          <button key={c.id} type="button" onClick={() => { setColumnId(c.id); setOptionId(c.options?.[0]?.id ?? ""); }} className={ROW}>
            <Radio checked={column_id === c.id} />
            <span className="flex-1 truncate">{c.title}</span>
          </button>
        ))}
        {trigger_columns.length === 0 && <div className="px-2.5 py-1.5 text-[12.5px] text-boardtree-text-faint">Add a Status or Label column to this table first.</div>}
      </div>

      {trigger_column && (
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

      <div className={LABEL}>Move the item to</div>
      <div className="flex max-h-36 flex-col gap-0.5 overflow-y-auto">
        {groups.map((g) => (
          <button key={g.id} type="button" onClick={() => setGroupId(g.id)} className={ROW}>
            <Radio checked={group_id === g.id} />
            <span className="flex-1 truncate">{g.label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!can_save || is_saving}
        onClick={() =>
          void onSave({
            trigger_type: "status_changed",
            trigger_column_id: Number(column_id),
            trigger_value: option_id,
            action_type: "move_to_group",
            action_params: { target_group_id: Number(group_id) },
          })
        }
        className={SAVE_BUTTON}
      >
        Create automation
      </button>
    </>
  );
}

function DateArrivedForm({
  columns, people, is_saving, onSave,
}: {
  columns: ColumnDef[];
  people: PersonDef[];
  is_saving: boolean;
  onSave: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => Promise<void>;
}) {
  const trigger_columns = columns.filter((c) => c.kind === "date");
  const people_columns = columns.filter((c) => c.kind === "people");
  const [column_id, setColumnId] = useState(trigger_columns[0]?.id ?? "");
  const [notify_mode, setNotifyMode] = useState<"person" | "column">(people_columns.length > 0 ? "column" : "person");
  const [notify_person_id, setNotifyPersonId] = useState(people[0]?.id ?? "");
  const [notify_column_id, setNotifyColumnId] = useState(people_columns[0]?.id ?? "");

  const can_save = !!column_id && (notify_mode === "person" ? !!notify_person_id : !!notify_column_id);

  return (
    <>
      <div className={LABEL}>When date column</div>
      <div className="flex flex-col gap-0.5">
        {trigger_columns.map((c) => (
          <button key={c.id} type="button" onClick={() => setColumnId(c.id)} className={ROW}>
            <Radio checked={column_id === c.id} />
            <span className="flex-1 truncate">{c.title}</span>
          </button>
        ))}
        {trigger_columns.length === 0 && <div className="px-2.5 py-1.5 text-[12.5px] text-boardtree-text-faint">Add a Date column to this table first.</div>}
      </div>

      <div className={LABEL}>Notify</div>
      <div className="flex flex-col gap-0.5">
        <button type="button" onClick={() => setNotifyMode("column")} disabled={people_columns.length === 0} className={`${ROW} disabled:opacity-40`}>
          <Radio checked={notify_mode === "column"} />
          <span className="flex-1">Whoever is assigned</span>
        </button>
        {notify_mode === "column" && (
          <div className="ml-6 flex flex-col gap-0.5">
            {people_columns.map((c) => (
              <button key={c.id} type="button" onClick={() => setNotifyColumnId(c.id)} className={ROW}>
                <Radio checked={notify_column_id === c.id} />
                <span className="flex-1 truncate">in "{c.title}"</span>
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={() => setNotifyMode("person")} className={ROW}>
          <Radio checked={notify_mode === "person"} />
          <span className="flex-1">A specific person</span>
        </button>
        {notify_mode === "person" && (
          <div className="ml-6 flex max-h-36 flex-col gap-0.5 overflow-y-auto">
            {people.map((p) => (
              <button key={p.id} type="button" onClick={() => setNotifyPersonId(p.id)} className={ROW}>
                <Radio checked={notify_person_id === p.id} />
                <span className="flex-1 truncate">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={!can_save || is_saving}
        onClick={() =>
          void onSave({
            trigger_type: "date_arrived",
            trigger_column_id: Number(column_id),
            action_type: "notify_person",
            action_params:
              notify_mode === "person"
                ? { notify_user_id: Number(notify_person_id) }
                : { notify_from_people_column_id: Number(notify_column_id) },
          })
        }
        className={SAVE_BUTTON}
      >
        Create automation
      </button>
    </>
  );
}

/** "When an item is created, notify someone" — the item-title-analogue of `DateArrivedForm`'s own notify picker, just with a fixed trigger and no watched column. */
function ItemCreatedNotifyForm({
  people, is_saving, onSave,
}: {
  people: PersonDef[];
  is_saving: boolean;
  onSave: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => Promise<void>;
}) {
  const [notify_person_id, setNotifyPersonId] = useState(people[0]?.id ?? "");
  const can_save = !!notify_person_id;

  return (
    <>
      <div className={LABEL}>Notify</div>
      <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
        {people.map((p) => (
          <button key={p.id} type="button" onClick={() => setNotifyPersonId(p.id)} className={ROW}>
            <Radio checked={notify_person_id === p.id} />
            <span className="flex-1 truncate">{p.name}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!can_save || is_saving}
        onClick={() =>
          void onSave({
            trigger_type: "item_created",
            trigger_column_id: null,
            action_type: "notify_person",
            action_params: { notify_user_id: Number(notify_person_id) },
          })
        }
        className={SAVE_BUTTON}
      >
        Create automation
      </button>
    </>
  );
}

/** "When someone is assigned, change the Status" — pairs the `person_assigned` trigger with `set_column_value` on a Status/Label column. */
function PersonAssignedSetStatusForm({
  columns, is_saving, onSave,
}: {
  columns: ColumnDef[];
  is_saving: boolean;
  onSave: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => Promise<void>;
}) {
  const people_columns = columns.filter((c) => c.kind === "people");
  const status_columns = columns.filter((c) => c.kind === "status" || c.kind === "label");
  const [watched_column_id, setWatchedColumnId] = useState(people_columns[0]?.id ?? "");
  const [target_column_id, setTargetColumnId] = useState(status_columns[0]?.id ?? "");
  const target_column = status_columns.find((c) => c.id === target_column_id);
  const [option_id, setOptionId] = useState(target_column?.options?.[0]?.id ?? "");

  const can_save = !!watched_column_id && !!target_column_id && !!option_id;

  return (
    <>
      <div className={LABEL}>When someone is assigned in</div>
      <div className="flex flex-col gap-0.5">
        {people_columns.map((c) => (
          <button key={c.id} type="button" onClick={() => setWatchedColumnId(c.id)} className={ROW}>
            <Radio checked={watched_column_id === c.id} />
            <span className="flex-1 truncate">{c.title}</span>
          </button>
        ))}
        {people_columns.length === 0 && <div className="px-2.5 py-1.5 text-[12.5px] text-boardtree-text-faint">Add a People column to this table first.</div>}
      </div>

      <div className={LABEL}>Change</div>
      <div className="flex flex-col gap-0.5">
        {status_columns.map((c) => (
          <button key={c.id} type="button" onClick={() => { setTargetColumnId(c.id); setOptionId(c.options?.[0]?.id ?? ""); }} className={ROW}>
            <Radio checked={target_column_id === c.id} />
            <span className="flex-1 truncate">{c.title}</span>
          </button>
        ))}
        {status_columns.length === 0 && <div className="px-2.5 py-1.5 text-[12.5px] text-boardtree-text-faint">Add a Status or Label column to this table first.</div>}
      </div>

      {target_column && (
        <>
          <div className={LABEL}>To</div>
          <div className="flex max-h-36 flex-col gap-0.5 overflow-y-auto">
            {(target_column.options ?? []).map((option) => (
              <button key={option.id} type="button" onClick={() => setOptionId(option.id)} className={ROW}>
                <Radio checked={option_id === option.id} />
                <span className="h-3 w-3 flex-none rounded-full" style={{ background: option.color }} />
                <span className="flex-1 truncate">{option.label || "(blank)"}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <button
        type="button"
        disabled={!can_save || is_saving}
        onClick={() =>
          void onSave({
            trigger_type: "person_assigned",
            trigger_column_id: Number(watched_column_id),
            trigger_value: null,
            action_type: "set_column_value",
            action_params: { target_column_id: Number(target_column_id), value: option_id },
          })
        }
        className={SAVE_BUTTON}
      >
        Create automation
      </button>
    </>
  );
}

/** "When a Status/Label changes to X, archive the item" — reuses `StatusChangedForm`'s own column/option picker, paired with the `archive_item` action instead of `move_to_group`. */
function StatusArchiveForm({
  columns, is_saving, onSave,
}: {
  columns: ColumnDef[];
  is_saving: boolean;
  onSave: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => Promise<void>;
}) {
  const trigger_columns = columns.filter((c) => c.kind === "status" || c.kind === "label");
  const [column_id, setColumnId] = useState(trigger_columns[0]?.id ?? "");
  const trigger_column = trigger_columns.find((c) => c.id === column_id);
  const [option_id, setOptionId] = useState(trigger_column?.options?.[0]?.id ?? "");

  const can_save = !!column_id && !!option_id;

  return (
    <>
      <div className={LABEL}>When column</div>
      <div className="flex flex-col gap-0.5">
        {trigger_columns.map((c) => (
          <button key={c.id} type="button" onClick={() => { setColumnId(c.id); setOptionId(c.options?.[0]?.id ?? ""); }} className={ROW}>
            <Radio checked={column_id === c.id} />
            <span className="flex-1 truncate">{c.title}</span>
          </button>
        ))}
        {trigger_columns.length === 0 && <div className="px-2.5 py-1.5 text-[12.5px] text-boardtree-text-faint">Add a Status or Label column to this table first.</div>}
      </div>

      {trigger_column && (
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

      <button
        type="button"
        disabled={!can_save || is_saving}
        onClick={() =>
          void onSave({
            trigger_type: "status_changed",
            trigger_column_id: Number(column_id),
            trigger_value: option_id,
            action_type: "archive_item",
            action_params: {},
          })
        }
        className={SAVE_BUTTON}
      >
        Create automation
      </button>
    </>
  );
}

/** "When a subitem is created, create an item in another table" — pairs the `subitem_created` trigger with the `create_item` action. */
function SubitemCreatedCreateItemForm({
  groups, is_saving, onSave,
}: {
  groups: { id: string; label: string }[];
  is_saving: boolean;
  onSave: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => Promise<void>;
}) {
  const [group_id, setGroupId] = useState(groups[0]?.id ?? "");
  const [item_name, setItemName] = useState("New item");
  const can_save = !!group_id;

  return (
    <>
      <div className={LABEL}>Create an item named</div>
      <input
        value={item_name}
        onChange={(e) => setItemName(e.target.value)}
        className="mb-1 h-9 w-full rounded-[6px] border border-boardtree-border px-2.5 text-[13px] text-boardtree-text outline-none focus:border-boardtree-accent"
      />

      <div className={LABEL}>In table</div>
      <div className="flex max-h-36 flex-col gap-0.5 overflow-y-auto">
        {groups.map((g) => (
          <button key={g.id} type="button" onClick={() => setGroupId(g.id)} className={ROW}>
            <Radio checked={group_id === g.id} />
            <span className="flex-1 truncate">{g.label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!can_save || is_saving}
        onClick={() =>
          void onSave({
            trigger_type: "subitem_created",
            trigger_column_id: null,
            action_type: "create_item",
            action_params: { target_group_id: Number(group_id), item_name: item_name.trim() || "New item" },
          })
        }
        className={SAVE_BUTTON}
      >
        Create automation
      </button>
    </>
  );
}
