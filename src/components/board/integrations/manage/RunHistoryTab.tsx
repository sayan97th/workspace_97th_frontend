"use client";
import React, { useState } from "react";
import type { BoardAutomationDto, BoardAutomationRunFilters, BoardAutomationRunStatus } from "@/types/board-automation";
import { FilterIcon, RefreshIcon } from "@/icons/workspace-icons";
import { RUNS_PER_PAGE, useAutomationRuns } from "@/hooks/useAutomationRuns";
import { ACTION_LABELS, RUN_STATUS_LABELS, TRIGGER_LABELS, formatDateTime } from "./manageFormat";
import { FIELD, ICON_BUTTON, InlineAlert, ManageEmptyState, RunStatusBadge, TOOLBAR_BUTTON } from "./manageUi";

export type RunHistoryTabProps = {
  board_id: number;
  view_id: number | null;
  automations: BoardAutomationDto[];
  onAddAutomation: () => void;
};

const NO_FILTERS: BoardAutomationRunFilters = { status: null, automation_id: null, from: null, to: null };

const HEADER_CELL = "px-4 py-2 text-left text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint";
const CELL = "px-4 py-3 align-top text-[12.5px] text-boardtree-text-secondary";

/**
 * Manage > Run history. Every time one of this table's automations ran, newest first, with what
 * came of it. Filter by result, automation and date, and page through the rest.
 */
export default function RunHistoryTab({ board_id, view_id, automations, onAddAutomation }: RunHistoryTabProps) {
  const [filters, setFilters] = useState<BoardAutomationRunFilters>(NO_FILTERS);
  const [is_filter_bar_open, setIsFilterBarOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { runs, meta, is_loading, error, refresh } = useAutomationRuns(board_id, view_id, filters, page);

  const active_count = Object.values(filters).filter((value) => value !== null && value !== "").length;

  const changeFilters = (next: Partial<BoardAutomationRunFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(NO_FILTERS);
    setPage(1);
  };

  const first_shown = meta.total === 0 ? 0 : (meta.current_page - 1) * meta.per_page + 1;
  const last_shown = Math.min(meta.current_page * meta.per_page, meta.total);
  const has_no_runs_at_all = !is_loading && !error && meta.total === 0 && active_count === 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setIsFilterBarOpen((open) => !open)} aria-expanded={is_filter_bar_open} className={`${TOOLBAR_BUTTON} ${active_count > 0 ? "text-boardtree-accent" : ""}`}>
          <FilterIcon size={15} />
          Filters
          {active_count > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-boardtree-accent px-1 text-[11px] font-semibold text-white">{active_count}</span>}
        </button>
        <button type="button" onClick={refresh} disabled={is_loading} aria-label="Refresh run history" title="Refresh" className={`${ICON_BUTTON} ml-auto`}>
          <RefreshIcon size={15} className={is_loading ? "animate-spin" : undefined} />
        </button>
      </div>

      {is_filter_bar_open && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-[10px] border border-boardtree-border-soft bg-boardtree-surface p-3">
          <label className="flex flex-col gap-1 text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint">
            Result
            <select
              value={filters.status ?? ""}
              onChange={(event) => changeFilters({ status: (event.target.value || null) as BoardAutomationRunStatus | null })}
              className={`${FIELD} min-w-[140px] font-normal normal-case tracking-normal`}
            >
              <option value="">All results</option>
              {(Object.keys(RUN_STATUS_LABELS) as BoardAutomationRunStatus[]).map((status) => (
                <option key={status} value={status}>{RUN_STATUS_LABELS[status]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint">
            Automation
            <select
              value={filters.automation_id ?? ""}
              onChange={(event) => changeFilters({ automation_id: event.target.value ? Number(event.target.value) : null })}
              className={`${FIELD} min-w-[200px] max-w-[280px] font-normal normal-case tracking-normal`}
            >
              <option value="">All automations</option>
              {automations.map((automation) => (
                <option key={automation.id} value={automation.id}>{automation.name || `${TRIGGER_LABELS[automation.trigger_type]}, ${ACTION_LABELS[automation.action_type]}`}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint">
            From
            <input type="date" value={filters.from ?? ""} max={filters.to ?? undefined} onChange={(event) => changeFilters({ from: event.target.value || null })} className={`${FIELD} font-normal normal-case tracking-normal`} />
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint">
            To
            <input type="date" value={filters.to ?? ""} min={filters.from ?? undefined} onChange={(event) => changeFilters({ to: event.target.value || null })} className={`${FIELD} font-normal normal-case tracking-normal`} />
          </label>
          {active_count > 0 && (
            <button type="button" onClick={clearFilters} className="h-9 px-2 text-[12.5px] font-medium text-boardtree-accent hover:underline">Clear filters</button>
          )}
        </div>
      )}

      {error && <InlineAlert message={error} onDismiss={refresh} action_label="Retry" />}

      {has_no_runs_at_all ? (
        <ManageEmptyState is_sleeping title="No automation runs yet" description="Once your automations start running, you will see their history here.">
          <button type="button" onClick={onAddAutomation} className="h-9 rounded-[6px] bg-boardtree-accent px-4 text-[13.5px] font-medium text-white hover:bg-boardtree-accent-hover">
            + Add automation
          </button>
        </ManageEmptyState>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-boardtree-border-soft bg-boardtree-surface">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-boardtree-border-soft">
                <th className={HEADER_CELL}>Time</th>
                <th className={HEADER_CELL}>Automation</th>
                <th className={HEADER_CELL}>Item</th>
                <th className={HEADER_CELL}>Result</th>
                <th className={HEADER_CELL}>Details</th>
                <th className={HEADER_CELL}>Triggered by</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-boardtree-border-soft last:border-b-0">
                  <td className={`${CELL} whitespace-nowrap`}>{formatDateTime(run.ran_at)}</td>
                  <td className={CELL}>
                    <div className="font-medium text-boardtree-text">{run.automation_name || TRIGGER_LABELS[run.trigger_type]}</div>
                    <div className="text-[12px] text-boardtree-text-faint">
                      {TRIGGER_LABELS[run.trigger_type]}, {ACTION_LABELS[run.action_type]}
                      {run.automation_id === null && " (deleted)"}
                    </div>
                  </td>
                  <td className={`${CELL} max-w-[180px] truncate`}>{run.item_name || "-"}</td>
                  <td className={CELL}><RunStatusBadge status={run.status} /></td>
                  <td className={`${CELL} max-w-[300px]`}>{run.message}</td>
                  <td className={`${CELL} whitespace-nowrap`}>{run.actor_name ?? "System"}</td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-boardtree-text-muted">
                    {is_loading ? "Loading run history..." : (
                      <>
                        No runs match these filters.{" "}
                        <button type="button" onClick={clearFilters} className="font-medium text-boardtree-accent hover:underline">Clear filters</button>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!has_no_runs_at_all && meta.total > RUNS_PER_PAGE && (
        <div className="mt-3 flex items-center justify-between text-[12.5px] text-boardtree-text-muted">
          <span>Showing {first_shown} to {last_shown} of {meta.total}</span>
          <div className="flex gap-2">
            <button type="button" disabled={is_loading || meta.current_page <= 1} onClick={() => setPage((current) => current - 1)} className="h-8 rounded-[6px] border border-boardtree-border px-3 text-boardtree-text hover:bg-boardtree-hover disabled:opacity-40">Previous</button>
            <button type="button" disabled={is_loading || meta.current_page >= meta.last_page} onClick={() => setPage((current) => current + 1)} className="h-8 rounded-[6px] border border-boardtree-border px-3 text-boardtree-text hover:bg-boardtree-hover disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
