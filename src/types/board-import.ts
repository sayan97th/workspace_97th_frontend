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

export type BoardImportCommitResponse = {
  created: number;
  updated: number;
  skipped: number;
  columns_created: number;
  group_id: number;
  group_created: boolean;
};
