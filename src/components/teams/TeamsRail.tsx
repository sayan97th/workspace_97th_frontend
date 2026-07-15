import React from "react";
import SearchField from "@/components/common/SearchField";
import { PlusIcon, TeamFolderIcon, TeamsIcon } from "@/icons/workspace-icons";
import { ALL_TEAMS_ID, type TeamsManagerApi } from "./useTeamsManager";

export type TeamsRailProps = {
  teams: TeamsManagerApi;
};

const railRowClass = (is_selected: boolean) =>
  `flex items-center gap-[10px] rounded-[9px] px-[10px] py-[9px] text-left transition-colors ${
    is_selected ? "bg-shell-hover-strong" : "hover:bg-shell-hover"
  }`;

/**
 * Left rail of the Teams view: search, the "All teams" master row, and one row per team.
 * Fully driven by {@link useTeamsManager}'s output so it stays presentational.
 */
const TeamsRail: React.FC<TeamsRailProps> = ({ teams }) => (
  <div className="flex w-[280px] flex-none flex-col border-r border-shell-border bg-shell-panel-alt">
    <div className="flex items-center justify-between gap-2.5 px-[18px] pb-3.5 pt-[22px]">
      <div>
        <div className="text-[18px] font-extrabold tracking-[-0.01em] text-shell-text">Teams</div>
        <div className="mt-0.5 text-[12.5px] text-shell-text-muted">
          {teams.total_team_count} teams in this account
        </div>
      </div>
      <button
        type="button"
        onClick={teams.openCreateTeam}
        className="flex flex-none items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600"
      >
        <PlusIcon size={11} />
        New team
      </button>
    </div>

    <div className="px-3.5 pb-3">
      <SearchField value={teams.team_query} onChange={teams.setTeamQuery} placeholder="Search teams" />
    </div>

    <div className="shell-scrollbar flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 pb-3.5">
      <button type="button" onClick={() => teams.selectTeam(ALL_TEAMS_ID)} className={railRowClass(teams.is_all_selected)}>
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-brand-500/[0.16] text-brand-200">
          <TeamsIcon size={14} />
        </span>
        <span
          className={`flex-1 truncate text-[13.5px] font-semibold ${
            teams.is_all_selected ? "text-shell-text" : "text-shell-text-secondary"
          }`}
        >
          All teams
        </span>
        <span className="text-[12px] text-shell-text-faint">{teams.total_team_count}</span>
      </button>

      {teams.team_rows.map((row) => (
        <button key={row.id} type="button" onClick={row.select} className={railRowClass(row.is_selected)}>
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-shell-hover text-shell-text-muted">
            <TeamFolderIcon size={14} />
          </span>
          <span
            className={`min-w-0 flex-1 truncate text-[13.5px] font-medium ${
              row.is_selected ? "text-shell-text" : "text-shell-text-secondary"
            }`}
          >
            {row.name}
          </span>
          <span className="text-[12px] text-shell-text-faint">{row.member_count}</span>
        </button>
      ))}
    </div>

    <div className="border-t border-shell-border px-4 py-3">
      <button
        type="button"
        onClick={teams.openCreateTeam}
        className="flex items-center gap-2 text-[12.5px] font-semibold text-shell-text-muted transition-colors hover:text-shell-text-secondary"
      >
        <PlusIcon size={12} />
        New team
      </button>
    </div>
  </div>
);

export default TeamsRail;
