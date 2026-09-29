"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, ExternalLink, PauseCircle, RefreshCw, Zap } from "lucide-react";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import ToggleSwitch from "@/components/board/toolbar/ToggleSwitch";
import { ACTION_LABELS, TRIGGER_LABELS } from "@/components/board/automations/builder/automationCatalog";
import { ImportanceIcon } from "@/components/board/automations/builder/ImportanceIcon";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { SearchIcon } from "@/icons/workspace-icons";
import type { AccountAutomationDto, BoardAutomationTriggerType } from "@/types/board-automation";
import useAccountAutomations from "./useAccountAutomations";

type StatusFilter = "all" | "on" | "off" | "attention";

/** Why an automation needs a look, null when it is fine. */
function attentionReason(automation: AccountAutomationDto): { label: string; detail: string } | null {
  if ((automation.problems ?? []).length > 0) return { label: "Needs fixing", detail: automation.problems![0].message };
  if (!automation.is_enabled && automation.paused_at) return { label: "Paused", detail: automation.paused_reason ?? "It switched itself off." };
  if ((automation.consecutive_failures ?? 0) > 0) return { label: "Failing", detail: `Its last ${automation.consecutive_failures} run(s) failed.` };
  return null;
}

/** The automation's name, or what it does when it has none: "Status changes, then Notify person and Move item". */
function automationTitle(automation: AccountAutomationDto): string {
  if (automation.name?.trim()) return automation.name;
  const actions = (automation.actions?.length ? automation.actions : [{ type: automation.action_type }]).map((action) => ACTION_LABELS[action.type] ?? action.type);
  const joined = actions.length > 1 ? `${actions.slice(0, -1).join(", ")} and ${actions[actions.length - 1]}` : actions[0];
  return `${TRIGGER_LABELS[automation.trigger_type] ?? automation.trigger_type}, then ${joined}`;
}

const lastRunLabel = (last_run_at: string | null): string => {
  if (!last_run_at) return "Never";
  try {
    return `${formatDistanceToNow(new Date(last_run_at))} ago`;
  } catch {
    return "Never";
  }
};

const SELECT_CLASS = "h-8 rounded-[8px] border border-shell-border-strong bg-shell-panel px-2 text-[12.5px] text-shell-text outline-none focus:border-brand-500";

function SummaryTile({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "good" | "warn" }) {
  const color = tone === "good" ? "text-[#00854d]" : tone === "warn" ? "text-[#d83a52]" : "text-shell-text";
  return (
    <div className="rounded-[12px] border border-shell-border bg-shell-panel px-4 py-3">
      <div className={`text-[22px] font-extrabold leading-tight ${color}`}>{value}</div>
      <div className="text-[12.5px] text-shell-text-muted">{label}</div>
    </div>
  );
}

/**
 * The account wide Automations center: every automation on every board the viewer may open, what it
 * does, its board, owner, recent runs and health, with on and off in bulk across boards. Editing one
 * opens its board's own Automations center.
 */
const AccountAutomationsView: React.FC = () => {
  const { showToast } = useToast();
  const center = useAccountAutomations((message) => showToast({ variant: "error", title: message }));
  const [query, setQuery] = useState("");
  const [board_filter, setBoardFilter] = useState("");
  const [owner_filter, setOwnerFilter] = useState("");
  const [trigger_filter, setTriggerFilter] = useState("");
  const [status_filter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [is_bulk_running, setIsBulkRunning] = useState(false);

  const automations = useMemo(() => center.data?.data ?? [], [center.data]);
  const boards = useMemo(() => Array.from(new Map(automations.map((automation) => [automation.board.id, automation.board.label ?? "Untitled board"])).entries()).sort((a, b) => a[1].localeCompare(b[1])), [automations]);
  const owners = useMemo(() => Array.from(new Map(automations.filter((automation) => automation.owner).map((automation) => [automation.owner!.id, automation.owner!.name])).entries()).sort((a, b) => a[1].localeCompare(b[1])), [automations]);
  const triggers = useMemo(() => Array.from(new Set(automations.map((automation) => automation.trigger_type))).sort(), [automations]);

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    return automations.filter((automation) => {
      if (board_filter && String(automation.board.id) !== board_filter) return false;
      if (owner_filter && String(automation.owner?.id ?? "") !== owner_filter) return false;
      if (trigger_filter && automation.trigger_type !== trigger_filter) return false;
      if (status_filter === "on" && !automation.is_enabled) return false;
      if (status_filter === "off" && automation.is_enabled) return false;
      if (status_filter === "attention" && !attentionReason(automation)) return false;
      if (!text) return true;
      return `${automationTitle(automation)} ${automation.description ?? ""} ${automation.board.label ?? ""} ${automation.owner?.name ?? ""}`.toLowerCase().includes(text);
    });
  }, [automations, query, board_filter, owner_filter, trigger_filter, status_filter]);

  const attention_count = useMemo(() => automations.filter((automation) => attentionReason(automation)).length, [automations]);
  const editable_visible = visible.filter((automation) => automation.can_edit);
  const selected_ids = editable_visible.filter((automation) => selected.has(automation.id)).map((automation) => automation.id);
  const is_all_selected = editable_visible.length > 0 && selected_ids.length === editable_visible.length;
  const is_filtered = query.trim() !== "" || board_filter !== "" || owner_filter !== "" || trigger_filter !== "" || status_filter !== "all";

  const toggleSelected = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const applyEnabled = async (ids: number[], is_enabled: boolean) => {
    setIsBulkRunning(true);
    try {
      const result = await center.setEnabled(ids, is_enabled);
      if (!result) return;
      if (result.skipped.length > 0) {
        showToast({ variant: "warning", title: result.message, description: result.skipped.slice(0, 3).map((entry) => entry.message).join(" ") });
      } else if (ids.length > 1) {
        showToast({ variant: "success", title: result.message });
      }
      setSelected(new Set());
    } finally {
      setIsBulkRunning(false);
    }
  };

  const clearFilters = () => {
    setQuery("");
    setBoardFilter("");
    setOwnerFilter("");
    setTriggerFilter("");
    setStatusFilter("all");
  };

  if (center.is_loading) return <BoardLoadingSpinner />;
  if (center.error && !center.data) return <CenteredMessage title="Something went wrong" detail={center.error} />;

  const summary = center.data?.summary;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-[26px] font-extrabold tracking-[-0.015em] text-shell-text">
            <Zap size={22} className="text-brand-500" />
            Automations
          </h1>
          <p className="text-[13.5px] text-shell-text-muted">Every automation on the boards you can open. Turn them on or off here, open one to edit it on its board.</p>
        </div>
        <button
          type="button"
          onClick={() => void center.reload()}
          className="flex h-8 items-center gap-1.5 rounded-[8px] border border-shell-border-strong bg-shell-panel px-3 text-[12.5px] text-shell-text hover:bg-shell-hover"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </header>

      {summary && (
        <section aria-label="Summary" className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <SummaryTile label="Automations" value={summary.total} />
          <SummaryTile label="Turned on" value={summary.enabled} tone="good" />
          <SummaryTile label="Need attention" value={attention_count} tone={attention_count > 0 ? "warn" : "default"} />
          <SummaryTile label={`Runs in the last ${summary.recent_days} days`} value={summary.recent_runs.toLocaleString()} />
          <SummaryTile label="Boards" value={summary.boards} />
        </section>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-[8px] border border-shell-border-strong bg-shell-panel px-3 py-1.5">
          <SearchIcon size={14} className="text-shell-text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search automations"
            aria-label="Search automations"
            className="w-[190px] bg-transparent text-[13px] text-shell-text outline-none placeholder:text-shell-text-faint"
          />
        </label>
        <select value={board_filter} onChange={(event) => setBoardFilter(event.target.value)} aria-label="Board" className={SELECT_CLASS}>
          <option value="">All boards</option>
          {boards.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <select value={owner_filter} onChange={(event) => setOwnerFilter(event.target.value)} aria-label="Owner" className={SELECT_CLASS}>
          <option value="">Any owner</option>
          {owners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select value={trigger_filter} onChange={(event) => setTriggerFilter(event.target.value)} aria-label="Trigger" className={SELECT_CLASS}>
          <option value="">Any trigger</option>
          {triggers.map((trigger) => <option key={trigger} value={trigger}>{TRIGGER_LABELS[trigger as BoardAutomationTriggerType] ?? trigger}</option>)}
        </select>
        <select value={status_filter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} aria-label="Status" className={SELECT_CLASS}>
          <option value="all">Any status</option>
          <option value="on">Turned on</option>
          <option value="off">Turned off</option>
          <option value="attention">Needs attention</option>
        </select>
        {is_filtered && (
          <button type="button" onClick={clearFilters} className="h-8 rounded-[8px] px-2.5 text-[12.5px] text-brand-500 hover:bg-shell-hover">
            Clear filters
          </button>
        )}
        <span className="ml-auto text-[12.5px] text-shell-text-muted">{visible.length === automations.length ? `${automations.length} automations` : `${visible.length} of ${automations.length}`}</span>
      </div>

      {selected_ids.length > 0 && (
        <div role="region" aria-label="Selected automations" className="mb-3 flex flex-wrap items-center gap-2 rounded-[10px] border border-brand-500/30 bg-brand-500/5 px-3 py-2">
          <span className="text-[13px] font-medium text-shell-text">{selected_ids.length} selected</span>
          <button type="button" disabled={is_bulk_running} onClick={() => void applyEnabled(selected_ids, true)} className="h-8 rounded-[6px] bg-brand-500 px-3 text-[12.5px] font-medium text-white hover:bg-brand-600 disabled:opacity-50">
            Turn on
          </button>
          <button type="button" disabled={is_bulk_running} onClick={() => void applyEnabled(selected_ids, false)} className="h-8 rounded-[6px] border border-shell-border-strong bg-shell-panel px-3 text-[12.5px] text-shell-text hover:bg-shell-hover disabled:opacity-50">
            Turn off
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="h-8 rounded-[6px] px-2.5 text-[12.5px] text-shell-text-secondary hover:bg-shell-hover">
            Clear selection
          </button>
        </div>
      )}

      {automations.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-2 py-20 text-center">
          <h2 className="text-lg font-semibold text-shell-text">No automations yet</h2>
          <p className="text-[13.5px] text-shell-text-muted">Open a board and choose Automate at the top of its table to create the first one.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-2 py-16 text-center">
          <h2 className="text-lg font-semibold text-shell-text">Nothing matches</h2>
          <p className="text-[13.5px] text-shell-text-muted">Try another search or clear the filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[12px] border border-shell-border bg-shell-panel">
          <table className="w-full min-w-[920px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-shell-border text-[11.5px] uppercase tracking-wide text-shell-text-muted">
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={is_all_selected}
                    disabled={editable_visible.length === 0}
                    onChange={() => setSelected(is_all_selected ? new Set() : new Set(editable_visible.map((automation) => automation.id)))}
                    aria-label="Select every automation you can edit"
                    className="accent-brand-500"
                  />
                </th>
                <th className="px-3 py-2.5 font-semibold">Automation</th>
                <th className="px-3 py-2.5 font-semibold">Board</th>
                <th className="px-3 py-2.5 font-semibold">Owner</th>
                <th className="px-3 py-2.5 font-semibold">Runs ({summary?.recent_days ?? 30} days)</th>
                <th className="px-3 py-2.5 font-semibold">Last run</th>
                <th className="px-3 py-2.5 font-semibold">On</th>
                <th className="w-12 px-3 py-2.5"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((automation) => {
                const attention = attentionReason(automation);
                const open_href = `/boards/${automation.board.id}?automation=${automation.id}`;
                return (
                  <tr key={automation.id} className="border-b border-shell-border last:border-b-0 hover:bg-shell-hover/60">
                    <td className="px-3 py-2.5 align-top">
                      <input
                        type="checkbox"
                        checked={selected.has(automation.id)}
                        disabled={!automation.can_edit}
                        onChange={() => toggleSelected(automation.id)}
                        aria-label={`Select ${automationTitle(automation)}`}
                        title={automation.can_edit ? undefined : "You cannot edit this board"}
                        className="accent-brand-500"
                      />
                    </td>
                    <td className="max-w-[380px] px-3 py-2.5 align-top">
                      <div className="flex items-start gap-1.5">
                        <span className="mt-0.5 flex-none"><ImportanceIcon importance={automation.importance} /></span>
                        <div className="min-w-0">
                          <Link href={open_href} className="font-semibold text-shell-text hover:text-brand-500 hover:underline">{automationTitle(automation)}</Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11.5px] text-shell-text-muted">
                            <span className="rounded-full bg-shell-hover px-1.5 py-px">{TRIGGER_LABELS[automation.trigger_type] ?? automation.trigger_type}</span>
                            {attention && (
                              <span title={attention.detail} className={`flex items-center gap-1 rounded-full px-1.5 py-px font-medium ${attention.label === "Paused" ? "bg-[#fdab3d]/15 text-[#b76e00]" : "bg-[#e2445c]/10 text-[#d83a52]"}`}>
                                {attention.label === "Paused" ? <PauseCircle size={11} /> : <AlertTriangle size={11} />}
                                {attention.label}
                              </span>
                            )}
                          </div>
                          {attention && <div className="mt-0.5 line-clamp-2 text-[11.5px] text-shell-text-muted">{attention.detail}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <Link href={`/boards/${automation.board.id}`} className="text-shell-text hover:text-brand-500 hover:underline">{automation.board.label ?? "Untitled board"}</Link>
                      <div className="text-[11.5px] text-shell-text-muted">{[automation.board.workspace_name, automation.view_label].filter(Boolean).join(", ")}</div>
                    </td>
                    <td className="px-3 py-2.5 align-top text-shell-text-secondary">{automation.owner?.name ?? "Nobody"}</td>
                    <td className="px-3 py-2.5 align-top">
                      <span className="text-shell-text">{automation.recent_runs.toLocaleString()}</span>
                      {automation.recent_failures > 0 && <span className="ml-1.5 text-[11.5px] text-[#d83a52]">{automation.recent_failures} failed</span>}
                    </td>
                    <td className="px-3 py-2.5 align-top text-shell-text-secondary">{lastRunLabel(automation.last_run_at)}</td>
                    <td className="px-3 py-2.5 align-top">
                      <button
                        type="button"
                        disabled={!automation.can_edit || is_bulk_running}
                        onClick={() => void applyEnabled([automation.id], !automation.is_enabled)}
                        aria-pressed={automation.is_enabled}
                        aria-label={`${automation.is_enabled ? "Turn off" : "Turn on"} ${automationTitle(automation)}`}
                        title={automation.can_edit ? undefined : "You cannot edit this board"}
                        className="flex items-center disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ToggleSwitch is_on={automation.is_enabled} size="sm" />
                      </button>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <Link href={open_href} aria-label={`Open ${automationTitle(automation)} on its board`} title="Open on its board" className="flex h-7 w-7 items-center justify-center rounded-[6px] text-shell-text-muted hover:bg-shell-hover hover:text-shell-text">
                        <ExternalLink size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {center.data?.is_truncated && <p className="mt-3 text-[12.5px] text-shell-text-muted">Only the newest 1000 automations are listed. Filter by board to find older ones.</p>}
    </div>
  );
};

export default AccountAutomationsView;
