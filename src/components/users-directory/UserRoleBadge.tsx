import React from "react";
import { InvitationPlatformRoleBadge } from "@/components/invitations";
import type { PlatformRoleName } from "@/types/administration/admin-users";

export type UserRoleBadgeProps = {
  role: PlatformRoleName;
};

/**
 * Account role pill (Super admin, Admin, Staff, Client) with what the role can do in a tooltip.
 * Same pill as Administration > Invitations, so a role reads the same everywhere.
 */
const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({ role }) => <InvitationPlatformRoleBadge role={role} />;

export default UserRoleBadge;
