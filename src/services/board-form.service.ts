import { apiClient } from "@/lib/api-client";
import { publicApiRequest } from "@/lib/public-api-client";
import type { BoardFormBuilderDto, PublicFormAnswer, PublicFormDto, UpdateBoardFormPayload } from "@/types/board-forms";

const formUrl = (board_id: number, view_id: number) => `/api/boards/${board_id}/views/${view_id}/form`;

/**
 * The Form view: the builder inside the board, and the public form anyone
 * with the link can fill in, see `BoardFormService` on the API.
 */
export const boardFormService = {
  async getBuilder(board_id: number, view_id: number): Promise<BoardFormBuilderDto> {
    return apiClient.get<BoardFormBuilderDto>(formUrl(board_id, view_id));
  },

  async updateForm(board_id: number, view_id: number, payload: UpdateBoardFormPayload): Promise<BoardFormBuilderDto> {
    return apiClient.patch<BoardFormBuilderDto>(formUrl(board_id, view_id), payload);
  },

  /** Replaces the public link, so every copy shared so far stops working. */
  async regenerateLink(board_id: number, view_id: number): Promise<string> {
    const response = await apiClient.post<{ token: string }>(`${formUrl(board_id, view_id)}/regenerate-link`);
    return response.token;
  },

  /** Public, no session. */
  async getPublicForm(token: string): Promise<PublicFormDto> {
    return publicApiRequest<PublicFormDto>(`/api/public/forms/${encodeURIComponent(token)}`);
  },

  /** Public, no session. Rejects with the API's `errors` map when an answer is invalid. */
  async submitPublicForm(token: string, name: string, answers: Record<string, PublicFormAnswer>): Promise<{ message: string }> {
    return publicApiRequest<{ message: string }>(`/api/public/forms/${encodeURIComponent(token)}/submissions`, "POST", { name, answers });
  },
};

/** The absolute url a form token opens at. */
export const buildPublicFormUrl = (token: string): string =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/forms/${token}`;
