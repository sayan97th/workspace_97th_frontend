import { apiClient } from "@/lib/api-client";
import type {
  CreateDepartmentPayload,
  DepartmentDto,
  DepartmentMutationResponse,
  UpdateDepartmentPayload,
} from "@/types/administration/departments";

/** Talks to the Laravel `/api/admin/departments` resource. */
export const departmentsService = {
  /** GET /api/admin/departments */
  async getDepartments(search?: string): Promise<DepartmentDto[]> {
    const response = await apiClient.get<{ data: DepartmentDto[] }>(
      `/api/admin/departments${search ? `?search=${encodeURIComponent(search)}` : ""}`
    );
    return response.data;
  },

  /** POST /api/admin/departments */
  async createDepartment(payload: CreateDepartmentPayload): Promise<DepartmentDto> {
    const response = await apiClient.post<{ department: DepartmentDto }>("/api/admin/departments", payload);
    return response.department;
  },

  /** PATCH /api/admin/departments/{id} */
  async updateDepartment(department_id: number, payload: UpdateDepartmentPayload): Promise<DepartmentDto> {
    const response = await apiClient.patch<{ department: DepartmentDto }>(
      `/api/admin/departments/${department_id}`,
      payload
    );
    return response.department;
  },

  /** DELETE /api/admin/departments/{id} */
  async deleteDepartment(department_id: number): Promise<void> {
    await apiClient.delete(`/api/admin/departments/${department_id}`);
  },

  /** POST /api/admin/departments/{id}/members */
  async assignMembers(department_id: number, user_ids: number[]): Promise<DepartmentDto> {
    const response = await apiClient.post<DepartmentMutationResponse>(
      `/api/admin/departments/${department_id}/members`,
      { user_ids }
    );
    return response.department;
  },

  /** DELETE /api/admin/departments/{id}/members/{user_id} */
  async removeMember(department_id: number, user_id: number): Promise<DepartmentDto> {
    const response = await apiClient.delete<DepartmentMutationResponse>(
      `/api/admin/departments/${department_id}/members/${user_id}`
    );
    return response.department;
  },

  /** POST /api/admin/departments/{id}/owners */
  async assignOwners(department_id: number, user_ids: number[]): Promise<DepartmentDto> {
    const response = await apiClient.post<DepartmentMutationResponse>(
      `/api/admin/departments/${department_id}/owners`,
      { user_ids }
    );
    return response.department;
  },

  /** DELETE /api/admin/departments/{id}/owners/{user_id} */
  async removeOwner(department_id: number, user_id: number): Promise<DepartmentDto> {
    const response = await apiClient.delete<DepartmentMutationResponse>(
      `/api/admin/departments/${department_id}/owners/${user_id}`
    );
    return response.department;
  },
};
