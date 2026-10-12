"use client";
import React from "react";
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
        <div role="status" className="admin-notice admin-notice-success mb-4">
          {users.invite_sent_notice}
        </div>
      ) : null}

      <InvitationsPanel invitations={invitations} can_manage={users.can_manage_users} />
      <InviteUserModal users={users} />
    </div>
  );
};

export default InvitationsSection;
