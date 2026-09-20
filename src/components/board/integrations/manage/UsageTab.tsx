"use client";
import React from "react";
import { format } from "date-fns";
import { useAutomationUsage } from "@/hooks/useAutomationUsage";
import type { BoardAutomationUsageDto } from "@/types/board-automation";
import { ACTION_LABELS, TRIGGER_LABELS } from "./manageFormat";
import { InlineAlert } from "./manageUi";

export type UsageTabProps = {
  board_id: number;
  view_id: number | null;
};

function StatTile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "danger" }) {
  return (
    <div className="rounded-[10px] border border-boardtree-border-soft bg-boardtree-surface p-4">
      <div className="text-[12px] font-semibold uppercase tracking-wide text-boardtree-text-faint">{label}</div>
      <div className={`mt-1 text-[26px] font-semibold leading-tight ${tone === "danger" ? "text-boardtree-danger" : "text-boardtree-text"}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[12px] text-boardtree-text-muted">{hint}</div>}
    </div>
  );
}

/** Runs per day over the period, one bar each, with the exact count in each bar's tooltip. */
function DailyRunsChart({ daily }: { daily: BoardAutomationUsageDto["daily"] }) {
  const max_runs = Math.max(1, ...daily.map((day) => day.runs));

  return (
    <div>
      <div role="img" aria-label={`Automation runs per day over the last ${daily.length} days`} className="flex h-[120px] items-end gap-[3px]">
        {daily.map((day) => (
          <div key={day.date} title={`${format(new Date(`${day.date}T00:00:00`), "MMM d")}: ${day.runs} ${day.runs === 1 ? "run" : "runs"}`} className="flex h-full flex-1 items-end">
            <div
              className={`w-full rounded-t-[3px] ${day.runs > 0 ? "bg-boardtree-accent" : "bg-boardtree-track"}`}
              style={{ height: day.runs > 0 ? `${Math.max(6, (day.runs / max_runs) * 100)}%` : "3px" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11.5px] text-boardtree-text-faint">
        <span>{format(new Date(`${daily[0].date}T00:00:00`), "MMM d")}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/** A ranked list where each row is a label, its bar and its count. */
function RankedBars({ rows }: { rows: { key: string; label: string; detail?: string; runs: number }[] }) {
  const max_runs = Math.max(1, ...rows.map((row) => row.runs));

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-boardtree-text">{row.label}</span>
            <span className="flex-none font-medium text-boardtree-text-secondary">{row.runs}</span>
          </div>
          {row.detail && <div className="truncate text-[11.5px] text-boardtree-text-faint">{row.detail}</div>}
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-boardtree-track">
            <div className="h-full rounded-full bg-boardtree-accent" style={{ width: `${(row.runs / max_runs) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const CARD = "rounded-[10px] border border-boardtree-border-soft bg-boardtree-surface p-4";

/**
 * Manage > Usage. How much this table's automations ran over the last 30 days, split by result,
 * by day, by automation and by action.
 */
export default function UsageTab({ board_id, view_id }: UsageTabProps) {
  const { usage, is_loading, error, refresh } = useAutomationUsage(board_id, view_id);

  if (error) return <InlineAlert message={error} onDismiss={refresh} action_label="Retry" />;
  if (is_loading || !usage) return <div className="py-12 text-center text-[13px] text-boardtree-text-muted">Loading usage...</div>;

  const success_rate = usage.runs > 0 ? `${Math.round((usage.success / usage.runs) * 100)}%` : "-";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-boardtree-text-muted">Automation activity on this table over the last {usage.period_days} days.</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Runs" value={String(usage.runs)} hint={`${usage.enabled_automations} of ${usage.automations} automations enabled`} />
        <StatTile label="Success rate" value={success_rate} hint={`${usage.success} successful`} />
        <StatTile label="Skipped" value={String(usage.skipped)} hint="Nothing to do" />
        <StatTile label="Failed" value={String(usage.failed)} hint="Could not be delivered" tone={usage.failed > 0 ? "danger" : undefined} />
      </div>

      <section className={CARD}>
        <h3 className="mb-3 text-[14px] font-semibold text-boardtree-text">Runs per day</h3>
        {usage.runs === 0 ? <p className="py-6 text-center text-[13px] text-boardtree-text-muted">No runs in this period.</p> : <DailyRunsChart daily={usage.daily} />}
      </section>

      {usage.runs > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className={CARD}>
            <h3 className="mb-3 text-[14px] font-semibold text-boardtree-text">Most active automations</h3>
            <RankedBars
              rows={usage.top_automations.map((row) => ({
                key: String(row.automation_id ?? `${row.trigger_type}:${row.action_type}`),
                label: row.automation_name || `${TRIGGER_LABELS[row.trigger_type]}, ${ACTION_LABELS[row.action_type]}`,
                detail: row.automation_id === null ? "Deleted automation" : undefined,
                runs: row.runs,
              }))}
            />
          </section>
          <section className={CARD}>
            <h3 className="mb-3 text-[14px] font-semibold text-boardtree-text">Runs by action</h3>
            <RankedBars rows={usage.by_action.map((row) => ({ key: row.action_type, label: ACTION_LABELS[row.action_type], runs: row.runs }))} />
          </section>
        </div>
      )}
    </div>
  );
}
