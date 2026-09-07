/** Minimal person reference embedded on activity-log/trash entries. */
export type BoardOptionsPerson = {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
};

/** One row in a board's Activity log — see `App\Models\BoardActivityLog` on the backend for exactly what's tracked. */
export type BoardActivityLogEntry = {
  id: number;
  action: string;
  description: string;
  meta: Record<string, unknown> | null;
  created_at: string;
  user: BoardOptionsPerson | null;
};

/** One archived or deleted item in a board's own "View archive / trash" panel. */
export type BoardTrashEntry = {
  id: string;
  name: string;
  group_name: string;
  timestamp: string;
  created_by: BoardOptionsPerson | null;
};

export type BoardTrashIndex = {
  archived: BoardTrashEntry[];
  trashed: BoardTrashEntry[];
};
