"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, UserPlus, UserRound, X } from "lucide-react";
import { Pagination } from "@/components/content";
import InviteUserModal from "@/components/administration/InviteUserModal";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { readWorkspacePath } from "@/layout/sidebar-routes";
import { accountTeamsService } from "@/services/account-teams.service";
import AddTeamBoardsModal from "./AddTeamBoardsModal";
import AddTeamMembersModal from "./AddTeamMembersModal";
import AllUsersTable from "./AllUsersTable";
import CreateTeamModal from "./CreateTeamModal";
import TeamContentTab from "./TeamContentTab";
import TeamHeader from "./TeamHeader";
import TeamMembersTable from "./TeamMembersTable";
import TeamSubTeamsTab from "./TeamSubTeamsTab";
import TeamsRail from "./TeamsRail";
import type { TeamsTabId } from "./types";
import { useTeamBoards } from "./useTeamBoards";
import { useTeamInvite } from "./useTeamInvite";
import { useTeamRoster } from "./useTeamRoster";
import { useTeamsManager } from "./useTeamsManager";
import "@/components/administration/administration.css";
import "./teams.css";

/** Where the close button leads when the page was opened from Administration (`?from=/administration...`). */
const ADMINISTRATION_PREFIX = "/administration";

/**
 * The Teams page, mounted at `/teams` without the workspace sidebar and styled after monday.com's
 * Teams directory: {@link TeamsRail} on the left, and on the right either "All users" (everyone
 * with the teams they belong to) or one team with its cover, picture, Users / Sub-teams / Content
 * tabs and the actions the viewer is allowed to take. Opened from the account menu or from
 * Administration's Directory, the close button returns to where the user came from.
 *
 * State lives in {@link useTeamsManager} (teams, selection, dialogs), {@link useTeamRoster}
 * (Users tab and All users), {@link useTeamBoards} (Content tab) and {@link useTeamInvite}, so the
 * components below stay presentational.
 */
const TeamsView: React.FC = () => {
  const router = useRouter();
  const search_params = useSearchParams();
  const teams = useTeamsManager();
  const team = teams.selected_team;
  const roster = useTeamRoster({ team, viewer_id: teams.viewer_id, onTeamUpdated: teams.applyUpdatedTeam });
  const content = useTeamBoards({ team, is_active: teams.active_tab === "content", onTeamUpdated: teams.applyUpdatedTeam });
  const invite = useTeamInvite();
  const [tab_query, setTabQuery] = useState("");
  const [all_users_total, setAllUsersTotal] = useState<number | null>(null);

  const active_tab: TeamsTabId = team ? teams.active_tab : "users";
  const is_unknown_team = teams.selected_team_id !== null && !team && !teams.is_loading_teams;

  useEffect(() => {
    setTabQuery("");
  }, [teams.selected_team_id, active_tab]);

  // Opened straight on a team, the rail's "All users" badge still needs a total.
  useEffect(() => {
    accountTeamsService
      .getAllMembers({ per_page: 1 })
      .then((result) => setAllUsersTotal((current) => current ?? result.total))
      .catch(() => undefined);
  }, []);

  // The rail's "All users" badge keeps the last total seen without a search.
  useEffect(() => {
    if (teams.is_all_users && !roster.is_loading && roster.user_query.trim() === "") setAllUsersTotal(roster.total);
  }, [teams.is_all_users, roster.is_loading, roster.user_query, roster.total]);

  const closePage = () => {
    const from = search_params.get("from");
    router.push(from && from.startsWith(ADMINISTRATION_PREFIX) ? from : readWorkspacePath());
  };

  const search_value = active_tab === "users" ? roster.user_query : tab_query;
  const setSearchValue = active_tab === "users" ? roster.setUserQuery : setTabQuery;

  const tabs: { id: TeamsTabId; label: string; count: number }[] = team
    ? [
        { id: "users", label: "Users", count: team.member_count },
        { id: "sub_teams", label: "Sub-teams", count: teams.sub_teams.length },
        { id: "content", label: "Content", count: team.board_count },
      ]
    : [];

  const search_box = (
    <label className="teams-search-box">
      <input
        value={search_value}
        onChange={(event) => setSearchValue(event.target.value)}
        placeholder={active_tab === "users" ? "Search by name or email" : active_tab === "content" ? "Search boards" : "Search sub-teams"}
        aria-label="Search"
      />
      <Search size={18} strokeWidth={1.5} aria-hidden="true" />
    </label>
  );

  const renderRoster = () => {
    if (roster.is_loading) return <div className="teams-table-empty">Loading users...</div>;
    if (roster.error) return <div className="teams-notice teams-notice-error">{roster.error}</div>;
    const empty_label = roster.user_query.trim() ? "No users match your search." : team ? "No users on this team yet." : "No users yet.";
    return (
      <>
        {team ? (
          <TeamMembersTable
            members={roster.members}
            viewer_id={teams.viewer_id}
            empty_label={empty_label}
            can_manage_owners={roster.can_manage_owners}
            owner_saving_id={roster.owner_saving_id}
            onToggleOwner={(member) => void roster.toggleTeamOwner(member)}
            canRemoveMember={roster.canRemoveMember}
            onRemoveMember={roster.requestRemoveMember}
            onLeave={() => teams.requestLeaveTeam(team)}
          />
        ) : (
          <AllUsersTable members={roster.members} empty_label={empty_label} onOpenTeam={(team_id) => teams.selectTeam(team_id)} />
        )}
        <Pagination
          current_page={roster.page}
          last_page={roster.last_page}
          total={roster.total}
          per_page={roster.per_page}
          onPageChange={roster.setPage}
        />
      </>
    );
  };

  const renderTeamPanel = () => {
    if (!team) return null;
    return (
      <>
        <TeamHeader team={team} teams={teams} onAddUsers={roster.openAddUsers} onInvite={invite.openInvite} />
        <div className="teams-toolbar">
          <div className="teams-tabs" role="tablist" aria-label={`${team.name} sections`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active_tab === tab.id}
                className="teams-tab"
                onClick={() => teams.setActiveTab(tab.id)}
              >
                {tab.label} / {tab.count}
              </button>
            ))}
          </div>
          {search_box}
        </div>
        <div className="teams-panel-body" role="tabpanel">
          {active_tab === "users" ? (
            <>
              {!team.can_manage_members ? (
                <div className="teams-notice">Only admins and this team&apos;s owners can change who is on it.</div>
              ) : null}
              {renderRoster()}
            </>
          ) : active_tab === "sub_teams" ? (
            <TeamSubTeamsTab team={team} teams={teams} query={tab_query} />
          ) : (
            <TeamContentTab team={team} content={content} query={tab_query} />
          )}
        </div>
      </>
    );
  };

  const renderAllUsers = () => (
    <>
      <div className="teams-page-heading">
        <h2 className="teams-page-title">All users</h2>
        {teams.is_admin ? (
          <div className="flex items-center gap-2">
            <Link href="/administration?section=users" className="teams-button teams-button-secondary teams-button-sm">
              <UserRound size={16} strokeWidth={1.75} aria-hidden="true" />
              Manage users
            </Link>
            <button type="button" className="teams-button teams-button-secondary teams-button-sm" onClick={invite.openInvite}>
              <UserPlus size={16} strokeWidth={1.75} aria-hidden="true" />
              Invite
            </button>
          </div>
        ) : null}
      </div>
      <div className="teams-toolbar" style={{ paddingTop: 16 }}>
        {search_box}
        <span className="teams-muted">
          {roster.total} {roster.total === 1 ? "user" : "users"} across {roster.team_count}{" "}
          {roster.team_count === 1 ? "team" : "teams"}
        </span>
      </div>
      <div className="teams-panel-body">{renderRoster()}</div>
    </>
  );

  const pending = teams.pending_action;

  return (
    <div className="teams-shell teams-theme">
      <TeamsRail teams={teams} all_users_total={all_users_total} />

      <main className="teams-main shell-scrollbar" aria-label={team ? team.name : "All users"}>
        <button
          type="button"
          onClick={closePage}
          className={`teams-close${team ? " teams-close-on-cover" : ""}`}
          aria-label="Close Teams"
        >
          <X size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>

        {is_unknown_team ? (
          <div className="teams-empty-state" style={{ marginTop: 80 }}>
            <strong>This team doesn&apos;t exist anymore</strong>
            <span>It may have been deleted. Pick another team from the list.</span>
            <button type="button" className="teams-button teams-button-secondary mt-2" onClick={() => teams.selectTeam(null)}>
              Show all users
            </button>
          </div>
        ) : team ? (
          renderTeamPanel()
        ) : teams.selected_team_id ? (
          <div className="teams-table-empty">Loading team...</div>
        ) : (
          renderAllUsers()
        )}
      </main>

      <CreateTeamModal teams={teams} />
      <AddTeamMembersModal team={team} roster={roster} />
      <AddTeamBoardsModal team={team} content={content} />
      <div className="administration-theme">
        <InviteUserModal users={invite} />
      </div>

      <ConfirmActionModal
        is_open={pending !== null}
        title={pending?.kind === "delete" ? "Delete team?" : "Leave team?"}
        description={
          pending?.kind === "delete"
            ? `"${pending.team.name}" will be deleted for everyone.`
            : `You will no longer be a member of "${pending?.team.name}".`
        }
        risk_items={
          pending?.kind === "delete"
            ? [
                "Its sub-teams move up a level, they are not deleted.",
                "Members keep access to the boards the team joined.",
              ]
            : pending?.team.is_viewer_owner
              ? ["You also stop being one of its owners."]
              : undefined
        }
        confirm_label={pending?.kind === "delete" ? "Delete team" : "Leave team"}
        variant={pending?.kind === "delete" ? "danger" : "warning"}
        onConfirm={teams.confirmPendingAction}
        onClose={teams.cancelPendingAction}
      />

      <ConfirmActionModal
        is_open={roster.member_pending_remove !== null}
        title="Remove from team?"
        description={`${roster.member_pending_remove?.name} will be removed from "${team?.name}". They keep access to the boards the team joined.`}
        confirm_label="Remove"
        variant="danger"
        onConfirm={roster.confirmRemoveMember}
        onClose={roster.cancelRemoveMember}
      />
    </div>
  );
};

export default TeamsView;
