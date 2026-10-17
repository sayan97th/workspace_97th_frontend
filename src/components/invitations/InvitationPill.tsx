import React from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import "./invitations.scss";
import type { InvitationTone } from "./invitationFormat";

export type InvitationPillProps = {
  tone: InvitationTone;
  children: React.ReactNode;
  /** Leading icon, otherwise a small dot in the tone color. */
  icon?: React.ReactNode;
  tooltip?: React.ReactNode;
};

/** Rounded tinted label, the base of the status and role badges. */
const InvitationPill: React.FC<InvitationPillProps> = ({ tone, children, icon, tooltip }) => (
  <PortalTooltip content={tooltip} disabled={!tooltip}>
    <span className="inv-pill" data-tone={tone} tabIndex={tooltip ? 0 : undefined}>
      {icon ?? <span className="inv-pill-dot" aria-hidden />}
      {children}
    </span>
  </PortalTooltip>
);

export default InvitationPill;
