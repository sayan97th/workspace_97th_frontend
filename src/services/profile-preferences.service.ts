import { apiClient } from "@/lib/api-client";
import type { ApiError } from "@/types/auth";
import type {
  LocalePreferencesPayload,
  NotificationPreferencesPayload,
  UpdatePreferencesResponse,
  UserSessionDto,
  WorkingStatusPayload,
} from "@/types/profile-preferences";

/** Extracts the first Laravel validation message, falling back to the top-level error message. */
export const apiErrorMessage = (error: unknown, fallback: string): string => {
  const api_error = error as ApiError;
  const field_message = api_error?.errors ? Object.values(api_error.errors)[0]?.[0] : undefined;
  return field_message || api_error?.message || fallback;
};

export const profilePreferencesService = {
  /** PATCH /api/profile/working-status */
  async updateWorkingStatus(payload: WorkingStatusPayload): Promise<UpdatePreferencesResponse> {
    return apiClient.patch<UpdatePreferencesResponse>("/api/profile/working-status", payload);
  },

  /** PATCH /api/profile/notifications */
  async updateNotificationPreferences(payload: NotificationPreferencesPayload): Promise<UpdatePreferencesResponse> {
    return apiClient.patch<UpdatePreferencesResponse>("/api/profile/notifications", payload);
  },

  /** PATCH /api/profile/locale */
  async updateLocalePreferences(payload: LocalePreferencesPayload): Promise<UpdatePreferencesResponse> {
    return apiClient.patch<UpdatePreferencesResponse>("/api/profile/locale", payload);
  },

  /** GET /api/profile/sessions */
  async fetchSessions(): Promise<UserSessionDto[]> {
    const response = await apiClient.get<{ data: UserSessionDto[] }>("/api/profile/sessions");
    return response.data;
  },

  /** DELETE /api/profile/sessions/{id} */
  async logoutSession(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/profile/sessions/${id}`);
  },
};
