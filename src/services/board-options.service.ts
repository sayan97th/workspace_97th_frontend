import { apiClient } from "@/lib/api-client";
import type {
  BoardActivityFeedPage,
  BoardActivityFilters,
  BoardActivitySource,
  BoardActivityUndoResult,
  BoardActivityUpdatesPage,
  BoardActivityViewer,
} from "@/types/board-activity-log";
import type { BoardActivityLogEntry, BoardTrashIndex } from "@/types/board-options";
import type { BoardDetail, BoardEditPermission } from "@/types/workspace";

/**
 * Talks to the board options menu's own endpoints — archive/unarchive the
 * whole board, its per-board archived/deleted-items panel, its activity log,
 * exporting to Excel, and product feedback. Mirrors
 * {@link import("./board-content.service").boardContentService}'s style.
 */
export const boardOptionsService = {
  /** POST /api/boards/{id}/archive — board options menu's "Archive board". */
  async archiveBoard(board_id: number): Promise<BoardDetail> {
    const response = await apiClient.post<{ item: BoardDetail }>(`/api/boards/${board_id}/archive`);
    return response.item;
  },

  /** POST /api/boards/{id}/unarchive — "View archive / trash" > Archive tab's "Restore". */
  async unarchiveBoard(board_id: number): Promise<BoardDetail> {
    const response = await apiClient.post<{ item: BoardDetail }>(`/api/boards/${board_id}/unarchive`);
    return response.item;
  },

  /** PATCH /api/boards/{id}/permissions, board options menu's "Board permissions". */
  async updateBoardPermission(board_id: number, edit_permission: BoardEditPermission): Promise<BoardDetail> {
    const response = await apiClient.patch<{ item: BoardDetail }>(`/api/boards/${board_id}/permissions`, { edit_permission });
    return response.item;
  },

  /** GET /api/boards/{id}/activity-log */
  async getActivityLog(board_id: number): Promise<BoardActivityLogEntry[]> {
    const response = await apiClient.get<{ data: BoardActivityLogEntry[] }>(`/api/boards/${board_id}/activity-log`);
    return response.data;
  },

  /** GET /api/boards/{id}/activity-log/feed, the Activity log drawer's "Activity" tab, newest first. */
  async getActivityFeed(board_id: number, filters: BoardActivityFilters, cursor: string | null = null): Promise<BoardActivityFeedPage> {
    const query = buildActivityQuery(filters);
    if (cursor) query.set("cursor", cursor);
    return apiClient.get<BoardActivityFeedPage>(`/api/boards/${board_id}/activity-log/feed?${query.toString()}`);
  },

  /** POST /api/boards/{id}/activity-log/{source}/{entry_id}/undo, the "Undo" button of one log entry. */
  async undoActivity(board_id: number, source: BoardActivitySource, entry_id: number): Promise<BoardActivityUndoResult> {
    return apiClient.post<BoardActivityUndoResult>(`/api/boards/${board_id}/activity-log/${source}/${entry_id}/undo`);
  },

  /** GET /api/boards/{id}/activity-log/viewers, the "Last viewed" tab. */
  async getActivityViewers(board_id: number): Promise<BoardActivityViewer[]> {
    const response = await apiClient.get<{ data: BoardActivityViewer[] }>(`/api/boards/${board_id}/activity-log/viewers`);
    return response.data;
  },

  /** GET /api/boards/{id}/activity-log/updates, the "Updates" tab. */
  async getActivityUpdates(board_id: number, page = 1): Promise<BoardActivityUpdatesPage> {
    return apiClient.get<BoardActivityUpdatesPage>(`/api/boards/${board_id}/activity-log/updates?page=${page}`);
  },

  /** GET /api/boards/{id}/activity-log/export, the log as a CSV file with the same filters as the list. */
  async exportActivityLog(board_id: number, filters: BoardActivityFilters): Promise<Blob> {
    return apiClient.get<Blob>(`/api/boards/${board_id}/activity-log/export?${buildActivityQuery(filters).toString()}`, { responseType: "blob" });
  },

  /** GET /api/boards/{id}/trash — this board's own archived + deleted items. */
  async getTrash(board_id: number): Promise<BoardTrashIndex> {
    return apiClient.get<BoardTrashIndex>(`/api/boards/${board_id}/trash`);
  },

  /** PATCH /api/boards/{id}/trash/{item_id}/restore */
  async restoreTrashItem(board_id: number, item_id: string): Promise<void> {
    await apiClient.patch(`/api/boards/${board_id}/trash/${item_id}/restore`);
  },

  /** DELETE /api/boards/{id}/trash/{item_id} — permanent, no further undo. */
  async deleteTrashItemForever(board_id: number, item_id: string): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/trash/${item_id}`);
  },

  /** PATCH /api/boards/{id}/trash/groups/{group_id}/restore, brings an archived group back at the end of its tab. */
  async restoreTrashGroup(board_id: number, group_id: string): Promise<void> {
    await apiClient.patch(`/api/boards/${board_id}/trash/groups/${group_id}/restore`);
  },

  /** DELETE /api/boards/{id}/trash/groups/{group_id}, permanent, deletes the group and every item in it. */
  async deleteTrashGroupForever(board_id: number, group_id: string): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/trash/groups/${group_id}`);
  },

  /** POST /api/feedback — board options menu's "Give feedback". */
  async submitFeedback(message: string, board_id?: number): Promise<void> {
    await apiClient.post("/api/feedback", {
      message,
      board_id,
      page_url: typeof window !== "undefined" ? window.location.href : undefined,
    });
  },
};

/** Start of the given local day, `days_ago` days back. */
const startOfLocalDay = (days_ago: number): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days_ago);
  return date;
};

/** Query string of the Activity log filters, shared by the list and the CSV export. */
function buildActivityQuery(filters: BoardActivityFilters): URLSearchParams {
  const query = new URLSearchParams();
  const search = filters.search.trim();
  if (search) query.set("search", search);
  filters.user_ids.forEach((id) => query.append("user_ids[]", String(id)));
  filters.column_ids.forEach((id) => query.append("column_ids[]", String(id)));
  filters.group_ids.forEach((id) => query.append("group_ids[]", String(id)));
  filters.event_types.forEach((type) => query.append("event_types[]", type));
  if (filters.automation_only) query.set("automation_only", "1");

  if (filters.period === "today") query.set("from", startOfLocalDay(0).toISOString());
  if (filters.period === "yesterday") {
    query.set("from", startOfLocalDay(1).toISOString());
    query.set("to", new Date(startOfLocalDay(0).getTime() - 1000).toISOString());
  }
  if (filters.period === "last_7_days") query.set("from", startOfLocalDay(6).toISOString());
  if (filters.period === "last_30_days") query.set("from", startOfLocalDay(29).toISOString());
  return query;
}
