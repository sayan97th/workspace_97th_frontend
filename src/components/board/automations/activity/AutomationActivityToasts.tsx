"use client";

import { CheckCircle2, Undo2, X, XCircle, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AutomationRunLine } from "@/types/automation-effects";
import "./automation-activity.scss";

/** How long a card stays before closing by itself, hovering pauses it. */
const CARD_DURATION_MS = 6000;
const FAILED_CARD_DURATION_MS = 10000;
const MAX_CARDS = 3;
const MAX_LINES = 3;

export type AutomationActivityEntry = {
  id: string;
  runs: AutomationRunLine[];
  /** The rows this burst changed, reloaded again after an Undo. */
  item_ids: number[];
  undo_state: "idle" | "undoing" | "undone";
};

/**
 * The cards of the "Automation ran" stack: one per burst of the viewer's own changes, newest at
 * the bottom, at most {@link MAX_CARDS}.
 */
export function useAutomationActivityToasts() {
  const [entries, setEntries] = useState<AutomationActivityEntry[]>([]);

  const push = useCallback((runs: AutomationRunLine[], item_ids: number[]) => {
    if (runs.length === 0) return;
    const entry: AutomationActivityEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      runs,
      item_ids,
      undo_state: "idle",
    };
    setEntries((current) => [...current, entry].slice(-MAX_CARDS));
  }, []);

  const dismiss = useCallback((entry_id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== entry_id));
  }, []);

  const setUndoState = useCallback((entry_id: string, undo_state: AutomationActivityEntry["undo_state"]) => {
    setEntries((current) => current.map((entry) => (entry.id === entry_id ? { ...entry, undo_state } : entry)));
  }, []);

  return { entries, push, dismiss, setUndoState };
}

/** The first run log of every run in the burst, what "Undo" sends to the API, one per run. */
export function undoableRunLogIds(runs: AutomationRunLine[]): number[] {
  const by_run = new Map<string, number>();
  runs.forEach((run) => {
    if (run.status !== "success" || run.run_log_id === null) return;
    const key = run.run_uuid ?? String(run.run_log_id);
    if (!by_run.has(key)) by_run.set(key, run.run_log_id);
  });
  return Array.from(by_run.values());
}

type AutomationActivityToastsProps = {
  entries: AutomationActivityEntry[];
  onDismiss: (entry_id: string) => void;
  /** Omitted when the viewer cannot edit the board. */
  onUndo?: (entry: AutomationActivityEntry) => void;
  onOpenItem?: (item_id: number) => void;
  onOpenAutomations?: () => void;
};

/**
 * Bottom left stack of "Automation ran" cards, so the viewer sees at once what an automation did
 * with their change ("Moved the item to Completed") and can take it back. The board's own toasts
 * keep the bottom right corner.
 */
export default function AutomationActivityToasts({ entries, onDismiss, onUndo, onOpenItem, onOpenAutomations }: AutomationActivityToastsProps) {
  if (entries.length === 0) return null;

  return (
    <div className="automation-activity" role="region" aria-label="Automation activity">
      {entries.map((entry) => (
        <AutomationActivityCard
          key={entry.id}
          entry={entry}
          onDismiss={onDismiss}
          onUndo={onUndo}
          onOpenItem={onOpenItem}
          onOpenAutomations={onOpenAutomations}
        />
      ))}
    </div>
  );
}

type AutomationActivityCardProps = Omit<AutomationActivityToastsProps, "entries"> & { entry: AutomationActivityEntry };

function AutomationActivityCard({ entry, onDismiss, onUndo, onOpenItem, onOpenAutomations }: AutomationActivityCardProps) {
  const has_failed = entry.runs.some((run) => run.status === "failed");
  const duration = has_failed ? FAILED_CARD_DURATION_MS : CARD_DURATION_MS;
  const card_ref = useRef<HTMLDivElement>(null);

  // The countdown bar closes the card when its animation ends. Without motion there is no
  // animation, so a plain timer does it instead (paused while the pointer is over the card).
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let remaining = duration;
    let started_at = Date.now();
    let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => onDismiss(entry.id), remaining);
    const card = card_ref.current;
    const pause = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
      remaining -= Date.now() - started_at;
    };
    const resume = () => {
      if (timer) return;
      started_at = Date.now();
      timer = setTimeout(() => onDismiss(entry.id), Math.max(remaining, 1000));
    };
    card?.addEventListener("mouseenter", pause);
    card?.addEventListener("mouseleave", resume);
    return () => {
      if (timer) clearTimeout(timer);
      card?.removeEventListener("mouseenter", pause);
      card?.removeEventListener("mouseleave", resume);
    };
  }, [duration, entry.id, onDismiss]);

  const automation_names = Array.from(new Set(entry.runs.map((run) => run.automation_name ?? "Automation")));
  const title = automation_names.length === 1 ? automation_names[0] : `${automation_names.length} automations ran`;
  const eyebrow = has_failed ? "Automation failed" : automation_names.length === 1 ? "Automation ran" : "Automations ran";

  const lines = uniqueLines(entry.runs);
  const shown_lines = lines.slice(0, MAX_LINES);
  const hidden_count = lines.length - shown_lines.length;

  const item_ids = Array.from(new Set(entry.runs.map((run) => run.item_id).filter((id): id is number => id !== null)));
  const single_item = item_ids.length === 1 ? entry.runs.find((run) => run.item_id === item_ids[0]) : undefined;

  const can_undo = !!onUndo && undoableRunLogIds(entry.runs).length > 0;

  return (
    <div
      ref={card_ref}
      className={`automation-activity__card${has_failed ? " automation-activity__card--failed" : ""}`}
      role={has_failed ? "alert" : "status"}
      aria-live={has_failed ? "assertive" : "polite"}
      style={{ ["--aa-duration" as string]: `${duration}ms` }}
    >
      <span className="automation-activity__bolt" aria-hidden="true">
        <Zap size={16} strokeWidth={2.4} fill="currentColor" />
      </span>

      <div className="automation-activity__body">
        <div className="automation-activity__eyebrow">
          <span>{eyebrow}</span>
          <span className="automation-activity__dot" aria-hidden="true" />
          <span>just now</span>
        </div>
        <div className="automation-activity__title" title={title}>
          {title}
        </div>

        <ul className="automation-activity__lines">
          {shown_lines.map((line) => (
            <li key={line.message} className={`automation-activity__line automation-activity__line--${line.status}`}>
              {line.status === "failed" ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
              <span>{line.message}</span>
            </li>
          ))}
          {hidden_count > 0 && <li className="automation-activity__line">and {hidden_count} more</li>}
        </ul>

        {single_item?.item_name && single_item.item_id !== null && (
          <button
            type="button"
            className="automation-activity__item"
            title={`Open "${single_item.item_name}"`}
            onClick={() => {
              onOpenItem?.(single_item.item_id as number);
              onDismiss(entry.id);
            }}
            disabled={!onOpenItem}
          >
            <span>{single_item.item_name}</span>
          </button>
        )}

        {(can_undo || onOpenAutomations) && (
          <div className="automation-activity__actions">
            {can_undo && (
              <button
                type="button"
                className="automation-activity__action automation-activity__action--primary"
                onClick={() => onUndo?.(entry)}
                disabled={entry.undo_state !== "idle"}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Undo2 size={14} />
                  {entry.undo_state === "undoing" ? "Undoing..." : entry.undo_state === "undone" ? "Undone" : "Undo"}
                </span>
              </button>
            )}
            {onOpenAutomations && (
              <button
                type="button"
                className="automation-activity__action"
                onClick={() => {
                  onOpenAutomations();
                  onDismiss(entry.id);
                }}
              >
                {has_failed ? "See what went wrong" : "View automations"}
              </button>
            )}
          </div>
        )}
      </div>

      <button type="button" className="automation-activity__close" aria-label="Dismiss" onClick={() => onDismiss(entry.id)}>
        <X size={14} />
      </button>

      <span className="automation-activity__progress" aria-hidden="true" onAnimationEnd={() => onDismiss(entry.id)} />
    </div>
  );
}

/** One line per distinct message, failures first so they are never cut off. */
function uniqueLines(runs: AutomationRunLine[]): Array<{ message: string; status: AutomationRunLine["status"] }> {
  const seen = new Map<string, AutomationRunLine["status"]>();
  runs.forEach((run) => {
    const current = seen.get(run.message);
    if (current !== "failed") seen.set(run.message, run.status);
  });
  return Array.from(seen.entries())
    .map(([message, status]) => ({ message, status }))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "failed" ? -1 : 1));
}
