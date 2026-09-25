"use client";
import React, { useRef, useState } from "react";
import { CloseIcon } from "@/icons/board-icons";
import { InfoIcon, PersonIcon, SearchIcon, TeamsIcon } from "@/icons/workspace-icons";
import type { BoardToolbarApi, BoardToolbarViewActions } from "./types";
import BoardPopover from "./BoardPopover";
import SaveViewButtons from "./SaveViewButtons";
import SelectablePersonAvatar from "./SelectablePersonAvatar";
import ToolbarButton from "./ToolbarButton";

export type PersonControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  view_actions?: BoardToolbarViewActions;
};

const POPOVER_WIDTH = 430;

function PersonControl<TRow>({ toolbar, view_actions }: PersonControlProps<TRow>) {
  const button_ref = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [is_search_focused, setSearchFocused] = useState(false);
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

  return (
    <>
      <ToolbarButton
        ref={button_ref}
        label="Person"
        Icon={PersonIcon}
        is_open={is_open}
        has_selection={selected_count > 0}
        badge_count={selected_count || undefined}
        onClick={() => toolbar.togglePanel("person")}
      />
      <BoardPopover
        anchor_el={button_ref.current}
        is_open={is_open}
        onClose={handleClose}
        width={POPOVER_WIDTH}
        align="start"
      >
        <div className="flex items-center gap-2 px-[18px] pb-3 pt-4">
          <span className="text-[15px] font-bold text-boardtree-text">Filter this board by person</span>
          <span className="flex flex-none items-center text-boardtree-text-faint" title="People with access to this board">
            <InfoIcon size={15} />
          </span>
          <div className="flex-1" />
          <SaveViewButtons view_actions={view_actions} />
        </div>

        <div className="px-[18px] pb-3.5">
          <div
            className="flex h-[38px] items-center gap-[9px] rounded-[9px] border bg-boardtree-hover-strong px-3 transition-colors"
            style={{ borderColor: is_search_focused ? "var(--color-boardtree-accent)" : "var(--color-boardtree-border)" }}
          >
            <span className="flex flex-none items-center text-boardtree-text-faint">
              <SearchIcon size={15} />
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-boardtree-text placeholder:text-boardtree-text-faint focus:outline-none"
            />
            {trimmed_query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="flex flex-none items-center text-boardtree-text-faint hover:text-boardtree-text"
              >
                <CloseIcon size={13} />
              </button>
            ) : null}
          </div>
        </div>

        {person_fields.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 px-[18px] pb-3">
            <span className="mr-1 text-[12.5px] font-medium text-boardtree-text-muted">Look in</span>
            <button
              type="button"
              onClick={() => toolbar.setPersonColumnIds(null)}
              className={`h-7 rounded-full border px-2.5 text-[12.5px] font-medium ${
                picked_column_ids === null
                  ? "border-boardtree-accent bg-boardtree-accent/10 text-boardtree-text"
                  : "border-boardtree-border text-boardtree-text-secondary hover:bg-boardtree-hover"
              }`}
            >
              All people columns
            </button>
            {person_fields.map((field) => (
              <button
                key={field.id}
                type="button"
                onClick={() => togglePersonColumn(field.id)}
                aria-pressed={picked_column_ids !== null && isColumnPicked(field.id)}
                className={`h-7 max-w-[160px] truncate rounded-full border px-2.5 text-[12.5px] font-medium ${
                  picked_column_ids !== null && isColumnPicked(field.id)
                    ? "border-boardtree-accent bg-boardtree-accent/10 text-boardtree-text"
                    : "border-boardtree-border text-boardtree-text-secondary hover:bg-boardtree-hover"
                }`}
              >
                {field.label}
              </button>
            ))}
          </div>
        )}

        <div className="shell-scrollbar max-h-[320px] overflow-y-auto px-4 pb-1.5">
          {filtered_teams.length > 0 && (
            <div className="pb-3">
              <p className="px-0.5 pb-1.5 text-[12px] font-semibold text-boardtree-text-faint">Teams</p>
              <div className="flex flex-wrap gap-1.5">
                {filtered_teams.map((team) => {
                  const is_selected = toolbar.selected_team_ids.includes(team.id);
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => toolbar.toggleTeamId(team.id)}
                      aria-pressed={is_selected}
                      title={`${team.member_ids.length} ${team.member_ids.length === 1 ? "member" : "members"}`}
                      className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium ${
                        is_selected
                          ? "border-boardtree-accent bg-boardtree-accent/10 text-boardtree-text"
                          : "border-boardtree-border text-boardtree-text-secondary hover:bg-boardtree-hover"
                      }`}
                    >
                      <TeamsIcon size={13} />
                      <span className="max-w-[150px] truncate">{team.name}</span>
                      <span className="text-[11.5px] text-boardtree-text-faint">{team.member_ids.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {filtered_persons.length > 0 ? (
            <>
              {filtered_teams.length > 0 && <p className="px-0.5 pb-1.5 text-[12px] font-semibold text-boardtree-text-faint">People</p>}
              <div className="flex flex-wrap gap-2">
                {filtered_persons.map((person) => (
                  <div key={person.id} className="flex w-[48px] flex-col items-center gap-0.5">
                    <SelectablePersonAvatar
                      person={person}
                      is_selected={toolbar.selected_person_ids.includes(person.id)}
                      onToggle={() => toolbar.togglePersonId(person.id)}
                    />
                    {/* Items this person would show, given every other active filter. */}
                    <span className="text-[11px] font-medium text-boardtree-text-faint" title={`${toolbar.person_counts[person.id] ?? 0} items`}>
                      {toolbar.person_counts[person.id] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : filtered_teams.length > 0 ? null : (
            <div className="flex flex-col items-center gap-2 px-5 py-6 text-center">
              <span className="flex-none text-boardtree-text-faint">
                <PersonIcon size={24} />
              </span>
              <span className="text-[13px] text-boardtree-text-muted">No people match &ldquo;{trimmed_query}&rdquo;</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-b-xl border-t border-boardtree-border-soft bg-boardtree-hover px-[18px] py-[11px]">
          <span className="text-[12.5px] text-boardtree-text-muted">
            {selected_count === 0
              ? `${toolbar.persons.length} people${toolbar.teams?.length ? `, ${toolbar.teams.length} teams` : ""}`
              : `${selected_count} selected`}
          </span>
          {selected_count > 0 ? (
            <button
              type="button"
              onClick={toolbar.clearPersonFilter}
              className="text-[13px] font-semibold text-boardtree-text-secondary hover:text-boardtree-text"
            >
              Clear
            </button>
          ) : null}
        </div>
      </BoardPopover>
    </>
  );
}

export default PersonControl;
