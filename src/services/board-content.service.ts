import { apiClient } from "@/lib/api-client";
import type {
  BoardColumnDto,
  BoardGroupDto,
  BoardGroupsIndexDto,
  BoardItemChecklistItemDto,
  BoardItemDetailDto,
  BoardItemDto,
  BoardItemMoveTargetDto,
  BoardItemValue,
  BoardTagDto,
  BoardViewDto,
  BoardViewsIndexDto,
  CreateBoardColumnPayload,
  CreateBoardGroupPayload,
  CreateBoardItemPayload,
  CreateBoardTagPayload,
  CreateChecklistItemPayload,
  MoveBoardItemToBoardPayload,
  ReorderBoardColumnsPayload,
  ReorderBoardItemsPayload,
  BoardItemsServerFilter,
  DuplicateBoardViewPayload,
  SaveBoardViewPayload,
  UpdateBoardColumnPayload,
  UpdateBoardColumnPermissionsPayload,
  UpdateBoardGroupPayload,
  UpdateBoardItemParentPayload,
  UpdateBoardItemPayload,
  UpdateBoardTagPayload,
  UpdateChecklistItemPayload,
  UpdateGroupCollapseStatePayload,
} from "@/types/board-content";

/**
 * Talks to the Laravel "table board" engine (`App\Http\Controllers\Board\*`)
 * — the reusable backend for any board's tables (groups), items, columns and
 * saved views. Mirrors {@link import("./workspace.service").workspaceService}'s
 * style: every call goes through the shared `apiClient`.
 */
export const boardContentService = {
  /** GET /api/boards/{board_id}/columns — scoped to `view_id` (a tab), defaulting to the board's primary tab. */
  async getColumns(board_id: number, view_id?: number | null): Promise<BoardColumnDto[]> {
    const query = view_id ? `?view_id=${view_id}` : "";
    const response = await apiClient.get<{ data: BoardColumnDto[] }>(`/api/boards/${board_id}/columns${query}`);
    return response.data;
  },

  /** POST /api/boards/{board_id}/columns */
  async createColumn(board_id: number, payload: CreateBoardColumnPayload): Promise<BoardColumnDto> {
    const response = await apiClient.post<{ column: BoardColumnDto }>(`/api/boards/${board_id}/columns`, payload);
    return response.column;
  },

  /** PATCH /api/boards/{board_id}/columns/{column_id} */
  async updateColumn(board_id: number, column_id: number, payload: UpdateBoardColumnPayload): Promise<BoardColumnDto> {
    const response = await apiClient.patch<{ column: BoardColumnDto }>(
      `/api/boards/${board_id}/columns/${column_id}`,
      payload
    );
    return response.column;
  },

  /** PATCH /api/boards/{id}/columns/{column_id}/permissions, board owners only. */
  async updateColumnPermissions(board_id: number, column_id: number, payload: UpdateBoardColumnPermissionsPayload): Promise<BoardColumnDto> {
    const response = await apiClient.patch<{ column: BoardColumnDto }>(
      `/api/boards/${board_id}/columns/${column_id}/permissions`,
      payload
    );
    return response.column;
  },

  /** PATCH /api/boards/{board_id}/columns/{column_id}/move */
  async moveColumn(board_id: number, column_id: number, position: number): Promise<BoardColumnDto> {
    const response = await apiClient.patch<{ column: BoardColumnDto }>(
      `/api/boards/${board_id}/columns/${column_id}/move`,
      { position }
    );
    return response.column;
  },

  /** DELETE /api/boards/{board_id}/columns/{column_id} */
  async deleteColumn(board_id: number, column_id: number): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/columns/${column_id}`);
  },

  /**
   * PATCH /api/boards/{board_id}/columns/reorder — column-header
   * drag-and-drop reordering (main table or subitem header), resequenced
   * server-side in one transaction, mirroring `reorderItems`.
   */
  async reorderColumns(board_id: number, payload: ReorderBoardColumnsPayload): Promise<BoardColumnDto[]> {
    const response = await apiClient.patch<{ data: BoardColumnDto[] }>(`/api/boards/${board_id}/columns/reorder`, payload);
    return response.data;
  },

  /** POST /api/boards/{board_id}/columns/{column_id}/duplicate — column menu's "Duplicate column". */
  async duplicateColumn(board_id: number, column_id: number, with_values: boolean): Promise<BoardColumnDto> {
    const response = await apiClient.post<{ column: BoardColumnDto }>(
      `/api/boards/${board_id}/columns/${column_id}/duplicate`,
      { with_values }
    );
    return response.column;
  },

  /** POST /api/boards/{board_id}/columns/{column_id}/duplicate — column menu's "Duplicate to another board", never carries cell values across, since the target board's items are a different set of rows. */
  async duplicateColumnToBoard(board_id: number, column_id: number, target_board_id: number): Promise<BoardColumnDto> {
    const response = await apiClient.post<{ column: BoardColumnDto }>(
      `/api/boards/${board_id}/columns/${column_id}/duplicate`,
      { target_board_id }
    );
    return response.column;
  },

  /** GET /api/boards/{board_id}/groups — a tab's tables (any number, 1…N) plus the viewer's own collapsed/expanded state for them, scoped to `view_id`, defaulting to the board's primary tab. */
  async getGroups(board_id: number, view_id?: number | null): Promise<BoardGroupsIndexDto> {
    const query = view_id ? `?view_id=${view_id}` : "";
    const response = await apiClient.get<{ data: BoardGroupDto[]; collapsed_group_ids: number[] }>(
      `/api/boards/${board_id}/groups${query}`
    );
    return { groups: response.data, collapsed_group_ids: response.collapsed_group_ids };
  },

  /** POST /api/boards/{board_id}/groups — add a new table to the board. */
  async createGroup(board_id: number, payload: CreateBoardGroupPayload): Promise<BoardGroupDto> {
    const response = await apiClient.post<{ group: BoardGroupDto }>(`/api/boards/${board_id}/groups`, payload);
    return response.group;
  },

  /** PATCH /api/boards/{board_id}/groups/{group_id} */
  async updateGroup(board_id: number, group_id: number, payload: UpdateBoardGroupPayload): Promise<BoardGroupDto> {
    const response = await apiClient.patch<{ group: BoardGroupDto }>(
      `/api/boards/${board_id}/groups/${group_id}`,
      payload
    );
    return response.group;
  },

  /**
   * PATCH /api/boards/{board_id}/groups/{group_id}/move, group menu's "Move group". `position` is the
   * zero-based slot among the tab's groups. Resolves with the moved group plus the whole resequenced
   * list, so the caller can reconcile every position at once.
   */
  async moveGroup(board_id: number, group_id: number, position: number): Promise<{ group: BoardGroupDto; groups: BoardGroupDto[] }> {
    return apiClient.patch<{ group: BoardGroupDto; groups: BoardGroupDto[] }>(`/api/boards/${board_id}/groups/${group_id}/move`, { position });
  },

  /** PATCH /api/boards/{board_id}/groups/{group_id}/archive, group menu's "Archive group". Hides the table until it is restored from the board's archive panel. */
  async archiveGroup(board_id: number, group_id: number): Promise<BoardGroupDto> {
    const response = await apiClient.patch<{ group: BoardGroupDto }>(`/api/boards/${board_id}/groups/${group_id}/archive`);
    return response.group;
  },

  /** DELETE /api/boards/{board_id}/groups/{group_id} — cascades to its items. */
  async deleteGroup(board_id: number, group_id: number): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/groups/${group_id}`);
  },

  /**
   * PUT /api/boards/{board_id}/groups/collapsed-state — saves the viewer's own
   * collapsed/expanded set for this tab's tables (group headers, toggled from
   * `GroupHeaderBar`/`CollapsedGroupSummaryRow`), so it's restored the next
   * time they open this tab. Only the *collapsed* ids are ever sent, keeping
   * this cheap even for a tab with hundreds of tables.
   */
  async updateGroupCollapseState(board_id: number, payload: UpdateGroupCollapseStatePayload): Promise<number[]> {
    const response = await apiClient.put<{ collapsed_group_ids: number[] }>(
      `/api/boards/${board_id}/groups/collapsed-state`,
      payload
    );
    return response.collapsed_group_ids;
  },

  /** POST /api/boards/{board_id}/groups/{group_id}/duplicate — group menu's "Duplicate this group". The response only carries the new group itself (no items), so a `with_items` duplicate still needs a follow-up `getItems` to pick up the copied rows under their real ids. */
  async duplicateGroup(board_id: number, group_id: number, with_items: boolean): Promise<BoardGroupDto> {
    const response = await apiClient.post<{ group: BoardGroupDto }>(
      `/api/boards/${board_id}/groups/${group_id}/duplicate`,
      { with_items }
    );
    return response.group;
  },

  /**
   * GET /api/boards/{board_id}/tags — the Tags column's board-wide option
   * list, shared across every Tags column on this board (unlike
   * Status/Dropdown's own per-column `config.options`). Board-wide rather
   * than per-tab, so this isn't scoped by `view_id`.
   */
  async getTags(board_id: number): Promise<BoardTagDto[]> {
    const response = await apiClient.get<{ data: BoardTagDto[] }>(`/api/boards/${board_id}/tags`);
    return response.data;
  },

  /** POST /api/boards/{board_id}/tags — a Tags cell's own "Create new tag", or the column's "Manage tags" modal. */
  async createTag(board_id: number, payload: CreateBoardTagPayload): Promise<BoardTagDto> {
    const response = await apiClient.post<{ tag: BoardTagDto }>(`/api/boards/${board_id}/tags`, payload);
    return response.tag;
  },

  /** PATCH /api/boards/{board_id}/tags/{tag_id} — "Manage tags" modal's recolor/rename. */
  async updateTag(board_id: number, tag_id: number, payload: UpdateBoardTagPayload): Promise<BoardTagDto> {
    const response = await apiClient.patch<{ tag: BoardTagDto }>(`/api/boards/${board_id}/tags/${tag_id}`, payload);
    return response.tag;
  },

  /** DELETE /api/boards/{board_id}/tags/{tag_id} */
  async deleteTag(board_id: number, tag_id: number): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/tags/${tag_id}`);
  },

  /**
   * GET /api/boards/{board_id}/items — scoped to `view_id` (a tab),
   * defaulting to the board's primary tab, optionally narrowed by a
   * server-side `search` term.
   *
   * `group_ids`, when given, narrows the response to just those tables
   * (groups) — used by `GroupSection`'s lazy per-table loading so opening a
   * tab with many/large tables doesn't fetch every row up front. Omitted,
   * every table in the tab is returned, unchanged from before.
   */
  async getItems(
    board_id: number,
    view_id?: number | null,
    search?: string,
    group_ids?: number[],
    filter?: BoardItemsServerFilter
  ): Promise<BoardItemDto[]> {
    const params = new URLSearchParams();
    if (view_id) params.set("view_id", String(view_id));
    if (search) params.set("search", search);
    group_ids?.forEach((group_id) => params.append("group_ids[]", String(group_id)));
    // Server-side filtering (`BoardItemFilterService::applyFilterState()`): only
    // the rows matching the toolbar's Person/Quick/Advanced filters come back.
    // `today` keeps relative dates ("This week") in the viewer's own time zone.
    if (filter) {
      params.set("filter_state", JSON.stringify(filter.filter_state));
      params.set("today", filter.today);
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await apiClient.get<{ data: BoardItemDto[] }>(`/api/boards/${board_id}/items${query}`);
    return response.data;
  },

  /** GET /api/boards/{board_id}/items/{item_id} — resolves a pulse for the item detail drawer. */
  async getItem(board_id: number, item_id: number): Promise<BoardItemDetailDto> {
    return apiClient.get<BoardItemDetailDto>(`/api/boards/${board_id}/items/${item_id}`);
  },

  /** POST /api/boards/{board_id}/items */
  async createItem(board_id: number, payload: CreateBoardItemPayload): Promise<BoardItemDto> {
    const response = await apiClient.post<{ item: BoardItemDto }>(`/api/boards/${board_id}/items`, payload);
    return response.item;
  },

  /** PATCH /api/boards/{board_id}/items/{item_id} — rename or move to a different table. */
  async updateItem(board_id: number, item_id: number, payload: UpdateBoardItemPayload): Promise<BoardItemDto> {
    const response = await apiClient.patch<{ item: BoardItemDto }>(
      `/api/boards/${board_id}/items/${item_id}`,
      payload
    );
    return response.item;
  },

  /**
   * PATCH /api/boards/{board_id}/items/{item_id}/parent, row menu's "Convert to
   * subitem" / "Convert to item" and a subitem's "Move to item". The response
   * carries the row's new `parent_id`, `group_id`, `position` and re-keyed
   * `values`, but none of the rollup counts (only `getItems` returns those).
   */
  async updateItemParent(board_id: number, item_id: number, payload: UpdateBoardItemParentPayload): Promise<BoardItemDto> {
    const response = await apiClient.patch<{ item: BoardItemDto }>(
      `/api/boards/${board_id}/items/${item_id}/parent`,
      payload
    );
    return response.item;
  },

  /** PATCH /api/boards/{board_id}/items/{item_id}/values — inline cell edits. */
  async updateItemValues(
    board_id: number,
    item_id: number,
    values: Record<string, BoardItemValue>
  ): Promise<BoardItemDto> {
    const response = await apiClient.patch<{ item: BoardItemDto }>(
      `/api/boards/${board_id}/items/${item_id}/values`,
      { values }
    );
    return response.item;
  },

  /** DELETE /api/boards/{board_id}/items/{item_id} */
  async deleteItem(board_id: number, item_id: number): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/items/${item_id}`);
  },

  /** PATCH /api/boards/{board_id}/items/{item_id}/recurrence — Row menu's "Set recurring..." popover. */
  async setItemRecurrence(
    board_id: number,
    item_id: number,
    payload: { frequency: "daily" | "weekly" | "monthly"; interval_count: number }
  ): Promise<{ frequency: "daily" | "weekly" | "monthly"; interval_count: number }> {
    const response = await apiClient.patch<{ recurrence: { frequency: "daily" | "weekly" | "monthly"; interval_count: number } }>(
      `/api/boards/${board_id}/items/${item_id}/recurrence`,
      payload
    );
    return response.recurrence;
  },

  /** DELETE /api/boards/{board_id}/items/{item_id}/recurrence — Row menu's "Stop recurring" action. */
  async clearItemRecurrence(board_id: number, item_id: number): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/items/${item_id}/recurrence`);
  },

  /** POST /api/boards/{board_id}/items/{item_id}/checklist-items — adds a subtask line, appended to the end. */
  async createChecklistItem(
    board_id: number,
    item_id: number,
    payload: CreateChecklistItemPayload
  ): Promise<BoardItemChecklistItemDto> {
    const response = await apiClient.post<{ checklist_item: BoardItemChecklistItemDto }>(
      `/api/boards/${board_id}/items/${item_id}/checklist-items`,
      payload
    );
    return response.checklist_item;
  },

  /** PATCH /api/boards/{board_id}/items/{item_id}/checklist-items/{checklist_item_id} — renames and/or toggles a subtask. */
  async updateChecklistItem(
    board_id: number,
    item_id: number,
    checklist_item_id: number,
    payload: UpdateChecklistItemPayload
  ): Promise<BoardItemChecklistItemDto> {
    const response = await apiClient.patch<{ checklist_item: BoardItemChecklistItemDto }>(
      `/api/boards/${board_id}/items/${item_id}/checklist-items/${checklist_item_id}`,
      payload
    );
    return response.checklist_item;
  },

  /** DELETE /api/boards/{board_id}/items/{item_id}/checklist-items/{checklist_item_id} */
  async deleteChecklistItem(board_id: number, item_id: number, checklist_item_id: number): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/items/${item_id}/checklist-items/${checklist_item_id}`);
  },

  /**
   * POST /api/boards/{board_id}/items/duplicate — selection action bar's
   * "Duplicate", and the row menu's own single-item "Duplicate" (item or
   * subitem). `with_subitems` defaults to true server-side, matching
   * Monday's own "duplicating an item duplicates its subitems" behavior.
   */
  async duplicateItems(board_id: number, item_ids: number[], with_subitems = true): Promise<BoardItemDto[]> {
    const response = await apiClient.post<{ items: BoardItemDto[] }>(`/api/boards/${board_id}/items/duplicate`, {
      item_ids,
      with_subitems,
    });
    return response.items;
  },

  /** PATCH /api/boards/{board_id}/items/move — selection action bar's "Move to". */
  async moveItems(board_id: number, item_ids: number[], group_id: number): Promise<BoardItemDto[]> {
    const response = await apiClient.patch<{ items: BoardItemDto[] }>(`/api/boards/${board_id}/items/move`, {
      item_ids,
      group_id,
    });
    return response.items;
  },

  /** GET /api/boards/{board_id}/move-targets, the other boards (with their tables) an item can be moved into from its drawer. */
  async getItemMoveTargets(board_id: number): Promise<BoardItemMoveTargetDto[]> {
    const response = await apiClient.get<{ data: BoardItemMoveTargetDto[] }>(`/api/boards/${board_id}/move-targets`);
    return response.data;
  },

  /** PATCH /api/boards/{board_id}/items/{item_id}/board, item drawer's "Move to" > "Move to board". Moves the item, with its subitems, into a table of another board. */
  async moveItemToBoard(board_id: number, item_id: number, payload: MoveBoardItemToBoardPayload): Promise<void> {
    await apiClient.patch(`/api/boards/${board_id}/items/${item_id}/board`, payload);
  },

  /** PATCH /api/boards/{board_id}/items/values — selection action bar's "Edit column" bulk action. */
  async bulkSetColumnValue(board_id: number, item_ids: number[], column_id: number, value: BoardItemValue): Promise<BoardItemDto[]> {
    const response = await apiClient.patch<{ items: BoardItemDto[] }>(`/api/boards/${board_id}/items/values`, {
      item_ids,
      column_id,
      value,
    });
    return response.items;
  },

  /**
   * PATCH /api/boards/{board_id}/items/reorder — drag-and-drop reordering
   * (same-table, cross-table, or within a subitem list), resequenced
   * server-side in one transaction.
   */
  async reorderItems(board_id: number, payload: ReorderBoardItemsPayload): Promise<BoardItemDto[]> {
    const response = await apiClient.patch<{ items: BoardItemDto[] }>(`/api/boards/${board_id}/items/reorder`, payload);
    return response.items;
  },

  /** PATCH /api/boards/{board_id}/items/archive — selection action bar's "Archive". */
  async archiveItems(board_id: number, item_ids: number[]): Promise<void> {
    await apiClient.patch(`/api/boards/${board_id}/items/archive`, { item_ids });
  },

  /** DELETE /api/boards/{board_id}/items — selection action bar's "Delete", the bulk counterpart of {@link deleteItem}. */
  async deleteItems(board_id: number, item_ids: number[]): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/items`, { item_ids });
  },

  /** GET /api/boards/{board_id}/views — the board's tabs + the viewer's personal tab order, if saved. */
  async getViews(board_id: number): Promise<BoardViewsIndexDto> {
    const response = await apiClient.get<{ data: BoardViewDto[]; personal_order: number[] | null }>(
      `/api/boards/${board_id}/views`
    );
    return { views: response.data, personal_order: response.personal_order };
  },

  /** POST /api/boards/{board_id}/views — add a new tab. */
  async createView(board_id: number, payload: SaveBoardViewPayload): Promise<BoardViewDto> {
    const response = await apiClient.post<{ view: BoardViewDto }>(`/api/boards/${board_id}/views`, payload);
    return response.view;
  },

  /**
   * PATCH /api/boards/{board_id}/views/{view_id} — the "save filters for this
   * board view" action. Called with just the subset of state that changed.
   */
  async saveView(board_id: number, view_id: number, payload: SaveBoardViewPayload): Promise<BoardViewDto> {
    const response = await apiClient.patch<{ view: BoardViewDto }>(
      `/api/boards/${board_id}/views/${view_id}`,
      payload
    );
    return response.view;
  },

  /** DELETE /api/boards/{board_id}/views/{view_id} */
  async deleteView(board_id: number, view_id: number): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/views/${view_id}`);
  },

  /** POST /api/boards/{board_id}/views/{view_id}/duplicate — clone a tab's label + saved config. */
  async duplicateView(board_id: number, view_id: number, payload?: DuplicateBoardViewPayload): Promise<BoardViewDto> {
    const response = await apiClient.post<{ view: BoardViewDto }>(`/api/boards/${board_id}/views/${view_id}/duplicate`, payload ?? {});
    return response.view;
  },

  /** POST /api/boards/{board_id}/views/{view_id}/pin — toggles whether the tab is pinned. */
  async togglePinView(board_id: number, view_id: number): Promise<BoardViewDto> {
    const response = await apiClient.post<{ view: BoardViewDto }>(`/api/boards/${board_id}/views/${view_id}/pin`);
    return response.view;
  },

  /** POST /api/boards/{board_id}/views/{view_id}/lock — toggles whether the tab is locked to restrict edits. */
  async toggleLockView(board_id: number, view_id: number): Promise<BoardViewDto> {
    const response = await apiClient.post<{ view: BoardViewDto }>(`/api/boards/${board_id}/views/${view_id}/lock`);
    return response.view;
  },

  /** PUT /api/boards/{board_id}/views/order — saves the viewer's own "Reorder (for you only)" tab order. */
  async updatePersonalViewOrder(board_id: number, view_ids: Array<number | string>): Promise<number[]> {
    const response = await apiClient.put<{ personal_order: number[] }>(`/api/boards/${board_id}/views/order`, {
      view_ids,
    });
    return response.personal_order;
  },

  /**
   * POST /api/boards/{board_id}/views/{view_id}/images — uploads an image
   * embedded into a `doc` view's markdown body (`BoardDocEditor`'s
   * image-upload plugin) and returns its public URL. Stateless: the caller
   * embeds the returned URL into the view's markdown, persisted through the
   * existing `saveView`/`updateDocContent` autosave — no separate record to
   * track here.
   */
  async uploadDocImage(board_id: number, view_id: number, image: File): Promise<string> {
    const form_data = new FormData();
    form_data.append("image", image);
    const response = await apiClient.postFormData<{ url: string }>(
      `/api/boards/${board_id}/views/${view_id}/images`,
      form_data
    );
    return response.url;
  },
};
