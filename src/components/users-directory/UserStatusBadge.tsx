import React from "react";
import { InvitationPill, type InvitationTone } from "@/components/invitations";

export type UserAccountStatus = "active" | "disabled" | "deleted";

export const USER_STATUS_META: Record<UserAccountStatus, { label: string; tone: InvitationTone; hint: string }> = {
  active: { label: "Active", tone: "success", hint: "Can sign in and use the account." },
  disabled: {
    label: "Disabled",
    tone: "warning",
    hint: "Sign in is blocked for now. The account and its data are kept, and it can be enabled again.",
  },
  deleted: {
    label: "Deleted",
    tone: "neutral",
    hint: "Removed from the account. Name and history are kept, and it can be restored.",
  },
};

/** Deleted wins over disabled, since a deleted account is gone whatever its active flag says. */
export const userAccountStatus = (is_active: boolean, is_deleted: boolean): UserAccountStatus =>
  is_deleted ? "deleted" : is_active ? "active" : "disabled";

export type UserStatusBadgeProps = {
  is_active: boolean;
  /** A deleted account, which reads as neutral gray since it is gone but recoverable. */
  is_deleted?: boolean;
};

/** Active / Disabled / Deleted pill with what the status means in a tooltip. */
const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({ is_active, is_deleted = false }) => {
  const meta = USER_STATUS_META[userAccountStatus(is_active, is_deleted)];
  return (
    <InvitationPill tone={meta.tone} tooltip={meta.hint}>
      {meta.label}
    </InvitationPill>
  );
};

export default UserStatusBadge;
