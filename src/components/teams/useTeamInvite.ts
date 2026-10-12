"use client";
import { useCallback, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import type { InviteUserApi } from "@/components/administration/InviteUserModal";
import { INVITABLE_ROLES_FOR_ADMIN, INVITABLE_ROLES_FOR_SUPER_ADMIN } from "@/components/administration/useUsersManager";
import { adminUsersService } from "@/services/administration/admin-users.service";
import { departmentsService } from "@/services/administration/departments.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type { PlatformRoleName } from "@/types/administration/admin-users";
import type { DepartmentDto } from "@/types/administration/departments";

/**
 * Drives Administration's {@link InviteUserApi} invite dialog from the Teams page ("Invite" on
 * All users, "Invite new users" under Add users). Same rules as the Users page: a plain admin
 * invites staff or clients, only a super admin may invite admins. Departments load the first
 * time the dialog opens.
 */
export function useTeamInvite(): InviteUserApi & { openInvite: () => void } {
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const invitable_roles = useMemo<PlatformRoleName[]>(
    () => (hasRole("super_admin") ? INVITABLE_ROLES_FOR_SUPER_ADMIN : INVITABLE_ROLES_FOR_ADMIN),
    [hasRole]
  );

  const [is_invite_open, setIsInviteOpen] = useState(false);
  const [department_rows, setDepartmentRows] = useState<DepartmentDto[]>([]);
  const [has_loaded_departments, setHasLoadedDepartments] = useState(false);
  const [invite_email, setInviteEmail] = useState("");
  const [invite_role, setInviteRole] = useState<PlatformRoleName>("staff");
  const [invite_department_id, setInviteDepartmentId] = useState<number | null>(null);
  const [invite_message, setInviteMessage] = useState("");
  const [invite_error, setInviteError] = useState<string | null>(null);
  const [is_submitting_invite, setIsSubmittingInvite] = useState(false);

  const openInvite = useCallback(() => {
    setInviteEmail("");
    setInviteRole("staff");
    setInviteDepartmentId(null);
    setInviteMessage("");
    setInviteError(null);
    setIsInviteOpen(true);
    if (!has_loaded_departments) {
      setHasLoadedDepartments(true);
      departmentsService
        .getDepartments()
        .then(setDepartmentRows)
        .catch(() => setDepartmentRows([]));
    }
  }, [has_loaded_departments]);

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
      showToast({
        variant: "success",
        title: `Invitation sent to ${invitation.email}`,
        description: "Add them to a team once they accept it.",
      });
    } catch (error) {
      setInviteError(apiErrorMessage(error, "We couldn't send that invitation."));
    } finally {
      setIsSubmittingInvite(false);
    }
  }, [can_submit_invite, invite_email, invite_role, invite_department_id, invite_message, showToast]);

  return {
    is_invite_open,
    openInvite,
    closeInvite,
    invitable_roles,
    department_rows,
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
