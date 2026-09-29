import { apiClient } from "@/lib/api-client";
import type {
  AccountAutomationTemplateDto,
  BoardAutomationBulkAction,
  BoardAutomationBulkResult,
  BoardAutomationCopyResult,
  BoardAutomationDto,
  BoardAutomationExportFile,
  BoardAutomationImportResult,
  BoardAutomationPreviewResult,
  BoardAutomationRunDetail,
  BoardAutomationRunDto,
  BoardAutomationSettingsDto,
  BoardAutomationVersionDto,
  BoardButtonPressResult,
  BoardItemAutomationsDto,
  BoardAutomationTeamDto,
  BoardAutomationTestResult,
  BoardAutomationRunFilters,
  BoardAutomationRunsPage,
  BoardAutomationTemplateDto,
  BoardAutomationUndoResult,
  BoardAutomationUsageDto,
  CreateBoardAutomationPayload,
  TestBoardAutomationPayload,
  UpdateBoardAutomationPayload,
  UpdateBoardAutomationSettingsPayload,
} from "@/types/board-automation";

/** Builds `?a=1&b=2`, leaving out every empty value. */
function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

/**
 * Talks to the Laravel rule-based (no AI) automations engine
 * (`App\Http\Controllers\Board\BoardAutomationController`) — mirrors
 * {@link import("./board-content.service").boardContentService}'s own style.
 */
export const boardAutomationService = {
  /** GET /api/boards/{board_id}/automations — scoped to `view_id` (a tab), defaulting to the board's primary tab. */
  async getAutomations(board_id: number, view_id?: number | null): Promise<BoardAutomationDto[]> {
    const query = view_id ? `?view_id=${view_id}` : "";
    const response = await apiClient.get<{ data: BoardAutomationDto[] }>(`/api/boards/${board_id}/automations${query}`);
    return response.data;
  },

  /** POST /api/boards/{board_id}/automations */
  async createAutomation(board_id: number, payload: CreateBoardAutomationPayload): Promise<BoardAutomationDto> {
    const response = await apiClient.post<{ automation: BoardAutomationDto }>(`/api/boards/${board_id}/automations`, payload);
    return response.automation;
  },

  /** PATCH /api/boards/{board_id}/automations/{automation_id} */
  async updateAutomation(board_id: number, automation_id: number, payload: UpdateBoardAutomationPayload): Promise<BoardAutomationDto> {
    const response = await apiClient.patch<{ automation: BoardAutomationDto }>(
      `/api/boards/${board_id}/automations/${automation_id}`,
      payload
    );
    return response.automation;
  },

  /** POST /api/boards/{board_id}/automations/{automation_id}/duplicate, the copy starts disabled. */
  async duplicateAutomation(board_id: number, automation_id: number): Promise<BoardAutomationDto> {
    const response = await apiClient.post<{ automation: BoardAutomationDto }>(`/api/boards/${board_id}/automations/${automation_id}/duplicate`, {});
    return response.automation;
  },

  /** GET /api/boards/{board_id}/automations/runs, the Manage tab's run history, newest first. */
  async getRuns(board_id: number, view_id: number | null, filters: BoardAutomationRunFilters, page: number, per_page: number): Promise<BoardAutomationRunsPage> {
    return apiClient.get<BoardAutomationRunsPage>(`/api/boards/${board_id}/automations/runs${buildQuery({ view_id, ...filters, page, per_page })}`);
  },

  /** GET /api/boards/{board_id}/automations/usage, run totals for the last 30 days. */
  async getUsage(board_id: number, view_id: number | null): Promise<BoardAutomationUsageDto> {
    const response = await apiClient.get<{ data: BoardAutomationUsageDto }>(`/api/boards/${board_id}/automations/usage${buildQuery({ view_id })}`);
    return response.data;
  },

  /** GET /api/boards/{board_id}/automations/templates, the board's saved templates, newest first. */
  async getTemplates(board_id: number): Promise<BoardAutomationTemplateDto[]> {
    const response = await apiClient.get<{ data: BoardAutomationTemplateDto[] }>(`/api/boards/${board_id}/automations/templates`);
    return response.data;
  },

  /** POST /api/boards/{board_id}/automations/{automation_id}/template, "Save as template" on an automation card. */
  async saveAsTemplate(board_id: number, automation_id: number, payload: { name?: string | null; description?: string | null }): Promise<BoardAutomationTemplateDto> {
    const response = await apiClient.post<{ template: BoardAutomationTemplateDto }>(`/api/boards/${board_id}/automations/${automation_id}/template`, payload);
    return response.template;
  },

  /** DELETE /api/boards/{board_id}/automations/templates/{template_id} */
  async deleteTemplate(board_id: number, template_id: number): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/automations/templates/${template_id}`);
  },

  /** POST /api/boards/{board_id}/automations/test, runs a definition on one item and rolls everything back. */
  async testRun(board_id: number, payload: TestBoardAutomationPayload): Promise<BoardAutomationTestResult> {
    const response = await apiClient.post<{ data: BoardAutomationTestResult }>(`/api/boards/${board_id}/automations/test`, payload);
    return response.data;
  },

  /** POST /api/boards/{board_id}/automations/{automation_id}/webhook-token, the old URL stops working. */
  async regenerateWebhookUrl(board_id: number, automation_id: number): Promise<BoardAutomationDto> {
    const response = await apiClient.post<{ automation: BoardAutomationDto }>(`/api/boards/${board_id}/automations/${automation_id}/webhook-token`, {});
    return response.automation;
  },

  /** GET /api/boards/{board_id}/automations/teams, the teams a "notify team" action can reach. */
  async getTeams(board_id: number): Promise<BoardAutomationTeamDto[]> {
    const response = await apiClient.get<{ data: BoardAutomationTeamDto[] }>(`/api/boards/${board_id}/automations/teams`);
    return response.data;
  },

  /** GET /api/automation-templates, the templates published for every board. */
  async getAccountTemplates(): Promise<AccountAutomationTemplateDto[]> {
    const response = await apiClient.get<{ data: AccountAutomationTemplateDto[] }>("/api/automation-templates");
    return response.data;
  },

  /** POST /api/automation-templates, administrators only. */
  async publishAccountTemplate(payload: { automation_id: number; name: string; description?: string | null }): Promise<AccountAutomationTemplateDto> {
    const response = await apiClient.post<{ template: AccountAutomationTemplateDto }>("/api/automation-templates", payload);
    return response.template;
  },

  /** DELETE /api/automation-templates/{template_id}, administrators only. */
  async deleteAccountTemplate(template_id: number): Promise<void> {
    await apiClient.delete(`/api/automation-templates/${template_id}`);
  },

  /** GET /api/boards/{board_id}/automations/settings */
  async getSettings(board_id: number): Promise<BoardAutomationSettingsDto> {
    const response = await apiClient.get<{ data: BoardAutomationSettingsDto }>(`/api/boards/${board_id}/automations/settings`);
    return response.data;
  },

  /** PUT /api/boards/{board_id}/automations/settings, "Pause all automations" and the working calendar. */
  async updateSettings(board_id: number, payload: UpdateBoardAutomationSettingsPayload): Promise<BoardAutomationSettingsDto> {
    const response = await apiClient.put<{ data: BoardAutomationSettingsDto }>(`/api/boards/${board_id}/automations/settings`, payload);
    return response.data;
  },

  /** POST /api/boards/{board_id}/automations/bulk */
  async bulkUpdate(board_id: number, automation_ids: number[], action: BoardAutomationBulkAction): Promise<BoardAutomationBulkResult> {
    return apiClient.post<BoardAutomationBulkResult>(`/api/boards/${board_id}/automations/bulk`, { automation_ids, action });
  },

  /** POST /api/boards/{board_id}/automations/copy, the copies start turned off. */
  async copyToBoard(board_id: number, automation_ids: number[], target_board_id: number): Promise<BoardAutomationCopyResult> {
    return apiClient.post<BoardAutomationCopyResult>(`/api/boards/${board_id}/automations/copy`, { automation_ids, target_board_id });
  },

  /** GET /api/boards/{board_id}/automations/{automation_id}/versions, newest first. */
  async getVersions(board_id: number, automation_id: number): Promise<BoardAutomationVersionDto[]> {
    const response = await apiClient.get<{ data: BoardAutomationVersionDto[] }>(`/api/boards/${board_id}/automations/${automation_id}/versions`);
    return response.data;
  },

  /** POST /api/boards/{board_id}/automations/{automation_id}/versions/{version_id}/restore */
  async restoreVersion(board_id: number, automation_id: number, version_id: number): Promise<BoardAutomationDto> {
    const response = await apiClient.post<{ automation: BoardAutomationDto }>(`/api/boards/${board_id}/automations/${automation_id}/versions/${version_id}/restore`, {});
    return response.automation;
  },

  /** GET /api/boards/{board_id}/automations/runs/{run_id}, every step of that execution. */
  async getRun(board_id: number, run_id: number): Promise<BoardAutomationRunDetail> {
    const response = await apiClient.get<{ data: BoardAutomationRunDetail }>(`/api/boards/${board_id}/automations/runs/${run_id}`);
    return response.data;
  },

  /** POST /api/boards/{board_id}/automations/runs/{run_id}/retry, runs a failed step and the ones after it again. */
  async retryRun(board_id: number, run_id: number): Promise<{ message: string; data: BoardAutomationRunDto[] }> {
    return apiClient.post<{ message: string; data: BoardAutomationRunDto[] }>(`/api/boards/${board_id}/automations/runs/${run_id}/retry`, {});
  },

  /** POST /api/boards/{board_id}/automations/runs/{run_id}/undo, takes back what that run changed inside the app. */
  async undoRun(board_id: number, run_id: number): Promise<BoardAutomationUndoResult> {
    return apiClient.post<BoardAutomationUndoResult>(`/api/boards/${board_id}/automations/runs/${run_id}/undo`, {});
  },

  /** POST /api/boards/{board_id}/automations/preview, the items a draft would act on, nothing saved. */
  async previewImpact(board_id: number, payload: TestBoardAutomationPayload): Promise<BoardAutomationPreviewResult> {
    const response = await apiClient.post<{ data: BoardAutomationPreviewResult }>(`/api/boards/${board_id}/automations/preview`, payload);
    return response.data;
  },

  /** POST /api/boards/{board_id}/automations/export, the automations of a table (all of them when `automation_ids` is empty) as a file. */
  async exportAutomations(board_id: number, view_id: number | null, automation_ids: number[] = []): Promise<BoardAutomationExportFile> {
    const response = await apiClient.post<{ data: BoardAutomationExportFile }>(`/api/boards/${board_id}/automations/export`, { view_id, automation_ids });
    return response.data;
  },

  /** POST /api/boards/{board_id}/automations/import, creates the automations of an exported file, turned off. */
  async importAutomations(board_id: number, view_id: number | null, file: unknown): Promise<BoardAutomationImportResult> {
    return apiClient.post<BoardAutomationImportResult>(`/api/boards/${board_id}/automations/import`, { view_id, file });
  },

  /** DELETE /api/boards/{board_id}/automations/delayed/{delayed_id}, cancels a run waiting behind a "wait" step. */
  async cancelWaitingRun(board_id: number, delayed_id: number): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/automations/delayed/${delayed_id}`);
  },

  /** GET /api/boards/{board_id}/automations/items/{item_id}, the item drawer's Automations tab. */
  async getItemAutomations(board_id: number, item_id: number): Promise<BoardItemAutomationsDto> {
    const response = await apiClient.get<{ data: BoardItemAutomationsDto }>(`/api/boards/${board_id}/automations/items/${item_id}`);
    return response.data;
  },

  /** POST /api/boards/{board_id}/items/{item_id}/buttons/{column_id}, a Button column's press. */
  async pressButton(board_id: number, item_id: number, column_id: number): Promise<BoardButtonPressResult> {
    return apiClient.post<BoardButtonPressResult>(`/api/boards/${board_id}/items/${item_id}/buttons/${column_id}`, {});
  },

  /** DELETE /api/boards/{board_id}/automations/{automation_id} */
  async deleteAutomation(board_id: number, automation_id: number): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/automations/${automation_id}`);
  },
};
