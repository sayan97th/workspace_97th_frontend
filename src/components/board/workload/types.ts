/**
 * Types for the Workload board view, mirroring
 * `App\Services\Board\WorkloadDataService`'s response 1:1.
 */

export type WorkloadBucket = "day" | "week";

/** A `workload`-type view's saved settings, persisted as `BoardViewDto.workload_config`. */
export type BoardWorkloadConfig = {
  /** Which tab of the board is read, a Workload tab has no items of its own. */
  source_view_id: number | null;
  people_column_id: string | null;
  /** A Date or Timeline column. */
  date_column_id: string | null;
  /** A Number column holding each item's effort (hours, points). Null counts every item as 1. */
  effort_column_id: string | null;
  bucket: WorkloadBucket;
  /** Capacity per person per bucket, in the effort's unit. */
  capacity: number;
  /** Per person capacity, keyed by user id. */
  capacity_overrides: Record<string, number>;
};

export type WorkloadPerson = {
  id: number | null;
  name: string;
  photo_url: string | null;
  is_deactivated: boolean;
};

export type WorkloadItem = {
  id: number;
  name: string;
  group_name: string | null;
  group_color: string | null;
  start: string;
  end: string;
  effort: number;
  /** The visible buckets this item takes time in. */
  bucket_keys: string[];
  person_ids: number[];
};

export type WorkloadRow = {
  person: WorkloadPerson;
  /** Null for the "Unassigned" row, which has no capacity. */
  capacity: number | null;
  total: number;
  /** Items with no date, counted but not placed on the timeline. */
  unscheduled_count: number;
  cells: { key: string; load: number }[];
  items: WorkloadItem[];
};

export type WorkloadBucketDto = {
  key: string;
  label: string;
  start: string;
  end: string;
  is_current: boolean;
  is_weekend: boolean;
};

export type WorkloadPickerOption = { id: string; label: string; type: string };

/** `GET /api/boards/{board_id}/views/{view_id}/workload-data` response. */
export type WorkloadDataDto = {
  config: BoardWorkloadConfig;
  source_views: { id: number; label: string; is_primary: boolean }[];
  people_columns: WorkloadPickerOption[];
  date_columns: WorkloadPickerOption[];
  effort_columns: WorkloadPickerOption[];
  buckets: WorkloadBucketDto[];
  range: { start: string; end: string; previous_start: string; next_start: string };
  people: WorkloadRow[];
  unassigned: WorkloadRow | null;
  has_data: boolean;
};
