"use client";
import React, { useRef } from "react";
import { Camera, ChevronDown, MoreHorizontal, Plus } from "lucide-react";
import type { ActionMenuItem } from "@/components/ui/dropdown/ActionMenu";
import type { AccountTeamImageKind } from "@/services/account-teams.service";
import TeamAvatar from "./TeamAvatar";
import TeamCoverArt from "./TeamCoverArt";
import TeamsMenuButton from "./TeamsMenuButton";
import type { Team } from "./types";
import type { TeamsManagerApi } from "./useTeamsManager";

export type TeamHeaderProps = {
  team: Team;
  teams: TeamsManagerApi;
  onAddUsers: () => void;
  onInvite: () => void;
};

const ACCEPTED_IMAGES = "image/png,image/jpeg,image/webp,image/gif";

/**
 * Top of a team's page, after monday.com: the cover banner, the round team picture overlapping
 * it, the name with the member count, the "Add users" split button and the "..." team menu.
 * Admins and team owners change the picture (click it) and the cover from the menu, admins also
 * edit, move and delete the team. Anyone on the team can leave it.
 */
const TeamHeader: React.FC<TeamHeaderProps> = ({ team, teams, onAddUsers, onInvite }) => {
  const picture_input_ref = useRef<HTMLInputElement>(null);
  const cover_input_ref = useRef<HTMLInputElement>(null);
  const can_edit_images = team.can_manage_members;
  const is_saving_picture = teams.image_saving_kind === "picture";

  const pickFile = (kind: AccountTeamImageKind) =>
    (kind === "picture" ? picture_input_ref : cover_input_ref).current?.click();

  const handleFile = (kind: AccountTeamImageKind) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void teams.uploadTeamImage(team, kind, file);
  };

  const image_items: ActionMenuItem[] = can_edit_images
    ? [
        { key: "picture", label: team.picture_url ? "Change team picture" : "Upload team picture", onClick: () => pickFile("picture") },
        ...(team.picture_url
          ? [{ key: "remove_picture", label: "Remove team picture", onClick: () => void teams.removeTeamImage(team, "picture") }]
          : []),
        { key: "cover", label: team.cover_url ? "Change cover image" : "Upload cover image", onClick: () => pickFile("cover") },
        ...(team.cover_url
          ? [{ key: "remove_cover", label: "Remove cover image", onClick: () => void teams.removeTeamImage(team, "cover") }]
          : []),
      ]
    : [];

  const manage_items: ActionMenuItem[] = team.can_manage
    ? [
        { key: "edit", label: "Edit team", onClick: () => teams.openEditTeam(team) },
        { key: "sub_team", label: "Add sub-team", onClick: () => teams.openCreateTeam(team.id) },
      ]
    : [];

  const exit_items: ActionMenuItem[] = [
    ...(team.is_member ? [{ key: "leave", label: "Leave team", onClick: () => teams.requestLeaveTeam(team) }] : []),
    ...(team.can_manage ? [{ key: "delete", label: "Delete team", danger: true, onClick: () => teams.requestDeleteTeam(team) }] : []),
  ];

  const add_menu_items: ActionMenuItem[] = [
    ...(teams.is_admin ? [{ key: "invite", label: "Invite new users", onClick: onInvite }] : []),
    ...(team.can_manage ? [{ key: "sub_team", label: "Create sub-team", onClick: () => teams.openCreateTeam(team.id) }] : []),
  ];

  const member_label = `${team.member_count} ${team.member_count === 1 ? "member" : "members"}`;

  return (
    <>
      <div className="teams-cover">
        {team.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.cover_url} alt="" />
        ) : (
          <TeamCoverArt />
        )}
      </div>

      <div className="teams-header">
        {can_edit_images ? (
          <button
            type="button"
            className="teams-header-avatar teams-avatar-editable"
            onClick={() => pickFile("picture")}
            disabled={is_saving_picture}
            aria-label={team.picture_url ? "Change team picture" : "Upload team picture"}
          >
            <TeamAvatar name={team.name} picture_url={team.picture_url} size={96} />
            <span className="teams-avatar-edit-label">
              <Camera size={16} strokeWidth={1.75} aria-hidden="true" />
              {is_saving_picture ? "Saving..." : "Change"}
            </span>
          </button>
        ) : (
          <span className="teams-header-avatar">
            <TeamAvatar name={team.name} picture_url={team.picture_url} size={96} />
          </span>
        )}

        <div className="teams-header-text">
          <h2 className="teams-header-title" title={team.name}>
            {team.name}
          </h2>
          <div className="teams-header-subtitle">{member_label}</div>
          {teams.parent_team || team.allow_guests || team.owners.length > 0 ? (
            <div className="teams-header-meta">
              {teams.parent_team ? (
                <span>
                  Sub-team of{" "}
                  <button type="button" className="teams-link" onClick={() => teams.selectTeam(teams.parent_team!.id)}>
                    {teams.parent_team.name}
                  </button>
                </span>
              ) : null}
              {team.allow_guests ? <span className="teams-pill teams-pill-accent">Guests allowed</span> : null}
              {team.owners.length > 0 ? (
                <span>
                  {team.owners.length === 1 ? "Owner" : "Owners"}: {team.owners.map((owner) => owner.name).join(", ")}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="teams-header-actions">
          {team.can_manage_members ? (
            <div className="teams-split-button">
              <button type="button" className="teams-button teams-button-primary" onClick={onAddUsers}>
                <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
                Add users
              </button>
              {add_menu_items.length > 0 ? (
                <TeamsMenuButton
                  aria_label="More ways to add"
                  className="teams-button teams-button-primary"
                  sections={[{ key: "add", items: add_menu_items }]}
                  width={200}
                >
                  <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
                </TeamsMenuButton>
              ) : null}
            </div>
          ) : null}
          <TeamsMenuButton
            aria_label="Team options"
            sections={[
              { key: "images", items: image_items },
              { key: "manage", items: manage_items },
              { key: "exit", items: exit_items },
            ]}
          >
            <MoreHorizontal size={20} strokeWidth={1.75} aria-hidden="true" />
          </TeamsMenuButton>
        </div>
      </div>

      <input ref={picture_input_ref} type="file" accept={ACCEPTED_IMAGES} hidden onChange={handleFile("picture")} />
      <input ref={cover_input_ref} type="file" accept={ACCEPTED_IMAGES} hidden onChange={handleFile("cover")} />
    </>
  );
};

export default TeamHeader;
