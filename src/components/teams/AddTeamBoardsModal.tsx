"use client";
import React from "react";
import { Check, LayoutGrid, Search } from "lucide-react";
import TeamModal from "./TeamModal";
import { BOARD_TYPE_LABELS } from "./TeamContentTab";
import type { Team } from "./types";
import type { TeamBoardsApi } from "./useTeamBoards";

export type AddTeamBoardsModalProps = {
  team: Team | null;
  content: TeamBoardsApi;
};

/**
 * "Add boards" for a team's Content tab: search boards by name and tick the ones the team should
 * join. Every member gets access to the boards added. A team with guests only sees shareable boards.
 */
const AddTeamBoardsModal: React.FC<AddTeamBoardsModalProps> = ({ team, content }) => (
  <TeamModal
    is_open={content.is_add_open && team !== null}
    title="Add boards"
    is_compact
    onClose={content.closeAddBoards}
    footer={
      <>
        <button type="button" className="teams-button teams-button-tertiary" onClick={content.closeAddBoards}>
          Cancel
        </button>
        <button
          type="button"
          className="teams-button teams-button-primary"
          onClick={() => void content.submitAddBoards()}
          disabled={!content.can_submit}
        >
          {content.is_submitting
            ? "Adding..."
            : content.selected_ids.length > 0
              ? `Add ${content.selected_ids.length} ${content.selected_ids.length === 1 ? "board" : "boards"}`
              : "Add"}
        </button>
      </>
    }
  >
    <p className="teams-muted">
      Everyone on {team?.name ?? "the team"} gets access to the boards you add.
      {team?.allow_guests ? " This team has guests, so only shareable boards are listed." : ""}
    </p>
    <div className="teams-search-box" style={{ width: "100%", height: 40 }}>
      <input
        value={content.candidate_query}
        onChange={(event) => content.setCandidateQuery(event.target.value)}
        placeholder="Search boards"
        aria-label="Search boards"
        autoFocus
      />
      <Search size={18} strokeWidth={1.5} aria-hidden="true" />
    </div>
    <div className="shell-scrollbar -mx-2 max-h-[320px] overflow-y-auto" role="listbox" aria-multiselectable="true" aria-label="Boards">
      {content.is_loading_candidates ? (
        <div className="teams-picker-empty">Loading boards...</div>
      ) : content.candidates.length === 0 ? (
        <div className="teams-picker-empty">
          {content.candidate_query ? "No boards match your search." : "There are no more boards this team can join."}
        </div>
      ) : (
        content.candidates.map((board) => {
          const is_selected = content.selected_ids.includes(board.id);
          return (
            <button
              key={board.id}
              type="button"
              role="option"
              aria-selected={is_selected}
              data-active={is_selected}
              className="teams-picker-option"
              onClick={() => content.toggleCandidate(board.id)}
            >
              <LayoutGrid size={18} strokeWidth={1.5} aria-hidden="true" className="flex-none teams-muted" />
              <span className="teams-picker-option-text">
                {board.name}
                {board.workspace ? <span className="teams-muted"> in {board.workspace.name}</span> : null}
              </span>
              <span className="teams-pill">{BOARD_TYPE_LABELS[board.board_type]}</span>
              <span className="inline-flex w-5 flex-none justify-center" aria-hidden="true">
                {is_selected ? <Check size={16} strokeWidth={2} /> : null}
              </span>
            </button>
          );
        })
      )}
    </div>
    {content.add_error ? <div className="teams-notice teams-notice-error">{content.add_error}</div> : null}
  </TeamModal>
);

export default AddTeamBoardsModal;
