"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { adminUsersService } from "@/services/administration/admin-users.service";
import type { AdminUserDto, PlatformRoleName } from "@/types/administration/admin-users";
import type { DepartmentDto } from "@/types/administration/departments";

/** A plain admin may only invite into these roles; only a super_admin may invite an admin/super_admin. */
const INVITABLE_ROLES_FOR_ADMIN: PlatformRoleName[] = ["staff", "client"];
const INVITABLE_ROLES_FOR_SUPER_ADMIN: PlatformRoleName[] = ["super_admin", "admin", "staff", "client"];

const SEARCH_DEBOUNCE_MS = 300;
const PER_PAGE = 20;

/** Highest-privilege role first, used to pick a single "primary role" to show in the dropdown. */
const ROLE_PRIORITY: PlatformRoleName[] = ["super_admin", "admin", "staff", "client"];

export const primaryRole = (user: AdminUserDto): PlatformRoleName => {
  const names = user.roles.map((role) => role.name);
  return ROLE_PRIORITY.find((role) => names.includes(role)) ?? "client";
};

export type UsersManagerApi = {
  is_loading: boolean;
  error: string | null;
  user_query: string;
  setUserQuery: (value: string) => void;
  user_rows: AdminUserDto[];
  user_total: number;
  page: number;
  setPage: (page: number) => void;
  last_page: number;

  department_rows: DepartmentDto[];

  /** Only a super_admin may change platform roles; the backend enforces this too. */
  can_edit_roles: boolean;
  setUserRole: (user: AdminUserDto, role: PlatformRoleName) => Promise<void>;
  is_updating_role_for_id: number | null;

  setUserDepartment: (user_id: number, department_id: number | null) => Promise<void>;

  user_pending_toggle: AdminUserDto | null;
  requestToggleActive: (user: AdminUserDto) => void;
  cancelToggleActive: () => void;
  confirmToggleActive: () => Promise<void>;

  invite_sent_notice: string | null;
  invitable_roles: PlatformRoleName[];
  is_invite_open: boolean;
  openInvite: () => void;
  closeInvite: () => void;
  invite_email: string;
  setInviteEmail: (value: string) => void;
  invite_role: PlatformRoleName;
  setInviteRole: (value: PlatformRoleName) => void;
  invite_department_id: number | null;
  setInviteDepartmentId: (value: number | null) => void;
  invite_message: string;
  setInviteMessage: (value: string) => void;
  invite_error: string | null;
  is_submitting_invite: boolean;
  can_submit_invite: boolean;
  submitInvite: () => Promise<void>;
};

/**
 * Owns the Users section: server-searched + paginated roster from `/api/admin/users`, real
 * RBAC role changes (via `/api/admin/roles/users/{id}/assign|revoke`, super_admin only),
 * department assignment, and deactivate/reactivate routed through a confirmation modal
 * (the old mock version fired instantly with no confirmation at all).
 */
export function useUsersManager(department_rows: DepartmentDto[]): UsersManagerApi {
  const { hasRole } = useAuth();
  const can_edit_roles = hasRole("super_admin");
  const invitable_roles = hasRole("super_admin") ? INVITABLE_ROLES_FOR_SUPER_ADMIN : INVITABLE_ROLES_FOR_ADMIN;

  const [user_rows, setUserRows] = useState<AdminUserDto[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user_query, setUserQuery] = useState("");
  const [debounced_query, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [user_total, setUserTotal] = useState(0);
  const [is_updating_role_for_id, setIsUpdatingRoleForId] = useState<number | null>(null);
  const [user_pending_toggle, setUserPendingToggle] = useState<AdminUserDto | null>(null);

  const [is_invite_open, setIsInviteOpen] = useState(false);
  const [invite_email, setInviteEmail] = useState("");
  const [invite_role, setInviteRole] = useState<PlatformRoleName>("client");
  const [invite_department_id, setInviteDepartmentId] = useState<number | null>(null);
  const [invite_message, setInviteMessage] = useState("");
  const [invite_error, setInviteError] = useState<string | null>(null);
  const [is_submitting_invite, setIsSubmittingInvite] = useState(false);
  const [invite_sent_notice, setInviteSentNotice] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(user_query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [user_query]);

  useEffect(() => {
    setPage(1);
  }, [debounced_query]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    adminUsersService
      .getUsers({ search: debounced_query, page, per_page: PER_PAGE })
      .then((result) => {
        if (cancelled) return;
        setUserRows(result.data);
        setLastPage(result.last_page);
        setUserTotal(result.total);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, "We couldn't load the user directory."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced_query, page]);

  const replaceRow = (updated: AdminUserDto) =>
    setUserRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));

  const setUserRole = useCallback(
    async (user: AdminUserDto, role: PlatformRoleName) => {
      if (!can_edit_roles) return;
      setIsUpdatingRoleForId(user.id);
      setError(null);
      try {
        const current_roles = user.roles.map((r) => r.name);
        let latest = user;
        for (const existing of current_roles) {
          if (existing !== role) {
            latest = await adminUsersService.revokeRole(user.id, existing);
          }
        }
        if (!current_roles.includes(role)) {
          latest = await adminUsersService.assignRole(user.id, role);
        }
        replaceRow(latest);
      } catch (err) {
        setError(apiErrorMessage(err, "We couldn't update that user's role."));
      } finally {
        setIsUpdatingRoleForId(null);
      }
    },
    [can_edit_roles]
  );

  const setUserDepartment = useCallback(async (user_id: number, department_id: number | null) => {
    try {
      const updated = await adminUsersService.updateUser(user_id, { department_id });
      replaceRow(updated);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't update that user's department."));
    }
  }, []);

  const requestToggleActive = useCallback((user: AdminUserDto) => setUserPendingToggle(user), []);
  const cancelToggleActive = useCallback(() => setUserPendingToggle(null), []);

  const confirmToggleActive = useCallback(async () => {
    if (!user_pending_toggle) return;
    const updated = user_pending_toggle.is_active
      ? await adminUsersService.deactivateUser(user_pending_toggle.id)
      : await adminUsersService.reactivateUser(user_pending_toggle.id);
    replaceRow(updated);
    setUserPendingToggle(null);
  }, [user_pending_toggle]);

  const openInvite = useCallback(() => {
    setInviteEmail("");
    setInviteRole(invitable_roles[invitable_roles.length - 1] ?? "client");
    setInviteDepartmentId(null);
    setInviteMessage("");
    setInviteError(null);
    setIsInviteOpen(true);
  }, [invitable_roles]);

  const closeInvite = useCallback(() => setIsInviteOpen(false), []);

  const can_submit_invite = invite_email.trim() !== "" && !is_submitting_invite;

  const submitInvite = useCallback(async () => {
    if (!can_submit_invite) return;
    setIsSubmittingInvite(true);
    setInviteError(null);
    try {
      const invitation = await adminUsersService.inviteUser({
        email: invite_email.trim(),
        role: invite_role,
        department_id: invite_department_id,
        message: invite_message.trim() || undefined,
      });
      setIsInviteOpen(false);
      // Nothing to add to the roster yet, the invitee has no User row until they accept.
      setInviteSentNotice(`Invitation sent to ${invitation.email}.`);
    } catch (err) {
      setInviteError(apiErrorMessage(err, "We couldn't send that invitation."));
    } finally {
      setIsSubmittingInvite(false);
    }
  }, [can_submit_invite, invite_email, invite_role, invite_department_id, invite_message]);

  return {
    is_loading,
    error,
    user_query,
    setUserQuery,
    user_rows,
    user_total,
    page,
    setPage,
    last_page,

    department_rows,

    can_edit_roles,
    setUserRole,
    is_updating_role_for_id,

    setUserDepartment,

    user_pending_toggle,
    requestToggleActive,
    cancelToggleActive,
    confirmToggleActive,

    invite_sent_notice,
    invitable_roles,
    is_invite_open,
    openInvite,
    closeInvite,
    invite_email,
    setInviteEmail,
    invite_role,
    setInviteRole,
    invite_department_id,
    setInviteDepartmentId,
    invite_message,
    setInviteMessage,
    invite_error,
    is_submitting_invite,
    can_submit_invite,
    submitInvite,
  };
}
