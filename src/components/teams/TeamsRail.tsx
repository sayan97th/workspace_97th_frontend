"use client";
import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Filter, MoreHorizontal, Plus, Search, Users, X } from "lucide-react";
import ActionMenu from "@/components/ui/dropdown/ActionMenu";
import TeamAvatar from "./TeamAvatar";
import TeamsMenuButton from "./TeamsMenuButton";
import { TEAMS_FILTER_LABELS, type TeamRow, type TeamsManagerApi } from "./useTeamsManager";
import type { TeamsFilterId } from "./types";

export type TeamsRailProps = {
  teams: TeamsManagerApi;
  /** Total of "All users", shown in its badge once known. */
  all_users_total: number | null;
};

const FILTER_IDS: TeamsFilterId[] = ["all", "member", "owner", "guests"];

/** Indent per sub-team level, in pixels. */
const DEPTH_INDENT = 20;

/**
 * Left rail of the Teams page, monday.com style: the "Teams" title, the New team / Filter teams /
 * Search teams actions, "All users", then every team with its member count badge. Sub-teams nest
 * under their parent behind a chevron, while searching or filtering the matches list flat.
 */
const TeamsRail: React.FC<TeamsRailProps> = ({ teams, all_users_total }) => {
  const [is_search_open, setIsSearchOpen] = useState(false);
  const [is_filter_open, setIsFilterOpen] = useState(false);
  const filter_button_ref = useRef<HTMLButtonElement>(null);
  const search_input_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (is_search_open) search_input_ref.current?.focus();
  }, [is_search_open]);

  const closeSearch = () => {
    teams.setTeamQuery("");
    setIsSearchOpen(false);
  };

  const renderRow = (row: TeamRow) => {
    const { team } = row;
    return (
      // div[role=button], not <button>: it nests the chevron and the options menu's own buttons.
      <div
        key={team.id}
        role="button"
        tabIndex={0}
        aria-current={row.is_selected ? "true" : undefined}
        onClick={() => teams.selectTeam(team.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            teams.selectTeam(team.id);
          }
        }}
        className="teams-rail-row"
        style={{ paddingLeft: 8 + row.depth * DEPTH_INDENT }}
      >
        {row.has_children ? (
          <button
            type="button"
            className="teams-rail-chevron"
            aria-expanded={row.is_expanded}
            aria-label={row.is_expanded ? `Hide sub-teams of ${team.name}` : `Show sub-teams of ${team.name}`}
            onClick={(event) => {
              event.stopPropagation();
              teams.toggleExpanded(team.id);
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : teams.is_filtering || !teams.has_nested_teams ? null : (
          <span className="teams-rail-chevron-spacer" aria-hidden="true" />
        )}
        <TeamAvatar name={team.name} picture_url={team.picture_url} size={26} />
        <span className="teams-rail-name" title={team.name}>
          {team.name}
        </span>
        {team.can_manage ? (
          <TeamsMenuButton
            aria_label={`${team.name} options`}
            className="teams-icon-button teams-icon-button-sm teams-row-options"
            width={200}
            sections={[
              {
                key: "manage",
                items: [
                  { key: "edit", label: "Edit team", onClick: () => teams.openEditTeam(team) },
                  { key: "sub_team", label: "Add sub-team", onClick: () => teams.openCreateTeam(team.id) },
                ],
              },
              { key: "danger", items: [{ key: "delete", label: "Delete team", danger: true, onClick: () => teams.requestDeleteTeam(team) }] },
            ]}
          >
            <MoreHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
          </TeamsMenuButton>
        ) : null}
        <span className="teams-count-badge" aria-label={`${team.member_count} members`}>
          {team.member_count}
        </span>
      </div>
    );
  };

  return (
    <aside className="teams-rail" aria-label="Teams">
      <h1 className="teams-rail-title">Teams</h1>

      {teams.can_create_teams ? (
        <button type="button" className="teams-rail-action" onClick={() => teams.openCreateTeam()}>
          <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
          New team
        </button>
      ) : null}

      <button
        ref={filter_button_ref}
        type="button"
        className="teams-rail-action"
        aria-haspopup="menu"
        aria-expanded={is_filter_open}
        onClick={() => setIsFilterOpen((open) => !open)}
      >
        <Filter size={18} strokeWidth={1.5} aria-hidden="true" />
        Filter teams
        {teams.filter !== "all" ? <span className="teams-rail-action-badge">{TEAMS_FILTER_LABELS[teams.filter]}</span> : null}
      </button>
      <ActionMenu
        anchor_el={filter_button_ref.current}
        is_open={is_filter_open}
        onClose={() => setIsFilterOpen(false)}
        aria_label="Filter teams"
        width={240}
        align="start"
        sections={[
          {
            key: "filters",
            items: FILTER_IDS.map((filter_id) => ({
              key: filter_id,
              label: TEAMS_FILTER_LABELS[filter_id],
              icon: teams.filter === filter_id ? <Check size={16} strokeWidth={2} /> : <span className="inline-block w-4" />,
              onClick: () => teams.setFilter(filter_id),
            })),
          },
        ]}
      />

      {is_search_open || teams.team_query ? (
        <div className="teams-search-field">
          <Search size={18} strokeWidth={1.5} aria-hidden="true" className="teams-muted" />
          <input
            ref={search_input_ref}
            value={teams.team_query}
            onChange={(event) => teams.setTeamQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeSearch();
            }}
            onBlur={() => {
              if (!teams.team_query) setIsSearchOpen(false);
            }}
            placeholder="Search teams"
            aria-label="Search teams"
          />
          <button type="button" className="teams-icon-button teams-icon-button-sm" onClick={closeSearch} aria-label="Clear search">
            <X size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button type="button" className="teams-rail-action" onClick={() => setIsSearchOpen(true)}>
          <Search size={18} strokeWidth={1.5} aria-hidden="true" />
          Search teams
        </button>
      )}

      <div className="teams-rail-divider" />

      <div className="teams-rail-list shell-scrollbar">
        <div
          role="button"
          tabIndex={0}
          aria-current={teams.is_all_users ? "true" : undefined}
          onClick={() => teams.selectTeam(null)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              teams.selectTeam(null);
            }
          }}
          className="teams-rail-row"
        >
          <span className="teams-avatar" style={{ width: 26, height: 26, background: "transparent" }}>
            <Users size={18} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span className="teams-rail-name">All users</span>
          {all_users_total !== null ? <span className="teams-count-badge">{all_users_total}</span> : null}
        </div>

        {teams.is_loading_teams ? (
          <div className="teams-rail-empty">Loading teams...</div>
        ) : teams.teams_error ? (
          <div className="teams-rail-empty">{teams.teams_error}</div>
        ) : teams.team_rows.length === 0 ? (
          <div className="teams-rail-empty">
            {teams.is_filtering ? "No teams match your search or filter." : "No teams yet."}
          </div>
        ) : (
          teams.team_rows.map(renderRow)
        )}
      </div>
    </aside>
  );
};

export default TeamsRail;
