"use client";
import { useMemo, useState } from "react";
import type { BoardPersonOption } from "@/components/board";
import type {
  AdminAuditLogEntry,
  AdminDepartment,
  AdminNavGroupId,
  AdminSectionId,
  AdminSession,
  AdminUserRole,
  AdminUserRow,
} from "./types";

const createDepartmentId = () => `dept-${Math.random().toString(36).slice(2, 10)}`;

export type AdministrationManagerConfig = {
  users: AdminUserRow[];
  departments: AdminDepartment[];
  audit_log: AdminAuditLogEntry[];
  sessions: AdminSession[];
  members: BoardPersonOption[];
  orphan_boards: { id: string; name: string }[];
};

export type OrphanBoardRow = {
  id: string;
  name: string;
  owner_id: string | null;
};

export type AdministrationManagerApi = {
  members: BoardPersonOption[];

  // ── Left nav ──────────────────────────────────────────────────────────
  active_section: AdminSectionId;
  selectSection: (id: AdminSectionId) => void;
  active_group: AdminNavGroupId | null;
  is_customization_expanded: boolean;
  is_directory_expanded: boolean;
  is_security_expanded: boolean;
  toggleDirectoryExpanded: () => void;
  toggleSecurityExpanded: () => void;

  // ── Profile ───────────────────────────────────────────────────────────
  account_name: string;
  setAccountName: (value: string) => void;
  account_url: string;
  setAccountUrl: (value: string) => void;

  // ── Account ───────────────────────────────────────────────────────────
  weekend_start: "fri_sat" | "sat_sun";
  setWeekendStart: (value: "fri_sat" | "sat_sun") => void;
  show_weekends: boolean;
  setShowWeekends: (value: boolean) => void;
  home_page: "default" | "dashboard";
  setHomePage: (value: "default" | "dashboard") => void;

  // ── Users ─────────────────────────────────────────────────────────────
  user_query: string;
  setUserQuery: (value: string) => void;
  user_rows: AdminUserRow[];
  user_total: number;
  setUserRole: (person_id: string, role: AdminUserRole) => void;
  setUserDepartment: (person_id: string, department_id: string | null) => void;
  deactivated_user_ids: string[];
  toggleUserActive: (person_id: string) => void;

  // ── Departments ───────────────────────────────────────────────────────
  department_rows: AdminDepartment[];
  unassigned_user_count: number;
  addDepartment: () => void;
  renameDepartment: (id: string, name: string) => void;
  removeDepartment: (id: string) => void;

  // ── Board ownership ──────────────────────────────────────────────────
  board_current_owner_id: string | null;
  setBoardCurrentOwner: (id: string) => void;
  board_new_owner_id: string | null;
  setBoardNewOwner: (id: string) => void;
  can_transfer_boards: boolean;
  transferBoards: () => void;
  board_transfer_notice: string | null;
  orphan_board_rows: OrphanBoardRow[];
  assignOrphanBoardOwner: (board_id: string, owner_id: string) => void;

  // ── Automations ownership ────────────────────────────────────────────
  auto_current_owner_id: string | null;
  setAutoCurrentOwner: (id: string) => void;
  auto_new_owner_id: string | null;
  setAutoNewOwner: (id: string) => void;
  can_transfer_automations: boolean;
  transferAutomations: () => void;
  auto_transfer_notice: string | null;
  keep_automations_running: boolean;
  toggleKeepAutomationsRunning: () => void;
  auto_default_owner_id: string | null;
  setAutoDefaultOwner: (id: string) => void;

  // ── Authentication ────────────────────────────────────────────────────
  two_factor_enabled: boolean;
  toggleTwoFactor: () => void;
  google_sso_enabled: boolean;
  toggleGoogleSso: () => void;
  saml_sso_enabled: boolean;
  toggleSamlSso: () => void;
  scim_enabled: boolean;
  toggleScim: () => void;
  guest_approval_enabled: boolean;
  toggleGuestApproval: () => void;
  approved_domains: string;
  setApprovedDomains: (value: string) => void;
  ip_restriction_enabled: boolean;
  toggleIpRestriction: () => void;
  ip_ranges: string;
  setIpRanges: (value: string) => void;
  default_product: string;
  setDefaultProduct: (value: string) => void;

  // ── Audit ─────────────────────────────────────────────────────────────
  audit_query: string;
  setAuditQuery: (value: string) => void;
  audit_event_filter: string;
  setAuditEventFilter: (value: string) => void;
  audit_rows: AdminAuditLogEntry[];

  // ── Advanced ──────────────────────────────────────────────────────────
  panic_stage: "idle" | "confirm" | "active";
  openPanicConfirm: () => void;
  cancelPanicConfirm: () => void;
  confirmPanic: () => void;
  deactivatePanic: () => void;
  session_inactivity: string;
  setSessionInactivity: (value: string) => void;
  session_max_duration: string;
  setSessionMaxDuration: (value: string) => void;

  // ── Sessions ──────────────────────────────────────────────────────────
  session_query: string;
  setSessionQuery: (value: string) => void;
  session_rows: AdminSession[];
  loggedOutSessionIds: string[];
  logoutSession: (id: string) => void;
  logoutAllSessions: () => void;
};

const NAV_GROUP_BY_SECTION: Partial<Record<AdminSectionId, AdminNavGroupId>> = {
  customization: "customization",
  branding: "customization",
  users: "directory",
  departments: "directory",
  board_ownership: "directory",
  automations_ownership: "directory",
  authentication: "security",
  audit: "security",
  advanced: "security",
  sessions: "security",
};

/**
 * Owns all Administration-modal state behind one config-in/API-out hook, the same shape
 * as {@link useTeamsManager} and {@link useTrashManager} — so {@link AdministrationModal}
 * and its section panels stay presentational. This is a mock-account surface (no backend
 * yet), so writes here just update local state, mirroring how the Teams/Trash dialogs work.
 */
export function useAdministrationManager({
  users,
  departments,
  audit_log,
  sessions,
  members,
  orphan_boards,
}: AdministrationManagerConfig): AdministrationManagerApi {
  const [active_section, setActiveSection] = useState<AdminSectionId>("profile");
  const [is_customization_expanded, setIsCustomizationExpanded] = useState(true);
  const [is_directory_expanded, setIsDirectoryExpanded] = useState(true);
  const [is_security_expanded, setIsSecurityExpanded] = useState(true);

  const selectSection = (id: AdminSectionId) => {
    setActiveSection(id);
    const group = NAV_GROUP_BY_SECTION[id];
    if (group === "customization") setIsCustomizationExpanded(true);
    if (group === "directory") setIsDirectoryExpanded(true);
    if (group === "security") setIsSecurityExpanded(true);
  };

  // ── Profile ───────────────────────────────────────────────────────────
  const [account_name, setAccountName] = useState("97th Floor");
  const [account_url, setAccountUrl] = useState("97thfloor");

  // ── Account ───────────────────────────────────────────────────────────
  const [weekend_start, setWeekendStart] = useState<"fri_sat" | "sat_sun">("sat_sun");
  const [show_weekends, setShowWeekends] = useState(true);
  const [home_page, setHomePage] = useState<"default" | "dashboard">("default");

  // ── Users ─────────────────────────────────────────────────────────────
  const [user_query, setUserQuery] = useState("");
  const [role_overrides, setRoleOverrides] = useState<Record<string, AdminUserRole>>({});
  const [department_overrides, setDepartmentOverrides] = useState<Record<string, string | null>>({});
  const [deactivated_user_ids, setDeactivatedUserIds] = useState<string[]>([]);

  const users_with_overrides = useMemo(
    () =>
      users.map((row) => ({
        ...row,
        role: role_overrides[row.person.id] ?? row.role,
        department_id:
          row.person.id in department_overrides ? department_overrides[row.person.id] : row.department_id,
      })),
    [users, role_overrides, department_overrides]
  );

  const trimmed_user_query = user_query.trim().toLowerCase();
  const user_rows = trimmed_user_query
    ? users_with_overrides.filter(
        (row) =>
          row.person.name.toLowerCase().includes(trimmed_user_query) ||
          row.email.toLowerCase().includes(trimmed_user_query)
      )
    : users_with_overrides;

  const setUserRole = (person_id: string, role: AdminUserRole) =>
    setRoleOverrides((current) => ({ ...current, [person_id]: role }));

  const setUserDepartment = (person_id: string, department_id: string | null) =>
    setDepartmentOverrides((current) => ({ ...current, [person_id]: department_id }));

  const toggleUserActive = (person_id: string) =>
    setDeactivatedUserIds((current) =>
      current.includes(person_id) ? current.filter((id) => id !== person_id) : [...current, person_id]
    );

  // ── Departments ───────────────────────────────────────────────────────
  const [custom_departments, setCustomDepartments] = useState<AdminDepartment[]>([]);
  const [removed_department_ids, setRemovedDepartmentIds] = useState<string[]>([]);
  const [department_name_overrides, setDepartmentNameOverrides] = useState<Record<string, string>>({});

  const department_rows = useMemo(
    () =>
      [...departments, ...custom_departments]
        .filter((department) => !removed_department_ids.includes(department.id))
        .map((department) => ({
          ...department,
          name: department_name_overrides[department.id] ?? department.name,
        })),
    [departments, custom_departments, removed_department_ids, department_name_overrides]
  );

  const unassigned_user_count = users_with_overrides.filter((row) => !row.department_id).length;

  const addDepartment = () =>
    setCustomDepartments((current) => [
      ...current,
      { id: createDepartmentId(), name: "New department", reserved: 0, assigned: 0, available: 0 },
    ]);

  const renameDepartment = (id: string, name: string) =>
    setDepartmentNameOverrides((current) => ({ ...current, [id]: name }));

  const removeDepartment = (id: string) => setRemovedDepartmentIds((current) => [...current, id]);

  // ── Board ownership ──────────────────────────────────────────────────
  const [board_current_owner_id, setBoardCurrentOwner] = useState<string | null>(members[0]?.id ?? null);
  const [board_new_owner_id, setBoardNewOwner] = useState<string | null>(null);
  const [board_transfer_notice, setBoardTransferNotice] = useState<string | null>(null);
  const can_transfer_boards = Boolean(
    board_current_owner_id && board_new_owner_id && board_current_owner_id !== board_new_owner_id
  );

  const transferBoards = () => {
    if (!can_transfer_boards) return;
    const new_owner = members.find((member) => member.id === board_new_owner_id);
    setBoardTransferNotice(new_owner ? `Boards reassigned to ${new_owner.name}.` : null);
    setBoardCurrentOwner(board_new_owner_id);
    setBoardNewOwner(null);
  };

  const [orphan_board_owners, setOrphanBoardOwners] = useState<Record<string, string>>({});
  const orphan_board_rows: OrphanBoardRow[] = orphan_boards.map((board) => ({
    ...board,
    owner_id: orphan_board_owners[board.id] ?? null,
  }));
  const assignOrphanBoardOwner = (board_id: string, owner_id: string) =>
    setOrphanBoardOwners((current) => ({ ...current, [board_id]: owner_id }));

  // ── Automations ownership ────────────────────────────────────────────
  const [auto_current_owner_id, setAutoCurrentOwner] = useState<string | null>(members[0]?.id ?? null);
  const [auto_new_owner_id, setAutoNewOwner] = useState<string | null>(null);
  const [auto_transfer_notice, setAutoTransferNotice] = useState<string | null>(null);
  const [keep_automations_running, setKeepAutomationsRunning] = useState(true);
  const [auto_default_owner_id, setAutoDefaultOwner] = useState<string | null>(members[0]?.id ?? null);
  const can_transfer_automations = Boolean(
    auto_current_owner_id && auto_new_owner_id && auto_current_owner_id !== auto_new_owner_id
  );

  const transferAutomations = () => {
    if (!can_transfer_automations) return;
    const new_owner = members.find((member) => member.id === auto_new_owner_id);
    setAutoTransferNotice(new_owner ? `Automations transferred to ${new_owner.name}.` : null);
    setAutoCurrentOwner(auto_new_owner_id);
    setAutoNewOwner(null);
  };

  const toggleKeepAutomationsRunning = () => setKeepAutomationsRunning((current) => !current);

  // ── Authentication ────────────────────────────────────────────────────
  const [two_factor_enabled, setTwoFactorEnabled] = useState(false);
  const [google_sso_enabled, setGoogleSsoEnabled] = useState(true);
  const [saml_sso_enabled, setSamlSsoEnabled] = useState(false);
  const [scim_enabled, setScimEnabled] = useState(false);
  const [guest_approval_enabled, setGuestApprovalEnabled] = useState(false);
  const [approved_domains, setApprovedDomains] = useState("");
  const [ip_restriction_enabled, setIpRestrictionEnabled] = useState(false);
  const [ip_ranges, setIpRanges] = useState("");
  const [default_product, setDefaultProduct] = useState("Work Management");

  // ── Audit ─────────────────────────────────────────────────────────────
  const [audit_query, setAuditQuery] = useState("");
  const [audit_event_filter, setAuditEventFilter] = useState("All events");
  const trimmed_audit_query = audit_query.trim().toLowerCase();
  const audit_rows = audit_log.filter((row) => {
    const user = members.find((member) => member.id === row.user_id);
    const matches_query = !trimmed_audit_query || user?.name.toLowerCase().includes(trimmed_audit_query);
    const matches_event = audit_event_filter === "All events" || row.event === audit_event_filter;
    return matches_query && matches_event;
  });

  // ── Advanced ──────────────────────────────────────────────────────────
  const [panic_stage, setPanicStage] = useState<"idle" | "confirm" | "active">("idle");
  const [session_inactivity, setSessionInactivity] = useState("1 hour");
  const [session_max_duration, setSessionMaxDuration] = useState("1 day");

  const openPanicConfirm = () => setPanicStage("confirm");
  const cancelPanicConfirm = () => setPanicStage("idle");
  const confirmPanic = () => setPanicStage("active");
  const deactivatePanic = () => setPanicStage("idle");

  // ── Sessions ──────────────────────────────────────────────────────────
  const [session_query, setSessionQuery] = useState("");
  const [loggedOutSessionIds, setLoggedOutSessionIds] = useState<string[]>([]);
  const trimmed_session_query = session_query.trim().toLowerCase();
  const session_rows = sessions
    .filter((row) => !loggedOutSessionIds.includes(row.id))
    .filter((row) => {
      if (!trimmed_session_query) return true;
      const user = members.find((member) => member.id === row.user_id);
      return user?.name.toLowerCase().includes(trimmed_session_query);
    });

  const logoutSession = (id: string) => setLoggedOutSessionIds((current) => [...current, id]);
  const logoutAllSessions = () => setLoggedOutSessionIds(sessions.map((row) => row.id));

  return {
    members,

    active_section,
    selectSection,
    active_group: NAV_GROUP_BY_SECTION[active_section] ?? null,
    is_customization_expanded,
    is_directory_expanded,
    is_security_expanded,
    toggleDirectoryExpanded: () => setIsDirectoryExpanded((current) => !current),
    toggleSecurityExpanded: () => setIsSecurityExpanded((current) => !current),

    account_name,
    setAccountName,
    account_url,
    setAccountUrl,

    weekend_start,
    setWeekendStart,
    show_weekends,
    setShowWeekends,
    home_page,
    setHomePage,

    user_query,
    setUserQuery,
    user_rows,
    user_total: users_with_overrides.length,
    setUserRole,
    setUserDepartment,
    deactivated_user_ids,
    toggleUserActive,

    department_rows,
    unassigned_user_count,
    addDepartment,
    renameDepartment,
    removeDepartment,

    board_current_owner_id,
    setBoardCurrentOwner,
    board_new_owner_id,
    setBoardNewOwner,
    can_transfer_boards,
    transferBoards,
    board_transfer_notice,
    orphan_board_rows,
    assignOrphanBoardOwner,

    auto_current_owner_id,
    setAutoCurrentOwner,
    auto_new_owner_id,
    setAutoNewOwner,
    can_transfer_automations,
    transferAutomations,
    auto_transfer_notice,
    keep_automations_running,
    toggleKeepAutomationsRunning,
    auto_default_owner_id,
    setAutoDefaultOwner,

    two_factor_enabled,
    toggleTwoFactor: () => setTwoFactorEnabled((current) => !current),
    google_sso_enabled,
    toggleGoogleSso: () => setGoogleSsoEnabled((current) => !current),
    saml_sso_enabled,
    toggleSamlSso: () => setSamlSsoEnabled((current) => !current),
    scim_enabled,
    toggleScim: () => setScimEnabled((current) => !current),
    guest_approval_enabled,
    toggleGuestApproval: () => setGuestApprovalEnabled((current) => !current),
    approved_domains,
    setApprovedDomains,
    ip_restriction_enabled,
    toggleIpRestriction: () => setIpRestrictionEnabled((current) => !current),
    ip_ranges,
    setIpRanges,
    default_product,
    setDefaultProduct,

    audit_query,
    setAuditQuery,
    audit_event_filter,
    setAuditEventFilter,
    audit_rows,

    panic_stage,
    openPanicConfirm,
    cancelPanicConfirm,
    confirmPanic,
    deactivatePanic,
    session_inactivity,
    setSessionInactivity,
    session_max_duration,
    setSessionMaxDuration,

    session_query,
    setSessionQuery,
    session_rows,
    loggedOutSessionIds,
    logoutSession,
    logoutAllSessions,
  };
}
