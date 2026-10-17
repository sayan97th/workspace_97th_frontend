"use client";
import React from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import { meterWidth, type InvitationTone } from "@/components/invitations";
import { CheckCircleIcon, DeleteIcon, LockIcon, TeamsIcon } from "@/icons/workspace-icons";
import type { AdminUserStatusCounts } from "@/types/administration/admin-users";
import type { AccountStatusFilter } from "./useUsersDirectory";

/** Which card is selected: one account status, or every account that was not deleted. */
export type UserStatFilter = AccountStatusFilter | "all";

const STAT_CARDS: ReadonlyArray<{
  id: UserStatFilter;
  label: string;
  tone: InvitationTone;
  hint: string;
  Icon: typeof TeamsIcon;
}> = [
  { id: "all", label: "All users", tone: "brand", hint: "Every account that can be used or enabled again.", Icon: TeamsIcon },
  { id: "active", label: "Active", tone: "success", hint: "Accounts that can sign in right now.", Icon: CheckCircleIcon },
  { id: "disabled", label: "Disabled", tone: "warning", hint: "Sign in is blocked, the account and its data are kept.", Icon: LockIcon },
  { id: "deleted", label: "Deleted", tone: "neutral", hint: "Removed accounts you can still restore.", Icon: DeleteIcon },
];

export type UserStatCardsProps = {
  counts: AdminUserStatusCounts | null;
  active: UserStatFilter;
  onSelect: (filter: UserStatFilter) => void;
};

/**
 * All, Active, Disabled and Deleted cards with a count and a meter for each status's share.
 * They double as the status filter, like the Invitations summary cards.
 */
const UserStatCards: React.FC<UserStatCardsProps> = ({ counts, active, onSelect }) => {
  // Deleted accounts are not part of "All users", so their meter compares against every row.
  const meter_total = (counts?.all ?? 0) + (counts?.deleted ?? 0);

  return (
    <div className="inv-stats" role="tablist" aria-label="Filter users by account status">
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
                {counts ? (
                  <span className="inv-stat-value">{count}</span>
                ) : (
                  <span className="inv-skeleton mt-2" style={{ width: 40, height: 18 }} />
                )}
              </span>
              <span className="inv-stat-meter" aria-hidden>
                <span style={{ width: meterWidth(count, card.id === "deleted" ? meter_total : counts?.all ?? 0) }} />
              </span>
            </button>
          </PortalTooltip>
        );
      })}
    </div>
  );
};

export default UserStatCards;
