"use client";
import React from "react";
import type { BoardImportJobDto } from "@/types/board-import";

export type ImportProgressStepProps = {
  job: BoardImportJobDto | null;
  is_stopping: boolean;
  onStop: () => void;
  onDone: () => void;
};

const STATUS_COPY: Record<BoardImportJobDto["status"], { title: string; description: string }> = {
  queued: { title: "Queued…", description: "Your import is next in line — this usually starts within a few seconds." },
  processing: { title: "Importing your items…", description: "Feel free to keep this window open — you'll see this update as rows are saved." },
  completed: { title: "Import complete", description: "Every row has been saved to the board." },
  failed: { title: "Import failed", description: "Something went wrong partway through. Rows already saved were kept." },
  cancelled: { title: "Import stopped", description: "Rows already saved before you stopped it were kept." },
};

/**
 * Step 4 ("Importing…") — shown right after "Import Now" is pressed. Tracks
 * `useBoardImportProgress`'s live job snapshot: a progress bar + running
 * counts while `"queued"`/`"processing"`, and a summary + "Done" once the
 * background job (see `ProcessBoardImportJob`) reaches a terminal status.
 * The "Stop" button is only offered while there's still something to stop.
 */
const ImportProgressStep: React.FC<ImportProgressStepProps> = ({ job, is_stopping, onStop, onDone }) => {
  if (!job) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-16">
        <p className="text-[13.5px] text-shell-text-secondary">Starting the import…</p>
      </div>
    );
  }

  const is_running = job.status === "queued" || job.status === "processing";
  const copy = STATUS_COPY[job.status];
  const can_stop = is_running && !job.cancel_requested;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-14">
      <div className="w-full max-w-[480px] text-center">
        <span
          className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${
            job.status === "completed"
              ? "bg-success-500/15 text-success-500"
              : job.status === "failed"
                ? "bg-error-500/15 text-error-500"
                : "bg-brand-500/10 text-brand-500"
          }`}
        >
          {job.status === "completed" ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : job.status === "failed" ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={is_running ? "animate-spin" : undefined}>
              <path
                d="M12 3a9 9 0 1 0 9 9"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>

        <h2 className="text-[19px] font-semibold text-shell-text">{copy.title}</h2>
        <p className="mt-1.5 text-[13.5px] text-shell-text-secondary">{copy.description}</p>

        <div className="mt-7">
          <div className="h-2 w-full overflow-hidden rounded-full bg-shell-hover">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${
                job.status === "failed" ? "bg-error-500" : job.status === "completed" ? "bg-success-500" : "bg-brand-500"
              }`}
              style={{ width: `${job.percent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[12.5px] text-shell-text-muted">
            <span>
              {job.processed_rows} of {job.total_rows || "…"} rows
            </span>
            <span>{job.percent}%</span>
          </div>
        </div>

        {job.status !== "queued" && (
          <div className="mt-5 flex items-center justify-center gap-5 text-[12.5px] text-shell-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
              Created: {job.created_count}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Updated: {job.updated_count}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-shell-text-muted" />
              Skipped: {job.skipped_count}
            </span>
          </div>
        )}

        {job.error_message && <p className="mt-4 text-[13px] text-error-500">{job.error_message}</p>}

        <div className="mt-8">
          {is_running ? (
            <button
              type="button"
              onClick={onStop}
              disabled={!can_stop || is_stopping}
              className="rounded-lg border border-shell-border-strong px-5 py-2.5 text-[13.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:cursor-default disabled:opacity-50"
            >
              {job.cancel_requested ? "Stopping…" : is_stopping ? "Stopping…" : "Stop import"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onDone}
              className="rounded-lg bg-brand-500 px-6 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportProgressStep;
