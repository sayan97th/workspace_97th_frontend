import React from "react";
import type { PlatformRoleName } from "@/types/administration/admin-users";

const ROLE_META: Record<PlatformRoleName, { label: string; classes: string; dot: string }> = {
  super_admin: { label: "Super admin", classes: "bg-brand-500/10 text-brand-400", dot: "bg-brand-500" },
  admin: { label: "Admin", classes: "bg-blue-light-500/10 text-blue-light-500", dot: "bg-blue-light-500" },
  staff: { label: "Staff", classes: "bg-success-500/10 text-success-400", dot: "bg-success-500" },
  client: { label: "Client", classes: "bg-shell-hover text-shell-text-secondary", dot: "bg-shell-text-faint" },
};

export type UserRoleBadgeProps = {
  role: PlatformRoleName;
};

/** Pill badge for a site-wide {@link PlatformRoleName}, matching {@link InvitationRoleBadge}'s look. */
const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({ role }) => {
  const meta = ROLE_META[role];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.classes}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
};

export default UserRoleBadge;
