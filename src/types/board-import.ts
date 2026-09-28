/**
 * API types for the board header's "More actions" > "Import items" wizard —
 * mirrors `App\Http\Controllers\Board\BoardImportController`'s payloads.
 * Reuses {@link BoardColumnDto}/{@link BoardGroupDto} from `board-content`
 * (the same shapes the rest of the table-board engine already works with)
 * rather than redefining them.
 */
import type { BoardColumnDto, BoardColumnType, BoardGroupDto } from "./board-content";

/** One column the uploaded file actually has, with a guessed type and a peek at its own data. */
export type BoardImportSourceColumn = {
  index: number;
  label: string;
  sample_values: string[];
  suggested_type: BoardColumnType;
  /** Why the backend guessed `suggested_type`, e.g. "100% of values are dates" — shown under the column so the guess can be checked. */
  detection_reason: string;
  /** Every creatable type that can hold (nearly) all of this column's values: the type picker recommends these and warns about any other choice. Every type when the column is empty. */
  compatible_types: BoardColumnType[];
  /** The file's own columns this one was merged from (e.g. `["Timeline - Start", "Timeline - End"]`, or a checklist's repeated "Task | Status" pairs); empty for an ordinary column. */
  combined_from: string[];
  /** How many rows actually have a value in this column. */
  filled_count: number;
};

/** How one source column is handled on commit — mirrors the "Map columns" step's per-row picker. */
export type BoardImportMappingMode = "name" | "map" | "create" | "skip";

export type BoardImportMapping = {
  source_index: number;
  mode: BoardImportMappingMode;
  /** Required when `mode` is `"map"` — the existing board column this source column feeds. */
  target_column_id?: number | null;
  /** `"create"` only — defaults to the source column's own label when omitted. */
  new_label?: string | null;
  /** `"create"` only — defaults to `suggested_type` when omitted. */
  new_type?: BoardColumnType | null;
};

export type BoardImportAnalyzeResponse = {
  import_token: string;
  file_name: string;
  row_count: number;
  source_columns: BoardImportSourceColumn[];
  suggested_mappings: BoardImportMapping[];
  board_columns: BoardColumnDto[];
  groups: BoardGroupDto[];
  /** The subset of column types the "create a new column" mapping mode may target. */
  creatable_column_types: BoardColumnType[];
};

/** How an incoming row that matches an existing item is handled — the "Handle matches" step. */
export type BoardImportDuplicateMode = "add" | "skip" | "update";

export type BoardImportCommitPayload = {
  import_token: string;
  view_id?: number | null;
  /** Import into this existing table, or omit (with `new_group_name`) to create one. */
  target_group_id?: number | null;
  new_group_name?: string | null;
  mappings: BoardImportMapping[];
  duplicate_mode: BoardImportDuplicateMode;
  /** Which source column identifies "the same row" for skip/update — defaults to the `"name"` mapping's column server-side when omitted. */
  match_source_index?: number | null;
};

/** A {@link BoardImportJobDto}'s lifecycle — mirrors `App\Models\BoardImportJob::STATUS_*`. */
export type BoardImportJobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

/** Terminal statuses — no further `board_import_progress` broadcasts will arrive for this job. */
export const BOARD_IMPORT_JOB_TERMINAL_STATUSES: BoardImportJobStatus[] = ["completed", "failed", "cancelled"];

/**
 * Progress snapshot for one run of the background import job — the "Import
 * items" wizard's 4th ("Importing…") step polls/listens for this. Mirrors
 * `App\Http\Resources\BoardImportJobResource`, the same shape returned by
 * `commit()`'s 202 response, `GET .../import/{id}`, and the live
 * `board_import_progress` broadcast.
 */
export type BoardImportJobDto = {
  id: number;
  status: BoardImportJobStatus;
  file_name: string;
  total_rows: number;
  processed_rows: number;
  /** 0-100, rounded. */
  percent: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  columns_created: number;
  group_id: number | null;
  cancel_requested: boolean;
  error_message: string | null;
};
