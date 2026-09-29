"use client";
import React, { useEffect, useMemo, useState } from "react";
import type { BoardAutomationBulkAction, BoardAutomationCopyResult, BoardAutomationDto, UpdateBoardAutomationPayload } from "@/types/board-automation";
import { boardAutomationService } from "@/services/board-automation.service";
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
import BulkActionBar from "./BulkActionBar";
import VersionHistoryPanel from "./VersionHistoryPanel";

export type ManageAutomationsTabProps = {
  board_id: number;
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
  /** Administrators only: publishes an automation as a template for every board. */
  onPublishAccountTemplate?: (automation_id: number, name: string) => Promise<void>;
  /** Replaces one automation after a restored version. */
  onReplaceAutomation?: (automation: BoardAutomationDto) => void;
  /** Reloads the list after bulk changes. */
  onReloadAutomations?: () => Promise<void>;
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
  const { board_id, board_label, automations, context, onToggle, onUpdate, onDuplicate, onDelete, onEdit, onSaveAsTemplate, onShowRuns, onExploreTemplates, onPublishAccountTemplate, onReplaceAutomation, onReloadAutomations } = props;
  const [selected_ids, setSelectedIds] = useState<number[]>([]);
  const [versions_id, setVersionsId] = useState<number | null>(null);
  const [is_bulk_busy, setIsBulkBusy] = useState(false);
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
    onShowVersions: (automation_id) => {
      closeInlineEditors();
      setVersionsId((current) => (current === automation_id ? null : automation_id));
    },
    onPublish: onPublishAccountTemplate
      ? (automation) => {
          const sentence = rows.find((row) => row.automation.id === automation.id)?.sentence ?? "Automation";
          const name = automation.name || (sentence.length > 80 ? `${sentence.slice(0, 79)}...` : sentence);
          void perform(automation.id, () => onPublishAccountTemplate(automation.id, name), "The template could not be published.", "Published for every board. Find it in Create > Created in your account.");
        }
      : undefined,
    onToggleSelect: (automation_id) => setSelectedIds((current) => (current.includes(automation_id) ? current.filter((id) => id !== automation_id) : [...current, automation_id])),
  };

  // Automations deleted elsewhere drop out of the selection.
  const live_selected_ids = selected_ids.filter((id) => automations.some((automation) => automation.id === id));
  const visible_ids = visible_rows.map(({ automation }) => automation.id);
  const is_all_visible_selected = visible_ids.length > 0 && visible_ids.every((id) => live_selected_ids.includes(id));

  const runBulk = async (action: BoardAutomationBulkAction) => {
    setIsBulkBusy(true);
    setActionError(null);
    try {
      const result = await boardAutomationService.bulkUpdate(board_id, live_selected_ids, action);
      await onReloadAutomations?.();
      setNotice(result.skipped.length ? `${result.message} ${result.skipped.length} stayed off: ${result.skipped[0].message}` : result.message);
      if (action === "delete") setSelectedIds([]);
    } catch (failure) {
      setActionError(apiErrorMessage(failure, "The automations could not be updated."));
    } finally {
      setIsBulkBusy(false);
    }
  };

  const copyToBoard = async (target_board_id: number): Promise<BoardAutomationCopyResult | null> => {
    setIsBulkBusy(true);
    setActionError(null);
    try {
      return await boardAutomationService.copyToBoard(board_id, live_selected_ids, target_board_id);
    } catch (failure) {
      setActionError(apiErrorMessage(failure, "The automations could not be copied."));
      return null;
    } finally {
      setIsBulkBusy(false);
    }
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
    is_selected: live_selected_ids.includes(automation.id),
    versions_panel:
      versions_id === automation.id ? (
        <VersionHistoryPanel
          board_id={board_id}
          automation={automation}
          context={context}
          onRestored={(restored) => {
            onReplaceAutomation?.(restored);
            setNotice("Version restored.");
          }}
          onClose={() => setVersionsId(null)}
        />
      ) : undefined,
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
        <label className="flex h-9 items-center gap-2 px-2 text-[12.5px] text-boardtree-text-secondary">
          <input
            type="checkbox"
            checked={is_all_visible_selected}
            onChange={() => setSelectedIds(is_all_visible_selected ? live_selected_ids.filter((id) => !visible_ids.includes(id)) : Array.from(new Set([...live_selected_ids, ...visible_ids])))}
            disabled={visible_ids.length === 0}
            className="h-4 w-4 accent-boardtree-accent"
          />
          Select all
        </label>

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

      {live_selected_ids.length > 0 && (
        <BulkActionBar board_id={board_id} selected_count={live_selected_ids.length} is_busy={is_bulk_busy} onBulk={(action) => void runBulk(action)} onCopy={copyToBoard} onClear={() => setSelectedIds([])} />
      )}
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
          <div className="min-w-[930px]">
            <div className={`${ROW_GRID} border-b border-boardtree-border-soft px-4 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint`}>
              <span className="sr-only">Selected</span>
              <span className="sr-only">Enabled</span>
              <span>Automation</span>
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
