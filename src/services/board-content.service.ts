import { apiClient } from "@/lib/api-client";
import type {
  BoardColumnDto,
  BoardGroupDto,
  BoardItemDetailDto,
  BoardItemDto,
  BoardItemValue,
  BoardViewDto,
  BoardViewsIndexDto,
  CreateBoardColumnPayload,
  CreateBoardGroupPayload,
  CreateBoardItemPayload,
  SaveBoardViewPayload,
  UpdateBoardColumnPayload,
  UpdateBoardGroupPayload,
  UpdateBoardItemPayload,
} from "@/types/board-content";

/**
 * Talks to the Laravel "table board" engine (`App\Http\Controllers\Board\*`)
 * — the reusable backend for any board's tables (groups), items, columns and
 * saved views. Mirrors {@link import("./workspace.service").workspaceService}'s
 * style: every call goes through the shared `apiClient`.
 */
export const boardContentService = {
  /**
   * GET /api/boards/client-hub — resolves Client Hub's navigation-item id.
   *
   * Client Hub renders at the static `/client-hub` frontend route (not the
   * id-routed `/boards/{id}` page), so it never receives its own id as a
   * route param. This is the one Client-Hub-specific call in this service —
   * everything else (views CRUD) reuses the generic `board_id`-keyed
   * endpoints below once the id is known.
   */
  async getClientHubBoardId(): Promise<number> {
    const response = await apiClient.get<{ id: number }>("/api/boards/client-hub");
    return response.id;
  },

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

  /** GET /api/boards/{board_id}/groups — a tab's tables (any number, 1…N), scoped to `view_id`, defaulting to the board's primary tab. */
  async getGroups(board_id: number, view_id?: number | null): Promise<BoardGroupDto[]> {
    const query = view_id ? `?view_id=${view_id}` : "";
    const response = await apiClient.get<{ data: BoardGroupDto[] }>(`/api/boards/${board_id}/groups${query}`);
    return response.data;
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

  /** DELETE /api/boards/{board_id}/groups/{group_id} — cascades to its items. */
  async deleteGroup(board_id: number, group_id: number): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/groups/${group_id}`);
  },

  /** GET /api/boards/{board_id}/items — scoped to `view_id` (a tab), defaulting to the board's primary tab, optionally narrowed by a server-side `search` term. */
  async getItems(board_id: number, view_id?: number | null, search?: string): Promise<BoardItemDto[]> {
    const params = new URLSearchParams();
    if (view_id) params.set("view_id", String(view_id));
    if (search) params.set("search", search);
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

  /** POST /api/boards/{board_id}/items/{item_id}/cover — sets (or replaces) the Kanban card's cover image. */
  async updateItemCover(board_id: number, item_id: number, cover: File): Promise<BoardItemDto> {
    const form_data = new FormData();
    form_data.append("cover", cover);
    const response = await apiClient.postFormData<{ item: BoardItemDto }>(
      `/api/boards/${board_id}/items/${item_id}/cover`,
      form_data
    );
    return response.item;
  },

  /** DELETE /api/boards/{board_id}/items/{item_id}/cover */
  async removeItemCover(board_id: number, item_id: number): Promise<BoardItemDto> {
    const response = await apiClient.delete<{ item: BoardItemDto }>(`/api/boards/${board_id}/items/${item_id}/cover`);
    return response.item;
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
  async duplicateView(board_id: number, view_id: number): Promise<BoardViewDto> {
    const response = await apiClient.post<{ view: BoardViewDto }>(`/api/boards/${board_id}/views/${view_id}/duplicate`);
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
};
