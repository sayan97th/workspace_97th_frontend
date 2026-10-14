"use client";
import React, { useRef, useState } from "react";
import { CloseIcon } from "@/icons/board-icons";
import { HelpIcon, PersonIcon, SearchIcon, TeamsIcon } from "@/icons/workspace-icons";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import type { BoardToolbarApi, BoardToolbarViewActions } from "./types";
import BoardPopover from "./BoardPopover";
import SaveViewButtons from "./SaveViewButtons";
import SelectablePersonAvatar from "./SelectablePersonAvatar";
import ToolbarButton from "./ToolbarButton";
import "./filter-panel.css";
import "./toolbar-panel.css";

export type PersonControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  view_actions?: BoardToolbarViewActions;
};

const POPOVER_WIDTH = 440;

/**
 * Person button and its monday style "Filter by person" panel: a search box, optional "Look in" People column
 * pills, team pills and a grid of selectable avatars with item counts and a name tooltip. Styled by
 * `filter-panel.css` and `toolbar-panel.css`.
 */
function PersonControl<TRow>({ toolbar, view_actions }: PersonControlProps<TRow>) {
  const button_ref = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const is_open = toolbar.active_panel === "person";
  const trimmed_query = query.trim();
  const selected_count = toolbar.selected_person_ids.length + toolbar.selected_team_ids.length;
  const lowered_query = trimmed_query.toLowerCase();

  const filtered_persons = toolbar.persons.filter((person) => person.name.toLowerCase().includes(lowered_query));
  const filtered_teams = (toolbar.teams ?? []).filter((team) => team.name.toLowerCase().includes(lowered_query));

  // The People columns the filter can read. The picker only shows when there is a choice to make.
  const person_fields = (toolbar.person_field_ids ?? [])
    .map((id) => toolbar.filter_fields.find((field) => field.id === id))
    .filter((field): field is NonNullable<typeof field> => !!field);
  const picked_column_ids = toolbar.person_column_ids;
  const isColumnPicked = (id: string) => picked_column_ids === null || picked_column_ids.includes(id);
  const togglePersonColumn = (id: string) => {
    // From "All people columns", picking a column narrows the filter to just that one.
    if (picked_column_ids === null) {
      toolbar.setPersonColumnIds(person_fields.length === 1 ? null : [id]);
      return;
    }
    const next = picked_column_ids.includes(id) ? picked_column_ids.filter((existing) => existing !== id) : [...picked_column_ids, id];
    // Every column (or none) ticked means "all People columns", including ones added later.
    toolbar.setPersonColumnIds(next.length === 0 || next.length === person_fields.length ? null : next);
  };

  const handleClose = () => {
    toolbar.closePanel();
    setQuery("");
  };

  const summary_label =
    selected_count > 0
      ? `${selected_count} selected`
      : `${toolbar.persons.length} ${toolbar.persons.length === 1 ? "person" : "people"}${
          toolbar.teams?.length ? `, ${toolbar.teams.length} ${toolbar.teams.length === 1 ? "team" : "teams"}` : ""
        }`;

  return (
    <>
      <Tooltip content="Filter by person" className="flex">
        <ToolbarButton
          ref={button_ref}
          label="Person"
          Icon={PersonIcon}
          is_open={is_open}
          has_selection={selected_count > 0}
          variant="accent"
          badge_count={selected_count || undefined}
          onClick={() => toolbar.togglePanel("person")}
        />
      </Tooltip>
      <BoardPopover anchor_el={button_ref.current} is_open={is_open} onClose={handleClose} width={POPOVER_WIDTH} align="start" unstyled>
        <div className="filter-panel toolbar-panel" role="dialog" aria-label="Filter by person">
          <div className="filter-panel__header">
            <h2 className="filter-panel__title">Filter by person</h2>
            <Tooltip placement="bottom" content="Show only the items assigned to the people or teams you pick">
              <span className="filter-panel__help" tabIndex={0} aria-label="About the person filter">
                <HelpIcon size={16} />
              </span>
            </Tooltip>
            <div className="filter-panel__header-actions">
              <SaveViewButtons view_actions={view_actions} appearance="panel" is_save_as_new_disabled={selected_count === 0} />
            </div>
          </div>

          <label className="toolbar-panel__search">
            <SearchIcon size={15} />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name"
              aria-label="Search people and teams"
            />
            {trimmed_query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="filter-panel__search-clear">
                <CloseIcon size={11} />
              </button>
            )}
          </label>

          {person_fields.length > 1 && (
            <div className="toolbar-panel__pills" data-inset="true">
              <span className="toolbar-panel__pills-label">Look in</span>
              <button
                type="button"
                onClick={() => toolbar.setPersonColumnIds(null)}
                aria-pressed={picked_column_ids === null}
                className="toolbar-panel__pill"
              >
                All people columns
              </button>
              {person_fields.map((field) => (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => togglePersonColumn(field.id)}
                  aria-pressed={picked_column_ids !== null && isColumnPicked(field.id)}
                  title={field.label}
                  className="toolbar-panel__pill"
                >
                  <span className="toolbar-panel__pill-label">{field.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="toolbar-panel__list filter-panel__scroll">
            {filtered_teams.length > 0 && (
              <>
                <p className="toolbar-panel__section-title">Teams</p>
                <div className="toolbar-panel__pills">
                  {filtered_teams.map((team) => {
                    const member_label = `${team.member_ids.length} ${team.member_ids.length === 1 ? "member" : "members"}`;
                    return (
                      <button
                        key={team.id}
                        type="button"
                        title={member_label}
                        onClick={() => toolbar.toggleTeamId(team.id)}
                        aria-pressed={toolbar.selected_team_ids.includes(team.id)}
                        className="toolbar-panel__pill"
                      >
                        <TeamsIcon size={13} />
                        <span className="toolbar-panel__pill-label">{team.name}</span>
                        <span className="toolbar-panel__pill-count">{team.member_ids.length}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {filtered_persons.length > 0 ? (
              <>
                {filtered_teams.length > 0 && <p className="toolbar-panel__section-title">People</p>}
                <div className="toolbar-panel__people">
                  {filtered_persons.map((person) => {
                    const item_count = toolbar.person_counts[person.id] ?? 0;
                    return (
                      <div key={person.id} className="toolbar-panel__person">
                        <SelectablePersonAvatar
                          person={person}
                          size={40}
                          ring_color="var(--filter-panel-surface)"
                          accent_color="var(--filter-panel-primary)"
                          has_name_tooltip
                          is_selected={toolbar.selected_person_ids.includes(person.id)}
                          onToggle={() => toolbar.togglePersonId(person.id)}
                        />
                        {/* Items this person would show, given every other active filter. */}
                        <span className="toolbar-panel__person-count" title={`${item_count} ${item_count === 1 ? "item" : "items"}`}>
                          {item_count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : filtered_teams.length > 0 ? null : (
              <div className="toolbar-panel__empty">
                <PersonIcon size={24} />
                <span>{trimmed_query ? <>No people match &ldquo;{trimmed_query}&rdquo;</> : "No people on this board yet"}</span>
              </div>
            )}
          </div>

          <div className="toolbar-panel__footer">
            <span className="toolbar-panel__footer-note">{summary_label}</span>
            <button type="button" disabled={selected_count === 0} onClick={toolbar.clearPersonFilter} className="filter-panel__text-button">
              Clear selection
            </button>
          </div>
        </div>
      </BoardPopover>
    </>
  );
}

export default PersonControl;
