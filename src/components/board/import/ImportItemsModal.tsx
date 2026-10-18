"use client";
import React, { useEffect, useRef, useState } from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import { useBoardImportProgress } from "@/hooks/useBoardImportProgress";
import { boardImportService } from "@/services/board-import.service";
import { boardOptionsService } from "@/services/board-options.service";
import type {
  BoardImportAnalyzeResponse,
  BoardImportDuplicateMode,
  BoardImportJobDto,
  BoardImportMapping,
} from "@/types/board-import";
import GiveFeedbackModal from "../GiveFeedbackModal";
import ImportUploadStep from "./ImportUploadStep";
import ImportMapColumnsStep, { FILE_GROUPS_TARGET, NEW_GROUP_TARGET } from "./ImportMapColumnsStep";
import ImportHandleMatchesStep, { type MatchingDuplicateMode } from "./ImportHandleMatchesStep";
import ImportProgressStep from "./ImportProgressStep";
import type { ImportSelectOption } from "./ImportSelect";
import {
  CheckCircleIcon,
  CheckIcon,
  ChevronLeftIcon,
  CloseIcon,
  FeedbackIcon,
  ImportColumnIcon,
  ImportItemNameIcon,
  PlusCircleIcon,
  Spinner,
  XCircleIcon,
} from "./importIcons";
import { READ_ONLY_COLUMN_TYPES, importErrorMessage, suggestGroupName } from "./importWizardUtils";
import "./import-wizard.scss";

export type ImportItemsModalProps = {
  is_open: boolean;
  onClose: () => void;
  board_id: number;
  /** The currently open tab, the import always lands on this tab. */
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

const EMPTY_MATCH_BY: Record<MatchingDuplicateMode, number | null> = { skip: null, update: null };

/**
 * Board options menu's "More actions" > "Import items", restyled after
 * monday.com's "Import file" flow: a full screen dialog with a centered
 * stepper, "Upload" (pick a file), "Map columns" (choose each column's
 * destination), "Handle matches" (dedupe strategy), then live progress on the
 * background job with a "Stop import" button (see
 * {@link useBoardImportProgress} and `ProcessBoardImportJob`). Owns the whole
 * flow; the caller only renders it and refreshes its own board data from
 * {@link ImportItemsModalProps.onImported}.
 */
const ImportItemsModal: React.FC<ImportItemsModalProps> = ({ is_open, onClose, board_id, view_id, onImported }) => {
  const [step, setStep] = useState<WizardStep>("upload");
  const [is_analyzing, setIsAnalyzing] = useState(false);
  const [is_starting_import, setIsStartingImport] = useState(false);
  const [is_stopping, setIsStopping] = useState(false);
  const [is_feedback_open, setIsFeedbackOpen] = useState(false);
  const [upload_error, setUploadError] = useState<string | null>(null);
  const [map_error, setMapError] = useState<string | null>(null);
  const [start_error, setStartError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<BoardImportAnalyzeResponse | null>(null);
  const [mappings, setMappings] = useState<BoardImportMapping[]>([]);
  const [target, setTarget] = useState<string>(NEW_GROUP_TARGET);
  const [new_group_name, setNewGroupName] = useState("");
  const [import_subitems, setImportSubitems] = useState(true);
  const [duplicate_mode, setDuplicateMode] = useState<BoardImportDuplicateMode>("add");
  const [match_by, setMatchBy] = useState<Record<MatchingDuplicateMode, number | null>>(EMPTY_MATCH_BY);

  const [seed_job, setSeedJob] = useState<BoardImportJobDto | null>(null);
  const job = useBoardImportProgress(board_id, seed_job);
  const has_reported_import_ref = useRef(false);

  useEffect(() => {
    if (!is_open) return;
    setStep("upload");
    setIsAnalyzing(false);
    setIsStartingImport(false);
    setIsStopping(false);
    setIsFeedbackOpen(false);
    setUploadError(null);
    setMapError(null);
    setStartError(null);
    setAnalysis(null);
    setMappings([]);
    setTarget(NEW_GROUP_TARGET);
    setNewGroupName("");
    setImportSubitems(true);
    setDuplicateMode("add");
    setMatchBy(EMPTY_MATCH_BY);
    setSeedJob(null);
    has_reported_import_ref.current = false;
  }, [is_open]);

  // Refreshes the caller's board data the moment the job reaches a terminal
  // status with rows actually written, before the viewer even clicks "Done".
  // Guarded by a ref (not state) so a later poll/broadcast update carrying
  // the same terminal status doesn't fire this a second time.
  useEffect(() => {
    if (!job || has_reported_import_ref.current) return;
    const is_terminal = job.status === "completed" || job.status === "failed" || job.status === "cancelled";
    if (is_terminal && job.group_id !== null && job.processed_rows > 0) {
      has_reported_import_ref.current = true;
      onImported({ group_id: job.group_id });
    }
  }, [job, onImported]);

  useEffect(() => {
    if (!is_open || is_feedback_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, is_feedback_open, onClose]);

  if (!is_open) return null;

  const handleFileSelected = async (file: File) => {
    setUploadError(null);
    setIsAnalyzing(true);
    try {
      const result = await boardImportService.analyze(board_id, file, view_id);
      setAnalysis(result);
      setMappings(result.suggested_mappings);
      setNewGroupName(suggestGroupName(result.file_name));
      setTarget((result.file_groups ?? []).length > 0 ? FILE_GROUPS_TARGET : NEW_GROUP_TARGET);
      setImportSubitems((result.subitem_count ?? 0) > 0);
      setMatchBy(EMPTY_MATCH_BY);
      setStep("map");
    } catch (error) {
      setUploadError(importErrorMessage(error, "We couldn't read that file. Make sure it's a .csv, .xlsx or .xls file and try again."));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleContinueFromMap = () => {
    if (!mappings.some((mapping) => mapping.mode === "name")) {
      setMapError("Choose which file column becomes the item name.");
      return;
    }
    if (mappings.some((mapping) => mapping.mode === "map" && mapping.target_column_id == null)) {
      setMapError("Pick a board column for every mapped row, or clear it.");
      return;
    }
    if (target === NEW_GROUP_TARGET && new_group_name.trim() === "") {
      setMapError("Give the new group a name before continuing.");
      return;
    }
    setMapError(null);
    // A match column only counts while its file column is still imported.
    const importable = new Set(mappings.filter((mapping) => mapping.mode !== "skip").map((mapping) => mapping.source_index));
    setMatchBy((current) => ({
      skip: current.skip !== null && importable.has(current.skip) ? current.skip : null,
      update: current.update !== null && importable.has(current.update) ? current.update : null,
    }));
    setStep("match");
  };

  const handleBack = () => {
    if (step === "map") {
      setStep("upload");
      setAnalysis(null);
      setMappings([]);
      setMapError(null);
    } else if (step === "match") {
      setStartError(null);
      setStep("map");
    }
  };

  const match_source_index = duplicate_mode === "add" ? null : match_by[duplicate_mode];
  const is_missing_match = duplicate_mode !== "add" && match_source_index === null;

  const handleStartImport = async () => {
    if (!analysis || is_missing_match) return;
    setStartError(null);
    setIsStartingImport(true);
    try {
      const is_existing_group = target !== NEW_GROUP_TARGET && target !== FILE_GROUPS_TARGET;
      const created_job = await boardImportService.commit(board_id, {
        import_token: analysis.import_token,
        view_id,
        target_group_id: is_existing_group ? Number(target) : null,
        new_group_name: target === NEW_GROUP_TARGET ? new_group_name.trim() || suggestGroupName(analysis.file_name) : null,
        group_mode: target === FILE_GROUPS_TARGET ? "file" : "single",
        import_subitems: import_subitems && analysis.subitem_count > 0,
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
      // The next poll tick or broadcast reconciles the real state either way.
    } finally {
      setIsStopping(false);
    }
  };

  const match_options: ImportSelectOption[] = (() => {
    if (!analysis) return [];
    const name_mapping = mappings.find((mapping) => mapping.mode === "name");
    const options: ImportSelectOption[] = [
      {
        value: name_mapping ? String(name_mapping.source_index) : "unmapped:name",
        label: "Item",
        icon: <ImportItemNameIcon />,
        is_disabled: !name_mapping,
        disabled_reason: "Choose the file column for the item name first",
      },
    ];
    for (const column of analysis.board_columns) {
      if (READ_ONLY_COLUMN_TYPES.includes(column.type)) continue;
      const mapping = mappings.find((candidate) => candidate.mode === "map" && candidate.target_column_id === column.id);
      options.push({
        value: mapping ? String(mapping.source_index) : `unmapped:${column.id}`,
        label: column.label,
        icon: <ImportColumnIcon type={column.type} />,
        is_disabled: !mapping,
        disabled_reason: "Map a file column to this column to match rows by it",
      });
    }
    for (const mapping of mappings.filter((candidate) => candidate.mode === "create")) {
      const source = analysis.source_columns.find((column) => column.index === mapping.source_index);
      options.push({
        value: String(mapping.source_index),
        label: mapping.new_label || source?.label || "Untitled",
        icon: <ImportColumnIcon type={mapping.new_type ?? source?.suggested_type ?? "text"} />,
        hint: "New",
      });
    }
    return options;
  })();

  const mapped_count = mappings.filter((mapping) => mapping.mode === "name" || mapping.mode === "map").length;
  const create_count = mappings.filter((mapping) => mapping.mode === "create").length;
  const skip_count = mappings.filter((mapping) => mapping.mode === "skip").length;

  const step_index = step === "progress" ? STEPS.length : STEPS.findIndex((entry) => entry.id === step);
  const can_go_back = step === "map" || step === "match";

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="iw-dialog-title" className="iw-overlay">
      <div className="iw-backdrop" onClick={onClose} aria-hidden="true" />

      <div className="iw-dialog">
        <header className="iw-header">
          <div className="iw-header-start">
            {can_go_back ? (
              <button type="button" onClick={handleBack} className="iw-text-button">
                <ChevronLeftIcon size={18} />
                Back
              </button>
            ) : (
              <h1 id="iw-dialog-title" className="iw-title">
                Import file
              </h1>
            )}
            {can_go_back && (
              <span id="iw-dialog-title" className="sr-only">
                Import file
              </span>
            )}
          </div>

          <ol className="iw-stepper" aria-label="Import steps">
            {STEPS.map((entry, index) => {
              const state = index < step_index ? "done" : index === step_index ? "current" : "upcoming";
              return (
                <React.Fragment key={entry.id}>
                  {index > 0 && <li className="iw-step-connector" data-done={index <= step_index} aria-hidden="true" />}
                  <li className="iw-step" data-state={state} aria-current={state === "current" ? "step" : undefined}>
                    <span className="iw-step-dot">{state === "done" ? <CheckIcon size={13} /> : <span>{index + 1}</span>}</span>
                    <span className="iw-step-label">{entry.label}</span>
                  </li>
                </React.Fragment>
              );
            })}
          </ol>

          <div className="iw-header-end">
            <PortalTooltip content="Tell us how importing your file went" placement="bottom">
              <button type="button" className="iw-text-button" onClick={() => setIsFeedbackOpen(true)}>
                <FeedbackIcon size={18} />
                <span className="iw-text-button-label">Feedback</span>
              </button>
            </PortalTooltip>
            <PortalTooltip content="Close" placement="bottom">
              <button type="button" onClick={onClose} aria-label="Close" className="iw-icon-button">
                <CloseIcon size={20} />
              </button>
            </PortalTooltip>
          </div>
        </header>

        <div className="iw-body">
          {step === "upload" && <ImportUploadStep is_analyzing={is_analyzing} error={upload_error} onFileSelected={handleFileSelected} />}

          {step === "map" && analysis && (
            <ImportMapColumnsStep
              file_name={analysis.file_name}
              row_count={analysis.row_count}
              source_columns={analysis.source_columns}
              board_columns={analysis.board_columns}
              groups={analysis.groups}
              file_groups={analysis.file_groups ?? []}
              subitem_count={analysis.subitem_count ?? 0}
              creatable_column_types={analysis.creatable_column_types}
              mappings={mappings}
              suggested_mappings={analysis.suggested_mappings}
              onChangeMappings={(next) => {
                setMappings(next);
                setMapError(null);
              }}
              target={target}
              onChangeTarget={setTarget}
              new_group_name={new_group_name}
              onChangeNewGroupName={setNewGroupName}
              import_subitems={import_subitems}
              onChangeImportSubitems={setImportSubitems}
            />
          )}

          {step === "match" && (
            <ImportHandleMatchesStep
              duplicate_mode={duplicate_mode}
              onChangeDuplicateMode={(mode) => {
                setDuplicateMode(mode);
                setStartError(null);
              }}
              match_by={match_by}
              onChangeMatchBy={(mode, source_index) => setMatchBy((current) => ({ ...current, [mode]: source_index }))}
              match_options={match_options}
            />
          )}

          {step === "progress" && <ImportProgressStep job={job} is_stopping={is_stopping} onStop={() => void handleStop()} onDone={onClose} />}
        </div>

        {(step === "map" || step === "match") && (
          <footer className="iw-footer">
            <p className="iw-footer-message" role={(step === "map" ? map_error : start_error) ? "alert" : undefined}>
              {step === "map" ? map_error : start_error}
            </p>

            {step === "map" ? (
              <ul className="iw-stats" aria-label="Mapping summary">
                <li className="iw-stat" data-tone="success">
                  <CheckCircleIcon />
                  Mapped: {mapped_count}
                </li>
                <li className="iw-stat" data-tone="success">
                  <PlusCircleIcon />
                  Create new column: {create_count}
                </li>
                <li className="iw-stat" data-tone="danger">
                  <XCircleIcon />
                  Don&apos;t import: {skip_count}
                </li>
              </ul>
            ) : (
              <span />
            )}

            <div className="iw-footer-end">
              {step === "map" ? (
                <button type="button" className="iw-button" data-variant="primary" onClick={handleContinueFromMap}>
                  Continue
                </button>
              ) : (
                <PortalTooltip content={is_missing_match ? "Choose the column rows are matched by" : ""} placement="top">
                  <button
                    type="button"
                    className="iw-button"
                    data-variant="primary"
                    onClick={() => void handleStartImport()}
                    disabled={is_starting_import || is_missing_match}
                  >
                    {is_starting_import && <Spinner />}
                    {is_starting_import ? "Starting…" : "Import Now"}
                  </button>
                </PortalTooltip>
              )}
            </div>
          </footer>
        )}
      </div>

      <GiveFeedbackModal
        is_open={is_feedback_open}
        description="Tell us how importing your file went, or what you'd like the import to do."
        layer_class_name="z-[450]"
        onClose={() => setIsFeedbackOpen(false)}
        onSubmit={(message) => boardOptionsService.submitFeedback(`[Import] ${message}`, board_id)}
      />
    </div>
  );
};

export default ImportItemsModal;
