"use client";
import React from "react";
import Link from "next/link";
import { PersonAvatar } from "@/components/board";
import TeamAvatar from "./TeamAvatar";
import type { TeamMember } from "./types";

export type AllUsersTableProps = {
  members: TeamMember[];
  empty_label: string;
  onOpenTeam: (team_id: string) => void;
};

/** Team avatars shown before the "+N" bubble. */
const VISIBLE_TEAMS = 2;

/**
 * "All users", after monday.com: Name, Email, Title and the teams each person belongs to as
 * stacked team pictures with a "+N" bubble, or "No teams". A team picture opens that team.
 */
const AllUsersTable: React.FC<AllUsersTableProps> = ({ members, empty_label, onOpenTeam }) => (
  <table className="teams-table">
    <thead>
      <tr>
        <th style={{ width: "32%" }}>Name</th>
        <th className="teams-hide-sm" style={{ width: "28%" }}>
          Email
        </th>
        <th className="teams-hide-sm">Title</th>
        <th style={{ width: 140 }}>Teams</th>
      </tr>
    </thead>
    <tbody>
      {members.map((member) => {
        const member_teams = member.teams ?? [];
        const hidden_count = member_teams.length - VISIBLE_TEAMS;
        return (
          <tr key={member.id}>
            <td>
              <div className="teams-person">
                <PersonAvatar person={member} size={32} />
                <Link href={`/users/${member.id}`} className="teams-link">
                  {member.name}
                </Link>
                {member.is_guest ? <span className="teams-pill">Guest</span> : null}
              </div>
            </td>
            <td className="teams-hide-sm">
              <div className="teams-cell-truncate">{member.email}</div>
            </td>
            <td className="teams-hide-sm">
              <div className={`teams-cell-clamp${member.title ? "" : " teams-faint"}`}>{member.title ?? "No title"}</div>
            </td>
            <td>
              {member_teams.length === 0 ? (
                <span className="teams-muted">No teams</span>
              ) : (
                <div className="teams-stack" aria-label={`Teams: ${member_teams.map((team) => team.name).join(", ")}`}>
                  {member_teams.slice(0, VISIBLE_TEAMS).map((team) => (
                    <button key={team.id} type="button" onClick={() => onOpenTeam(team.id)} aria-label={`Open ${team.name}`}>
                      <TeamAvatar name={team.name} picture_url={team.picture_url} size={28} has_ring />
                    </button>
                  ))}
                  {hidden_count > 0 ? (
                    <span className="teams-stack-more" title={member_teams.slice(VISIBLE_TEAMS).map((team) => team.name).join(", ")}>
                      +{hidden_count}
                    </span>
                  ) : null}
                </div>
              )}
            </td>
          </tr>
        );
      })}
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

export default AllUsersTable;
