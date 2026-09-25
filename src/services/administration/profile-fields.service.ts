import { apiClient } from "@/lib/api-client";
import type {
  ProfileFieldDto,
  StoreProfileFieldPayload,
  UpdateProfileFieldPayload,
} from "@/types/administration/profile-fields";

/** Talks to the Laravel `/api/admin/profile-fields` resource. */
export const profileFieldsService = {
  /** GET /api/admin/profile-fields */
  async getFields(): Promise<ProfileFieldDto[]> {
    const response = await apiClient.get<{ data: ProfileFieldDto[] }>("/api/admin/profile-fields");
    return response.data;
  },

  /** POST /api/admin/profile-fields */
  async createField(payload: StoreProfileFieldPayload): Promise<ProfileFieldDto> {
    const response = await apiClient.post<{ field: ProfileFieldDto }>("/api/admin/profile-fields", payload);
    return response.field;
  },

  /** PATCH /api/admin/profile-fields/{id} */
  async updateField(field_id: number, payload: UpdateProfileFieldPayload): Promise<ProfileFieldDto> {
    const response = await apiClient.patch<{ field: ProfileFieldDto }>(`/api/admin/profile-fields/${field_id}`, payload);
    return response.field;
  },

  /** DELETE /api/admin/profile-fields/{id}, also removes every user's value for it. */
  async deleteField(field_id: number): Promise<void> {
    await apiClient.delete<void>(`/api/admin/profile-fields/${field_id}`);
  },

  /** PUT /api/admin/profile-fields/order */
  async reorderFields(field_ids: number[]): Promise<ProfileFieldDto[]> {
    const response = await apiClient.put<{ data: ProfileFieldDto[] }>("/api/admin/profile-fields/order", { field_ids });
    return response.data;
  },
};
