import { apiClient } from "@/lib/api-client";
import { publicApiRequest } from "@/lib/public-api-client";
import type { BoardDocDto, DocUploadedFile, PublicDocDto } from "@/types/board-doc";

/**
 * Talks to the Laravel API for the body of a Doc (a navigation leaf with
 * `view_key = doc`) and the files embedded in it. The upload endpoint also
 * serves the Doc tabs of regular boards, keyed by the board id.
 */
export const boardDocService = {
  /** GET /api/boards/{board_id}/doc */
  async getDoc(board_id: number): Promise<BoardDocDto> {
    return apiClient.get<BoardDocDto>(`/api/boards/${board_id}/doc`);
  },

  /** PUT /api/boards/{board_id}/doc, replaces the whole document. */
  async saveDoc(board_id: number, content: string | null): Promise<BoardDocDto> {
    const response = await apiClient.put<{ doc: BoardDocDto }>(`/api/boards/${board_id}/doc`, { content });
    return response.doc;
  },

  /** POST /api/boards/{board_id}/doc/files, stores an image, video, audio clip or attachment. */
  async uploadFile(board_id: number, file: File): Promise<DocUploadedFile> {
    const form_data = new FormData();
    form_data.append("file", file);
    return apiClient.postFormData<DocUploadedFile>(`/api/boards/${board_id}/doc/files`, form_data);
  },

  /** PUT /api/boards/{board_id}/doc/public-link, the Share dialog's "Share public link" switch. */
  async updatePublicLink(board_id: number, is_enabled: boolean): Promise<BoardDocDto> {
    const response = await apiClient.put<{ doc: BoardDocDto }>(`/api/boards/${board_id}/doc/public-link`, { is_enabled });
    return response.doc;
  },

  /** Public, no session: GET /api/public/docs/{token}, a doc opened through its public link. */
  async openPublicDoc(token: string): Promise<PublicDocDto> {
    return publicApiRequest<PublicDocDto>(`/api/public/docs/${encodeURIComponent(token)}`);
  },
};

/** The absolute url a doc's public link opens at. */
export const buildPublicDocUrl = (token: string): string =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/share/docs/${token}`;
