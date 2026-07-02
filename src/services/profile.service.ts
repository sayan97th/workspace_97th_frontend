import { apiClient } from "@/lib/api-client";
import type {
  ProfileData,
  PartialProfileData,
  ProfileResponse,
  UpdateProfileResponse,
  ProfilePhotoResponse,
  ChangePasswordData,
  ChangePasswordResponse,
} from "@/types/auth";

export const profileService = {
  /** GET /api/profile — fetch the full profile on page load. */
  async fetchUserProfile(): Promise<ProfileResponse> {
    const response = await apiClient.get<{ data: ProfileResponse }>("/api/profile");
    return response.data;
  },

  /** PUT /api/profile — full profile update (all fields sent). */
  async updateUserProfile(data: ProfileData): Promise<UpdateProfileResponse> {
    return apiClient.put<UpdateProfileResponse>("/api/profile", data);
  },

  /** PATCH /api/profile — partial update, only send the fields that changed. */
  async patchUserProfile(data: PartialProfileData): Promise<UpdateProfileResponse> {
    return apiClient.patch<UpdateProfileResponse>("/api/profile", data);
  },

  /** POST /api/profile/photo — upload a new avatar (multipart). */
  async uploadProfilePhoto(file: File): Promise<ProfilePhotoResponse> {
    const form_data = new FormData();
    form_data.append("profile_photo", file);
    return apiClient.postFormData<ProfilePhotoResponse>("/api/profile/photo", form_data);
  },

  /** DELETE /api/profile/photo — remove the current avatar. */
  async deleteProfilePhoto(): Promise<ProfilePhotoResponse> {
    return apiClient.delete<ProfilePhotoResponse>("/api/profile/photo");
  },

  /** PUT /api/profile/password — change the account password. */
  async changePassword(data: ChangePasswordData): Promise<ChangePasswordResponse> {
    return apiClient.put<ChangePasswordResponse>("/api/profile/password", data);
  },
};
