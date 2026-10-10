import { apiClient } from "@/lib/api-client";
import type {
  OrganizationAssetKey,
  OrganizationDto,
  OrganizationResponse,
  UpdateOrganizationPayload,
} from "@/types/organization";

/** Talks to the Laravel `/api/admin/organization` resource behind Administration > Organization. */
export const organizationService = {
  /** GET /api/admin/organization */
  async getOrganization(): Promise<OrganizationDto> {
    return apiClient.get<OrganizationDto>("/api/admin/organization");
  },

  /** PATCH /api/admin/organization, only the fields that changed. */
  async updateOrganization(payload: UpdateOrganizationPayload): Promise<OrganizationDto> {
    const response = await apiClient.patch<OrganizationResponse>("/api/admin/organization", payload);
    return response.organization;
  },

  /** POST /api/admin/organization/assets/{asset} */
  async uploadAsset(asset: OrganizationAssetKey, file: File): Promise<OrganizationDto> {
    const form_data = new FormData();
    form_data.append("file", file);
    const response = await apiClient.postFormData<OrganizationResponse>(
      `/api/admin/organization/assets/${asset}`,
      form_data
    );
    return response.organization;
  },

  /** DELETE /api/admin/organization/assets/{asset} */
  async removeAsset(asset: OrganizationAssetKey): Promise<OrganizationDto> {
    const response = await apiClient.delete<OrganizationResponse>(`/api/admin/organization/assets/${asset}`);
    return response.organization;
  },
};
