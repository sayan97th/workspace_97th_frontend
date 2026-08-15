"use client";
import React from "react";
import { useRouter } from "next/navigation";
import SearchField from "@/components/common/SearchField";
import { Pagination } from "@/components/content";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { ChevronRightIcon, PlusIcon } from "@/icons/workspace-icons";
import AddTeamMembersModal from "./AddTeamMembersModal";
import CreateTeamModal from "./CreateTeamModal";
import TeamMembersTable from "./TeamMembersTable";
import TeamsRail from "./TeamsRail";
import { useTeamsManager } from "./useTeamsManager";

const tabButtonClass = (is_active: boolean) =>
  `border-b-2 pb-[11px] text-[13.5px] font-semibold transition-colors ${
    is_active ? "border-brand-500 text-shell-text" : "border-transparent text-shell-text-muted hover:text-shell-text-secondary"
  }`;

/**
 * "Teams" page, mounted at `/teams`. Replaces the old floating `TeamsModal` dialog with a
 * full route: the same left rail ({@link TeamsRail}) and Users/Content roster panel, still
 * driven entirely by {@link useTeamsManager}, now filling the admin shell's content area
 * instead of a centered overlay. Nested action dialogs ({@link CreateTeamModal},
 * {@link AddTeamMembersModal}, the delete/remove confirmations) stay real modals, they are
 * short-lived flows layered on top of the view, not the view itself.
 */
const TeamsView: React.FC = () => {
  const router = useRouter();
  const teams = useTeamsManager();

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden bg-shell-bg text-shell-text">
      <div className="flex flex-none items-center gap-3 border-b border-shell-border px-6 py-3.5">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-shell-text-muted transition-colors hover:text-shell-text"
        >
          <ChevronRightIcon className="rotate-180" size={11} />
          Back
        </button>
        <span className="h-4 w-px bg-shell-border" aria-hidden="true" />
        <span className="text-[13px] font-medium text-shell-text-muted">Teams directory</span>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <TeamsRail teams={teams} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-none px-[30px] pt-7">
            <div className="text-[22px] font-extrabold tracking-[-0.01em]">{teams.panel_title}</div>
            <div className="mt-[3px] text-[13px] text-shell-text-muted">{teams.panel_subtitle}</div>
            <div className="mt-5 flex gap-[22px] border-b border-shell-border">
              <button type="button" onClick={() => teams.setActiveTab("users")} className={tabButtonClass(teams.active_tab === "users")}>
                Users
              </button>
              <button type="button" onClick={() => teams.setActiveTab("content")} className={tabButtonClass(teams.active_tab === "content")}>
                Content
              </button>
            </div>
          </div>

          {teams.active_tab === "users" ? (
            <>
              <div className="flex flex-none items-center justify-between gap-3 px-[30px] pt-[16px]">
                <SearchField
                  value={teams.user_query}
                  onChange={teams.setUserQuery}
                  placeholder="Search people"
                  className="max-w-[280px]"
                />
                {!teams.is_all_selected ? (
                  <button
                    type="button"
                    onClick={teams.openAddMembers}
                    className="flex flex-none items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600"
                  >
                    <PlusIcon size={11} />
                    Add members
                  </button>
                ) : null}
              </div>
              <div className="shell-scrollbar min-h-0 flex-1 overflow-y-auto px-[30px] pb-8 pt-[10px]">
                {teams.is_loading_members ? (
                  <div className="px-[10px] py-10 text-center text-[13px] text-shell-text-faint">
                    Loading people…
                  </div>
                ) : teams.members_error ? (
                  <div className="px-[10px] py-10 text-center text-[13px] text-brand-200">
                    {teams.members_error}
                  </div>
                ) : (
                  <>
                    <TeamMembersTable
                      members={teams.visible_members}
                      onRemoveMember={teams.is_all_selected ? undefined : teams.requestRemoveMember}
                    />
                    <Pagination
                      current_page={teams.page}
                      last_page={teams.last_page}
                      total={teams.total_members}
                      per_page={teams.per_page}
                      onPageChange={teams.setPage}
                    />
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 text-shell-text-faint">
              <span className="flex-none text-shell-text-faint">
                <svg width="34" height="34" viewBox="0 0 16 16" fill="none">
                  <rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2.5 6 H13.5" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </span>
              <div className="text-[13.5px]">No boards owned by this team yet</div>
            </div>
          )}
        </div>
      </div>

      <CreateTeamModal teams={teams} />
      <AddTeamMembersModal teams={teams} />

      <ConfirmActionModal
        is_open={teams.team_pending_delete !== null}
        title="Delete team"
        description={`"${teams.team_pending_delete?.name}" will be permanently deleted. This can't be undone.`}
        confirm_label="Delete team"
        danger
        onConfirm={teams.confirmDeleteTeam}
        onClose={teams.cancelDeleteTeam}
      />

      <ConfirmActionModal
        is_open={teams.member_pending_remove !== null}
        title="Remove member"
        description={`"${teams.member_pending_remove?.name}" will be removed from "${teams.selected_team?.name}".`}
        confirm_label="Remove"
        danger
        onConfirm={teams.confirmRemoveMember}
        onClose={teams.cancelRemoveMember}
      />
    </div>
  );
};

export default TeamsView;
