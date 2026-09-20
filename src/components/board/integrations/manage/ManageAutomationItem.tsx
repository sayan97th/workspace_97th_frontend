"use client";
import React, { useState } from "react";
import type { BoardAutomationDto } from "@/types/board-automation";
import { DeleteIcon, DuplicateIcon, MoreDotsIcon, RenameIcon } from "@/icons/workspace-icons";
import { useOutsideClick } from "../../table/useOutsideClick";
import { ToggleSwitch, TEXT_FIELD } from "../../automations/automationFormParts";
import { ChannelBadge } from "../../automations/CommunicationTemplateCard";
import { AUTOMATION_KIND_LABELS, ACTION_LABELS, automationKind, formatDateTime, formatRelativeTime } from "./manageFormat";
import { ICON_BUTTON, MENU_ITEM, MENU_PANEL } from "./manageUi";

/** Everything a card or a row can do to one automation, wired up once by the tab. */
export type AutomationItemActions = {
  onToggle: (automation: BoardAutomationDto) => void;
  onStartRename: (automation_id: number) => void;
  onSubmitRename: (automation: BoardAutomationDto, name: string) => void;
  onCancelRename: () => void;
  onDuplicate: (automation: BoardAutomationDto) => void;
  onRequestDelete: (automation_id: number) => void;
  onConfirmDelete: (automation: BoardAutomationDto) => void;
  onCancelDelete: () => void;
};

export type AutomationItemProps = {
  automation: BoardAutomationDto;
  /** The plain English sentence describing the trigger and the action. */
  sentence: string;
  actions: AutomationItemActions;
  is_busy: boolean;
  is_editing: boolean;
  is_confirming_delete: boolean;
};

const NAME_MAX_LENGTH = 255;

/** The three dots menu of one automation: rename, duplicate, delete. */
function AutomationMenu({ automation, actions, is_busy }: { automation: BoardAutomationDto; actions: AutomationItemActions; is_busy: boolean }) {
  const [is_open, setIsOpen] = useState(false);
  const ref = useOutsideClick<HTMLDivElement>(is_open, () => setIsOpen(false));

  const pick = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div ref={ref} className="relative flex-none">
      <button type="button" disabled={is_busy} onClick={() => setIsOpen((open) => !open)} aria-label="Automation actions" aria-haspopup="menu" aria-expanded={is_open} className={`${ICON_BUTTON} !h-8 !w-8`}>
        <MoreDotsIcon size={15} />
      </button>
      {is_open && (
        <div role="menu" className={`${MENU_PANEL} right-0 w-[170px]`}>
          <button type="button" role="menuitem" onClick={() => pick(() => actions.onStartRename(automation.id))} className={MENU_ITEM}>
            <RenameIcon size={14} />
            Rename
          </button>
          <button type="button" role="menuitem" onClick={() => pick(() => actions.onDuplicate(automation))} className={MENU_ITEM}>
            <DuplicateIcon size={14} />
            Duplicate
          </button>
          <button type="button" role="menuitem" onClick={() => pick(() => actions.onRequestDelete(automation.id))} className={`${MENU_ITEM} text-boardtree-danger`}>
            <DeleteIcon size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/** The rename field, mounted only while editing so its draft always starts from the current name. */
function RenameField({ automation, actions }: { automation: BoardAutomationDto; actions: AutomationItemActions }) {
  const [draft, setDraft] = useState(automation.name ?? "");

  return (
    <input
      autoFocus
      value={draft}
      maxLength={NAME_MAX_LENGTH}
      placeholder="Name this automation"
      aria-label="Automation name"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => actions.onSubmitRename(automation, draft)}
      onKeyDown={(event) => {
        if (event.key === "Enter") actions.onSubmitRename(automation, draft);
        if (event.key === "Escape") actions.onCancelRename();
      }}
      className={`${TEXT_FIELD} h-8`}
    />
  );
}

/** The automation's own name when it has one, always followed by the sentence. Turns into a text field while renaming. */
function AutomationTitle({ automation, sentence, actions, is_editing }: Pick<AutomationItemProps, "automation" | "sentence" | "actions" | "is_editing">) {
  if (is_editing) return <RenameField automation={automation} actions={actions} />;

  return (
    <div className="min-w-0">
      {automation.name && <div className="truncate text-[13.5px] font-semibold text-boardtree-text">{automation.name}</div>}
      <div className={`text-[13px] leading-snug ${automation.name ? "text-boardtree-text-muted" : "text-boardtree-text"}`}>{sentence}</div>
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

/** The email, Slack or board action mark, reusing the strip on the template cards. */
function KindMark({ automation }: { automation: BoardAutomationDto }) {
  const kind = automationKind(automation.action_type);
  if (kind === "board") return <span className="text-[12px] font-medium text-boardtree-text-faint">{AUTOMATION_KIND_LABELS.board}</span>;
  return <ChannelBadge channel={kind === "email" ? "email" : automation.action_type === "slack_notify_channel" ? "slack_channel" : "slack_person"} />;
}

/** One automation as a card, the grid layout of the Manage tab. */
export function AutomationCard({ automation, sentence, actions, is_busy, is_editing, is_confirming_delete }: AutomationItemProps) {
  return (
    <div className={`flex flex-col gap-3 rounded-[10px] border border-boardtree-border-soft bg-boardtree-surface p-3.5 transition-shadow hover:shadow-[0_4px_14px_rgba(30,34,55,0.08)] ${automation.is_enabled ? "" : "opacity-80"}`}>
      <div className="flex items-center justify-between gap-2">
        <KindMark automation={automation} />
        <AutomationMenu automation={automation} actions={actions} is_busy={is_busy} />
      </div>

      <AutomationTitle automation={automation} sentence={sentence} actions={actions} is_editing={is_editing} />

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
        <dt className="text-boardtree-text-faint">Created by</dt>
        <dd className="truncate text-right text-boardtree-text-secondary">{automation.created_by?.name ?? "Unknown"}</dd>
        <dt className="text-boardtree-text-faint">Runs</dt>
        <dd className="text-right text-boardtree-text-secondary">{automation.run_count}</dd>
        <dt className="text-boardtree-text-faint">Last run</dt>
        <dd className="text-right text-boardtree-text-secondary" title={formatDateTime(automation.last_run_at)}>{formatRelativeTime(automation.last_run_at)}</dd>
      </dl>

      {is_confirming_delete && <DeleteConfirm automation={automation} actions={actions} is_busy={is_busy} />}

      <div className="mt-auto flex items-center gap-2 border-t border-boardtree-border-soft pt-3">
        <ToggleSwitch checked={automation.is_enabled} disabled={is_busy} onToggle={() => actions.onToggle(automation)} />
        <span className="text-[12px] text-boardtree-text-muted">{automation.is_enabled ? "Enabled" : "Disabled"}</span>
      </div>
    </div>
  );
}

/** The columns of the list layout, shared by the header row and every automation row. */
export const ROW_GRID = "grid grid-cols-[44px_minmax(0,1fr)_120px_140px_70px_120px_36px] items-center gap-3";

/** One automation as a table row, the list layout of the Manage tab. */
export function AutomationRow({ automation, sentence, actions, is_busy, is_editing, is_confirming_delete }: AutomationItemProps) {
  return (
    <div className={`border-b border-boardtree-border-soft px-4 py-3 last:border-b-0 ${automation.is_enabled ? "" : "opacity-80"}`}>
      <div className={ROW_GRID}>
        <ToggleSwitch checked={automation.is_enabled} disabled={is_busy} onToggle={() => actions.onToggle(automation)} />
        <AutomationTitle automation={automation} sentence={sentence} actions={actions} is_editing={is_editing} />
        <span className="truncate text-[12.5px] text-boardtree-text-secondary">{ACTION_LABELS[automation.action_type]}</span>
        <span className="truncate text-[12.5px] text-boardtree-text-secondary">{automation.created_by?.name ?? "Unknown"}</span>
        <span className="text-[12.5px] text-boardtree-text-secondary">{automation.run_count}</span>
        <span className="truncate text-[12.5px] text-boardtree-text-secondary" title={formatDateTime(automation.last_run_at)}>{formatRelativeTime(automation.last_run_at)}</span>
        <AutomationMenu automation={automation} actions={actions} is_busy={is_busy} />
      </div>
      {is_confirming_delete && (
        <div className="mt-2">
          <DeleteConfirm automation={automation} actions={actions} is_busy={is_busy} />
        </div>
      )}
    </div>
  );
}
