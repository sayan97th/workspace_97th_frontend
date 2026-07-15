"use client";
import React, { useEffect } from "react";
import SearchField from "@/components/common/SearchField";
import { TEAMS_ROSTER, TEAMS_SEED } from "@/data/teams-data";
import { CloseIcon } from "@/icons/board-icons";
import CreateTeamModal from "./CreateTeamModal";
import TeamMembersTable from "./TeamMembersTable";
import TeamsRail from "./TeamsRail";
import type { Team, TeamMember } from "./types";
import { useTeamsManager } from "./useTeamsManager";

export type TeamsModalProps = {
  is_open: boolean;
  onClose: () => void;
  /** Seed teams shown in the rail. Defaults to the account's Teams directory. */
  teams?: Team[];
  /** Full people directory the teams draw members from. Defaults to the account's Teams directory. */
  members?: TeamMember[];
};

const tabButtonClass = (is_active: boolean) =>
  `border-b-2 pb-[11px] text-[13.5px] font-semibold transition-colors ${
    is_active ? "border-brand-500 text-shell-text" : "border-transparent text-shell-text-muted hover:text-shell-text-secondary"
  }`;

/**
 * Account-wide "Teams" browser opened from {@link AccountMenu}'s Teams entry: a left rail
 * of teams (search + "All teams") and a right panel with Users/Content tabs for the
 * selected team. Composes {@link useTeamsManager} with {@link TeamsRail},
 * {@link TeamMembersTable} and {@link CreateTeamModal}, so a future "team picker" elsewhere
 * in the app can reuse the same pieces instead of this whole dialog.
 */
const TeamsModal: React.FC<TeamsModalProps> = ({
  is_open,
  onClose,
  teams: initial_teams = TEAMS_SEED,
  members = TEAMS_ROSTER,
}) => {
  const teams = useTeamsManager({ teams: initial_teams, members });

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      // Let the nested "Create new team" dialog handle Escape first — otherwise one
      // press would close both dialogs since each has its own window keydown listener.
      if (event.key === "Escape" && !teams.is_create_team_open) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previous_overflow;
    };
  }, [is_open, onClose, teams.is_create_team_open]);

  if (!is_open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Teams"
      className="fixed inset-0 z-[300] flex items-center justify-center p-6"
    >
      <div className="absolute inset-0 bg-[#060e0e]/[0.62]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[301] flex h-[760px] max-h-[92vh] w-[1240px] max-w-full overflow-hidden rounded-[18px] border border-shell-border-strong bg-shell-panel text-shell-text shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-[30px] w-[30px] items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover"
        >
          <CloseIcon size={15} />
        </button>

        <TeamsRail teams={teams} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-none px-[26px] pt-[22px]">
            <div className="text-[20px] font-extrabold tracking-[-0.01em]">{teams.panel_title}</div>
            <div className="mt-[3px] text-[12.5px] text-shell-text-muted">{teams.panel_subtitle}</div>
            <div className="mt-[18px] flex gap-[22px] border-b border-shell-border">
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
              <div className="flex-none px-[26px] pt-[14px]">
                <SearchField
                  value={teams.user_query}
                  onChange={teams.setUserQuery}
                  placeholder="Search people"
                  className="max-w-[280px]"
                />
              </div>
              <div className="shell-scrollbar min-h-0 flex-1 overflow-y-auto px-[26px] pb-6 pt-[10px]">
                <TeamMembersTable members={teams.visible_members} />
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
    </div>
  );
};

export default TeamsModal;
