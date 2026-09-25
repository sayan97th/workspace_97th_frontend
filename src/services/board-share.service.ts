import { apiClient } from "@/lib/api-client";
import { publicApiRequest } from "@/lib/public-api-client";
import type { BoardViewShareLinkDto, SharedViewDto } from "@/types/board-sharing";

const shareLinkUrl = (board_id: number, view_id: number) => `/api/boards/${board_id}/views/${view_id}/share-link`;

/**
 * "Share view": a read only public link to one board view. Managing the link
 * needs a board owner, opening it needs nothing but the token (and the
 * password, when one is set).
 */
export const boardShareService = {
  async getLink(board_id: number, view_id: number): Promise<BoardViewShareLinkDto | null> {
    const response = await apiClient.get<{ link: BoardViewShareLinkDto | null }>(shareLinkUrl(board_id, view_id));
    return response.link;
  },

  /** Creates the link, or turns an existing one back on. */
  async enableLink(board_id: number, view_id: number): Promise<BoardViewShareLinkDto> {
    const response = await apiClient.post<{ link: BoardViewShareLinkDto }>(shareLinkUrl(board_id, view_id));
    return response.link;
  },

  /** `password: null` removes the password. */
  async updateLink(board_id: number, view_id: number, payload: { is_enabled?: boolean; password?: string | null }): Promise<BoardViewShareLinkDto> {
    const response = await apiClient.patch<{ link: BoardViewShareLinkDto }>(shareLinkUrl(board_id, view_id), payload);
    return response.link;
  },

  /** Replaces the token, so the old link stops working right away. */
  async regenerateLink(board_id: number, view_id: number): Promise<BoardViewShareLinkDto> {
    const response = await apiClient.post<{ link: BoardViewShareLinkDto }>(`${shareLinkUrl(board_id, view_id)}/regenerate`);
    return response.link;
  },

  async deleteLink(board_id: number, view_id: number): Promise<void> {
    await apiClient.delete(shareLinkUrl(board_id, view_id));
  },

  /** Public, no session: opens a shared view. Rejects with `status_code: 401` and `requires_password` when a password is needed. */
  async openSharedView(token: string, password?: string): Promise<SharedViewDto> {
    return publicApiRequest<SharedViewDto>(`/api/public/views/${encodeURIComponent(token)}`, "POST", password ? { password } : {});
  },
};

/** The absolute url a share token opens at. */
export const buildSharedViewUrl = (token: string): string =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/share/views/${token}`;
