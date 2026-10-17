"use client";
import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { BoardLoadingSpinner } from "@/app/(admin)/boards/_components/BoardRouteStates";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import {
  InvitationAvatar,
  InvitationCopyEmailButton,
  formatInvitationDate,
  formatInvitationDateTime,
  formatRelative,
} from "@/components/invitations";
import { primaryRole } from "@/components/administration/useUsersManager";
import {
  AlertCircleIcon,
  BuildingIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ClockIcon,
  LockIcon,
  MailIcon,
  PersonIcon,
  PhoneIcon,
  RefreshIcon,
} from "@/icons/workspace-icons";
import "@/components/invitations/invitations.scss";
import "./users-directory.scss";
import UserRoleBadge from "./UserRoleBadge";
import UserStatusBadge from "./UserStatusBadge";
import AdminPasswordSection from "./AdminPasswordSection";
import EditUserAccessSection from "./EditUserAccessSection";
import EditUserSection, { EditUserFieldError } from "./EditUserSection";
import EditUserTabs, { DEFAULT_EDIT_USER_TAB, EDIT_USER_TAB_IDS, type EditUserTabId } from "./EditUserTabs";
import UsersAccessDenied from "./UsersAccessDenied";
import { useEditUser, type EditUserFormData } from "./useEditUser";
import { STAFF_TIER_LOCKED_HINT, USER_MANAGER_ROLES, canManageAccount } from "./userManagementPermissions";

const USERS_PATH = "/users";

const BackToUsers: React.FC = () => (
  <Link href={USERS_PATH} className="inv-back-link">
    <ChevronLeftIcon size={14} />
    Back to users
  </Link>
);

type TextFieldProps = {
  field: Exclude<keyof EditUserFormData, "department_id">;
  label: string;
  type?: string;
  placeholder: string;
  autoComplete?: string;
  icon?: React.ReactNode;
  value: string;
  error: string | undefined;
  disabled: boolean;
  onChange: (field: TextFieldProps["field"], value: string) => void;
};

const TextField: React.FC<TextFieldProps> = ({
  field,
  label,
  type = "text",
  placeholder,
  autoComplete,
  icon,
  value,
  error,
  disabled,
  onChange,
}) => (
  <div>
    <label className="ud-label" htmlFor={`edit_user_${field}`}>
      {label}
    </label>
    <div className="ud-input-wrap">
      {icon ? <span className="inv-field-icon">{icon}</span> : null}
      <input
        id={`edit_user_${field}`}
        name={field}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `edit_user_${field}_error` : undefined}
        data-has-icon={icon ? "true" : undefined}
        onChange={(event) => onChange(field, event.target.value)}
        className="ud-input"
      />
    </div>
    <EditUserFieldError id={`edit_user_${field}_error`} message={error} />
  </div>
);

export type EditUserViewProps = {
  user_id: string;
};

/**
 * Manage users edit page (`/users/{id}/edit`): a header card with the account at a glance,
 * then Profile, Password and Account access tabs. Only super admins and admins get in, and a
 * plain admin opening a staff or admin account sees it read only, matching the API's
 * `UserManagementGate`.
 */
const EditUserView: React.FC<EditUserViewProps> = ({ user_id }) => {
  const router = useRouter();
  const search_params = useSearchParams();
  const { user: auth_user, isLoading: is_auth_loading, hasAnyRole } = useAuth();
  const has_manager_role = hasAnyRole(...USER_MANAGER_ROLES);
  const edit_user = useEditUser(user_id, has_manager_role);

  // The active tab lives in the URL (`?tab=password`) rather than component state, so
  // reloading the page, or sharing or bookmarking the link, lands back on the same section.
  const tab_param = search_params.get("tab");
  const active_tab: EditUserTabId = EDIT_USER_TAB_IDS.includes(tab_param as EditUserTabId)
    ? (tab_param as EditUserTabId)
    : DEFAULT_EDIT_USER_TAB;

  const selectTab = (id: EditUserTabId) => {
    const params = new URLSearchParams(search_params.toString());
    if (id === DEFAULT_EDIT_USER_TAB) {
      params.delete("tab");
    } else {
      params.set("tab", id);
    }
    const query = params.toString();
    router.replace(`/users/${user_id}/edit${query ? `?${query}` : ""}`, { scroll: false });
  };

  if (is_auth_loading) {
    return <BoardLoadingSpinner />;
  }

  if (!has_manager_role || edit_user.is_forbidden) {
    return <UsersAccessDenied secondary_action={has_manager_role ? <BackToUsers /> : null} />;
  }

  if (edit_user.is_loading) {
    return <BoardLoadingSpinner />;
  }

  if (edit_user.load_error || !edit_user.user) {
    return (
      <UsersAccessDenied
        title="User not found"
        detail={edit_user.load_error ?? "This account doesn't exist or was removed for good."}
        secondary_action={<BackToUsers />}
      />
    );
  }

  const { user } = edit_user;
  const is_self = auth_user?.id === user.id;
  const is_deleted = Boolean(user.deleted_at);
  const can_edit = canManageAccount(user, auth_user?.id ?? null, hasAnyRole("super_admin"));
  const is_read_only = !can_edit || is_deleted;

  const read_only_reason = is_self
    ? "This is your own account. Change your details and password from My Profile."
    : !can_edit
      ? `${STAFF_TIER_LOCKED_HINT} You can see this account, but not change it.`
      : null;

  const setTextField = (field: TextFieldProps["field"], value: string) => edit_user.setField(field, value);

  return (
    <div className="invitations-theme inv-page">
      <div className="inv-page-inner ud-edit-inner">
        <BackToUsers />

        <section className="ud-hero" aria-label="Account summary">
          <div className="ud-hero-band" aria-hidden />
          <div className="ud-hero-body">
            <span className="ud-hero-avatar" data-faded={is_deleted || !user.is_active ? "true" : undefined}>
              <InvitationAvatar email={user.email} full_name={user.full_name} photo_url={user.profile_photo_url} size={72} />
            </span>
            <div className="ud-hero-main">
              <h1 className="ud-hero-name font-heading text-page-title">{user.full_name}</h1>
              <div className="ud-hero-email">
                <span>{user.email}</span>
                <InvitationCopyEmailButton email={user.email} />
              </div>
              <div className="ud-hero-pills">
                <UserRoleBadge role={primaryRole(user)} />
                <UserStatusBadge is_active={user.is_active} is_deleted={is_deleted} />
                {user.email_verified_at ? null : (
                  <span className="inv-pill" data-tone="warning">
                    <AlertCircleIcon size={12} />
                    Email not verified
                  </span>
                )}
              </div>
            </div>
          </div>

          <dl className="ud-hero-facts">
            <div className="ud-fact">
              <dt className="ud-fact-label">
                <BuildingIcon size={12} />
                Department
              </dt>
              <dd className="ud-fact-value">{user.department?.name ?? "No department"}</dd>
            </div>
            <div className="ud-fact">
              <dt className="ud-fact-label">
                <PhoneIcon size={12} />
                Phone
              </dt>
              <dd className="ud-fact-value">{user.phone || "Not added"}</dd>
            </div>
            <div className="ud-fact">
              <dt className="ud-fact-label">
                <ClockIcon size={12} />
                Joined
              </dt>
              <dd className="ud-fact-value">
                <PortalTooltip content={formatInvitationDateTime(user.created_at)}>
                  <span>{formatInvitationDate(user.created_at)}</span>
                </PortalTooltip>
              </dd>
            </div>
            <div className="ud-fact">
              <dt className="ud-fact-label">
                <RefreshIcon size={12} />
                Last updated
              </dt>
              <dd className="ud-fact-value">
                <PortalTooltip content={formatInvitationDateTime(user.updated_at)}>
                  <span>{formatRelative(user.updated_at)}</span>
                </PortalTooltip>
              </dd>
            </div>
          </dl>
        </section>

        {read_only_reason ? (
          <div role="status" className="inv-notice" data-tone="info">
            <LockIcon size={16} />
            <span>{read_only_reason}</span>
          </div>
        ) : is_deleted && active_tab !== "access" ? (
          <div role="status" className="inv-notice" data-tone="warning">
            <AlertCircleIcon size={16} />
            <span>
              This account was deleted, so its details can&apos;t be changed.{" "}
              <button type="button" className="font-medium underline" onClick={() => selectTab("access")}>
                Restore it
              </button>{" "}
              to edit it again.
            </span>
          </div>
        ) : null}

        {can_edit ? <EditUserTabs active_tab={active_tab} onSelect={selectTab} /> : null}

        <div id="edit-user-panel" role={can_edit ? "tabpanel" : undefined}>
          {active_tab === "profile" || !can_edit ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (edit_user.is_dirty) void edit_user.submit();
              }}
              noValidate
            >
              {edit_user.save_error ? (
                <div role="alert" className="inv-notice" data-tone="danger">
                  <AlertCircleIcon size={16} />
                  <span>{edit_user.save_error}</span>
                </div>
              ) : null}
              {edit_user.success_message ? (
                <div role="status" className="inv-notice" data-tone="success">
                  <CheckCircleIcon size={16} />
                  <span>{edit_user.success_message}</span>
                </div>
              ) : null}

              <EditUserSection
                icon={<PersonIcon size={17} />}
                title="Profile"
                description="How this person shows up across boards, updates and people pickers."
                footer={
                  is_read_only ? undefined : (
                    <>
                      <p className="ud-footer-hint">
                        {edit_user.is_dirty ? "You have unsaved changes." : "Changes apply right away once saved."}
                      </p>
                      <div className="ud-footer-actions">
                        <button
                          type="button"
                          onClick={edit_user.discardChanges}
                          disabled={!edit_user.is_dirty || edit_user.is_saving}
                          className="inv-button inv-button-ghost"
                        >
                          Discard
                        </button>
                        <button
                          type="submit"
                          disabled={!edit_user.is_dirty || edit_user.is_saving}
                          className="inv-button inv-button-primary"
                        >
                          {edit_user.is_saving ? <span className="ud-button-spinner" aria-hidden /> : null}
                          {edit_user.is_saving ? "Saving" : "Save changes"}
                        </button>
                      </div>
                    </>
                  )
                }
              >
                <div className="ud-form-grid">
                  <TextField
                    field="first_name"
                    label="First name"
                    placeholder="First name"
                    autoComplete="off"
                    value={edit_user.form_data.first_name}
                    error={edit_user.field_errors.first_name}
                    disabled={is_read_only}
                    onChange={setTextField}
                  />
                  <TextField
                    field="last_name"
                    label="Last name"
                    placeholder="Last name"
                    autoComplete="off"
                    value={edit_user.form_data.last_name}
                    error={edit_user.field_errors.last_name}
                    disabled={is_read_only}
                    onChange={setTextField}
                  />
                  <div className="ud-field-full">
                    <TextField
                      field="email"
                      label="Email address"
                      type="email"
                      placeholder="name@example.com"
                      autoComplete="off"
                      icon={<MailIcon size={15} />}
                      value={edit_user.form_data.email}
                      error={edit_user.field_errors.email}
                      disabled={is_read_only}
                      onChange={setTextField}
                    />
                    {!is_read_only ? (
                      <p className="ud-field-hint">They sign in with this email, so let them know if you change it.</p>
                    ) : null}
                  </div>
                  <TextField
                    field="phone"
                    label="Phone number"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    autoComplete="off"
                    icon={<PhoneIcon size={15} />}
                    value={edit_user.form_data.phone}
                    error={edit_user.field_errors.phone}
                    disabled={is_read_only}
                    onChange={setTextField}
                  />
                  <div>
                    <label className="ud-label" htmlFor="edit_user_department_id">
                      Department
                    </label>
                    <div className="ud-input-wrap">
                      <span className="inv-field-icon">
                        <BuildingIcon size={15} />
                      </span>
                      <select
                        id="edit_user_department_id"
                        value={edit_user.form_data.department_id !== null ? String(edit_user.form_data.department_id) : ""}
                        disabled={is_read_only}
                        aria-invalid={edit_user.field_errors.department_id ? true : undefined}
                        data-has-icon="true"
                        onChange={(event) =>
                          edit_user.setField("department_id", event.target.value ? Number(event.target.value) : null)
                        }
                        className="ud-input"
                      >
                        <option value="">No department</option>
                        {edit_user.department_rows.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                      <span className="ud-select-caret">
                        <ChevronDownIcon size={12} />
                      </span>
                    </div>
                    <EditUserFieldError message={edit_user.field_errors.department_id} />
                  </div>
                </div>
              </EditUserSection>
            </form>
          ) : active_tab === "password" ? (
            is_deleted ? null : (
              <AdminPasswordSection user={user} />
            )
          ) : (
            <EditUserAccessSection
              user={user}
              onToggleActive={edit_user.toggleActive}
              onDelete={edit_user.deleteAccount}
              onRestore={edit_user.restoreAccount}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EditUserView;
