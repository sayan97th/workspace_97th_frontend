"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import { PersonAvatar } from "@/components/board";
import { toPersonOption } from "@/components/administration/adminUserMapping";
import { primaryRole } from "@/components/administration/useUsersManager";
import SettingsDropdown from "@/components/administration/SettingsDropdown";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileSectionHeader from "@/components/profile/ProfileSectionHeader";
import ProfileBanner from "@/components/profile/ProfileBanner";
import ProfileFieldError from "@/components/profile/ProfileFieldError";
import { inputClass, labelClass, primaryButtonClass } from "@/components/profile/profileStyles";
import { ChevronRightIcon, MailIcon, PersonIcon } from "@/icons/workspace-icons";
import UserRoleBadge from "./UserRoleBadge";
import UserStatusBadge from "./UserStatusBadge";
import { useEditUser } from "./useEditUser";

const EDIT_USER_ROLES = ["super_admin", "admin"];

export type EditUserViewProps = {
  user_id: string;
};

/** Full-page (not a modal) form for editing another account's name, email, phone and department. */
const EditUserView: React.FC<EditUserViewProps> = ({ user_id }) => {
  const router = useRouter();
  const { isLoading: is_auth_loading, hasAnyRole } = useAuth();
  const edit_user = useEditUser(user_id);

  if (is_auth_loading) {
    return <BoardLoadingSpinner />;
  }

  if (!hasAnyRole(...EDIT_USER_ROLES)) {
    return (
      <CenteredMessage
        title="You don't have access to this page"
        detail="Only account administrators can edit another user's account."
      />
    );
  }

  if (edit_user.is_loading) {
    return <BoardLoadingSpinner />;
  }

  if (edit_user.load_error || !edit_user.user) {
    return <CenteredMessage title="User not found" detail={edit_user.load_error ?? "This account doesn't exist."} />;
  }

  const { user } = edit_user;
  const person = toPersonOption(user);
  const role = primaryRole(user);

  const department_options = [
    { id: "", label: "Unassigned" },
    ...edit_user.department_rows.map((department) => ({ id: String(department.id), label: department.name })),
  ];

  return (
    <div className="mx-auto max-w-[760px] px-8 py-7">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-5 flex w-fit items-center gap-1.5 text-[13px] font-semibold text-shell-text-muted transition-colors hover:text-shell-text"
      >
        <ChevronRightIcon className="rotate-180" size={11} />
        Back
      </button>

      <div className="mb-7 flex items-center gap-4 rounded-2xl border border-shell-border bg-shell-panel-alt p-6">
        <PersonAvatar person={person} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-extrabold tracking-[-0.01em] text-shell-text">{user.full_name}</h1>
          <p className="mt-0.5 truncate text-[13.5px] text-shell-text-muted">{user.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <UserRoleBadge role={role} />
            <UserStatusBadge is_active={user.is_active} />
          </div>
        </div>
      </div>

      {edit_user.save_error ? (
        <ProfileBanner tone="error" className="mb-6">
          {edit_user.save_error}
        </ProfileBanner>
      ) : null}
      {edit_user.success_message ? (
        <ProfileBanner tone="success" className="mb-6">
          {edit_user.success_message}
        </ProfileBanner>
      ) : null}

      <div className="space-y-6">
        <ProfileCard>
          <ProfileSectionHeader
            icon={<PersonIcon size={16} />}
            title="Personal information"
            description="This account's name."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="first_name">
                First name
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                value={edit_user.form_data.first_name}
                placeholder="First name"
                onChange={(e) => edit_user.setField("first_name", e.target.value)}
                className={inputClass(!!edit_user.field_errors.first_name)}
              />
              {edit_user.field_errors.first_name ? (
                <ProfileFieldError message={edit_user.field_errors.first_name} />
              ) : null}
            </div>
            <div>
              <label className={labelClass} htmlFor="last_name">
                Last name
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                value={edit_user.form_data.last_name}
                placeholder="Last name"
                onChange={(e) => edit_user.setField("last_name", e.target.value)}
                className={inputClass(!!edit_user.field_errors.last_name)}
              />
              {edit_user.field_errors.last_name ? (
                <ProfileFieldError message={edit_user.field_errors.last_name} />
              ) : null}
            </div>
          </div>
        </ProfileCard>

        <ProfileCard>
          <ProfileSectionHeader
            icon={<MailIcon size={16} />}
            title="Contact details"
            description="Email, phone number and department."
          />

          <div className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={edit_user.form_data.email}
                placeholder="name@example.com"
                onChange={(e) => edit_user.setField("email", e.target.value)}
                className={inputClass(!!edit_user.field_errors.email)}
              />
              {edit_user.field_errors.email ? <ProfileFieldError message={edit_user.field_errors.email} /> : null}
            </div>

            <div>
              <label className={labelClass} htmlFor="phone">
                Phone number
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                value={edit_user.form_data.phone}
                placeholder="+1 (555) 000-0000"
                onChange={(e) => edit_user.setField("phone", e.target.value)}
                className={inputClass(!!edit_user.field_errors.phone)}
              />
              {edit_user.field_errors.phone ? <ProfileFieldError message={edit_user.field_errors.phone} /> : null}
            </div>

            <div>
              <label className={labelClass}>Department</label>
              <SettingsDropdown
                value={edit_user.form_data.department_id !== null ? String(edit_user.form_data.department_id) : ""}
                options={department_options}
                onChange={(id) => edit_user.setField("department_id", id ? Number(id) : null)}
                placeholder="Unassigned"
                className="w-full"
              />
              {edit_user.field_errors.department_id ? (
                <ProfileFieldError message={edit_user.field_errors.department_id} />
              ) : null}
            </div>
          </div>
        </ProfileCard>

        <div className="flex items-center justify-end gap-3">
          <p className="text-xs text-shell-text-faint">Changes will be applied immediately.</p>
          <button
            type="button"
            disabled={edit_user.is_saving}
            onClick={() => void edit_user.submit()}
            className={primaryButtonClass}
          >
            {edit_user.is_saving ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving…
              </span>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditUserView;
