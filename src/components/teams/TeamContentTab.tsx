"use client";
import React from "react";
import Link from "next/link";
import { LayoutGrid, Plus, X } from "lucide-react";
import type { Team, TeamBoard } from "./types";
import type { TeamBoardsApi } from "./useTeamBoards";

export type TeamContentTabProps = {
  team: Team;
  content: TeamBoardsApi;
  query: string;
};

export const BOARD_TYPE_LABELS: Record<TeamBoard["board_type"], string> = {
  main: "Main",
  private: "Private",
  shareable: "Shareable",
};

/**
 * A team's Content tab: the boards the team joined, each linking to the board. Admins and team
 * owners add boards (every member gets access) and take boards off the list.
 */
const TeamContentTab: React.FC<TeamContentTabProps> = ({ team, content, query }) => {
  const trimmed_query = query.trim().toLowerCase();
  const rows = trimmed_query
    ? content.boards.filter(
        (board) => board.name.toLowerCase().includes(trimmed_query) || (board.workspace?.name ?? "").toLowerCase().includes(trimmed_query)
      )
    : content.boards;

  if (content.is_loading) return <div className="teams-table-empty">Loading boards...</div>;
  if (content.error) return <div className="teams-notice teams-notice-error">{content.error}</div>;

  if (content.boards.length === 0) {
    return (
      <div className="teams-empty-state">
        <LayoutGrid size={40} strokeWidth={1.25} aria-hidden="true" />
        <strong>No boards yet</strong>
        <span>
          Add the boards {team.name} works on. Everyone on the team gets access to them
          {team.allow_guests ? ", and since this team has guests, only shareable boards can be added." : "."}
        </span>
        {team.can_manage_members ? (
          <button type="button" className="teams-button teams-button-primary mt-2" onClick={content.openAddBoards}>
            <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
            Add boards
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {team.can_manage_members ? (
        <div className="mb-2 flex justify-end">
          <button type="button" className="teams-button teams-button-secondary teams-button-sm" onClick={content.openAddBoards}>
            <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
            Add boards
          </button>
        </div>
      ) : null}
      <table className="teams-table">
        <thead>
          <tr>
            <th style={{ width: "44%" }}>Board</th>
            <th className="teams-hide-sm">Workspace</th>
            <th style={{ width: 140 }}>Type</th>
            <th style={{ width: 56 }}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((board) => (
            <tr key={board.id}>
              <td>
                <div className="teams-person">
                  <LayoutGrid size={20} strokeWidth={1.5} aria-hidden="true" className="flex-none teams-muted" />
                  <Link href={`/boards/${board.id}`} className="teams-link">
                    {board.name}
                  </Link>
                </div>
              </td>
              <td className="teams-hide-sm">
                <div className="teams-cell-truncate teams-muted">{board.workspace?.name ?? "No workspace"}</div>
              </td>
              <td>
                <span className="teams-pill">{BOARD_TYPE_LABELS[board.board_type]}</span>
              </td>
              <td>
                <div className="teams-row-actions">
                  {team.can_manage_members ? (
                    <button
                      type="button"
                      className="teams-icon-button"
                      onClick={() => void content.removeBoard(board)}
                      disabled={content.removing_id === board.id}
                      aria-label={`Remove ${board.name} from ${team.name}`}
                      title="Remove from team"
                    >
                      <X size={16} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="teams-table-empty">
                No boards match your search.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </>
  );
};

export default TeamContentTab;
