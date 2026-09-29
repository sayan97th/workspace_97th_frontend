"use client";
import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleMinus, Hourglass, PauseCircle, PenLine, Plus, XCircle } from "lucide-react";
import type { BoardAutomationDto, BoardItemAutomationsDto } from "@/types/board-automation";
import { boardAutomationService } from "@/services/board-automation.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { describeAutomationParts } from "./automationDescriptions";
import { ACTION_LABELS, type AutomationBuilderContext } from "./builder/automationCatalog";
import { formatDateTime, formatRelativeTime } from "../integrations/manage/manageFormat";
import { RunStatusBadge } from "../integrations/manage/manageUi";

export type ItemAutomationsPanelProps = {
  board_id: number;
  item_id: number;
  automations: BoardAutomationDto[];
  context: AutomationBuilderContext;
  can_edit: boolean;
  /** Opens the Automations center on one automation, or on a blank one. */
  onOpenAutomation: (automation_id?: number) => void;
};

const SECTION_TITLE = "mb-2 text-[12px] font-semibold uppercase tracking-wide text-shell-text-faint";

/**
 * The item drawer's Automations tab, like monday's item "Automations" view: which automations of
 * the table would act on this item right now (its conditions checked against the item), what
 * already ran on it, and what is waiting to run.
 */
export default function ItemAutomationsPanel({ board_id, item_id, automations, context, can_edit, onOpenAutomation }: ItemAutomationsPanelProps) {
  const [data, setData] = useState<BoardItemAutomationsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    boardAutomationService
      .getItemAutomations(board_id, item_id)
      .then(setData)
      .catch((failure) => setError(apiErrorMessage(failure, "The automations of this item could not be loaded.")));
  }, [board_id, item_id]);

  useEffect(() => {
    load();
  }, [load]);

  const cancelWait = async (waiting_id: number) => {
    try {
      await boardAutomationService.cancelWaitingRun(board_id, waiting_id);
      load();
    } catch (failure) {
      setError(apiErrorMessage(failure, "The waiting run could not be cancelled."));
    }
  };

  const by_id = new Map(automations.map((automation) => [automation.id, automation]));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 text-shell-text">
      {error && <div role="alert" className="mb-3 text-[13px] text-[#e2445c]">{error}</div>}
      {!data && !error && <div className="text-[13px] text-shell-text-muted">Loading automations...</div>}

      {data?.is_board_paused && (
        <div role="status" className="mb-4 flex items-center gap-2 rounded-[10px] border border-[#fdab3d]/50 bg-[#fdab3d]/[0.12] px-3 py-2 text-[13px]">
          <PauseCircle size={15} className="text-[#d58b12]" />
          Every automation of this board is paused.
        </div>
      )}

      {data && data.waiting.length > 0 && (
        <section aria-label="Waiting to run" className="mb-5">
          <div className={SECTION_TITLE}>Waiting to run</div>
          <ul className="flex flex-col gap-1.5">
            {data.waiting.map((waiting) => (
              <li key={waiting.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-shell-border bg-shell-panel-alt px-3 py-2 text-[13px]">
                <span className="flex min-w-0 items-center gap-2">
                  <Hourglass size={14} className="flex-none text-[#ff9f1a]" />
                  <span className="truncate">{by_id.get(waiting.automation_id)?.name || "An automation"} continues {formatDateTime(waiting.run_at)}</span>
                </span>
                {can_edit && (
                  <button type="button" onClick={() => void cancelWait(waiting.id)} className="h-7 flex-none rounded-[6px] border border-shell-border px-2.5 text-[12px] hover:bg-shell-hover">
                    Cancel
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && (
        <section aria-label="Automations of this table" className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <span className={SECTION_TITLE.replace("mb-2 ", "")}>Automations of this table</span>
            {can_edit && (
              <button type="button" onClick={() => onOpenAutomation()} className="flex h-7 items-center gap-1 rounded-[6px] px-2 text-[12.5px] text-[#579bfc] hover:bg-shell-hover">
                <Plus size={14} />
                Create automation
              </button>
            )}
          </div>
          {data.automations.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-shell-border px-4 py-5 text-center text-[13px] text-shell-text-muted">No automation on this table yet.</div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {data.automations.map((entry) => {
                const automation = by_id.get(entry.id);
                if (!automation) return null;
                const status = !entry.is_enabled
                  ? { icon: <CircleMinus size={14} />, text: "Turned off", className: "text-shell-text-faint" }
                  : entry.passes_conditions === null
                    ? { icon: <CheckCircle2 size={14} />, text: "Runs on every item", className: "text-[#00c875]" }
                    : entry.passes_conditions
                      ? { icon: <CheckCircle2 size={14} />, text: "The item meets its conditions", className: "text-[#00c875]" }
                      : { icon: <XCircle size={14} />, text: entry.has_else ? "The item does not meet its conditions, the otherwise actions apply" : "The item does not meet its conditions", className: "text-shell-text-muted" };
                return (
                  <li key={entry.id} className="rounded-[10px] border border-shell-border bg-shell-panel-alt px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {automation.name && <div className="text-[11.5px] font-semibold uppercase tracking-wide text-shell-text-faint">{automation.name}</div>}
                        <p className={`text-[13.5px] leading-snug ${entry.is_enabled ? "text-shell-text" : "text-shell-text-muted"}`}>
                          {describeAutomationParts(automation, context).map((part, index) => (part.is_token ? <strong key={index} className="font-semibold">{part.text}</strong> : <span key={index}>{part.text}</span>))}
                        </p>
                        <div className={`mt-1 flex items-center gap-1.5 text-[12px] ${status.className}`}>
                          {status.icon}
                          {status.text}
                        </div>
                      </div>
                      {can_edit && (
                        <button type="button" onClick={() => onOpenAutomation(automation.id)} aria-label="Edit automation" title="Edit automation" className="flex h-7 w-7 flex-none items-center justify-center rounded-[6px] text-shell-text-muted hover:bg-shell-hover hover:text-shell-text">
                          <PenLine size={14} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {data && (
        <section aria-label="Runs on this item">
          <div className={SECTION_TITLE}>Runs on this item</div>
          {data.runs.length === 0 ? (
            <div className="text-[13px] text-shell-text-muted">No automation ran on this item yet.</div>
          ) : (
            <ul className="flex flex-col gap-1">
              {data.runs.map((run) => (
                <li key={run.id} className="flex items-start gap-3 rounded-[8px] px-2 py-1.5 hover:bg-shell-hover">
                  <span className="w-[96px] flex-none whitespace-nowrap text-[12px] text-shell-text-faint" title={formatDateTime(run.ran_at)}>{formatRelativeTime(run.ran_at)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5 text-[13px]">
                      <span className="font-medium">{run.automation_name || ACTION_LABELS[run.action_type]}</span>
                      <RunStatusBadge status={run.status} />
                    </span>
                    <span className="block text-[12.5px] text-shell-text-secondary">{run.message}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
