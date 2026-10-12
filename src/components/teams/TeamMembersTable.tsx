"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, MoreHorizontal } from "lucide-react";
import { PersonAvatar } from "@/components/board";
import type { ActionMenuItem } from "@/components/ui/dropdown/ActionMenu";
import TeamsMenuButton from "./TeamsMenuButton";
import TeamsTooltip from "./TeamsTooltip";
import type { TeamMember } from "./types";

export type TeamMembersTableProps = {
  members: TeamMember[];
  viewer_id: string | null;
  /** Shown when `members` is empty. */
  empty_label: string;
  /** Admins pick owners, everyone else only sees who owns the team. */
  can_manage_owners: boolean;
  owner_saving_id: string | null;
  onToggleOwner: (member: TeamMember) => void;
  canRemoveMember: (member: TeamMember) => boolean;
  onRemoveMember: (member: TeamMember) => void;
  onLeave: () => void;
};

/** "Make Lea an owner", the tooltip monday shows on the crown. */
const crownLabel = (member: TeamMember, can_manage_owners: boolean): string => {
  const first_name = member.name.split(" ")[0] || member.name;
  if (!can_manage_owners) return `${first_name} is a team owner`;
  return member.is_team_owner ? `Remove ${first_name} as owner` : `Make ${first_name} an owner`;
};

/**
 * A team's Users tab, after monday.com: Name (photo and a link to the profile), Email and Title,
 * then the owner crown and a "..." menu per row. The crown is a toggle for admins, a static badge
 * on owners for everyone else.
 */
const TeamMembersTable: React.FC<TeamMembersTableProps> = ({
  members,
  viewer_id,
  empty_label,
  can_manage_owners,
  owner_saving_id,
  onToggleOwner,
  canRemoveMember,
  onRemoveMember,
  onLeave,
}) => {
  const router = useRouter();
  const rowMenuItems = (member: TeamMember): ActionMenuItem[][] => [
    [{ key: "profile", label: "View profile", onClick: () => router.push(`/users/${member.id}`) }],
    can_manage_owners && !member.is_guest
      ? [
          {
            key: "owner",
            label: member.is_team_owner ? "Remove as team owner" : "Make team owner",
            onClick: () => onToggleOwner(member),
          },
        ]
      : [],
    member.id === viewer_id
      ? [{ key: "leave", label: "Leave team", onClick: onLeave }]
      : canRemoveMember(member)
        ? [{ key: "remove", label: "Remove from team", danger: true, onClick: () => onRemoveMember(member) }]
        : [],
  ];

  return (
    <table className="teams-table">
      <thead>
        <tr>
          <th style={{ width: "36%" }}>Name</th>
          <th className="teams-hide-sm" style={{ width: "30%" }}>
            Email
          </th>
          <th className="teams-hide-sm">Title</th>
          <th style={{ width: 96 }}>
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {members.map((member) => (
          <tr key={member.id}>
            <td>
              <div className="teams-person">
                <PersonAvatar person={member} size={32} />
                <Link href={`/users/${member.id}`} className="teams-link">
                  {member.name}
                </Link>
                {member.is_guest ? <span className="teams-pill">Guest</span> : null}
                {member.id === viewer_id ? <span className="teams-pill">You</span> : null}
              </div>
            </td>
            <td className="teams-hide-sm">
              <div className="teams-cell-truncate">{member.email}</div>
            </td>
            <td className="teams-hide-sm">
              <div className={`teams-cell-clamp${member.title ? "" : " teams-faint"}`}>{member.title ?? "No title"}</div>
            </td>
            <td>
              <div className="teams-row-actions">
                {can_manage_owners && !member.is_guest ? (
                  <TeamsTooltip content={crownLabel(member, true)}>
                    <button
                      type="button"
                      className="teams-crown"
                      aria-pressed={Boolean(member.is_team_owner)}
                      aria-label={crownLabel(member, true)}
                      disabled={owner_saving_id === member.id}
                      onClick={() => onToggleOwner(member)}
                    >
                      <Crown size={13} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </TeamsTooltip>
                ) : member.is_team_owner ? (
                  <TeamsTooltip content={crownLabel(member, false)}>
                    <span className="teams-crown" aria-pressed="true" role="img" aria-label={crownLabel(member, false)}>
                      <Crown size={13} strokeWidth={2} aria-hidden="true" />
                    </span>
                  </TeamsTooltip>
                ) : (
                  <span className="inline-block w-[26px]" aria-hidden="true" />
                )}
                <TeamsMenuButton
                  aria_label={`${member.name} options`}
                  sections={rowMenuItems(member).map((items, index) => ({ key: String(index), items }))}
                  width={220}
                >
                  <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
                </TeamsMenuButton>
              </div>
            </td>
          </tr>
        ))}
        {members.length === 0 ? (
          <tr>
            <td colSpan={4} className="teams-table-empty">
              {empty_label}
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
};

export default TeamMembersTable;
