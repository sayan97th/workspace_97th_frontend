/**
 * API types of "Export board to Excel" and the group menu's "Export to Excel",
 * mirrors `App\Http\Controllers\Board\BoardExportController` and
 * `App\Http\Resources\BoardExportJobResource`.
 */

/** `grouped`: one block per group like the board. `flat`: one filterable table with a Group column. */
export type BoardExportLayout = "grouped" | "flat";

export type BoardExportStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

export const BOARD_EXPORT_TERMINAL_STATUSES: BoardExportStatus[] = ["completed", "failed", "cancelled"];

/** What the dialog shows before anything runs. */
export type BoardExportSummary = {
  board_label: string;
  view_label: string | null;
  group_name: string | null;
  groups: number;
  items: number;
  subitems: number;
  columns: number;
  subitem_columns: number;
  hidden_columns: number;
};

export type BoardExportJobDto = {
  id: number;
  board_id: number;
  group_id: number | null;
  status: BoardExportStatus;
  layout: BoardExportLayout;
  include_subitems: boolean;
  include_hidden_columns: boolean;
  file_name: string;
  file_size_bytes: number;
  total_rows: number;
  processed_rows: number;
  column_count: number;
  percent: number;
  cancel_requested: boolean;
  error_message: string | null;
  /** Short lived signed path of the finished file, null until it is ready or once it expired. */
  download_url: string | null;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  expires_at: string | null;
};

export type BoardExportOptions = {
  view_id?: number | null;
  group_id?: number | null;
  layout: BoardExportLayout;
  include_subitems: boolean;
  include_hidden_columns: boolean;
  time_zone?: string;
};
