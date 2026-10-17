"use client";
import React from "react";
import { CheckCircleIcon } from "@/icons/workspace-icons";
import AdminPageActions from "../AdminPageActions";
import InviteButton from "../InviteButton";
import InviteUserModal from "../InviteUserModal";
import InvitationsPanel from "../users/InvitationsPanel";
import { useStaffInvitationsManager } from "../useStaffInvitationsManager";
import type { UsersManagerApi } from "../useUsersManager";

export type InvitationsSectionProps = {
  users: UsersManagerApi;
};

/**
 * Administration > Directory > Invitations, its own rail page like monday's: every account
 * invitation with resend and cancel. Sending a new invitation reloads the list through
 * `invitations_version`.
 */
const InvitationsSection: React.FC<InvitationsSectionProps> = ({ users }) => {
  const invitations = useStaffInvitationsManager(users.invitations_version);

  return (
    <div>
      <AdminPageActions>
        <InviteButton onClick={users.openInvite} />
      </AdminPageActions>

      {users.invite_sent_notice ? (
        <div role="status" className="invitations-theme inv-notice" data-tone="success">
          <CheckCircleIcon size={16} />
          <span>{users.invite_sent_notice}</span>
        </div>
      ) : null}

      <InvitationsPanel invitations={invitations} can_manage={users.can_manage_users} onInvite={users.openInvite} />
      <InviteUserModal users={users} />
    </div>
  );
};

export default InvitationsSection;
