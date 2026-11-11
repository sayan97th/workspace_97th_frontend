"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useBoardExportProgress } from "@/hooks/useBoardExportProgress";
import { getApiErrorMessage } from "@/lib/api-error";
import { boardExportService } from "@/services/board-export.service";
import type { BoardExportJobDto, BoardExportLayout, BoardExportSummary } from "@/types/board-export";
import "./export-board-modal.scss";

export type ExportBoardModalProps = {
  is_open: boolean;
  onClose: () => void;
  board_id: number;
  board_label: string;
  /** The tab to export, the primary tab when omitted. */
  view_id?: number | null;
  /** The group menu's "Export to Excel" exports only this group. */
  group?: { id: number; name: string } | null;
};

/** The last layout and switches someone picked, so the next export starts the same way. */
const PREFERENCES_KEY = "board-export-preferences";

type ExportPreferences = { layout: BoardExportLayout; include_subitems: boolean; include_hidden_columns: boolean };

const DEFAULT_PREFERENCES: ExportPreferences = { layout: "grouped", include_subitems: true, include_hidden_columns: true };

function readPreferences(): ExportPreferences {
  try {
    const stored = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "null") as Partial<ExportPreferences> | null;
    if (!stored) return DEFAULT_PREFERENCES;
    return {
      layout: stored.layout === "flat" ? "flat" : "grouped",
      include_subitems: stored.include_subitems !== false,
      include_hidden_columns: stored.include_hidden_columns !== false,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function savePreferences(preferences: ExportPreferences): void {
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Private windows may refuse storage, the defaults are fine.
  }
}

const formatCount = (value: number) => value.toLocaleString("en-US");

const plural = (count: number, one: string, many: string) => `${formatCount(count)} ${count === 1 ? one : many}`;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatRemaining(seconds: number): string {
  if (seconds < 5) return "Almost done";
  if (seconds < 60) return `About ${Math.ceil(seconds / 5) * 5} seconds left`;
  const minutes = Math.ceil(seconds / 60);
  return `About ${minutes} ${minutes === 1 ? "minute" : "minutes"} left`;
}

function viewerTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Board options menu's "More actions" > "Export board to Excel", and the
 * group menu's "Export to Excel".
 *
 * Three views in one card, monday style:
 * 1. Setup: what will be exported (groups, items, subitems, columns), the
 *    layout ("Like the board" or "Single table") and two switches.
 * 2. Progress: the export runs as a background job on the API (see
 *    `BoardExportController`), followed live through
 *    {@link useBoardExportProgress}. The dialog can be closed meanwhile, the
 *    component stays mounted, keeps following the job and still downloads
 *    the file (with a toast) once it is ready.
 * 3. Ready: the download starts on its own through a signed link, with a
 *    "Download again" fallback.
 */
const ExportBoardModal: React.FC<ExportBoardModalProps> = ({ is_open, onClose, board_id, board_label, view_id, group = null }) => {
  const toast = useToast();
  const [summary, setSummary] = useState<BoardExportSummary | null>(null);
  const [summary_error, setSummaryError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<ExportPreferences>(DEFAULT_PREFERENCES);
  const [is_starting, setIsStarting] = useState(false);
  const [start_error, setStartError] = useState<string | null>(null);
  const [seed_job, setSeedJob] = useState<BoardExportJobDto | null>(null);
  const [is_cancelling, setIsCancelling] = useState(false);
  const job = useBoardExportProgress(board_id, seed_job);

  const [remaining_label, setRemainingLabel] = useState<string | null>(null);
  const is_open_ref = useRef(is_open);
  useEffect(() => {
    is_open_ref.current = is_open;
  }, [is_open]);
  const downloaded_job_ids = useRef(new Set<number>());
  const reported_job_ids = useRef(new Set<number>());
  const rate_sample = useRef<{ job_id: number; started_at: number; start_rows: number } | null>(null);

  const group_id = group?.id ?? null;
  const is_running = job !== null && (job.status === "queued" || job.status === "processing");

  // Opening the dialog after a finished export starts over on the setup view.
  useEffect(() => {
    if (!is_open) return;
    setPreferences(readPreferences());
    setStartError(null);
    if (job && !is_running) setSeedJob(null);
    // Only the open transition matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_open]);

  // Counts of what the chosen tab or group holds.
  useEffect(() => {
    if (!is_open) return;
    let is_current = true;
    setSummary(null);
    setSummaryError(null);
    boardExportService
      .getSummary(board_id, view_id, group_id)
      .then((result) => is_current && setSummary(result))
      .catch((error) => is_current && setSummaryError(getApiErrorMessage(error, "Couldn't read the board. Please try again.")));
    return () => {
      is_current = false;
    };
  }, [is_open, board_id, view_id, group_id]);

  const handleDownload = useCallback((target: BoardExportJobDto) => {
    if (!boardExportService.download(target)) {
      toast.error("This export has expired", { description: "Export the board again to get a fresh file." });
    }
  }, [toast]);

  // The finished file downloads on its own, once, whether or not the dialog is still open.
  useEffect(() => {
    if (!job || reported_job_ids.current.has(job.id)) return;

    if (job.status === "completed") {
      reported_job_ids.current.add(job.id);
      if (!downloaded_job_ids.current.has(job.id)) {
        downloaded_job_ids.current.add(job.id);
        handleDownload(job);
      }
      if (!is_open_ref.current) {
        toast.success("Your Excel export is ready", {
          description: job.file_name,
          action_text: "Download again",
          onAction: () => handleDownload(job),
        });
      }
    } else if (job.status === "failed") {
      reported_job_ids.current.add(job.id);
      if (!is_open_ref.current) toast.error("The export failed", { description: job.error_message ?? "Please try again." });
    } else if (job.status === "cancelled") {
      reported_job_ids.current.add(job.id);
    }
  }, [job, handleDownload, toast]);

  // Escape closes, the page behind doesn't scroll while the dialog is open.
  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previous_overflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [is_open, onClose]);

  const updatePreferences = (patch: Partial<ExportPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch };
      savePreferences(next);
      return next;
    });
  };

  const handleStart = async () => {
    setIsStarting(true);
    setStartError(null);
    try {
      const started = await boardExportService.start(board_id, {
        view_id: view_id ?? null,
        group_id,
        layout: preferences.layout,
        include_subitems: preferences.include_subitems && (summary?.subitems ?? 0) > 0,
        include_hidden_columns: preferences.include_hidden_columns,
        time_zone: viewerTimeZone(),
      });
      rate_sample.current = null;
      setSeedJob(started);
    } catch (error) {
      setStartError(getApiErrorMessage(error, "Couldn't start the export. Please try again."));
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancel = async () => {
    if (!job) return;
    setIsCancelling(true);
    try {
      const cancelled = await boardExportService.cancel(board_id, job.id);
      setSeedJob(cancelled.status === "cancelled" ? null : cancelled);
      if (cancelled.status === "cancelled") toast.info("Export stopped");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't stop the export."));
    } finally {
      setIsCancelling(false);
    }
  };

  // A cancelled export (stopped from here or elsewhere) returns to the setup view.
  useEffect(() => {
    if (job?.status === "cancelled") setSeedJob(null);
  }, [job?.status]);

  // Remaining time, from the rows written since the first progress update.
  useEffect(() => {
    if (!job || job.status !== "processing" || job.total_rows <= 0) {
      setRemainingLabel(null);
      return;
    }
    const now = Date.now();
    const sample = rate_sample.current;
    if (!sample || sample.job_id !== job.id) {
      rate_sample.current = { job_id: job.id, started_at: now, start_rows: job.processed_rows };
      setRemainingLabel(null);
      return;
    }
    const elapsed_seconds = (now - sample.started_at) / 1000;
    const written = job.processed_rows - sample.start_rows;
    setRemainingLabel(elapsed_seconds < 2 || written <= 0 ? null : formatRemaining((job.total_rows - job.processed_rows) / (written / elapsed_seconds)));
  }, [job]);

  if (!is_open || typeof document === "undefined") return null;

  const view: "setup" | "progress" | "ready" | "failed" =
    job === null ? "setup" : job.status === "completed" ? "ready" : job.status === "failed" ? "failed" : "progress";

  const scope_label = group ? (
    <>
      <strong>{group.name}</strong> group of {board_label}
    </>
  ) : (
    <>
      <strong>{board_label}</strong>
      {summary?.view_label ? `, ${summary.view_label}` : ""}
    </>
  );

  const total_rows = summary ? summary.items + (preferences.include_subitems ? summary.subitems : 0) : 0;
  const has_subitems = (summary?.subitems ?? 0) > 0;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="bx-title" className="bx-overlay">
      <div className="bx-backdrop" onClick={onClose} aria-hidden="true" />

      <div className="bx-dialog">
        <header className="bx-header">
          <span className="bx-file-badge" aria-hidden="true">
            <SpreadsheetIcon />
          </span>
          <div className="bx-heading">
            <h2 id="bx-title" className="bx-title">
              Export to Excel
            </h2>
            <p className="bx-subtitle">{scope_label}</p>
          </div>
          <button type="button" className="bx-icon-button" onClick={onClose} aria-label={is_running ? "Hide, the export keeps running" : "Close"}>
            <CloseIcon />
          </button>
        </header>

        <div className="bx-body">
          {view === "setup" && (
            <>
              <div className="bx-stats" aria-live="polite">
                <Stat label={summary?.groups === 1 ? "Group" : "Groups"} value={summary?.groups} />
                <Stat label={summary?.items === 1 ? "Item" : "Items"} value={summary?.items} />
                <Stat label={summary?.subitems === 1 ? "Subitem" : "Subitems"} value={summary?.subitems} />
                <Stat label={summary?.columns === 1 ? "Column" : "Columns"} value={summary ? summary.columns + 1 : undefined} />
              </div>

              <p className="bx-section-label" id="bx-layout-label">
                Layout
              </p>
              <div className="bx-layouts" role="radiogroup" aria-labelledby="bx-layout-label">
                <LayoutCard
                  is_selected={preferences.layout === "grouped"}
                  onSelect={() => updatePreferences({ layout: "grouped" })}
                  name="Like the board"
                  hint="Each group with its own header, subitems tucked under their item."
                  preview={<GroupedPreview />}
                />
                <LayoutCard
                  is_selected={preferences.layout === "flat"}
                  onSelect={() => updatePreferences({ layout: "flat" })}
                  name="Single table"
                  hint="One header row with filters and a Group column, ready for sorting and pivots."
                  preview={<FlatPreview />}
                />
              </div>

              <p className="bx-section-label">Include</p>
              <div className="bx-options">
                <OptionSwitch
                  icon={<SubitemsIcon />}
                  title="Subitems"
                  hint={
                    !summary
                      ? "Counting subitems..."
                      : !has_subitems
                        ? "This board has no subitems"
                        : preferences.layout === "flat"
                          ? `${plural(summary.subitems, "subitem", "subitems")} on their own sheet`
                          : `${plural(summary.subitems, "subitem", "subitems")} as collapsible rows under their item`
                  }
                  is_checked={preferences.include_subitems && has_subitems}
                  is_disabled={!has_subitems}
                  onToggle={() => updatePreferences({ include_subitems: !preferences.include_subitems })}
                />
                {(summary?.hidden_columns ?? 0) > 0 && (
                  <OptionSwitch
                    icon={<HiddenIcon />}
                    title="Hidden columns"
                    hint={`${plural(summary?.hidden_columns ?? 0, "column is", "columns are")} hidden in this view`}
                    is_checked={preferences.include_hidden_columns}
                    onToggle={() => updatePreferences({ include_hidden_columns: !preferences.include_hidden_columns })}
                  />
                )}
              </div>

              {(start_error || summary_error) && (
                <div className="bx-alert" role="alert">
                  <AlertIcon />
                  <span>{start_error ?? summary_error}</span>
                </div>
              )}
            </>
          )}

          {view === "progress" && job && (
            <div className="bx-progress" aria-live="polite">
              <ProgressArt />
              {job.status === "queued" ? (
                <>
                  <div className="bx-percent bx-percent--label">Getting ready</div>
                  <div className="bx-progress-label">Your export is next in line</div>
                </>
              ) : (
                <>
                  <div className="bx-percent">{job.percent}%</div>
                  <div className="bx-progress-label">
                    {job.total_rows > 0 ? `Writing ${formatCount(job.processed_rows)} of ${plural(job.total_rows, "row", "rows")}` : "Reading the board..."}
                  </div>
                </>
              )}
              <div
                className={`bx-track ${job.status === "queued" ? "is-indeterminate" : ""}`}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={job.status === "queued" ? undefined : job.percent}
                aria-label="Export progress"
              >
                <div className="bx-track__fill" style={{ width: `${Math.max(job.percent, 2)}%` }} />
              </div>
              <div className="bx-progress-meta">
                <span>{job.layout === "flat" ? "Single table" : "Like the board"}</span>
                <span>{remaining_label ?? (job.cancel_requested ? "Stopping..." : " ")}</span>
              </div>
              <div className="bx-note">
                <InfoIcon />
                <span>You can close this window and keep working. The file downloads as soon as it is ready.</span>
              </div>
            </div>
          )}

          {view === "ready" && job && (
            <div className="bx-result" aria-live="polite">
              <svg className="bx-check" viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r="30" />
                <path d="M20 33 L28 41 L44 24" />
              </svg>
              <h3 className="bx-result__title">Your file is ready</h3>
              <p className="bx-result__text">
                The download started on its own.{" "}
                <button type="button" className="bx-button bx-button--link" onClick={() => handleDownload(job)}>
                  Download again
                </button>
              </p>
              <div className="bx-file-card">
                <span className="bx-file-card__icon" aria-hidden="true">
                  <SpreadsheetIcon />
                </span>
                <div className="bx-file-card__text">
                  <div className="bx-file-card__name" title={job.file_name}>
                    {job.file_name}
                  </div>
                  <div className="bx-file-card__meta">
                    {plural(job.processed_rows, "row", "rows")}, {plural(job.column_count, "column", "columns")}, {formatBytes(job.file_size_bytes)}
                  </div>
                </div>
              </div>
              <div className="bx-note">
                <InfoIcon />
                <span>The link stays available for 24 hours.</span>
              </div>
            </div>
          )}

          {view === "failed" && job && (
            <div className="bx-result" role="alert">
              <svg className="bx-check is-error" viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r="30" />
                <path d="M24 24 L40 40 M40 24 L24 40" />
              </svg>
              <h3 className="bx-result__title">The export didn&apos;t finish</h3>
              <p className="bx-result__text">{job.error_message ?? "Something went wrong while writing the file. Please try again."}</p>
            </div>
          )}
        </div>

        <footer className="bx-footer">
          {view === "setup" && (
            <>
              <span className="bx-footer__hint">
                <BoltIcon />
                {summary ? `${plural(total_rows, "row", "rows")}, exported in the background` : "Exported in the background"}
              </span>
              <button type="button" className="bx-button bx-button--ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="bx-button bx-button--primary" onClick={() => void handleStart()} disabled={!summary || is_starting}>
                {is_starting ? <span className="bx-spinner" aria-hidden="true" /> : <DownloadIcon />}
                {is_starting ? "Starting..." : "Export"}
              </button>
            </>
          )}

          {view === "progress" && (
            <>
              <button type="button" className="bx-button bx-button--danger" onClick={() => void handleCancel()} disabled={is_cancelling || job?.cancel_requested}>
                {is_cancelling || job?.cancel_requested ? "Stopping..." : "Stop export"}
              </button>
              <span className="bx-footer__spacer" />
              <button type="button" className="bx-button bx-button--secondary" onClick={onClose}>
                Hide
              </button>
            </>
          )}

          {view === "ready" && (
            <>
              <button type="button" className="bx-button bx-button--ghost" onClick={() => setSeedJob(null)}>
                Export again
              </button>
              <span className="bx-footer__spacer" />
              <button type="button" className="bx-button bx-button--primary" onClick={onClose}>
                Done
              </button>
            </>
          )}

          {view === "failed" && (
            <>
              <button type="button" className="bx-button bx-button--ghost" onClick={onClose}>
                Close
              </button>
              <span className="bx-footer__spacer" />
              <button type="button" className="bx-button bx-button--primary" onClick={() => setSeedJob(null)}>
                Try again
              </button>
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default ExportBoardModal;

// ── Pieces ──────────────────────────────────────────────────────────

const Stat: React.FC<{ label: string; value: number | undefined }> = ({ label, value }) => (
  <div className="bx-stat">
    {value === undefined ? <span className="bx-stat__skeleton" aria-hidden="true" /> : <span className="bx-stat__value">{formatCount(value)}</span>}
    <span className="bx-stat__label">{label}</span>
  </div>
);

const LayoutCard: React.FC<{ is_selected: boolean; onSelect: () => void; name: string; hint: string; preview: React.ReactNode }> = ({
  is_selected,
  onSelect,
  name,
  hint,
  preview,
}) => (
  <button type="button" role="radio" aria-checked={is_selected} className={`bx-layout-card ${is_selected ? "is-selected" : ""}`} onClick={onSelect}>
    <span className="bx-layout-card__check" aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 6.2 5 8.6 9.5 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
    <span className="bx-layout-card__preview" aria-hidden="true">
      {preview}
    </span>
    <span>
      <span className="bx-layout-card__name">{name}</span>
      <span className="bx-layout-card__hint" style={{ display: "block" }}>
        {hint}
      </span>
    </span>
  </button>
);

const OptionSwitch: React.FC<{
  icon: React.ReactNode;
  title: string;
  hint: string;
  is_checked: boolean;
  is_disabled?: boolean;
  onToggle: () => void;
}> = ({ icon, title, hint, is_checked, is_disabled = false, onToggle }) => (
  <div className={`bx-option ${is_disabled ? "is-disabled" : ""}`} onClick={() => !is_disabled && onToggle()}>
    <span className="bx-option__icon" aria-hidden="true">
      {icon}
    </span>
    <span className="bx-option__text">
      <span className="bx-option__title" style={{ display: "block" }}>
        {title}
      </span>
      <span className="bx-option__hint">{hint}</span>
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={is_checked}
      aria-label={`Include ${title.toLowerCase()}`}
      className="bx-switch"
      disabled={is_disabled}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    />
  </div>
);

const ProgressArt: React.FC = () => (
  <div className="bx-progress-art" aria-hidden="true">
    <div className="bx-progress-art__sheet">
      <div className="bx-progress-art__bar" />
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="bx-progress-art__row">
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
    <span className="bx-progress-art__arrow">
      <DownloadIcon />
    </span>
  </div>
);

/** A small sheet with two colored group blocks, each with a header row and a tucked in subitem row. */
const GroupedPreview: React.FC = () => (
  <svg viewBox="0 0 220 96" className="bx-sheet">
    <rect x="12" y="10" width="54" height="6" rx="3" fill="#579bfc" />
    <rect x="12" y="20" width="196" height="7" rx="2" className="bx-sheet__header" />
    {[30, 39].map((y) => (
      <g key={y}>
        <rect x="12" y={y} width="3" height="7" fill="#579bfc" />
        <rect x="17" y={y} width="56" height="7" rx="2" className="bx-sheet__cell" />
        <rect x="77" y={y} width="40" height="7" rx="2" fill={y === 30 ? "#00c875" : "#fdab3d"} />
        <rect x="121" y={y} width="87" height="7" rx="2" className="bx-sheet__cell" />
      </g>
    ))}
    <rect x="26" y="48" width="70" height="5" rx="2" className="bx-sheet__line" />
    <rect x="12" y="62" width="44" height="6" rx="3" fill="#a25ddc" />
    <rect x="12" y="72" width="196" height="7" rx="2" className="bx-sheet__header" />
    <rect x="12" y="82" width="3" height="7" fill="#a25ddc" />
    <rect x="17" y="82" width="56" height="7" rx="2" className="bx-sheet__cell" />
    <rect x="77" y="82" width="40" height="7" rx="2" fill="#e2445c" />
    <rect x="121" y="82" width="87" height="7" rx="2" className="bx-sheet__cell" />
  </svg>
);

/** A small sheet with one header row carrying filter arrows and evenly striped rows. */
const FlatPreview: React.FC = () => (
  <svg viewBox="0 0 220 96" className="bx-sheet">
    <rect x="12" y="10" width="196" height="9" rx="2" className="bx-sheet__header" />
    {[44, 106, 168].map((x) => (
      <path key={x} d={`M${x} 13 l3 3 l3 -3`} fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
    ))}
    {[23, 33, 43, 53, 63, 73, 83].map((y, index) => (
      <g key={y}>
        <rect x="12" y={y} width="36" height="7" rx="2" className="bx-sheet__line" />
        <rect x="52" y={y} width="58" height="7" rx="2" className="bx-sheet__cell" />
        <rect x="114" y={y} width="40" height="7" rx="2" fill={["#00c875", "#fdab3d", "#e2445c", "#00c875", "#579bfc", "#fdab3d", "#00c875"][index]} />
        <rect x="158" y={y} width="50" height="7" rx="2" className="bx-sheet__cell" />
      </g>
    ))}
  </svg>
);

// ── Icons ───────────────────────────────────────────────────────────

const SpreadsheetIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M3.5 9h17M3.5 14.5h17M9.5 9v11.5" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const DownloadIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SubitemsIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 3v6.5a2 2 0 0 0 2 2h3M8 4.5h5M10.5 11.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const HiddenIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2 8s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4Z" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.4" />
    <path d="M3 13 13 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const BoltIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8l1-5.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

const InfoIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
    <path d="M8 7.2v3.6M8 5.1v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const AlertIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 1.8 14.5 13.5h-13L8 1.8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M8 6.3v3.2M8 11.4v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
