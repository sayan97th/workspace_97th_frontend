import React from "react";
import type { WorkspaceMembershipRole } from "@/types/invitation";
import { CrownIcon, EyeIcon, MemberIcon } from "@/icons/workspace-icons";
import InvitationPill from "./InvitationPill";
import type { InvitationTone } from "./invitationFormat";

export const WORKSPACE_ROLE_META: Record<
  WorkspaceMembershipRole,
  { label: string; tone: InvitationTone; hint: string; Icon: typeof CrownIcon }
> = {
  owner: { label: "Owner", tone: "brand", hint: "Full access, can manage members and settings.", Icon: CrownIcon },
  member: { label: "Member", tone: "info", hint: "Can create and edit boards in this workspace.", Icon: MemberIcon },
  viewer: { label: "Viewer", tone: "neutral", hint: "Read only access to this workspace.", Icon: EyeIcon },
};

export type InvitationRoleBadgeProps = {
  role: WorkspaceMembershipRole;
};

/** Workspace role pill with its icon and a tooltip describing what the role can do. */
const InvitationRoleBadge: React.FC<InvitationRoleBadgeProps> = ({ role }) => {
  const meta = WORKSPACE_ROLE_META[role];
  return (
    <InvitationPill tone={meta.tone} tooltip={meta.hint} icon={<meta.Icon size={12} />}>
      {meta.label}
    </InvitationPill>
  );
};

export default InvitationRoleBadge;
