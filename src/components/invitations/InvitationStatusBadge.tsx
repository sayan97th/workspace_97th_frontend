import React from "react";
import type { WorkspaceInvitationStatus } from "@/types/invitation";

const STATUS_META: Record<WorkspaceInvitationStatus, { label: string; classes: string; dot: string }> = {
  pending: { label: "Pending", classes: "bg-warning-500/10 text-warning-500", dot: "bg-warning-500" },
  accepted: { label: "Accepted", classes: "bg-success-500/10 text-success-400", dot: "bg-success-500" },
  expired: { label: "Expired", classes: "bg-error-500/10 text-error-400", dot: "bg-error-500" },
};

export type InvitationStatusBadgeProps = {
  status: WorkspaceInvitationStatus;
};

/** Pill badge for a {@link WorkspaceInvitationStatus}, shared by the invitations table and its filter dropdown. */
const InvitationStatusBadge: React.FC<InvitationStatusBadgeProps> = ({ status }) => {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.classes}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
};

export default InvitationStatusBadge;
