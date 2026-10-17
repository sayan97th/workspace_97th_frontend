import React from "react";
import InvitationPill from "./InvitationPill";
import type { InvitationStatusValue, InvitationTone } from "./invitationFormat";

export const INVITATION_STATUS_META: Record<InvitationStatusValue, { label: string; tone: InvitationTone; hint: string }> = {
  pending: {
    label: "Pending",
    tone: "info",
    hint: "Sent and waiting for the person to accept. The link still works.",
  },
  accepted: {
    label: "Accepted",
    tone: "success",
    hint: "The person accepted and now has an active account.",
  },
  expired: {
    label: "Expired",
    tone: "warning",
    hint: "The link stopped working before it was accepted. Send it again to revive it.",
  },
};

export type InvitationStatusBadgeProps = {
  status: InvitationStatusValue;
};

/** Pending / Accepted / Expired pill with a tooltip that explains the status. Shared by every invitations list. */
const InvitationStatusBadge: React.FC<InvitationStatusBadgeProps> = ({ status }) => {
  const meta = INVITATION_STATUS_META[status];
  return (
    <InvitationPill tone={meta.tone} tooltip={meta.hint}>
      {meta.label}
    </InvitationPill>
  );
};

export default InvitationStatusBadge;
