"use client";
import React, { useEffect, useState } from "react";
import { History, RotateCcw, X } from "lucide-react";
import type { BoardAutomationDto, BoardAutomationVersionDto, BoardAutomationVersionPart } from "@/types/board-automation";
import { boardAutomationService } from "@/services/board-automation.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type { AutomationBuilderContext } from "../../automations/builder/automationCatalog";
import { describeDefinition, type SentencePart } from "../../automations/builder/automationSentence";
import { formatDateTime, formatRelativeTime } from "./manageFormat";

export type VersionHistoryPanelProps = {
  board_id: number;
  automation: BoardAutomationDto;
  context: AutomationBuilderContext;
  onRestored: (automation: BoardAutomationDto) => void;
  onClose: () => void;
};

const PART_LABELS: Record<BoardAutomationVersionPart, string> = {
  trigger: "Trigger",
  conditions: "Conditions",
  actions: "Actions",
  else_actions: "Otherwise",
  details: "Name and settings",
};

function Sentence({ parts }: { parts: SentencePart[] }) {
  return (
    <p className="text-[13px] leading-snug text-boardtree-text-secondary">
      {parts.map((part, index) => (part.is_token ? <strong key={index} className="font-semibold text-boardtree-text">{part.text}</strong> : <span key={index}>{part.text}</span>))}
    </p>
  );
}

/**
 * Every saved version of one automation, newest first: who saved it, when, what changed from the
 * version before and the whole sentence as it was. Restoring writes that version back as a new
 * one, so nothing in the history is lost.
 */
export default function VersionHistoryPanel({ board_id, automation, context, onRestored, onClose }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<BoardAutomationVersionDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring_id, setRestoringId] = useState<number | null>(null);
  const [confirm_id, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    boardAutomationService
      .getVersions(board_id, automation.id)
      .then((data) => {
        if (!cancelled) setVersions(data);
      })
      .catch((failure) => {
        if (!cancelled) setError(apiErrorMessage(failure, "The version history could not be loaded."));
      });
    return () => {
      cancelled = true;
    };
    // Reloaded after every save, the count changes with each new version.
  }, [board_id, automation.id, automation.version_count]);

  const restore = async (version: BoardAutomationVersionDto) => {
    setRestoringId(version.id);
    setError(null);
    try {
      onRestored(await boardAutomationService.restoreVersion(board_id, automation.id, version.id));
      setConfirmId(null);
    } catch (failure) {
      setError(apiErrorMessage(failure, "The version could not be restored."));
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div role="dialog" aria-label="Version history" className="rounded-[8px] border border-boardtree-border-soft bg-boardtree-panel-alt px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-boardtree-text">
          <History size={14} />
          Version history
        </span>
        <button type="button" onClick={onClose} aria-label="Close version history" className="flex h-7 w-7 items-center justify-center rounded-[6px] text-boardtree-text-muted hover:bg-boardtree-hover">
          <X size={14} />
        </button>
      </div>

      {error && <div role="alert" className="mb-2 text-[12.5px] text-boardtree-danger">{error}</div>}
      {versions === null && !error && <div className="py-3 text-[12.5px] text-boardtree-text-muted">Loading versions...</div>}
      {versions?.length === 0 && <div className="py-3 text-[12.5px] text-boardtree-text-muted">No saved version yet. The next save starts the history.</div>}

      <ol className="flex max-h-[340px] flex-col gap-2 overflow-y-auto pr-1">
        {versions?.map((version, index) => {
          const is_current = index === 0;
          return (
            <li key={version.id} className="rounded-[8px] border border-boardtree-border-soft bg-boardtree-surface px-3 py-2.5">
              <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                <span className="font-semibold text-boardtree-text">Version {version.version}</span>
                {is_current && <span className="rounded-full bg-[#00c875]/[0.14] px-2 py-0.5 text-[11px] font-semibold text-[#0a9a5c]">Current</span>}
                <span className="text-boardtree-text-faint" title={formatDateTime(version.created_at)}>
                  {version.changed_by?.name ?? "Someone"}, {formatRelativeTime(version.created_at)}
                </span>
                {version.changed_parts.length > 0 ? (
                  version.changed_parts.map((part) => (
                    <span key={part} className="rounded-full bg-boardtree-hover px-2 py-0.5 text-[11px] text-boardtree-text-secondary">{PART_LABELS[part]} changed</span>
                  ))
                ) : (
                  <span className="rounded-full bg-boardtree-hover px-2 py-0.5 text-[11px] text-boardtree-text-secondary">{version.version === 1 ? "Created" : "Restored"}</span>
                )}
              </div>
              {version.snapshot.name && <div className="text-[12px] font-semibold uppercase tracking-wide text-boardtree-text-faint">{version.snapshot.name}</div>}
              <Sentence parts={describeDefinition({ ...version.snapshot, conditions: version.snapshot.conditions ?? [], actions: version.snapshot.actions ?? [] }, context)} />
              {!is_current && (
                <div className="mt-2 flex items-center justify-end gap-2">
                  {confirm_id === version.id ? (
                    <>
                      <span className="text-[12px] text-boardtree-text-secondary">Replace the current sentence with this one?</span>
                      <button type="button" disabled={restoring_id !== null} onClick={() => void restore(version)} className="h-7 rounded-[6px] bg-boardtree-accent px-3 text-[12px] font-medium text-white hover:bg-boardtree-accent-hover disabled:opacity-40">
                        {restoring_id === version.id ? "Restoring..." : "Restore"}
                      </button>
                      <button type="button" onClick={() => setConfirmId(null)} className="h-7 rounded-[6px] border border-boardtree-border px-3 text-[12px] text-boardtree-text hover:bg-boardtree-hover">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setConfirmId(version.id)} className="flex h-7 items-center gap-1 rounded-[6px] px-2 text-[12px] text-boardtree-accent hover:bg-boardtree-hover">
                      <RotateCcw size={13} />
                      Restore this version
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
