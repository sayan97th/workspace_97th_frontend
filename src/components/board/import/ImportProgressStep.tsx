"use client";
import React from "react";
import type { BoardImportJobDto } from "@/types/board-import";
import { CheckIcon, Spinner, WarningIcon, XCircleIcon } from "./importIcons";

export type ImportProgressStepProps = {
  job: BoardImportJobDto | null;
  is_stopping: boolean;
  onStop: () => void;
  onDone: () => void;
};

const STATUS_COPY: Record<BoardImportJobDto["status"], { title: string; description: string }> = {
  queued: { title: "Getting ready…", description: "Your import is next in line, it usually starts within a few seconds." },
  processing: { title: "Importing your items…", description: "You can keep this window open and watch the rows come in." },
  completed: { title: "Import complete", description: "Every row has been saved to the board." },
  failed: { title: "Import failed", description: "Something went wrong partway through. Rows already saved were kept." },
  cancelled: { title: "Import stopped", description: "Rows saved before you stopped it were kept." },
};

const STATUS_TONE: Record<BoardImportJobDto["status"], "primary" | "success" | "danger" | "neutral"> = {
  queued: "primary",
  processing: "primary",
  completed: "success",
  failed: "danger",
  cancelled: "neutral",
};

/**
 * Step 4, shown right after "Import Now": tracks `useBoardImportProgress`'s
 * live job snapshot with a progress bar while the background job runs, then
 * a summary of what it created (items, updates, skips, columns, groups and
 * subitems) once it reaches a terminal status. "Stop import" is only offered
 * while there's still something to stop.
 */
const ImportProgressStep: React.FC<ImportProgressStepProps> = ({ job, is_stopping, onStop, onDone }) => {
  if (!job) {
    return (
      <div className="iw-progress" role="status">
        <span className="iw-progress-badge">
          <Spinner />
        </span>
        <p className="iw-step-subtitle">Starting the import…</p>
      </div>
    );
  }

  const is_running = job.status === "queued" || job.status === "processing";
  const copy = STATUS_COPY[job.status];
  const tone = STATUS_TONE[job.status];
  const can_stop = is_running && !job.cancel_requested;

  const summary = [
    { label: "Items created", value: job.created_count, always: true },
    { label: "Items updated", value: job.updated_count, always: false },
    { label: "Rows skipped", value: job.skipped_count, always: false },
    { label: "Subitems created", value: job.subitems_created ?? 0, always: false },
    { label: "Columns created", value: job.columns_created, always: false },
    { label: "Groups created", value: job.groups_created ?? 0, always: false },
  ].filter((entry) => entry.always || entry.value > 0);

  return (
    <div className="iw-progress">
      <div className="iw-progress-inner">
        <span className="iw-progress-badge" data-tone={tone} aria-hidden="true">
          {is_running ? (
            <Spinner />
          ) : job.status === "completed" ? (
            <CheckIcon size={28} />
          ) : job.status === "failed" ? (
            <WarningIcon size={28} />
          ) : (
            <XCircleIcon size={28} />
          )}
        </span>

        <h2 className="iw-step-title" aria-live="polite">
          {copy.title}
        </h2>
        <p className="iw-step-subtitle">{copy.description}</p>

        <div
          className="iw-progress-bar"
          data-tone={tone}
          role="progressbar"
          aria-label="Import progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={job.percent}
        >
          <span style={{ width: `${job.percent}%` }} />
        </div>
        <div className="iw-progress-count">
          <span>
            {job.processed_rows} of {job.total_rows || "…"} rows
          </span>
          <span>{job.percent}%</span>
        </div>

        {job.status !== "queued" && (
          <ul className="iw-summary">
            {summary.map((entry) => (
              <li key={entry.label}>
                <strong>{entry.value}</strong>
                <span>{entry.label}</span>
              </li>
            ))}
          </ul>
        )}

        {job.error_message && (
          <div className="iw-alert mx-auto mt-5 text-left" role="alert">
            <WarningIcon size={16} />
            <span>{job.error_message}</span>
          </div>
        )}

        <div className="iw-progress-actions">
          {is_running ? (
            <button type="button" className="iw-button" data-variant="secondary" onClick={onStop} disabled={!can_stop || is_stopping}>
              {job.cancel_requested || is_stopping ? "Stopping…" : "Stop import"}
            </button>
          ) : (
            <button type="button" className="iw-button" data-variant="primary" onClick={onDone}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportProgressStep;
