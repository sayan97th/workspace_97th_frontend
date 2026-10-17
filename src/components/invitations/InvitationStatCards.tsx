"use client";
import React from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import { CheckCircleIcon, ClockIcon, MailIcon, WarningTriangleIcon } from "@/icons/workspace-icons";
import "./invitations.scss";
import { meterWidth, type InvitationStatusValue, type InvitationTone } from "./invitationFormat";

/** Which card is selected: one status, or every invitation. */
export type InvitationStatFilter = InvitationStatusValue | "all";

export type InvitationStatCounts = Record<InvitationStatFilter, number>;

const STAT_CARDS: ReadonlyArray<{
  id: InvitationStatFilter;
  label: string;
  tone: InvitationTone;
  hint: string;
  Icon: typeof MailIcon;
}> = [
  { id: "all", label: "All invitations", tone: "brand", hint: "Every invitation ever sent, whatever its status.", Icon: MailIcon },
  { id: "pending", label: "Pending", tone: "info", hint: "Sent and still waiting to be accepted.", Icon: ClockIcon },
  { id: "accepted", label: "Accepted", tone: "success", hint: "People who accepted and joined.", Icon: CheckCircleIcon },
  { id: "expired", label: "Expired", tone: "warning", hint: "Links that stopped working before anyone accepted them.", Icon: WarningTriangleIcon },
];

export type InvitationStatCardsProps = {
  counts: InvitationStatCounts | null;
  active: InvitationStatFilter;
  onSelect: (filter: InvitationStatFilter) => void;
};

/**
 * Four summary cards (All, Pending, Accepted, Expired) with a count and a meter showing each
 * status's share. They are also the status filter: clicking one narrows the list to it.
 */
const InvitationStatCards: React.FC<InvitationStatCardsProps> = ({ counts, active, onSelect }) => (
  <div className="inv-stats" role="tablist" aria-label="Filter invitations by status">
    {STAT_CARDS.map((card) => {
      const count = counts?.[card.id] ?? 0;
      const is_active = active === card.id;
      return (
        <PortalTooltip key={card.id} content={card.hint} className="w-full">
          <button
            type="button"
            role="tab"
            aria-selected={is_active}
            data-tone={card.tone}
            data-active={is_active ? "true" : "false"}
            onClick={() => onSelect(card.id)}
            className="inv-stat"
          >
            <span className="inv-stat-icon">
              <card.Icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="inv-stat-label">{card.label}</span>
              {counts ? <span className="inv-stat-value">{count}</span> : <span className="inv-skeleton mt-2" style={{ width: 40, height: 18 }} />}
            </span>
            <span className="inv-stat-meter" aria-hidden>
              <span style={{ width: meterWidth(count, counts?.all ?? 0) }} />
            </span>
          </button>
        </PortalTooltip>
      );
    })}
  </div>
);

export default InvitationStatCards;
