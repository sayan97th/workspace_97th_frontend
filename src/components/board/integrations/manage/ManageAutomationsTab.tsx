"use client";
import React, { useMemo, useState } from "react";
import type { ColumnDef, PersonDef } from "../../table/types";
import type { BoardAutomationDto } from "@/types/board-automation";
import { DownloadIcon, GridViewToggleIcon, ListViewToggleIcon } from "@/icons/board-icons";
import { SearchIcon } from "@/icons/workspace-icons";
import { downloadCsv } from "@/lib/csv-export";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { describeAutomation, type NamedOption } from "../../automations/automationDescriptions";
import AutomationFilterMenu, { NO_FILTERS, countActiveFilters, type AutomationFilters } from "./AutomationFilterMenu";
import { AutomationCard, AutomationRow, ROW_GRID, type AutomationItemActions } from "./ManageAutomationItem";
import { ACTION_LABELS, AUTOMATION_KIND_LABELS, automationKind, automationSearchText, formatDateTime } from "./manageFormat";
import { ICON_BUTTON, InlineAlert, ManageEmptyState } from "./manageUi";

export type ManageAutomationsTabProps = {
  board_label: string;
  automations: BoardAutomationDto[];
  columns: ColumnDef[];
  groups: NamedOption[];
  people: PersonDef[];
  onToggle: (automation_id: number, is_enabled: boolean) => Promise<void>;
  onRename: (automation_id: number, name: string | null) => Promise<void>;
  onDuplicate: (automation_id: number) => Promise<void>;
  onDelete: (automation_id: number) => Promise<void>;
  onExploreTemplates: () => void;
};

type Layout = "cards" | "list";

const LAYOUT_STORAGE_KEY = "manage_automations_layout";

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
 * and list layouts, export what is shown, and enable, rename, duplicate or delete each one.
 */
export default function ManageAutomationsTab({ board_label, automations, columns, groups, people, onToggle, onRename, onDuplicate, onDelete, onExploreTemplates }: ManageAutomationsTabProps) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<AutomationFilters>(NO_FILTERS);
  const [layout, setLayout] = useState<Layout>(readStoredLayout);
  const [editing_id, setEditingId] = useState<number | null>(null);
  const [confirming_delete_id, setConfirmingDeleteId] = useState<number | null>(null);
  const [busy_id, setBusyId] = useState<number | null>(null);
  const [action_error, setActionError] = useState<string | null>(null);

  const rows = useMemo(
    () => automations.map((automation) => ({ automation, sentence: describeAutomation(automation, columns, groups, people) })),
    [automations, columns, groups, people]
  );

  const search_text = search.trim().toLowerCase();
  const visible_rows = rows.filter(({ automation, sentence }) => {
    if (filters.status === "enabled" && !automation.is_enabled) return false;
    if (filters.status === "disabled" && automation.is_enabled) return false;
    if (filters.kind !== "all" && automationKind(automation.action_type) !== filters.kind) return false;
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

  const perform = async (automation_id: number, action: () => Promise<void>, fallback_message: string) => {
    setBusyId(automation_id);
    setActionError(null);
    try {
      await action();
    } catch (failure) {
      setActionError(apiErrorMessage(failure, fallback_message));
    } finally {
      setBusyId(null);
    }
  };

  const actions: AutomationItemActions = {
    onToggle: (automation) => void perform(automation.id, () => onToggle(automation.id, !automation.is_enabled), "The automation could not be updated."),
    onStartRename: (automation_id) => {
      setConfirmingDeleteId(null);
      setEditingId(automation_id);
    },
    onSubmitRename: (automation, name) => {
      // Enter, Escape and blur can all land here for one edit, only the first counts.
      if (editing_id !== automation.id) return;
      setEditingId(null);
      const next_name = name.trim();
      if (next_name === (automation.name ?? "")) return;
      void perform(automation.id, () => onRename(automation.id, next_name || null), "The automation could not be renamed.");
    },
    onCancelRename: () => setEditingId(null),
    onDuplicate: (automation) => void perform(automation.id, () => onDuplicate(automation.id), "The automation could not be duplicated."),
    onRequestDelete: (automation_id) => {
      setEditingId(null);
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
      ["Name", "Description", "Type", "Action", "Status", "Created by", "Runs", "Last run"],
      visible_rows.map(({ automation, sentence }) => [
        automation.name ?? "",
        sentence,
        AUTOMATION_KIND_LABELS[automationKind(automation.action_type)],
        ACTION_LABELS[automation.action_type],
        automation.is_enabled ? "Enabled" : "Disabled",
        automation.created_by?.name ?? "",
        String(automation.run_count),
        automation.last_run_at ? formatDateTime(automation.last_run_at) : "",
      ])
    );
  };

  if (automations.length === 0) {
    return (
      <ManageEmptyState title="Create your first automation to save time" description="You can also explore pre-built automation templates.">
        <button type="button" onClick={onExploreTemplates} className="h-9 rounded-[6px] border border-boardtree-border px-4 text-[13.5px] text-boardtree-text hover:bg-boardtree-hover">
          Explore templates
        </button>
      </ManageEmptyState>
    );
  }

  const item_props = (automation: BoardAutomationDto, sentence: string) => ({
    automation,
    sentence,
    actions,
    is_busy: busy_id === automation.id,
    is_editing: editing_id === automation.id,
    is_confirming_delete: confirming_delete_id === automation.id,
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative w-full max-w-[300px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-boardtree-text-faint"><SearchIcon size={14} /></span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            aria-label="Search automations"
            className="h-9 w-full rounded-[6px] bg-boardtree-hover pl-9 pr-3 text-[13px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint focus:ring-2 focus:ring-boardtree-accent/40"
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

      {visible_rows.length === 0 ? (
        <div className="py-12 text-center text-[13.5px] text-boardtree-text-muted">
          No automations match your search.{" "}
          {is_narrowed && <button type="button" onClick={clearNarrowing} className="font-medium text-boardtree-accent hover:underline">Clear search and filters</button>}
        </div>
      ) : layout === "cards" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible_rows.map(({ automation, sentence }) => (
            <AutomationCard key={automation.id} {...item_props(automation, sentence)} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-boardtree-border-soft bg-boardtree-surface">
          <div className="min-w-[760px]">
            <div className={`${ROW_GRID} border-b border-boardtree-border-soft px-4 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint`}>
              <span className="sr-only">Enabled</span>
              <span className="col-start-2">Automation</span>
              <span>Action</span>
              <span>Created by</span>
              <span>Runs</span>
              <span>Last run</span>
              <span className="sr-only">Actions</span>
            </div>
            {visible_rows.map(({ automation, sentence }) => (
              <AutomationRow key={automation.id} {...item_props(automation, sentence)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
