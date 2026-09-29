"use client";
import React, { useState } from "react";
import { AlertTriangle, BookmarkPlus, Building2, ChartLine, Code2, Copy, History, PenLine, Trash2, UserRoundCog } from "lucide-react";
import type { BoardAutomationDto, BoardAutomationImportance } from "@/types/board-automation";
import { MoreDotsIcon, RenameIcon } from "@/icons/workspace-icons";
import { useOutsideClick } from "../../table/useOutsideClick";
import { ToggleSwitch, TEXT_FIELD } from "../../automations/automationFormParts";
import { ChannelBadge } from "../../automations/CommunicationTemplateCard";
import { IMPORTANCE_LABELS, type AutomationBuilderContext } from "../../automations/builder/automationCatalog";
import type { SentencePart } from "../../automations/builder/automationSentence";
import { ImportanceIcon } from "../../automations/builder/ImportanceIcon";
import { MiniAvatar } from "../../automations/builder/builderUi";
import { ACTION_LABELS, automationKind, formatDateTime, formatRelativeTime } from "./manageFormat";
import { ICON_BUTTON, MENU_ITEM, MENU_PANEL } from "./manageUi";

/** Everything a card or a row can do to one automation, wired up once by the tab. */
export type AutomationItemActions = {
  onToggle: (automation: BoardAutomationDto) => void;
  onEdit: (automation: BoardAutomationDto) => void;
  onStartRename: (automation_id: number) => void;
  onSubmitRename: (automation: BoardAutomationDto, name: string) => void;
  onCancelRename: () => void;
  onDuplicate: (automation: BoardAutomationDto) => void;
  onSaveAsTemplate: (automation: BoardAutomationDto) => void;
  onShowRuns: (automation: BoardAutomationDto) => void;
  onCopyId: (automation: BoardAutomationDto) => void;
  onChangeImportance: (automation: BoardAutomationDto, importance: BoardAutomationImportance) => void;
  onStartDescription: (automation_id: number) => void;
  onSubmitDescription: (automation: BoardAutomationDto, description: string) => void;
  onCancelDescription: () => void;
  onStartTransfer: (automation_id: number) => void;
  onTransfer: (automation: BoardAutomationDto, user_id: number) => void;
  onCancelTransfer: () => void;
  onRequestDelete: (automation_id: number) => void;
  onConfirmDelete: (automation: BoardAutomationDto) => void;
  onCancelDelete: () => void;
  onShowVersions: (automation_id: number) => void;
  /** Administrators only: publishes the automation as a template for every board. */
  onPublish?: (automation: BoardAutomationDto) => void;
  onToggleSelect: (automation_id: number) => void;
};

export type AutomationItemProps = {
  automation: BoardAutomationDto;
  /** The sentence describing the trigger, conditions and actions, tokens marked for bold. */
  sentence: SentencePart[];
  context: AutomationBuilderContext;
  actions: AutomationItemActions;
  is_busy: boolean;
  is_editing: boolean;
  is_editing_description: boolean;
  is_transferring: boolean;
  is_confirming_delete: boolean;
  is_selected: boolean;
  /** The version history, shown under the automation while open. */
  versions_panel?: React.ReactNode;
};

const NAME_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 1000;

/** The three dots menu of one automation, the same entries as monday's. */
function AutomationMenu({ automation, actions, is_busy }: { automation: BoardAutomationDto; actions: AutomationItemActions; is_busy: boolean }) {
  const [is_open, setIsOpen] = useState(false);
  const ref = useOutsideClick<HTMLDivElement>(is_open, () => setIsOpen(false));

  const pick = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  const entries: { label: string; icon: React.ReactNode; onPick: () => void; is_danger?: boolean; has_divider?: boolean }[] = [
    { label: "Edit", icon: <PenLine size={14} />, onPick: () => actions.onEdit(automation) },
    { label: "Rename", icon: <RenameIcon size={14} />, onPick: () => actions.onStartRename(automation.id) },
    { label: "Duplicate", icon: <Copy size={14} />, onPick: () => actions.onDuplicate(automation) },
    { label: "Save as template", icon: <BookmarkPlus size={14} />, onPick: () => actions.onSaveAsTemplate(automation) },
    { label: "Run history", icon: <ChartLine size={14} />, onPick: () => actions.onShowRuns(automation) },
    { label: "Version history", icon: <History size={14} />, onPick: () => actions.onShowVersions(automation.id) },
    ...(actions.onPublish ? [{ label: "Publish for every board", icon: <Building2 size={14} />, onPick: () => actions.onPublish?.(automation) }] : []),
    { label: "Delete", icon: <Trash2 size={14} />, onPick: () => actions.onRequestDelete(automation.id), is_danger: true },
    { label: "Transfer ownership", icon: <UserRoundCog size={14} />, onPick: () => actions.onStartTransfer(automation.id) },
    { label: "Copy automation ID", icon: <Code2 size={14} />, onPick: () => actions.onCopyId(automation), has_divider: true },
  ];

  return (
    <div ref={ref} className="relative flex-none">
      <button type="button" disabled={is_busy} onClick={() => setIsOpen((open) => !open)} aria-label="Automation actions" aria-haspopup="menu" aria-expanded={is_open} className={`${ICON_BUTTON} !h-8 !w-8`}>
        <MoreDotsIcon size={15} />
      </button>
      {is_open && (
        <div role="menu" className={`${MENU_PANEL} right-0 w-[220px]`}>
          {entries.map((entry) => (
            <React.Fragment key={entry.label}>
              {entry.has_divider && <div className="my-1 border-t border-boardtree-border-soft" />}
              <button type="button" role="menuitem" onClick={() => pick(entry.onPick)} className={`${MENU_ITEM} ${entry.is_danger ? "text-boardtree-danger" : ""}`}>
                {entry.icon}
                {entry.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

/** Minor, Major or Critical, changed straight from the card like monday's importance dropdown. */
function ImportanceMenu({ automation, actions, is_busy }: { automation: BoardAutomationDto; actions: AutomationItemActions; is_busy: boolean }) {
  const [is_open, setIsOpen] = useState(false);
  const ref = useOutsideClick<HTMLDivElement>(is_open, () => setIsOpen(false));
  const importance = automation.importance ?? "minor";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={is_busy}
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={is_open}
        aria-label={`Importance: ${IMPORTANCE_LABELS[importance]}`}
        className={`flex h-7 items-center gap-1.5 rounded-[4px] px-2 text-[12.5px] text-boardtree-text-secondary hover:bg-boardtree-hover ${is_open ? "bg-boardtree-accent-surface" : ""}`}
      >
        <ImportanceIcon importance={importance} />
        {IMPORTANCE_LABELS[importance]}
      </button>
      {is_open && (
        <div role="listbox" aria-label="Importance" className={`${MENU_PANEL} left-0 w-[170px] p-1`}>
          {(Object.keys(IMPORTANCE_LABELS) as BoardAutomationImportance[]).map((level) => (
            <button
              key={level}
              type="button"
              role="option"
              aria-selected={importance === level}
              onClick={() => {
                setIsOpen(false);
                if (level !== importance) actions.onChangeImportance(automation, level);
              }}
              className={`flex h-8 w-full items-center gap-2.5 rounded-[5px] px-2.5 text-left text-[13px] ${importance === level ? "bg-boardtree-accent-surface text-boardtree-text" : "text-boardtree-text hover:bg-boardtree-hover"}`}
            >
              <ImportanceIcon importance={level} />
              {IMPORTANCE_LABELS[level]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** A single line field mounted only while editing, so its draft always starts from the saved text. */
function InlineField({ initial, placeholder, label, max_length, onSubmit, onCancel }: { initial: string; placeholder: string; label: string; max_length: number; onSubmit: (value: string) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(initial);
  return (
    <input
      autoFocus
      value={draft}
      maxLength={max_length}
      placeholder={placeholder}
      aria-label={label}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onSubmit(draft)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSubmit(draft);
        if (event.key === "Escape") onCancel();
      }}
      className={`${TEXT_FIELD} h-8`}
    />
  );
}

/** The sentence with its tokens in bold, like "When **Status** changes to **Done** move item to **Completed**". */
function Sentence({ parts, is_enabled }: { parts: SentencePart[]; is_enabled: boolean }) {
  return (
    <p className={`text-[16px] leading-snug ${is_enabled ? "text-boardtree-text" : "text-boardtree-text-faint"}`}>
      {parts.map((part, index) => (part.is_token ? <strong key={index} className="font-semibold">{part.text}</strong> : <span key={index}>{part.text}</span>))}
    </p>
  );
}

function AutomationTitle({ automation, sentence, actions, is_editing }: Pick<AutomationItemProps, "automation" | "sentence" | "actions" | "is_editing">) {
  if (is_editing) {
    return <InlineField initial={automation.name ?? ""} placeholder="Name this automation" label="Automation name" max_length={NAME_MAX_LENGTH} onSubmit={(name) => actions.onSubmitRename(automation, name)} onCancel={actions.onCancelRename} />;
  }
  return (
    <div className="min-w-0">
      {automation.name && <div className="mb-0.5 truncate text-[12.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint">{automation.name}</div>}
      <Sentence parts={sentence} is_enabled={automation.is_enabled} />
    </div>
  );
}

function OwnerMark({ automation, context }: { automation: BoardAutomationDto; context: AutomationBuilderContext }) {
  const owner = automation.owner ?? automation.created_by;
  if (!owner) return <span className="text-boardtree-text-faint">Unknown</span>;
  const person = context.people.find((entry) => entry.id === String(owner.id));
  return (
    <span className="flex min-w-0 items-center gap-1.5" title={owner.name}>
      {person ? <MiniAvatar initials={person.initials} color={person.color} /> : null}
      <span className="truncate text-boardtree-text-secondary">{owner.name}</span>
    </span>
  );
}

function DescriptionField({ automation, actions, is_editing }: { automation: BoardAutomationDto; actions: AutomationItemActions; is_editing: boolean }) {
  if (is_editing) {
    return (
      <span className="min-w-[220px] flex-1">
        <InlineField
          initial={automation.description ?? ""}
          placeholder="What this automation is for"
          label="Automation description"
          max_length={DESCRIPTION_MAX_LENGTH}
          onSubmit={(description) => actions.onSubmitDescription(automation, description)}
          onCancel={actions.onCancelDescription}
        />
      </span>
    );
  }
  return (
    <button type="button" onClick={() => actions.onStartDescription(automation.id)} className="min-w-0 max-w-[340px] truncate rounded-[4px] px-1 text-left hover:bg-boardtree-hover" title={automation.description ?? "Add description"}>
      {automation.description ? <span className="text-boardtree-text-secondary">{automation.description}</span> : <span className="text-boardtree-text-faint">Add description</span>}
    </button>
  );
}

function TransferPanel({ automation, context, actions, is_busy }: { automation: BoardAutomationDto; context: AutomationBuilderContext; actions: AutomationItemActions; is_busy: boolean }) {
  const current_owner_id = String((automation.owner ?? automation.created_by)?.id ?? "");
  const candidates = context.people.filter((person) => person.id !== current_owner_id);
  const [user_id, setUserId] = useState(candidates[0]?.id ?? "");

  return (
    <div role="dialog" aria-label="Transfer ownership" className="flex flex-wrap items-center gap-2 rounded-[8px] border border-boardtree-border-soft bg-boardtree-panel-alt px-3 py-2">
      <span className="text-[12.5px] text-boardtree-text-secondary">Transfer ownership to</span>
      <select value={user_id} onChange={(event) => setUserId(event.target.value)} aria-label="New owner" className="h-8 min-w-[180px] rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2 text-[12.5px] text-boardtree-text">
        {candidates.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
      </select>
      <div className="ml-auto flex gap-2">
        <button type="button" disabled={is_busy || !user_id} onClick={() => actions.onTransfer(automation, Number(user_id))} className="h-7 rounded-[6px] bg-boardtree-accent px-3 text-[12px] font-medium text-white hover:bg-boardtree-accent-hover disabled:opacity-40">
          Transfer
        </button>
        <button type="button" onClick={actions.onCancelTransfer} className="h-7 rounded-[6px] border border-boardtree-border px-3 text-[12px] text-boardtree-text hover:bg-boardtree-hover">
          Cancel
        </button>
      </div>
    </div>
  );
}

function DeleteConfirm({ automation, actions, is_busy }: { automation: BoardAutomationDto; actions: AutomationItemActions; is_busy: boolean }) {
  return (
    <div role="alertdialog" aria-label="Confirm delete" className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-boardtree-danger/30 bg-boardtree-danger-hover px-3 py-2">
      <span className="text-[12.5px] text-boardtree-text-secondary">Delete this automation? Its run history stays.</span>
      <div className="flex gap-2">
        <button type="button" disabled={is_busy} onClick={() => actions.onConfirmDelete(automation)} className="h-7 rounded-[6px] bg-boardtree-danger px-3 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-40">
          Delete
        </button>
        <button type="button" onClick={actions.onCancelDelete} className="h-7 rounded-[6px] border border-boardtree-border px-3 text-[12px] text-boardtree-text hover:bg-boardtree-hover">
          Cancel
        </button>
      </div>
    </div>
  );
}

/** The email or Slack mark of automations that reach people outside the app, nothing for board actions. */
function KindMark({ automation }: { automation: BoardAutomationDto }) {
  const kind = automationKind(automation);
  if (kind === "board") return null;
  const type = (automation.actions?.length ? automation.actions : [{ type: automation.action_type }]).find((action) => action.type === "send_email" || action.type.startsWith("slack_"))?.type;
  return <ChannelBadge channel={type === "send_email" ? "email" : type === "slack_notify_channel" ? "slack_channel" : "slack_person"} />;
}

const META_LABEL = "text-boardtree-text-faint";

/** Selects the automation for the bulk actions. */
function SelectBox({ automation, actions, is_selected }: { automation: BoardAutomationDto; actions: AutomationItemActions; is_selected: boolean }) {
  return (
    <input
      type="checkbox"
      checked={is_selected}
      onChange={() => actions.onToggleSelect(automation.id)}
      aria-label={`Select ${automation.name || "automation"} ${automation.id}`}
      className="h-4 w-4 flex-none cursor-pointer accent-boardtree-accent"
    />
  );
}

/** What else the card says about how the automation behaves: an else branch, a wait. */
function BehaviorBadges({ automation }: { automation: BoardAutomationDto }) {
  const has_wait = [...(automation.actions ?? []), ...(automation.else_actions ?? [])].some((action) => action.type === "wait");
  const badges = [automation.else_actions?.length ? "Otherwise branch" : null, has_wait ? "Waits" : null, automation.condition_groups?.length ? "Condition groups" : null].filter(Boolean) as string[];
  if (badges.length === 0) return null;
  return (
    <>
      {badges.map((badge) => (
        <span key={badge} className="rounded-full bg-boardtree-hover px-2 py-0.5 text-[11px] text-boardtree-text-secondary">{badge}</span>
      ))}
    </>
  );
}

/**
 * How healthy the automation is: paused by itself (with why), or failing several runs in a row.
 * Nothing when it runs fine.
 */
export function HealthBadge({ automation }: { automation: BoardAutomationDto }) {
  const failures = automation.consecutive_failures ?? 0;
  if (!automation.is_enabled && automation.paused_at) {
    return (
      <span title={automation.paused_reason ?? undefined} className="flex max-w-[360px] items-center gap-1 truncate rounded-full bg-boardtree-danger-hover px-2 py-0.5 text-[11px] text-boardtree-danger">
        <AlertTriangle size={11} className="flex-none" />
        <span className="truncate">Paused{automation.paused_reason ? `: ${automation.paused_reason}` : ""}</span>
      </span>
    );
  }
  if (failures === 0) return null;
  return (
    <span title={automation.last_failed_at ? `Last failed ${formatDateTime(automation.last_failed_at)}` : undefined} className="flex items-center gap-1 rounded-full bg-[#fff0d9] px-2 py-0.5 text-[11px] text-[#9a5b00] dark:bg-[#3a2a10] dark:text-[#f5b85c]">
      <AlertTriangle size={11} className="flex-none" />
      {failures === 1 ? "Last run failed" : `Failed ${failures} runs in a row`}
    </span>
  );
}

/** One automation as a wide card, monday's "Manage your board automations" layout. */
export function AutomationCard(props: AutomationItemProps) {
  const { automation, sentence, context, actions, is_busy, is_editing, is_editing_description, is_transferring, is_confirming_delete, is_selected, versions_panel } = props;
  return (
    <div className={`rounded-[10px] border bg-boardtree-surface px-5 py-4 transition-shadow hover:shadow-[0_4px_14px_rgba(30,34,55,0.08)] ${is_selected ? "border-boardtree-accent/60" : "border-boardtree-border-soft"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="pt-1">
          <SelectBox automation={automation} actions={actions} is_selected={is_selected} />
        </div>
        <div className="min-w-0 flex-1">
          <AutomationTitle automation={automation} sentence={sentence} actions={actions} is_editing={is_editing} />
          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px]">
            <ImportanceMenu automation={automation} actions={actions} is_busy={is_busy} />
            <span className="flex items-center gap-1.5" title={formatDateTime(automation.updated_at)}>
              <span className={META_LABEL}>Updated</span>
              <span className="text-boardtree-text-secondary">{formatRelativeTime(automation.updated_at ?? automation.created_at)}</span>
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <span className={META_LABEL}>Owner</span>
              <OwnerMark automation={automation} context={context} />
            </span>
            <span className="flex items-center gap-1.5" title={formatDateTime(automation.last_run_at)}>
              <span className={META_LABEL}>Runs</span>
              <span className="text-boardtree-text-secondary">{automation.run_count}</span>
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className={META_LABEL}>Description</span>
              <DescriptionField automation={automation} actions={actions} is_editing={is_editing_description} />
            </span>
            <KindMark automation={automation} />
            <BehaviorBadges automation={automation} />
            <HealthBadge automation={automation} />
          </div>
        </div>
        <div className="flex flex-none items-center gap-2 pt-1">
          <ToggleSwitch checked={automation.is_enabled} disabled={is_busy} onToggle={() => actions.onToggle(automation)} />
          <AutomationMenu automation={automation} actions={actions} is_busy={is_busy} />
        </div>
      </div>
      {(is_transferring || is_confirming_delete || versions_panel) && (
        <div className="mt-3 flex flex-col gap-2">
          {is_transferring && <TransferPanel automation={automation} context={context} actions={actions} is_busy={is_busy} />}
          {is_confirming_delete && <DeleteConfirm automation={automation} actions={actions} is_busy={is_busy} />}
          {versions_panel}
        </div>
      )}
    </div>
  );
}

/** The columns of the list layout, shared by the header row and every automation row. */
export const ROW_GRID = "grid grid-cols-[20px_44px_minmax(0,1fr)_110px_120px_140px_70px_120px_36px] items-center gap-3";

/** One automation as a table row, the compact list layout of the Manage tab. */
export function AutomationRow(props: AutomationItemProps) {
  const { automation, sentence, context, actions, is_busy, is_editing, is_transferring, is_confirming_delete, is_selected, versions_panel } = props;
  const first_action = automation.actions?.[0]?.type ?? automation.action_type;
  const extra_actions = Math.max(0, (automation.actions?.length ?? 1) - 1);
  return (
    <div className="border-b border-boardtree-border-soft px-4 py-3 last:border-b-0">
      <div className={ROW_GRID}>
        <SelectBox automation={automation} actions={actions} is_selected={is_selected} />
        <ToggleSwitch checked={automation.is_enabled} disabled={is_busy} onToggle={() => actions.onToggle(automation)} />
        <div className="min-w-0">
          <AutomationTitle automation={automation} sentence={sentence} actions={actions} is_editing={is_editing} />
          <div className="mt-1 flex empty:hidden">
            <HealthBadge automation={automation} />
          </div>
        </div>
        <ImportanceMenu automation={automation} actions={actions} is_busy={is_busy} />
        <span className="truncate text-[12.5px] text-boardtree-text-secondary">
          {ACTION_LABELS[first_action]}
          {extra_actions > 0 && <span className="text-boardtree-text-faint"> +{extra_actions}</span>}
        </span>
        <span className="min-w-0 text-[12.5px]"><OwnerMark automation={automation} context={context} /></span>
        <span className="text-[12.5px] text-boardtree-text-secondary">{automation.run_count}</span>
        <span className="truncate text-[12.5px] text-boardtree-text-secondary" title={formatDateTime(automation.last_run_at)}>{formatRelativeTime(automation.last_run_at)}</span>
        <AutomationMenu automation={automation} actions={actions} is_busy={is_busy} />
      </div>
      {(is_transferring || is_confirming_delete || versions_panel) && (
        <div className="mt-2 flex flex-col gap-2">
          {is_transferring && <TransferPanel automation={automation} context={context} actions={actions} is_busy={is_busy} />}
          {is_confirming_delete && <DeleteConfirm automation={automation} actions={actions} is_busy={is_busy} />}
          {versions_panel}
        </div>
      )}
    </div>
  );
}
