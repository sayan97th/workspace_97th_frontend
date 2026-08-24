"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { adminUsersService } from "@/services/administration/admin-users.service";
import { departmentsService } from "@/services/administration/departments.service";
import type { DepartmentDto } from "@/types/administration/departments";

const RENAME_DEBOUNCE_MS = 600;

export type DepartmentsManagerApi = {
  is_loading: boolean;
  error: string | null;
  department_rows: DepartmentDto[];
  unassigned_user_count: number;

  addDepartment: () => Promise<void>;
  is_adding_department: boolean;
  renameDepartment: (id: number, name: string) => void;

  department_pending_delete: DepartmentDto | null;
  requestRemoveDepartment: (department: DepartmentDto) => void;
  cancelRemoveDepartment: () => void;
  confirmRemoveDepartment: () => Promise<void>;
};

/**
 * Owns the Departments section's CRUD against `/api/admin/departments`. Renaming debounces
 * (it's a free-text field editing on every keystroke), creating and deleting are immediate;
 * deleting is destructive and routed through {@link ConfirmActionModal} instead of firing on
 * click like the old mock implementation did.
 */
export function useDepartmentsManager(): DepartmentsManagerApi {
  const [department_rows, setDepartmentRows] = useState<DepartmentDto[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unassigned_user_count, setUnassignedUserCount] = useState(0);
  const [is_adding_department, setIsAddingDepartment] = useState(false);
  const [department_pending_delete, setDepartmentPendingDelete] = useState<DepartmentDto | null>(null);

  const rename_timeouts_ref = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const loadDepartments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [departments, unassigned] = await Promise.all([
        departmentsService.getDepartments(),
        adminUsersService.getUsers({ department: "unassigned", per_page: 1 }),
      ]);
      setDepartmentRows(departments);
      setUnassignedUserCount(unassigned.total);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't load departments."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    const timeouts = rename_timeouts_ref.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  const addDepartment = useCallback(async () => {
    setIsAddingDepartment(true);
    try {
      const created = await departmentsService.createDepartment({ name: "New department" });
      setDepartmentRows((current) => [...current, created]);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't create that department."));
    } finally {
      setIsAddingDepartment(false);
    }
  }, []);

  const renameDepartment = useCallback((id: number, name: string) => {
    setDepartmentRows((current) => current.map((row) => (row.id === id ? { ...row, name } : row)));

    const existing_timeout = rename_timeouts_ref.current.get(id);
    if (existing_timeout) clearTimeout(existing_timeout);

    const timeout = setTimeout(() => {
      rename_timeouts_ref.current.delete(id);
      void departmentsService
        .updateDepartment(id, { name })
        .catch((err) => setError(apiErrorMessage(err, "We couldn't rename that department.")));
    }, RENAME_DEBOUNCE_MS);
    rename_timeouts_ref.current.set(id, timeout);
  }, []);

  const requestRemoveDepartment = useCallback((department: DepartmentDto) => setDepartmentPendingDelete(department), []);
  const cancelRemoveDepartment = useCallback(() => setDepartmentPendingDelete(null), []);

  const confirmRemoveDepartment = useCallback(async () => {
    if (!department_pending_delete) return;
    const deleted_id = department_pending_delete.id;
    await departmentsService.deleteDepartment(deleted_id);
    setDepartmentRows((current) => current.filter((row) => row.id !== deleted_id));
    setDepartmentPendingDelete(null);
  }, [department_pending_delete]);

  return {
    is_loading,
    error,
    department_rows,
    unassigned_user_count,

    addDepartment,
    is_adding_department,
    renameDepartment,

    department_pending_delete,
    requestRemoveDepartment,
    cancelRemoveDepartment,
    confirmRemoveDepartment,
  };
}
