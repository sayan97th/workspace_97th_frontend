/** API types for Administration > Usage stats, mirroring `UsageStatsController`. */

export type UsageKpisDto = {
  total_users: number;
  deactivated_users: number;
  active_users: number;
  new_users: number;
  total_boards: number;
  boards_created: number;
  total_items: number;
  items_created: number;
  updates_posted: number;
  files_uploaded: number;
  storage_bytes: number;
};

export type UsageTopBoardDto = {
  id: number;
  label: string;
  workspace: string | null;
  events_count: number;
};

export type UsageTopUserDto = {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
  is_deactivated: boolean;
  events_count: number;
  active_days: number;
};

export type UsageStatsDto = {
  range: { from: string; to: string };
  kpis: UsageKpisDto;
  daily_active_users: { date: string; active_users: number }[];
  top_boards: UsageTopBoardDto[];
  top_users: UsageTopUserDto[];
};
