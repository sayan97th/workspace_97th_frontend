"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { adminUsersService } from "@/services/administration/admin-users.service";
import { departmentsService } from "@/services/administration/departments.service";
import type { DepartmentDto } from "@/types/administration/departments";
import { useDepartmentMembers, type DepartmentMembersApi } from "./useDepartmentMembers";

const RENAME_DEBOUNCE_MS = 600;

export type DepartmentsManagerApi = {
  is_loading: boolean;
  error: string | null;
  department_rows: DepartmentDto[];
  unassigned_user_count: number;

  addDepartment: () => Promise<void>;
  is_adding_department: boolean;
  renameDepartment: (id: number, name: string) => void;
  /** Sets the reserved seats of a department; `null` means unlimited. */
  updateReservedSeats: (id: number, seats: number | null) => void;

  /** The "Manage department" dialog: members and owners of the opened department. */
  members: DepartmentMembersApi;
  openMembers: (department: DepartmentDto) => void;
  closeMembers: () => void;

  department_pending_delete: DepartmentDto | null;
  requestRemoveDepartment: (department: DepartmentDto) => void;
  cancelRemoveDepartment: () => void;
  confirmRemoveDepartment: () => Promise<void>;
};

/**
 * Owns the Departments section's CRUD against `/api/admin/departments`. Renaming and
 * reserving seats debounce (they're free-text/number fields editing on every keystroke),
 * creating and deleting are immediate;
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

  const [managed_department_id, setManagedDepartmentId] = useState<number | null>(null);

  const rename_timeouts_ref = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const seat_timeouts_ref = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

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
    const rename_timeouts = rename_timeouts_ref.current;
    const seat_timeouts = seat_timeouts_ref.current;
    return () => {
      rename_timeouts.forEach((timeout) => clearTimeout(timeout));
      seat_timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  const refreshUnassignedCount = useCallback(async () => {
    try {
      const unassigned = await adminUsersService.getUsers({ department: "unassigned", per_page: 1 });
      setUnassignedUserCount(unassigned.total);
    } catch {
      // The banner is informational, a failed refresh just leaves the previous count.
    }
  }, []);

  /** Swaps a department row for the server's fresh copy after a members/owners change. */
  const applyDepartmentChange = useCallback(
    (updated: DepartmentDto) => {
      setDepartmentRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      void refreshUnassignedCount();
    },
    [refreshUnassignedCount]
  );

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

  const updateReservedSeats = useCallback((id: number, seats: number | null) => {
    setDepartmentRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              seat_limit: seats,
              reserved: seats,
              available: seats === null ? null : Math.max(seats - row.assigned, 0),
              over_by: seats === null ? 0 : Math.max(row.assigned - seats, 0),
            }
          : row
      )
    );

    const existing_timeout = seat_timeouts_ref.current.get(id);
    if (existing_timeout) clearTimeout(existing_timeout);

    const timeout = setTimeout(() => {
      seat_timeouts_ref.current.delete(id);
      void departmentsService
        .updateDepartment(id, { seat_limit: seats })
        .catch((err) => setError(apiErrorMessage(err, "We couldn't update the reserved seats.")));
    }, RENAME_DEBOUNCE_MS);
    seat_timeouts_ref.current.set(id, timeout);
  }, []);

  const openMembers = useCallback((department: DepartmentDto) => setManagedDepartmentId(department.id), []);
  const closeMembers = useCallback(() => setManagedDepartmentId(null), []);

  const managed_department = department_rows.find((row) => row.id === managed_department_id) ?? null;
  const members = useDepartmentMembers({ department: managed_department, onDepartmentChanged: applyDepartmentChange });

  const requestRemoveDepartment = useCallback((department: DepartmentDto) => setDepartmentPendingDelete(department), []);
  const cancelRemoveDepartment = useCallback(() => setDepartmentPendingDelete(null), []);

  const confirmRemoveDepartment = useCallback(async () => {
    if (!department_pending_delete) return;
    const deleted_id = department_pending_delete.id;
    await departmentsService.deleteDepartment(deleted_id);
    setDepartmentRows((current) => current.filter((row) => row.id !== deleted_id));
    setDepartmentPendingDelete(null);
    void refreshUnassignedCount();
  }, [department_pending_delete, refreshUnassignedCount]);

  return {
    is_loading,
    error,
    department_rows,
    unassigned_user_count,

    addDepartment,
    is_adding_department,
    renameDepartment,
    updateReservedSeats,

    members,
    openMembers,
    closeMembers,

    department_pending_delete,
    requestRemoveDepartment,
    cancelRemoveDepartment,
    confirmRemoveDepartment,
  };
}
