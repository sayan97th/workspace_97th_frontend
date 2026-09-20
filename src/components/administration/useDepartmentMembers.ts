"use client";
import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { adminUsersService } from "@/services/administration/admin-users.service";
import { departmentsService } from "@/services/administration/departments.service";
import type { AdminUserDto } from "@/types/administration/admin-users";
import type { DepartmentDto } from "@/types/administration/departments";

const SEARCH_DEBOUNCE_MS = 300;
const MEMBERS_PER_PAGE = 100;
const CANDIDATES_PER_PAGE = 20;

export type DepartmentMembersApi = {
  /** The department whose members dialog is open, or `null` when it's closed. */
  department: DepartmentDto | null;
  error: string | null;
  is_saving: boolean;

  member_rows: AdminUserDto[];
  is_loading_members: boolean;
  removeMember: (user: AdminUserDto) => Promise<void>;

  member_query: string;
  setMemberQuery: (value: string) => void;
  member_candidates: AdminUserDto[];
  is_loading_member_candidates: boolean;
  selected_member_ids: number[];
  toggleMemberCandidate: (user_id: number) => void;
  addSelectedMembers: () => Promise<void>;

  owner_query: string;
  setOwnerQuery: (value: string) => void;
  owner_candidates: AdminUserDto[];
  is_loading_owner_candidates: boolean;
  addOwner: (user: AdminUserDto) => Promise<void>;
  removeOwner: (user_id: number) => Promise<void>;
};

type Params = {
  department: DepartmentDto | null;
  onDepartmentChanged: (department: DepartmentDto) => void;
};

/**
 * Owns the "Manage department" dialog opened from {@link DepartmentsSection}: the current
 * members, the picker for adding more, and (for admins) the department's owners. Every
 * mutation returns the refreshed {@link DepartmentDto}, which is pushed up through
 * `onDepartmentChanged` so the table's assigned/available counts stay in sync.
 *
 * Like monday.com, an owner is offered only users without a department yet, while an admin
 * can also pull users in from other departments.
 */
export function useDepartmentMembers({ department, onDepartmentChanged }: Params): DepartmentMembersApi {
  const department_id = department?.id ?? null;
  const can_move_between_departments = department?.can_administer ?? false;

  const [error, setError] = useState<string | null>(null);
  const [is_saving, setIsSaving] = useState(false);

  const [member_rows, setMemberRows] = useState<AdminUserDto[]>([]);
  const [is_loading_members, setIsLoadingMembers] = useState(false);

  const [member_query, setMemberQuery] = useState("");
  const [debounced_member_query, setDebouncedMemberQuery] = useState("");
  const [member_candidates, setMemberCandidates] = useState<AdminUserDto[]>([]);
  const [is_loading_member_candidates, setIsLoadingMemberCandidates] = useState(false);
  const [selected_member_ids, setSelectedMemberIds] = useState<number[]>([]);

  const [owner_query, setOwnerQuery] = useState("");
  const [debounced_owner_query, setDebouncedOwnerQuery] = useState("");
  const [owner_candidates, setOwnerCandidates] = useState<AdminUserDto[]>([]);
  const [is_loading_owner_candidates, setIsLoadingOwnerCandidates] = useState(false);

  // Reset everything whenever the dialog opens on another department (or closes).
  useEffect(() => {
    setError(null);
    setMemberQuery("");
    setDebouncedMemberQuery("");
    setOwnerQuery("");
    setDebouncedOwnerQuery("");
    setSelectedMemberIds([]);
    setMemberRows([]);
    setMemberCandidates([]);
    setOwnerCandidates([]);
  }, [department_id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedMemberQuery(member_query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [member_query]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedOwnerQuery(owner_query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [owner_query]);

  const loadMembers = useCallback(async (id: number) => {
    setIsLoadingMembers(true);
    try {
      const result = await adminUsersService.getUsers({ department: id, per_page: MEMBERS_PER_PAGE });
      setMemberRows(result.data);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't load the department members."));
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (department_id !== null) void loadMembers(department_id);
  }, [department_id, loadMembers]);

  // Users that can be added: admins may pull from anyone, owners only from the unassigned pool.
  const assigned_count = department?.assigned ?? 0;
  useEffect(() => {
    if (department_id === null) return;
    let cancelled = false;
    setIsLoadingMemberCandidates(true);
    adminUsersService
      .getUsers({
        search: debounced_member_query,
        per_page: CANDIDATES_PER_PAGE,
        department: can_move_between_departments ? undefined : "unassigned",
      })
      .then((result) => {
        if (!cancelled) setMemberCandidates(result.data.filter((user) => user.department?.id !== department_id));
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, "We couldn't search users."));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMemberCandidates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [department_id, debounced_member_query, can_move_between_departments, assigned_count]);

  // Owners must be staff-tier users, so the owner picker only searches staff.
  useEffect(() => {
    if (department_id === null || !can_move_between_departments) return;
    let cancelled = false;
    setIsLoadingOwnerCandidates(true);
    adminUsersService
      .getUsers({ type: "staff", search: debounced_owner_query, per_page: CANDIDATES_PER_PAGE })
      .then((result) => {
        if (!cancelled) setOwnerCandidates(result.data);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, "We couldn't search staff members."));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingOwnerCandidates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [department_id, debounced_owner_query, can_move_between_departments]);

  const toggleMemberCandidate = useCallback((user_id: number) => {
    setSelectedMemberIds((current) =>
      current.includes(user_id) ? current.filter((id) => id !== user_id) : [...current, user_id],
    );
  }, []);

  const runMutation = useCallback(
    async (mutation: () => Promise<DepartmentDto>, fallback_message: string): Promise<boolean> => {
      setIsSaving(true);
      setError(null);
      try {
        onDepartmentChanged(await mutation());
        return true;
      } catch (err) {
        setError(apiErrorMessage(err, fallback_message));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [onDepartmentChanged],
  );

  const addSelectedMembers = useCallback(async () => {
    if (department_id === null || selected_member_ids.length === 0) return;
    const succeeded = await runMutation(
      () => departmentsService.assignMembers(department_id, selected_member_ids),
      "We couldn't add those members.",
    );
    if (succeeded) {
      setSelectedMemberIds([]);
      await loadMembers(department_id);
    }
  }, [department_id, selected_member_ids, runMutation, loadMembers]);

  const removeMember = useCallback(
    async (user: AdminUserDto) => {
      if (department_id === null) return;
      const succeeded = await runMutation(
        () => departmentsService.removeMember(department_id, user.id),
        "We couldn't remove that member.",
      );
      if (succeeded) setMemberRows((current) => current.filter((row) => row.id !== user.id));
    },
    [department_id, runMutation],
  );

  const addOwner = useCallback(
    async (user: AdminUserDto) => {
      if (department_id === null) return;
      await runMutation(() => departmentsService.assignOwners(department_id, [user.id]), "We couldn't add that owner.");
    },
    [department_id, runMutation],
  );

  const removeOwner = useCallback(
    async (user_id: number) => {
      if (department_id === null) return;
      await runMutation(() => departmentsService.removeOwner(department_id, user_id), "We couldn't remove that owner.");
    },
    [department_id, runMutation],
  );

  return {
    department,
    error,
    is_saving,

    member_rows,
    is_loading_members,
    removeMember,

    member_query,
    setMemberQuery,
    member_candidates,
    is_loading_member_candidates,
    selected_member_ids,
    toggleMemberCandidate,
    addSelectedMembers,

    owner_query,
    setOwnerQuery,
    owner_candidates,
    is_loading_owner_candidates,
    addOwner,
    removeOwner,
  };
}
