import { apiClient } from "@/lib/api-client";
import type { WorkspaceNavNode } from "@/types/workspace";
import type { BoardTemplateCategory, BoardTemplateDto } from "@/types/board-template";

/**
 * The Template center (`App\Http\Controllers\Template\BoardTemplateController`):
 * built in templates plus boards saved as templates, saving a board as a
 * template, and creating a board from one.
 */
export const boardTemplateService = {
  /** GET /api/board-templates */
  async listTemplates(): Promise<{ categories: BoardTemplateCategory[]; templates: BoardTemplateDto[] }> {
    return apiClient.get<{ categories: BoardTemplateCategory[]; templates: BoardTemplateDto[] }>("/api/board-templates");
  },

  /** POST /api/board-templates, the board menu's "Save as a template". */
  async saveBoardAsTemplate(payload: { board_id: number; name: string; description?: string | null; category?: string; include_items: boolean }): Promise<{ id: string; name: string }> {
    const response = await apiClient.post<{ template: { id: string; name: string } }>("/api/board-templates", payload);
    return response.template;
  },

  /** DELETE /api/board-templates/{id}, only for templates saved by the viewer (or by anyone, for admins). */
  async deleteTemplate(template_id: string): Promise<void> {
    await apiClient.delete(`/api/board-templates/${template_id.replace(/^custom:/, "")}`);
  },

  /** POST /api/workspaces/{slug}/navigation/from-template, creates a board from a template and returns it. */
  async createBoardFromTemplate(
    workspace_slug: string,
    payload: { template_id: string; label: string; parent_id?: number | null }
  ): Promise<WorkspaceNavNode> {
    const response = await apiClient.post<{ item: WorkspaceNavNode }>(`/api/workspaces/${workspace_slug}/navigation/from-template`, payload);
    return response.item;
  },
};
