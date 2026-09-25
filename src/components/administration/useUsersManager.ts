"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { downloadBlob } from "@/lib/download-blob";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { adminUsersService } from "@/services/administration/admin-users.service";
import { profileFieldsService } from "@/services/administration/profile-fields.service";
import type {
  AdminUserDto,
  AdminUsersSortField,
  BulkUserAction,
  PlatformRoleName,
} from "@/types/administration/admin-users";
import type { DepartmentDto } from "@/types/administration/departments";
import type { ProfileFieldDto } from "@/types/administration/profile-fields";
import {
  useAdminFilterState,
  useAdminSelection,
  useAdminSort,
  type AdminFilterDef,
  type AdminFilterStateApi,
  type AdminSelectionApi,
} from "./filters";

/** A plain admin may only invite into these roles; only a super_admin may invite an admin/super_admin. */
const INVITABLE_ROLES_FOR_ADMIN: PlatformRoleName[] = ["staff", "client"];
const INVITABLE_ROLES_FOR_SUPER_ADMIN: PlatformRoleName[] = ["super_admin", "admin", "staff", "client"];

const SEARCH_DEBOUNCE_MS = 300;
export const USERS_PER_PAGE = 20;

/** Highest-privilege role first, used to pick a single "primary role" to show in the dropdown. */
const ROLE_PRIORITY: PlatformRoleName[] = ["super_admin", "admin", "staff", "client"];

export const ROLE_LABELS: Record<PlatformRoleName, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  staff: "Staff",
  client: "Client",
};

export const primaryRole = (user: AdminUserDto): PlatformRoleName => {
  const names = user.roles.map((role) => role.name);
  return ROLE_PRIORITY.find((role) => names.includes(role)) ?? "client";
};

/** Filter key prefix for custom profile field columns, followed by the field id. */
export const PROFILE_FIELD_FILTER_PREFIX = "field_";

/**
 * Filter definitions for the Users table: one per column, each with the editor that fits
 * its values, plus one per custom profile field, typed after the field.
 */
export const buildUserFilterDefs = (department_rows: DepartmentDto[], profile_fields: ProfileFieldDto[]): AdminFilterDef[] => [
  {
    key: "role",
    label: "Role",
    kind: "multi_select",
    param: "role",
    options: ROLE_PRIORITY.map((role) => ({ id: role, label: ROLE_LABELS[role] })),
  },
  {
    key: "status",
    label: "Status",
    kind: "multi_select",
    param: "account_status",
    options: [
      { id: "active", label: "Active", color: "#00c875" },
      { id: "disabled", label: "Deactivated", color: "#fdab3d" },
      { id: "deleted", label: "Deleted", color: "#e2445c" },
    ],
  },
  {
    key: "department",
    label: "Department",
    kind: "multi_select",
    param: "department",
    options: [
      { id: "unassigned", label: "No department" },
      ...department_rows.map((department) => ({ id: String(department.id), label: department.name })),
    ],
  },
  {
    key: "email_status",
    label: "Email",
    kind: "multi_select",
    param: "email_status",
    options: [
      { id: "verified", label: "Verified" },
      { id: "unverified", label: "Not verified" },
    ],
  },
  {
    key: "last_active",
    label: "Last active",
    kind: "date_range",
    from_param: "last_active_from",
    to_param: "last_active_to",
    never_param: "last_active_never",
    never_label: "Never signed in",
  },
  {
    key: "created",
    label: "Date added",
    kind: "date_range",
    from_param: "created_from",
    to_param: "created_to",
    presets: ["today", "last_7_days", "last_30_days", "last_90_days", "custom"],
  },
  ...profile_fields.map((field): AdminFilterDef => {
    const key = `${PROFILE_FIELD_FILTER_PREFIX}${field.id}`;
    const base = `fields[${field.id}]`;
    switch (field.type) {
      case "dropdown":
        return {
          key,
          label: field.name,
          kind: "multi_select",
          param: `${base}[in]`,
          options: field.options.map((option) => ({ id: option.id, label: option.label, color: option.color })),
        };
      case "number":
        return { key, label: field.name, kind: "number_range", min_param: `${base}[min]`, max_param: `${base}[max]` };
      case "date":
        return {
          key,
          label: field.name,
          kind: "date_range",
          from_param: `${base}[from]`,
          to_param: `${base}[to]`,
          presets: ["last_30_days", "last_90_days", "older_than_90_days", "custom"],
        };
      default:
        return { key, label: field.name, kind: "text", param: `${base}[contains]`, placeholder: `${field.name} contains…` };
    }
  }),
];

export type UsersManagerApi = {
  is_loading: boolean;
  error: string | null;
  setError: (value: string | null) => void;
  notice: string | null;
  setNotice: (value: string | null) => void;
  user_query: string;
  setUserQuery: (value: string) => void;
  user_rows: AdminUserDto[];
  user_total: number;
  page: number;
  setPage: (page: number) => void;
  last_page: number;

  department_rows: DepartmentDto[];
  profile_fields: ProfileFieldDto[];
  /** Refetches the current page and the profile fields, e.g. after they changed elsewhere in Administration. */
  reloadUsers: () => void;
  /** Swaps an updated user into the current page, e.g. after an edit in the details drawer. */
  replaceRow: (updated: AdminUserDto) => void;

  filter_defs: AdminFilterDef[];
  filters: AdminFilterStateApi;
  sort_field: AdminUsersSortField;
  sort_direction: "asc" | "desc";
  toggleSort: (field: AdminUsersSortField) => void;
  selection: AdminSelectionApi;

  /** Admins and super admins manage users; staff only read the directory. */
  can_manage_users: boolean;
  /** Only a super_admin may change platform roles; the backend enforces this too. */
  can_edit_roles: boolean;
  setUserRole: (user: AdminUserDto, role: PlatformRoleName) => Promise<void>;
  is_updating_role_for_id: number | null;

  setUserDepartment: (user_id: number, department_id: number | null) => Promise<void>;

  user_pending_toggle: AdminUserDto | null;
  requestToggleActive: (user: AdminUserDto) => void;
  cancelToggleActive: () => void;
  confirmToggleActive: () => Promise<void>;

  is_running_bulk_action: boolean;
  runBulkAction: (action: BulkUserAction, extras?: { department_id?: number | null; role?: PlatformRoleName }) => Promise<void>;
  is_exporting: boolean;
  /** Downloads a CSV of the selected users, or of everyone matching the current filters. */
  exportUsers: (selected_only: boolean) => Promise<void>;

  details_user_id: number | null;
  openDetails: (user_id: number) => void;
  closeDetails: () => void;

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
  /** Bumped after every invitation sent, so the Invitations tab refetches. */
  invitations_version: number;
};

/**
 * Owns the Users section: the server searched, filtered, sorted and paginated roster from
 * `/api/admin/users`, row selection with bulk actions and CSV export, real RBAC role
 * changes (super_admin only), department assignment, deactivate/reactivate through a
 * confirmation modal, the invite dialog and which user's details drawer is open.
 */
export function useUsersManager(department_rows: DepartmentDto[]): UsersManagerApi {
  const { hasRole, hasAnyRole } = useAuth();
  const can_edit_roles = hasRole("super_admin");
  const can_manage_users = hasAnyRole("super_admin", "admin");
  const invitable_roles = useMemo(
    () => (hasRole("super_admin") ? INVITABLE_ROLES_FOR_SUPER_ADMIN : INVITABLE_ROLES_FOR_ADMIN),
    [hasRole]
  );

  const [user_rows, setUserRows] = useState<AdminUserDto[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [reload_token, setReloadToken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [user_query, setUserQuery] = useState("");
  const [debounced_query, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [user_total, setUserTotal] = useState(0);
  const [is_updating_role_for_id, setIsUpdatingRoleForId] = useState<number | null>(null);
  const [user_pending_toggle, setUserPendingToggle] = useState<AdminUserDto | null>(null);
  const [profile_fields, setProfileFields] = useState<ProfileFieldDto[]>([]);
  const [is_running_bulk_action, setIsRunningBulkAction] = useState(false);
  const [is_exporting, setIsExporting] = useState(false);
  const [details_user_id, setDetailsUserId] = useState<number | null>(null);

  const [is_invite_open, setIsInviteOpen] = useState(false);
  const [invite_email, setInviteEmail] = useState("");
  const [invite_role, setInviteRole] = useState<PlatformRoleName>("client");
  const [invite_department_id, setInviteDepartmentId] = useState<number | null>(null);
  const [invite_message, setInviteMessage] = useState("");
  const [invite_error, setInviteError] = useState<string | null>(null);
  const [is_submitting_invite, setIsSubmittingInvite] = useState(false);
  const [invite_sent_notice, setInviteSentNotice] = useState<string | null>(null);
  const [invitations_version, setInvitationsVersion] = useState(0);

  const filter_defs = useMemo(() => buildUserFilterDefs(department_rows, profile_fields), [department_rows, profile_fields]);
  const filters = useAdminFilterState(filter_defs);
  const { sort_field, sort_direction, toggleSort } = useAdminSort<AdminUsersSortField>("created_at", "desc");
  const selection = useAdminSelection();

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(user_query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [user_query]);

  useEffect(() => {
    setPage(1);
  }, [debounced_query, filters.filter_key, sort_field, sort_direction]);

  useEffect(() => {
    let cancelled = false;
    profileFieldsService
      .getFields()
      .then((fields) => {
        if (!cancelled) setProfileFields(fields);
      })
      .catch(() => {
        // Custom fields are an optional extra, the directory still works without them.
      });
    return () => {
      cancelled = true;
    };
  }, [reload_token]);

  const { filter_params, filter_key } = filters;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    adminUsersService
      .getUsers({
        search: debounced_query,
        page,
        per_page: USERS_PER_PAGE,
        sort_field,
        sort_direction,
        filter_params,
      })
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
    // `filter_key` is the stable string form of `filter_params`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced_query, page, reload_token, sort_field, sort_direction, filter_key]);

  const reloadUsers = useCallback(() => setReloadToken((token) => token + 1), []);

  const replaceRow = useCallback(
    (updated: AdminUserDto) =>
      setUserRows((current) => current.map((row) => (row.id === updated.id ? { ...row, ...updated } : row))),
    []
  );

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
    [can_edit_roles, replaceRow]
  );

  const setUserDepartment = useCallback(
    async (user_id: number, department_id: number | null) => {
      try {
        const updated = await adminUsersService.updateUser(user_id, { department_id });
        replaceRow(updated);
      } catch (err) {
        setError(apiErrorMessage(err, "We couldn't update that user's department."));
      }
    },
    [replaceRow]
  );

  const requestToggleActive = useCallback((user: AdminUserDto) => setUserPendingToggle(user), []);
  const cancelToggleActive = useCallback(() => setUserPendingToggle(null), []);

  const confirmToggleActive = useCallback(async () => {
    if (!user_pending_toggle) return;
    const updated = user_pending_toggle.is_active
      ? await adminUsersService.deactivateUser(user_pending_toggle.id)
      : await adminUsersService.reactivateUser(user_pending_toggle.id);
    replaceRow(updated);
    setUserPendingToggle(null);
  }, [user_pending_toggle, replaceRow]);

  const runBulkAction = useCallback(
    async (action: BulkUserAction, extras: { department_id?: number | null; role?: PlatformRoleName } = {}) => {
      if (selection.selected_ids.length === 0) return;
      setIsRunningBulkAction(true);
      setError(null);
      try {
        const result = await adminUsersService.bulkAction({ user_ids: selection.selected_ids, action, ...extras });
        const skipped =
          result.skipped_count > 0
            ? ` ${result.skipped_count} skipped (your own account, people you can't manage, or no change needed).`
            : "";
        setNotice(`${result.message}${skipped}`);
        selection.clear();
        reloadUsers();
      } catch (err) {
        setError(apiErrorMessage(err, "We couldn't update the selected users."));
      } finally {
        setIsRunningBulkAction(false);
      }
    },
    [selection, reloadUsers]
  );

  const exportUsers = useCallback(
    async (selected_only: boolean) => {
      setIsExporting(true);
      setError(null);
      try {
        const blob = await adminUsersService.exportUsers({
          search: debounced_query,
          sort_field,
          sort_direction,
          filter_params: selected_only ? {} : filter_params,
          ids: selected_only ? selection.selected_ids : undefined,
        });
        downloadBlob(blob, `users-${new Date().toISOString().slice(0, 10)}.csv`);
      } catch (err) {
        setError(apiErrorMessage(err, "We couldn't export the users."));
      } finally {
        setIsExporting(false);
      }
    },
    [debounced_query, sort_field, sort_direction, filter_params, selection.selected_ids]
  );

  const openDetails = useCallback((user_id: number) => setDetailsUserId(user_id), []);
  const closeDetails = useCallback(() => setDetailsUserId(null), []);

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
      setInvitationsVersion((version) => version + 1);
    } catch (err) {
      setInviteError(apiErrorMessage(err, "We couldn't send that invitation."));
    } finally {
      setIsSubmittingInvite(false);
    }
  }, [can_submit_invite, invite_email, invite_role, invite_department_id, invite_message]);

  return {
    is_loading,
    error,
    setError,
    notice,
    setNotice,
    user_query,
    setUserQuery,
    user_rows,
    user_total,
    page,
    setPage,
    last_page,
    reloadUsers,
    replaceRow,

    department_rows,
    profile_fields,

    filter_defs,
    filters,
    sort_field,
    sort_direction,
    toggleSort,
    selection,

    can_manage_users,
    can_edit_roles,
    setUserRole,
    is_updating_role_for_id,

    setUserDepartment,

    user_pending_toggle,
    requestToggleActive,
    cancelToggleActive,
    confirmToggleActive,

    is_running_bulk_action,
    runBulkAction,
    is_exporting,
    exportUsers,

    details_user_id,
    openDetails,
    closeDetails,

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
    invitations_version,
  };
}
