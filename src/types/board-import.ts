/**
 * API types for the board header's "More actions" > "Import items" wizard ,
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
  /** Why the backend guessed `suggested_type`, e.g. "100% of values are dates", shown under the column so the guess can be checked. */
  detection_reason: string;
  /** Every creatable type that can hold (nearly) all of this column's values: the type picker recommends these and warns about any other choice. Every type when the column is empty. */
  compatible_types: BoardColumnType[];
  /** The file's own columns this one was merged from (e.g. `["Timeline - Start", "Timeline - End"]`, or a checklist's repeated "Task | Status" pairs); empty for an ordinary column. */
  combined_from: string[];
  /** How many rows actually have a value (or an embedded file) in this column. */
  filled_count: number;
  /** How many different values the column holds, case-insensitively. */
  distinct_count: number;
  /** The options of the spreadsheet dropdown list (data validation) the column's cells pick from, in the file's order, with the color each gets. Empty when the column has no list. */
  declared_options: BoardImportDeclaredOption[];
  /** `"priority"` when the column holds priorities, its labels get the board's Priority column colors. */
  option_preset: BoardImportOptionPreset | null;
  /** The files embedded in this column's cells (pictures, documents), null when it has none. */
  assets: BoardImportAssetSummary | null;
  /** How many of the column's names match a workspace user, set when it can become a People column. */
  people_match: BoardImportPeopleMatch | null;
};

export type BoardImportOptionPreset = "priority";

export type BoardImportDeclaredOption = { label: string; color: string };

/** One embedded file shown in the "Map columns" step, already staged so it can be previewed. */
export type BoardImportAssetPreview = {
  file_name: string;
  url: string | null;
  mime_type: string;
  kind: "image" | "file";
  width: number | null;
  height: number | null;
};

export type BoardImportAssetSummary = {
  file_count: number;
  image_count: number;
  /** How many cells hold at least one file. */
  cell_count: number;
  total_bytes: number;
  /** The first few files, for thumbnails. */
  previews: BoardImportAssetPreview[];
};

export type BoardImportPeopleMatch = {
  matched_count: number;
  total_count: number;
  /** A few names that match no user and would be left out of a People column. */
  unmatched: string[];
};

/** One sheet of an uploaded workbook. */
export type BoardImportSheet = {
  index: number;
  name: string;
  /** Rows with a value below the header row. */
  row_count: number;
  image_count: number;
};

/** How one source column is handled on commit, mirrors the "Map columns" step's per-row picker. */
export type BoardImportMappingMode = "name" | "map" | "create" | "skip";

export type BoardImportMapping = {
  source_index: number;
  mode: BoardImportMappingMode;
  /** Required when `mode` is `"map"`, the existing board column this source column feeds. */
  target_column_id?: number | null;
  /** `"create"` only, defaults to the source column's own label when omitted. */
  new_label?: string | null;
  /** `"create"` only, defaults to `suggested_type` when omitted. */
  new_type?: BoardColumnType | null;
  /**
   * Wizard only, never sent: tells apart several rows importing the same
   * source column (the "Duplicate" action). The row the backend suggested
   * has none, see `mappingRowKey()`.
   */
  row_key?: string;
  /** Wizard only, never sent: true on a row added by "Duplicate" or "Add column from file". */
  is_copy?: boolean;
};

export type BoardImportAnalyzeResponse = {
  import_token: string;
  file_name: string;
  /** Every sheet of the workbook (one entry for a .csv), the wizard can switch to another one. */
  sheets: BoardImportSheet[];
  /** The sheet these columns were read from. */
  sheet_index: number;
  row_count: number;
  source_columns: BoardImportSourceColumn[];
  suggested_mappings: BoardImportMapping[];
  board_columns: BoardColumnDto[];
  groups: BoardGroupDto[];
  /** The subset of column types the "create a new column" mapping mode may target. */
  creatable_column_types: BoardColumnType[];
  /** The groups a monday.com export's rows sat under, in file order. Empty for a plain table. */
  file_groups: BoardImportFileGroup[];
  /** How many subitem rows a monday.com export lists under its items. */
  subitem_count: number;
};

export type BoardImportFileGroup = { name: string; row_count: number };

/** `"single"` imports every row into one table, `"file"` into the groups a monday.com export already has. */
export type BoardImportGroupMode = "single" | "file";

/** How an incoming row that matches an existing item is handled, the "Handle matches" step. */
export type BoardImportDuplicateMode = "add" | "skip" | "update";

export type BoardImportCommitPayload = {
  import_token: string;
  view_id?: number | null;
  /** Import into this existing table, or omit (with `new_group_name`) to create one. */
  target_group_id?: number | null;
  new_group_name?: string | null;
  group_mode?: BoardImportGroupMode;
  /** Adds the subitem rows a monday.com export lists under each new item. */
  import_subitems?: boolean;
  mappings: BoardImportMapping[];
  duplicate_mode: BoardImportDuplicateMode;
  /** Which source column identifies "the same row" for skip/update, defaults to the `"name"` mapping's column server-side when omitted. */
  match_source_index?: number | null;
};

/** A {@link BoardImportJobDto}'s lifecycle, mirrors `App\Models\BoardImportJob::STATUS_*`. */
export type BoardImportJobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

/** Terminal statuses, no further `board_import_progress` broadcasts will arrive for this job. */
export const BOARD_IMPORT_JOB_TERMINAL_STATUSES: BoardImportJobStatus[] = ["completed", "failed", "cancelled"];

/**
 * Progress snapshot for one run of the background import job, the "Import
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
  groups_created: number;
  subitems_created: number;
  group_id: number | null;
  cancel_requested: boolean;
  error_message: string | null;
};
