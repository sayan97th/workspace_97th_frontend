import React from "react";

export type UserStatusBadgeProps = {
  is_active: boolean;
};

/** Pill badge for a user account's active/disabled state, matching {@link InvitationStatusBadge}'s look. */
const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({ is_active }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
      is_active ? "bg-success-500/10 text-success-400" : "bg-error-500/10 text-error-400"
    }`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${is_active ? "bg-success-500" : "bg-error-500"}`} />
    {is_active ? "Active" : "Disabled"}
  </span>
);

export default UserStatusBadge;
