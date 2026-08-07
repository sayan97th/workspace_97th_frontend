import React from "react";
import type { WorkspaceMembershipRole } from "@/types/invitation";

const ROLE_META: Record<WorkspaceMembershipRole, { label: string; classes: string; dot: string }> = {
  owner: { label: "Owner", classes: "bg-brand-500/10 text-brand-400", dot: "bg-brand-500" },
  member: { label: "Member", classes: "bg-blue-light-500/10 text-blue-light-500", dot: "bg-blue-light-500" },
  viewer: { label: "Viewer", classes: "bg-shell-hover text-shell-text-secondary", dot: "bg-shell-text-faint" },
};

export type InvitationRoleBadgeProps = {
  role: WorkspaceMembershipRole;
};

/** Pill badge for a {@link WorkspaceMembershipRole}, shared by the invitations table and its filter dropdown. */
const InvitationRoleBadge: React.FC<InvitationRoleBadgeProps> = ({ role }) => {
  const meta = ROLE_META[role];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.classes}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
};

export default InvitationRoleBadge;
