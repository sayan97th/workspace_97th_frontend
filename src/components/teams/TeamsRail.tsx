import React from "react";
import SearchField from "@/components/common/SearchField";
import { PlusIcon, TeamFolderIcon, TeamsIcon } from "@/icons/workspace-icons";
import { ALL_TEAMS_ID, type TeamsManagerApi } from "./useTeamsManager";

export type TeamsRailProps = {
  teams: TeamsManagerApi;
};

const railRowClass = (is_selected: boolean) =>
  `flex items-center gap-[10px] rounded-[9px] px-[10px] py-[9px] text-left transition-colors ${
    is_selected ? "bg-white/[0.08]" : "hover:bg-white/[0.06]"
  }`;

/**
 * Left rail of the Teams view: search, the "All teams" master row, and one row per team.
 * Fully driven by {@link useTeamsManager}'s output so it stays presentational.
 */
const TeamsRail: React.FC<TeamsRailProps> = ({ teams }) => (
  <div className="flex w-[280px] flex-none flex-col border-r border-white/[0.07] bg-[#0F1C1C]">
    <div className="flex items-center justify-between gap-2.5 px-[18px] pb-3.5 pt-[22px]">
      <div>
        <div className="text-[18px] font-extrabold tracking-[-0.01em] text-[#e9eded]">Teams</div>
        <div className="mt-0.5 text-[12.5px] text-[#8a9495]">
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
            teams.is_all_selected ? "text-[#f2f5f5]" : "text-[#d7dcdc]"
          }`}
        >
          All teams
        </span>
        <span className="text-[12px] text-[#7e8889]">{teams.total_team_count}</span>
      </button>

      {teams.team_rows.map((row) => (
        <button key={row.id} type="button" onClick={row.select} className={railRowClass(row.is_selected)}>
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/[0.06] text-[#8a9495]">
            <TeamFolderIcon size={14} />
          </span>
          <span
            className={`min-w-0 flex-1 truncate text-[13.5px] font-medium ${
              row.is_selected ? "text-[#f2f5f5]" : "text-[#d7dcdc]"
            }`}
          >
            {row.name}
          </span>
          <span className="text-[12px] text-[#7e8889]">{row.member_count}</span>
        </button>
      ))}
    </div>

    <div className="border-t border-white/[0.07] px-4 py-3">
      <button
        type="button"
        onClick={teams.openCreateTeam}
        className="flex items-center gap-2 text-[12.5px] font-semibold text-[#9aa4a5] transition-colors hover:text-[#d7dcdc]"
      >
        <PlusIcon size={12} />
        New team
      </button>
    </div>
  </div>
);

export default TeamsRail;
