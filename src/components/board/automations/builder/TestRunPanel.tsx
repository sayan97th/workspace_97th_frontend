"use client";
import React, { useState } from "react";
import { CheckCircle2, CircleSlash, FlaskConical, XCircle } from "lucide-react";
import type { BoardAutomationRunStatus, BoardAutomationTestResult } from "@/types/board-automation";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { ACTION_LABELS, type AutomationBuilderContext, type NamedOption } from "./automationCatalog";
import { conditionFieldLabel } from "./automationSentence";
import type { ConditionDraft, ConditionGroupDraft } from "./builderDraft";
import { PickerList, POPOVER_INPUT } from "./builderUi";

export type TestRunPanelProps = {
  context: AutomationBuilderContext;
  /** Items of this table the test can run on. */
  items: NamedOption[];
  conditions: ConditionDraft[];
  groups?: ConditionGroupDraft[];
  /** The trigger has no item of its own (recurring, webhook), so the item is optional. */
  is_itemless: boolean;
  is_webhook: boolean;
  /** What still blocks a run, the same list the save button shows. */
  problems: string[];
  onRun: (item_id: number | null, payload: Record<string, unknown> | null) => Promise<BoardAutomationTestResult>;
};

const STATUS_STYLES: Record<BoardAutomationRunStatus, { icon: React.ReactNode; label: string; className: string }> = {
  success: { icon: <CheckCircle2 size={15} />, label: "Would run", className: "text-[#00854d]" },
  skipped: { icon: <CircleSlash size={15} />, label: "Skipped", className: "text-boardtree-text-muted" },
  failed: { icon: <XCircle size={15} />, label: "Would fail", className: "text-boardtree-danger" },
};

const SAMPLE_PAYLOAD = '{\n  "name": "Ada Lovelace",\n  "email": "ada@example.com"\n}';

/**
 * "Test run on an item": runs the sentence as it stands on one item, in a transaction the API
 * rolls back, and lists which conditions the item passes and what every action would do. Nothing
 * is saved and no notification, email, Slack message or webhook is sent.
 */
export default function TestRunPanel({ context, items, conditions, groups = [], is_itemless, is_webhook, problems, onRun }: TestRunPanelProps) {
  const [item_id, setItemId] = useState<string | null>(items[0]?.id ?? null);
  const [payload_text, setPayloadText] = useState(SAMPLE_PAYLOAD);
  const [is_running, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BoardAutomationTestResult | null>(null);

  const run = async () => {
    setError(null);
    let payload: Record<string, unknown> | null = null;
    if (is_webhook) {
      try {
        const parsed: unknown = JSON.parse(payload_text || "{}");
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
        payload = parsed as Record<string, unknown>;
      } catch {
        setError("The sample body must be a JSON object, like the one shown.");
        return;
      }
    }
    setIsRunning(true);
    try {
      setResult(await onRun(item_id ? Number(item_id) : null, payload));
    } catch (failure) {
      setResult(null);
      setError(apiErrorMessage(failure, "The test run could not start."));
    } finally {
      setIsRunning(false);
    }
  };

  const needs_item = !is_itemless;
  const can_run = problems.length === 0 && (!needs_item || item_id !== null) && !is_running;

  return (
    <section aria-label="Test run" className="mt-8 max-w-[640px] rounded-[10px] border border-boardtree-border-soft bg-boardtree-panel-alt p-4">
      <div className="mb-1 flex items-center gap-2 text-[14px] font-semibold text-boardtree-text">
        <FlaskConical size={16} className="text-boardtree-accent" />
        Test run
      </div>
      <p className="mb-3 text-[12.5px] leading-snug text-boardtree-text-secondary">
        Try the automation on an item before turning it on. Nothing is saved and no notification, email, Slack message or webhook is sent.
      </p>

      {!is_itemless && (
        <div className="mb-3">
          <div className="mb-1 text-[12px] font-medium text-boardtree-text-secondary">Item</div>
          {items.length === 0 ? (
            <div className="text-[12.5px] text-boardtree-text-faint">This table has no item to test on yet.</div>
          ) : (
            <div className="max-w-[360px] rounded-[8px] border border-boardtree-border bg-boardtree-surface p-1.5">
              <PickerList sections={[{ entries: items }]} selected={item_id} onPick={setItemId} placeholder="Search items" max_height={160} />
            </div>
          )}
        </div>
      )}

      {is_webhook && (
        <label className="mb-3 block">
          <span className="mb-1 block text-[12px] font-medium text-boardtree-text-secondary">Sample body (JSON)</span>
          <textarea
            rows={5}
            value={payload_text}
            onChange={(event) => setPayloadText(event.target.value)}
            aria-label="Sample body"
            spellCheck={false}
            className={`${POPOVER_INPUT} !h-auto resize-y py-2 font-mono text-[12px]`}
          />
        </label>
      )}

      {problems.length > 0 && <div className="mb-3 text-[12.5px] text-boardtree-text-muted">Finish the sentence to test it: {problems[0].charAt(0).toLowerCase()}{problems[0].slice(1)}</div>}

      <button
        type="button"
        onClick={() => void run()}
        disabled={!can_run}
        className="h-9 rounded-[4px] border border-boardtree-accent px-4 text-[13px] font-medium text-boardtree-accent hover:bg-boardtree-accent-surface disabled:opacity-40"
      >
        {is_running ? "Running..." : "Run test"}
      </button>

      {error && <div role="alert" className="mt-3 text-[12.5px] text-boardtree-danger">{error}</div>}

      {result && (
        <div className="mt-4 flex flex-col gap-3" aria-live="polite">
          {result.conditions.length > 0 && (
            <div>
              <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-boardtree-text-faint">Conditions</div>
              <ul className="flex flex-col gap-1">
                {result.conditions.map((entry) => (
                  <li key={entry.index} className={`flex items-center gap-2 text-[13px] ${entry.passes ? "text-[#00854d]" : "text-boardtree-danger"}`}>
                    {entry.passes ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                    <span className="text-boardtree-text">{conditions[entry.index] ? conditionFieldLabel(context, conditions[entry.index].column_id) : `Condition ${entry.index + 1}`}</span>
                    <span>{entry.passes ? "passes" : "does not pass"}</span>
                  </li>
                ))}
                {(result.groups ?? []).map((entry) => (
                  <li key={`group_${entry.index}`} className={`flex items-center gap-2 text-[13px] ${entry.passes ? "text-[#00854d]" : "text-boardtree-danger"}`}>
                    {entry.passes ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                    <span className="text-boardtree-text">Group {entry.index + 1}{groups[entry.index] ? ` (${groups[entry.index].rules.length} conditions)` : ""}</span>
                    <span>{entry.passes ? "matches" : "does not match"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!result.passes && result.branch !== "else" ? (
            <div className="rounded-[8px] bg-boardtree-surface px-3 py-2 text-[12.5px] text-boardtree-text-secondary">
              {result.item ? `"${result.item.name}"` : "The item"} does not meet the conditions, so no action would run.
            </div>
          ) : (
            <div>
              {result.branch === "else" && (
                <div className="mb-2 rounded-[8px] bg-boardtree-surface px-3 py-2 text-[12.5px] text-boardtree-text-secondary">
                  {result.item ? `"${result.item.name}"` : "The item"} does not meet the conditions, so the &quot;otherwise&quot; actions run.
                </div>
              )}
              <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-boardtree-text-faint">Actions</div>
              {result.actions.length === 0 ? (
                <div className="text-[12.5px] text-boardtree-text-muted">No action ran.</div>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {result.actions.map((entry, index) => {
                    const style = STATUS_STYLES[entry.status];
                    return (
                      <li key={index} className="flex items-start gap-2 rounded-[8px] bg-boardtree-surface px-3 py-2 text-[13px]">
                        <span className={`mt-0.5 flex-none ${style.className}`} title={style.label}>{style.icon}</span>
                        <span className="min-w-0">
                          <span className="font-medium text-boardtree-text">{ACTION_LABELS[entry.action_type] ?? entry.action_type}</span>
                          {entry.branch === "else" && !entry.is_chained && <span className="ml-1.5 rounded-full bg-boardtree-hover px-1.5 py-0.5 text-[11px] text-boardtree-text-secondary">otherwise</span>}
                          {entry.is_chained && <span className="ml-1.5 rounded-full bg-boardtree-hover px-1.5 py-0.5 text-[11px] text-boardtree-text-secondary">chained: {entry.automation_name}</span>}
                          <span className="block text-[12.5px] text-boardtree-text-secondary">{entry.message}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
