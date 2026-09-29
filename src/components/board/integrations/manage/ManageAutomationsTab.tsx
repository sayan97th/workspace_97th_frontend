"use client";
import React, { useEffect, useMemo, useState } from "react";
import type { BoardAutomationDto, UpdateBoardAutomationPayload } from "@/types/board-automation";
import { DownloadIcon, GridViewToggleIcon, ListViewToggleIcon } from "@/icons/board-icons";
import { SearchIcon } from "@/icons/workspace-icons";
import { downloadCsv } from "@/lib/csv-export";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { describeAutomationParts } from "../../automations/automationDescriptions";
import { IMPORTANCE_LABELS, type AutomationBuilderContext } from "../../automations/builder/automationCatalog";
import { sentenceText } from "../../automations/builder/automationSentence";
import AutomationFilterMenu, { NO_FILTERS, countActiveFilters, type AutomationFilters } from "./AutomationFilterMenu";
import { AutomationCard, AutomationRow, ROW_GRID, type AutomationItemActions } from "./ManageAutomationItem";
import { ACTION_LABELS, AUTOMATION_KIND_LABELS, automationActionTypes, automationKind, automationSearchText, formatDateTime } from "./manageFormat";
import { ICON_BUTTON, InlineAlert, ManageEmptyState } from "./manageUi";

export type ManageAutomationsTabProps = {
  board_label: string;
  automations: BoardAutomationDto[];
  context: AutomationBuilderContext;
  onToggle: (automation_id: number, is_enabled: boolean) => Promise<void>;
  /** Rename, importance, description and ownership changes. */
  onUpdate: (automation_id: number, payload: UpdateBoardAutomationPayload) => Promise<void>;
  onDuplicate: (automation_id: number) => Promise<void>;
  onDelete: (automation_id: number) => Promise<void>;
  /** Opens the automation in the sentence builder. */
  onEdit: (automation: BoardAutomationDto) => void;
  onSaveAsTemplate: (automation_id: number, name: string) => Promise<void>;
  /** Opens the Run history tab narrowed to one automation. */
  onShowRuns: (automation_id: number) => void;
  onExploreTemplates: () => void;
};

type Layout = "cards" | "list";

const LAYOUT_STORAGE_KEY = "manage_automations_layout";
const NOTICE_MS = 3000;

/** The remembered layout, falling back to cards when storage is empty or blocked. */
function readStoredLayout(): Layout {
  try {
    return window.localStorage.getItem(LAYOUT_STORAGE_KEY) === "list" ? "list" : "cards";
  } catch {
    return "cards";
  }
}

const fileSlug = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "board";

/**
 * Manage > Automations. Search and filter every automation on this table, switch between the card
 * and list layouts, export what is shown, and edit, enable, rename, duplicate, save as template,
 * transfer or delete each one, like monday's "Manage your board automations".
 */
export default function ManageAutomationsTab(props: ManageAutomationsTabProps) {
  const { board_label, automations, context, onToggle, onUpdate, onDuplicate, onDelete, onEdit, onSaveAsTemplate, onShowRuns, onExploreTemplates } = props;
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<AutomationFilters>(NO_FILTERS);
  const [layout, setLayout] = useState<Layout>(readStoredLayout);
  const [editing_id, setEditingId] = useState<number | null>(null);
  const [describing_id, setDescribingId] = useState<number | null>(null);
  const [transferring_id, setTransferringId] = useState<number | null>(null);
  const [confirming_delete_id, setConfirmingDeleteId] = useState<number | null>(null);
  const [busy_id, setBusyId] = useState<number | null>(null);
  const [action_error, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const rows = useMemo(
    () => automations.map((automation) => {
      const parts = describeAutomationParts(automation, context);
      return { automation, parts, sentence: sentenceText(parts) };
    }),
    [automations, context]
  );

  const search_text = search.trim().toLowerCase();
  const visible_rows = rows.filter(({ automation, sentence }) => {
    if (filters.status === "enabled" && !automation.is_enabled) return false;
    if (filters.status === "disabled" && automation.is_enabled) return false;
    if (filters.kind !== "all" && automationKind(automation) !== filters.kind) return false;
    if (filters.importance !== "all" && (automation.importance ?? "minor") !== filters.importance) return false;
    return automationSearchText(automation, sentence).includes(search_text);
  });
  const is_narrowed = search_text !== "" || countActiveFilters(filters) > 0;

  const changeLayout = (next_layout: Layout) => {
    setLayout(next_layout);
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, next_layout);
    } catch {
      // The layout is a convenience, it still applies for this session.
    }
  };

  const clearNarrowing = () => {
    setSearch("");
    setFilters(NO_FILTERS);
  };

  const closeInlineEditors = () => {
    setEditingId(null);
    setDescribingId(null);
    setTransferringId(null);
    setConfirmingDeleteId(null);
  };

  const perform = async (automation_id: number, action: () => Promise<void>, fallback_message: string, success_notice?: string) => {
    setBusyId(automation_id);
    setActionError(null);
    try {
      await action();
      if (success_notice) setNotice(success_notice);
    } catch (failure) {
      setActionError(apiErrorMessage(failure, fallback_message));
    } finally {
      setBusyId(null);
    }
  };

  const actions: AutomationItemActions = {
    onToggle: (automation) => void perform(automation.id, () => onToggle(automation.id, !automation.is_enabled), "The automation could not be updated."),
    onEdit: (automation) => onEdit(automation),
    onStartRename: (automation_id) => {
      closeInlineEditors();
      setEditingId(automation_id);
    },
    onSubmitRename: (automation, name) => {
      // Enter, Escape and blur can all land here for one edit, only the first counts.
      if (editing_id !== automation.id) return;
      setEditingId(null);
      const next_name = name.trim();
      if (next_name === (automation.name ?? "")) return;
      void perform(automation.id, () => onUpdate(automation.id, { name: next_name || null }), "The automation could not be renamed.");
    },
    onCancelRename: () => setEditingId(null),
    onDuplicate: (automation) => void perform(automation.id, () => onDuplicate(automation.id), "The automation could not be duplicated.", "Duplicated. The copy starts turned off."),
    onSaveAsTemplate: (automation) => {
      const sentence = rows.find((row) => row.automation.id === automation.id)?.sentence ?? "Saved automation";
      const name = automation.name || (sentence.length > 80 ? `${sentence.slice(0, 79)}...` : sentence);
      void perform(automation.id, () => onSaveAsTemplate(automation.id, name), "The template could not be saved.", "Saved as a template. Find it in Create > Saved templates.");
    },
    onShowRuns: (automation) => onShowRuns(automation.id),
    onCopyId: (automation) => {
      const text = String(automation.id);
      const copy = navigator.clipboard?.writeText(text);
      if (!copy) {
        setNotice(`Automation ID: ${text}`);
        return;
      }
      copy.then(() => setNotice(`Automation ID ${text} copied.`)).catch(() => setNotice(`Automation ID: ${text}`));
    },
    onChangeImportance: (automation, importance) =>
      void perform(automation.id, () => onUpdate(automation.id, { importance }), "The importance could not be changed.", `Marked as ${IMPORTANCE_LABELS[importance]}.`),
    onStartDescription: (automation_id) => {
      closeInlineEditors();
      setDescribingId(automation_id);
    },
    onSubmitDescription: (automation, description) => {
      if (describing_id !== automation.id) return;
      setDescribingId(null);
      const next = description.trim();
      if (next === (automation.description ?? "")) return;
      void perform(automation.id, () => onUpdate(automation.id, { description: next || null }), "The description could not be saved.");
    },
    onCancelDescription: () => setDescribingId(null),
    onStartTransfer: (automation_id) => {
      closeInlineEditors();
      setTransferringId(automation_id);
    },
    onTransfer: (automation, user_id) =>
      void perform(
        automation.id,
        async () => {
          await onUpdate(automation.id, { owner_id: user_id });
          setTransferringId(null);
        },
        "The ownership could not be transferred.",
        "Ownership transferred."
      ),
    onCancelTransfer: () => setTransferringId(null),
    onRequestDelete: (automation_id) => {
      closeInlineEditors();
      setConfirmingDeleteId(automation_id);
    },
    onConfirmDelete: (automation) =>
      void perform(
        automation.id,
        async () => {
          await onDelete(automation.id);
          setConfirmingDeleteId(null);
        },
        "The automation could not be deleted."
      ),
    onCancelDelete: () => setConfirmingDeleteId(null),
  };

  const exportCsv = () => {
    downloadCsv(
      `automations-${fileSlug(board_label)}.csv`,
      ["ID", "Name", "Automation", "Description", "Importance", "Type", "Actions", "Status", "Owner", "Runs", "Last run", "Updated"],
      visible_rows.map(({ automation, sentence }) => [
        String(automation.id),
        automation.name ?? "",
        sentence,
        automation.description ?? "",
        IMPORTANCE_LABELS[automation.importance ?? "minor"],
        AUTOMATION_KIND_LABELS[automationKind(automation)],
        automationActionTypes(automation).map((type) => ACTION_LABELS[type]).join(", "),
        automation.is_enabled ? "Enabled" : "Disabled",
        automation.owner?.name ?? automation.created_by?.name ?? "",
        String(automation.run_count),
        automation.last_run_at ? formatDateTime(automation.last_run_at) : "",
        automation.updated_at ? formatDateTime(automation.updated_at) : "",
      ])
    );
  };

  if (automations.length === 0) {
    return (
      <ManageEmptyState title="Create your first automation to save time" description="Start from a template or build your own sentence.">
        <button type="button" onClick={onExploreTemplates} className="h-9 rounded-[6px] border border-boardtree-border px-4 text-[13.5px] text-boardtree-text hover:bg-boardtree-hover">
          Explore templates
        </button>
      </ManageEmptyState>
    );
  }

  const item_props = (automation: BoardAutomationDto, parts: ReturnType<typeof describeAutomationParts>) => ({
    automation,
    sentence: parts,
    context,
    actions,
    is_busy: busy_id === automation.id,
    is_editing: editing_id === automation.id,
    is_editing_description: describing_id === automation.id,
    is_transferring: transferring_id === automation.id,
    is_confirming_delete: confirming_delete_id === automation.id,
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative w-full max-w-[420px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-boardtree-text-faint"><SearchIcon size={14} /></span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            aria-label="Search automations"
            className="h-9 w-full rounded-[4px] border border-boardtree-border bg-boardtree-surface pl-9 pr-3 text-[13px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint focus:border-boardtree-accent"
          />
        </label>
        <AutomationFilterMenu filters={filters} onChange={setFilters} />

        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={exportCsv} disabled={visible_rows.length === 0} aria-label="Export automations as CSV" title="Export as CSV" className={ICON_BUTTON}>
            <DownloadIcon size={16} />
          </button>
          <div role="group" aria-label="Layout" className="flex overflow-hidden rounded-[6px] border border-boardtree-border">
            <button type="button" onClick={() => changeLayout("cards")} aria-pressed={layout === "cards"} aria-label="Card layout" className={`flex h-8 w-9 items-center justify-center ${layout === "cards" ? "bg-boardtree-accent-surface text-boardtree-accent" : "text-boardtree-text-muted hover:bg-boardtree-hover"}`}>
              <GridViewToggleIcon size={15} />
            </button>
            <button type="button" onClick={() => changeLayout("list")} aria-pressed={layout === "list"} aria-label="List layout" className={`flex h-8 w-9 items-center justify-center ${layout === "list" ? "bg-boardtree-accent-surface text-boardtree-accent" : "text-boardtree-text-muted hover:bg-boardtree-hover"}`}>
              <ListViewToggleIcon size={15} />
            </button>
          </div>
        </div>
      </div>

      {action_error && <InlineAlert message={action_error} onDismiss={() => setActionError(null)} />}
      {notice && (
        <div role="status" className="mb-3 rounded-[8px] border border-[#00c875]/30 bg-[#00c875]/[0.08] px-3 py-2 text-[12.5px] text-boardtree-text-secondary">
          {notice}
        </div>
      )}

      {visible_rows.length === 0 ? (
        <div className="py-12 text-center text-[13.5px] text-boardtree-text-muted">
          No automations match your search.{" "}
          {is_narrowed && <button type="button" onClick={clearNarrowing} className="font-medium text-boardtree-accent hover:underline">Clear search and filters</button>}
        </div>
      ) : layout === "cards" ? (
        <div className="flex flex-col gap-3">
          {visible_rows.map(({ automation, parts }) => (
            <AutomationCard key={automation.id} {...item_props(automation, parts)} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-boardtree-border-soft bg-boardtree-surface">
          <div className="min-w-[900px]">
            <div className={`${ROW_GRID} border-b border-boardtree-border-soft px-4 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint`}>
              <span className="sr-only">Enabled</span>
              <span className="col-start-2">Automation</span>
              <span>Importance</span>
              <span>Action</span>
              <span>Owner</span>
              <span>Runs</span>
              <span>Last run</span>
              <span className="sr-only">Actions</span>
            </div>
            {visible_rows.map(({ automation, parts }) => (
              <AutomationRow key={automation.id} {...item_props(automation, parts)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
