"use client";
import React, { useEffect, useState } from "react";
import { Hourglass, RotateCcw } from "lucide-react";
import type { BoardAutomationRunDetail, BoardAutomationRunDto } from "@/types/board-automation";
import { boardAutomationService } from "@/services/board-automation.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { ACTION_LABELS, formatDateTime } from "./manageFormat";
import { RunStatusBadge } from "./manageUi";

export type RunDetailPanelProps = {
  board_id: number;
  run: BoardAutomationRunDto;
  /** Called after a retry or a cancelled wait, so the history reloads. */
  onChanged: () => void;
};

function StepRow({ step, is_focused, can_retry, is_retrying, onRetry }: { step: BoardAutomationRunDto; is_focused: boolean; can_retry: boolean; is_retrying: boolean; onRetry: () => void }) {
  return (
    <li className={`flex items-start gap-3 rounded-[8px] px-3 py-2 ${is_focused ? "bg-boardtree-accent-surface" : "bg-boardtree-surface"}`}>
      <span className="mt-0.5 w-5 flex-none text-right text-[12px] text-boardtree-text-faint">{(step.step_index ?? 0) + 1}.</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-boardtree-text">{ACTION_LABELS[step.action_type] ?? step.action_type}</span>
          {step.branch === "else" && <span className="rounded-full bg-boardtree-hover px-1.5 py-0.5 text-[11px] text-boardtree-text-secondary">otherwise</span>}
          <RunStatusBadge status={step.status} />
          <span className="text-[11.5px] text-boardtree-text-faint">{formatDateTime(step.ran_at)}</span>
        </span>
        <span className="mt-0.5 block text-[12.5px] text-boardtree-text-secondary">{step.message}</span>
      </span>
      {can_retry && step.status === "failed" && (
        <button type="button" disabled={is_retrying} onClick={onRetry} className="flex h-7 flex-none items-center gap-1 rounded-[6px] border border-boardtree-border px-2 text-[12px] text-boardtree-text hover:bg-boardtree-hover disabled:opacity-40">
          <RotateCcw size={12} className={is_retrying ? "animate-spin" : undefined} />
          {is_retrying ? "Retrying..." : "Retry"}
        </button>
      )}
    </li>
  );
}

/**
 * Every step of the execution a Run history row belongs to, in order, with a retry for a failed
 * step (it runs that step and the ones after it again) and the waiting part of a run, which can
 * be cancelled.
 */
export default function RunDetailPanel({ board_id, run, onChanged }: RunDetailPanelProps) {
  const [detail, setDetail] = useState<BoardAutomationRunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retrying_id, setRetryingId] = useState<number | null>(null);
  const [reload_key, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    boardAutomationService
      .getRun(board_id, run.id)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((failure) => {
        if (!cancelled) setError(apiErrorMessage(failure, "The run could not be loaded."));
      });
    return () => {
      cancelled = true;
    };
  }, [board_id, run.id, reload_key]);

  const retry = async (step: BoardAutomationRunDto) => {
    setRetryingId(step.id);
    setError(null);
    try {
      const result = await boardAutomationService.retryRun(board_id, step.id);
      setNotice(result.message);
      setReloadKey((key) => key + 1);
      onChanged();
    } catch (failure) {
      setError(apiErrorMessage(failure, "The step could not be retried."));
    } finally {
      setRetryingId(null);
    }
  };

  const cancelWait = async (waiting_id: number) => {
    try {
      await boardAutomationService.cancelWaitingRun(board_id, waiting_id);
      setNotice("The rest of the run was cancelled.");
      setReloadKey((key) => key + 1);
      onChanged();
    } catch (failure) {
      setError(apiErrorMessage(failure, "The waiting run could not be cancelled."));
    }
  };

  return (
    <div className="rounded-[10px] bg-boardtree-panel-alt p-3" aria-live="polite">
      {error && <div role="alert" className="mb-2 text-[12.5px] text-boardtree-danger">{error}</div>}
      {notice && <div role="status" className="mb-2 text-[12.5px] text-boardtree-text-secondary">{notice}</div>}
      {!detail && !error && <div className="text-[12.5px] text-boardtree-text-muted">Loading the steps of this run...</div>}
      {detail && (
        <>
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-boardtree-text-faint">
            Steps of this run{run.item_name ? ` on "${run.item_name}"` : ""}
          </div>
          <ol className="flex flex-col gap-1.5">
            {detail.steps.map((step) => (
              <StepRow key={step.id} step={step} is_focused={step.id === run.id} can_retry={run.automation_id !== null} is_retrying={retrying_id === step.id} onRetry={() => void retry(step)} />
            ))}
          </ol>
          {detail.waiting_until && detail.waiting_id && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-[8px] bg-boardtree-surface px-3 py-2 text-[12.5px] text-boardtree-text-secondary">
              <span className="flex items-center gap-1.5">
                <Hourglass size={14} className="text-[#ff9f1a]" />
                The next steps run {formatDateTime(detail.waiting_until)}.
              </span>
              <button type="button" onClick={() => void cancelWait(detail.waiting_id as number)} className="h-7 rounded-[6px] border border-boardtree-border px-2.5 text-[12px] text-boardtree-text hover:bg-boardtree-hover">
                Cancel the rest
              </button>
            </div>
          )}
          {detail.retries.length > 0 && (
            <>
              <div className="mb-2 mt-3 text-[12px] font-semibold uppercase tracking-wide text-boardtree-text-faint">Retries</div>
              <ol className="flex flex-col gap-1.5">
                {detail.retries.map((step) => (
                  <StepRow key={step.id} step={step} is_focused={false} can_retry={false} is_retrying={false} onRetry={() => {}} />
                ))}
              </ol>
            </>
          )}
        </>
      )}
    </div>
  );
}
