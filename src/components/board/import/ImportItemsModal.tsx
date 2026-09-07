"use client";
import React, { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/icons/workspace-icons";
import { useBoardImportProgress } from "@/hooks/useBoardImportProgress";
import { boardImportService } from "@/services/board-import.service";
import type {
  BoardImportAnalyzeResponse,
  BoardImportDuplicateMode,
  BoardImportJobDto,
  BoardImportMapping,
} from "@/types/board-import";
import ImportUploadStep from "./ImportUploadStep";
import ImportMapColumnsStep from "./ImportMapColumnsStep";
import ImportHandleMatchesStep from "./ImportHandleMatchesStep";
import ImportProgressStep from "./ImportProgressStep";
import { importErrorMessage, suggestGroupName } from "./importWizardUtils";

export type ImportItemsModalProps = {
  is_open: boolean;
  onClose: () => void;
  board_id: number;
  /** The currently open tab — the import always lands on this tab. */
  view_id: number | null;
  /** Fired once the background job has actually written rows (as soon as it reaches a terminal status with a target table), so the caller can refresh its columns/groups/items. */
  onImported: (result: { group_id: number }) => void;
};

type WizardStep = "upload" | "map" | "match" | "progress";

const STEPS: { id: Exclude<WizardStep, "progress">; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "map", label: "Map columns" },
  { id: "match", label: "Handle matches" },
];

/**
 * Board options menu's "More actions" > "Import items" — a wizard for
 * bulk-importing a .csv/.xlsx/.xls file into the current tab, either into a
 * new table or an existing one: "Upload" (pick a file) → "Map columns"
 * (choose each column's destination) → "Handle matches" (dedupe strategy) →
 * "Importing…" (live progress on the background job, with a "Stop" button —
 * see {@link useBoardImportProgress} and `ProcessBoardImportJob`). Owns the
 * whole flow itself; the caller only needs to render it and refresh its own
 * board data from {@link ImportItemsModalProps.onImported}.
 */
const ImportItemsModal: React.FC<ImportItemsModalProps> = ({ is_open, onClose, board_id, view_id, onImported }) => {
  const [step, setStep] = useState<WizardStep>("upload");
  const [is_analyzing, setIsAnalyzing] = useState(false);
  const [is_starting_import, setIsStartingImport] = useState(false);
  const [is_stopping, setIsStopping] = useState(false);
  const [upload_error, setUploadError] = useState<string | null>(null);
  const [map_error, setMapError] = useState<string | null>(null);
  const [start_error, setStartError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<BoardImportAnalyzeResponse | null>(null);
  const [mappings, setMappings] = useState<BoardImportMapping[]>([]);
  const [target_group_id, setTargetGroupId] = useState<number | null>(null);
  const [new_group_name, setNewGroupName] = useState("");
  const [duplicate_mode, setDuplicateMode] = useState<BoardImportDuplicateMode>("add");
  const [match_source_index, setMatchSourceIndex] = useState<number | null>(null);

  const [seed_job, setSeedJob] = useState<BoardImportJobDto | null>(null);
  const job = useBoardImportProgress(board_id, seed_job);
  const has_reported_import_ref = useRef(false);

  useEffect(() => {
    if (!is_open) return;
    setStep("upload");
    setIsAnalyzing(false);
    setIsStartingImport(false);
    setIsStopping(false);
    setUploadError(null);
    setMapError(null);
    setStartError(null);
    setAnalysis(null);
    setMappings([]);
    setTargetGroupId(null);
    setNewGroupName("");
    setDuplicateMode("add");
    setMatchSourceIndex(null);
    setSeedJob(null);
    has_reported_import_ref.current = false;
  }, [is_open]);

  // Refreshes the caller's board data the moment the job reaches a terminal
  // status with rows actually written — before the viewer even clicks
  // "Done" — so the table's already current by the time they close the
  // wizard. Guarded by a ref (not state) so a later poll/broadcast update
  // carrying the same terminal status doesn't fire this a second time.
  useEffect(() => {
    if (!job || has_reported_import_ref.current) return;
    const is_terminal = job.status === "completed" || job.status === "failed" || job.status === "cancelled";
    if (is_terminal && job.group_id !== null && job.processed_rows > 0) {
      has_reported_import_ref.current = true;
      onImported({ group_id: job.group_id });
    }
  }, [job, onImported]);

  if (!is_open) return null;

  const handleFileSelected = async (file: File) => {
    setUploadError(null);
    setIsAnalyzing(true);
    try {
      const result = await boardImportService.analyze(board_id, file, view_id);
      setAnalysis(result);
      setMappings(result.suggested_mappings);
      setNewGroupName(suggestGroupName(result.file_name));
      const name_mapping = result.suggested_mappings.find((mapping) => mapping.mode === "name");
      setMatchSourceIndex(name_mapping?.source_index ?? 0);
      setStep("map");
    } catch (error) {
      setUploadError(
        importErrorMessage(error, "We couldn't read that file. Make sure it's a .csv, .xlsx or .xls file and try again.")
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleContinueFromMap = () => {
    if (!mappings.some((mapping) => mapping.mode === "name")) {
      setMapError("Choose which column is the item's name before continuing.");
      return;
    }
    if (target_group_id === null && new_group_name.trim() === "") {
      setMapError("Give the new table a name before continuing.");
      return;
    }
    setMapError(null);
    setStep("match");
  };

  const handleBack = () => {
    if (step === "map") {
      setStep("upload");
      setAnalysis(null);
      setMappings([]);
    } else if (step === "match") {
      setStep("map");
    }
  };

  const handleStartImport = async () => {
    if (!analysis) return;
    setStartError(null);
    setIsStartingImport(true);
    try {
      const created_job = await boardImportService.commit(board_id, {
        import_token: analysis.import_token,
        view_id,
        target_group_id,
        new_group_name: target_group_id === null ? new_group_name.trim() || suggestGroupName(analysis.file_name) : null,
        mappings,
        duplicate_mode,
        match_source_index,
      });
      setSeedJob(created_job);
      setStep("progress");
    } catch (error) {
      setStartError(importErrorMessage(error, "Couldn't start the import. Please try again."));
    } finally {
      setIsStartingImport(false);
    }
  };

  const handleStop = async () => {
    if (!job) return;
    setIsStopping(true);
    try {
      const updated = await boardImportService.cancel(board_id, job.id);
      setSeedJob(updated);
    } catch {
      // The next poll tick / broadcast will reconcile the real state either way.
    } finally {
      setIsStopping(false);
    }
  };

  const matchable_columns = mappings
    .filter((mapping) => mapping.mode === "name" || mapping.mode === "map" || mapping.mode === "create")
    .map((mapping) => {
      const source = analysis?.source_columns.find((column) => column.index === mapping.source_index);
      const label =
        mapping.mode === "name"
          ? "Item (name)"
          : mapping.mode === "create"
            ? mapping.new_label || source?.label || "Untitled"
            : analysis?.board_columns.find((column) => column.id === mapping.target_column_id)?.label ?? source?.label ?? "Untitled";
      return { source_index: mapping.source_index, label };
    });

  const mapped_count = mappings.filter((mapping) => mapping.mode === "name" || mapping.mode === "map").length;
  const create_count = mappings.filter((mapping) => mapping.mode === "create").length;
  const skip_count = mappings.filter((mapping) => mapping.mode === "skip").length;

  const step_index = STEPS.findIndex((entry) => entry.id === step);
  const can_go_back = step === "map" || step === "match";

  return (
    <div role="dialog" aria-modal="true" aria-label="Import items" className="fixed inset-0 z-[430] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[431] flex h-[min(760px,92vh)] w-[min(1080px,94vw)] flex-col overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-2xl">
        <div className="flex items-center justify-between border-b border-shell-border px-7 py-4">
          <div className="flex w-[90px] items-center">
            {can_go_back && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step === "progress"
              ? STEPS.map((entry, index) => (
                  <React.Fragment key={entry.id}>
                    {index > 0 && <span className="h-px w-8 bg-brand-500" />}
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-500 text-white">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </React.Fragment>
                ))
              : STEPS.map((entry, index) => {
                  const is_current = index === step_index;
                  const is_done = index < step_index;
                  return (
                    <React.Fragment key={entry.id}>
                      {index > 0 && <span className="h-px w-8 bg-shell-border-strong" />}
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11.5px] font-semibold ${
                            is_done
                              ? "bg-brand-500 text-white"
                              : is_current
                                ? "border-2 border-brand-500 text-brand-500"
                                : "border border-shell-border-strong text-shell-text-muted"
                          }`}
                        >
                          {is_done ? (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                              <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            index + 1
                          )}
                        </span>
                        <span className={`text-[13px] font-medium ${is_current ? "text-shell-text" : "text-shell-text-muted"}`}>{entry.label}</span>
                      </div>
                    </React.Fragment>
                  );
                })}
          </div>

          <div className="flex w-[90px] items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        </div>

        {step === "upload" && <ImportUploadStep is_analyzing={is_analyzing} error={upload_error} onFileSelected={handleFileSelected} />}

        {step === "map" && analysis && (
          <ImportMapColumnsStep
            file_name={analysis.file_name}
            row_count={analysis.row_count}
            source_columns={analysis.source_columns}
            board_columns={analysis.board_columns}
            groups={analysis.groups}
            creatable_column_types={analysis.creatable_column_types}
            mappings={mappings}
            onChangeMappings={setMappings}
            target_group_id={target_group_id}
            onChangeTargetGroupId={setTargetGroupId}
            new_group_name={new_group_name}
            onChangeNewGroupName={setNewGroupName}
            error={map_error}
          />
        )}

        {step === "match" && (
          <ImportHandleMatchesStep
            duplicate_mode={duplicate_mode}
            onChangeDuplicateMode={setDuplicateMode}
            match_source_index={match_source_index}
            onChangeMatchSourceIndex={setMatchSourceIndex}
            matchable_columns={matchable_columns}
          />
        )}

        {step === "progress" && <ImportProgressStep job={job} is_stopping={is_stopping} onStop={() => void handleStop()} onDone={onClose} />}

        {(step === "map" || step === "match") && (
          <div className="flex items-center justify-between border-t border-shell-border px-7 py-4">
            <div className="flex items-center gap-4 text-[12.5px] text-shell-text-secondary">
              {step === "map" && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                    Mapped: {mapped_count}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    Create new column: {create_count}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-shell-text-muted" />
                    Don&apos;t import: {skip_count}
                  </span>
                </>
              )}
              {step === "match" && start_error && <span className="text-error-500">{start_error}</span>}
            </div>

            <button
              type="button"
              onClick={step === "map" ? handleContinueFromMap : () => void handleStartImport()}
              disabled={is_starting_import}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50"
            >
              {step === "map" ? "Continue" : is_starting_import ? "Starting…" : "Import Now"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportItemsModal;
