"use client";
import React from "react";
import { MoreHorizontal, Network, Plus } from "lucide-react";
import { PersonAvatar } from "@/components/board";
import TeamAvatar from "./TeamAvatar";
import TeamsMenuButton from "./TeamsMenuButton";
import type { Team } from "./types";
import type { TeamsManagerApi } from "./useTeamsManager";

export type TeamSubTeamsTabProps = {
  team: Team;
  teams: TeamsManagerApi;
  query: string;
};

/**
 * A team's Sub-teams tab: the teams nested directly under it with their member count and owners.
 * Admins create a sub-team here, move one back to the top level or delete it, and any team can be
 * moved under another from Edit team.
 */
const TeamSubTeamsTab: React.FC<TeamSubTeamsTabProps> = ({ team, teams, query }) => {
  const trimmed_query = query.trim().toLowerCase();
  const rows = trimmed_query
    ? teams.sub_teams.filter((sub_team) => sub_team.name.toLowerCase().includes(trimmed_query))
    : teams.sub_teams;

  if (teams.sub_teams.length === 0) {
    return (
      <div className="teams-empty-state">
        <Network size={40} strokeWidth={1.25} aria-hidden="true" />
        <strong>No sub-teams yet</strong>
        <span>Split {team.name} into smaller teams, each with its own users, owners and boards.</span>
        {team.can_manage ? (
          <button type="button" className="teams-button teams-button-primary mt-2" onClick={() => teams.openCreateTeam(team.id)}>
            <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
            Create sub-team
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {team.can_manage ? (
        <div className="mb-2 flex justify-end">
          <button type="button" className="teams-button teams-button-secondary teams-button-sm" onClick={() => teams.openCreateTeam(team.id)}>
            <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
            Create sub-team
          </button>
        </div>
      ) : null}
      <table className="teams-table">
        <thead>
          <tr>
            <th style={{ width: "44%" }}>Name</th>
            <th>Members</th>
            <th className="teams-hide-sm">Owners</th>
            <th style={{ width: 56 }}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((sub_team) => (
            <tr key={sub_team.id}>
              <td>
                <div className="teams-person">
                  <TeamAvatar name={sub_team.name} picture_url={sub_team.picture_url} size={32} />
                  <button type="button" className="teams-link" onClick={() => teams.selectTeam(sub_team.id)}>
                    {sub_team.name}
                  </button>
                  {sub_team.sub_team_count > 0 ? (
                    <span className="teams-pill">
                      {sub_team.sub_team_count} {sub_team.sub_team_count === 1 ? "sub-team" : "sub-teams"}
                    </span>
                  ) : null}
                </div>
              </td>
              <td>{sub_team.member_count}</td>
              <td className="teams-hide-sm">
                {sub_team.owners.length > 0 ? (
                  <span className="teams-stack" title={sub_team.owners.map((owner) => owner.name).join(", ")}>
                    {sub_team.owners.slice(0, 3).map((owner) => (
                      <PersonAvatar key={owner.id} person={owner} size={24} className="teams-avatar-ringed" />
                    ))}
                    {sub_team.owners.length > 3 ? <span className="teams-stack-more">+{sub_team.owners.length - 3}</span> : null}
                  </span>
                ) : (
                  <span className="teams-faint">No owners</span>
                )}
              </td>
              <td>
                <div className="teams-row-actions">
                  {sub_team.can_manage ? (
                    <TeamsMenuButton
                      aria_label={`${sub_team.name} options`}
                      width={240}
                      sections={[
                        {
                          key: "manage",
                          items: [
                            { key: "edit", label: "Edit team", onClick: () => teams.openEditTeam(sub_team) },
                            { key: "detach", label: "Move to top level", onClick: () => void teams.detachSubTeam(sub_team) },
                          ],
                        },
                        {
                          key: "danger",
                          items: [{ key: "delete", label: "Delete team", danger: true, onClick: () => teams.requestDeleteTeam(sub_team) }],
                        },
                      ]}
                    >
                      <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
                    </TeamsMenuButton>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="teams-table-empty">
                No sub-teams match your search.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </>
  );
};

export default TeamSubTeamsTab;
