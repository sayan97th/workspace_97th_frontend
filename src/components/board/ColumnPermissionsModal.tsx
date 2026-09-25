"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, CloseIcon, SearchIcon } from "@/icons/workspace-icons";
import { getApiErrorMessage } from "@/lib/api-error";
import { peopleService, type MentionTeamDto } from "@/services/people.service";
import type { BoardColumnDto, BoardColumnRestriction, UpdateBoardColumnPermissionsPayload } from "@/types/board-content";

export type ColumnPermissionsPerson = { id: number; full_name: string };

export type ColumnPermissionsModalProps = {
  is_open: boolean;
  onClose: () => void;
  board_id: number;
  column: BoardColumnDto | null;
  /** Everyone who can be picked, usually the board's workspace members. */
  people: ColumnPermissionsPerson[];
  onSave: (payload: UpdateBoardColumnPermissionsPayload) => Promise<void>;
};

type RestrictionKind = "view" | "edit";

type RestrictionDraft = { is_restricted: boolean; user_ids: number[]; team_ids: number[] };

const toDraft = (restriction: BoardColumnRestriction | null): RestrictionDraft => ({
  is_restricted: restriction !== null,
  user_ids: restriction?.user_ids ?? [],
  team_ids: restriction?.team_ids ?? [],
});

const toPayload = (draft: RestrictionDraft): BoardColumnRestriction | null =>
  draft.is_restricted ? { user_ids: draft.user_ids, team_ids: draft.team_ids } : null;

const toggleId = (ids: number[], id: number): number[] => (ids.includes(id) ? ids.filter((current) => current !== id) : [...ids, id]);

const SECTION_COPY: Record<RestrictionKind, { title: string; everyone: string; restricted: string }> = {
  view: {
    title: "Who can view this column",
    everyone: "Everyone on the board",
    restricted: "Only board owners and the people below. Everyone else will not see the column at all.",
  },
  edit: {
    title: "Who can edit this column",
    everyone: "Everyone who can edit the board",
    restricted: "Only board owners and the people below can change its values.",
  },
};

/**
 * Column menu's "Column permissions": restricts who can see and who can
 * change one column's values, like monday.com's column permissions. Board
 * owners always keep access. Enforced by `ColumnPermissionService` on the API.
 */
const ColumnPermissionsModal: React.FC<ColumnPermissionsModalProps> = ({ is_open, onClose, board_id, column, people, onSave }) => {
  const [drafts, setDrafts] = useState<Record<RestrictionKind, RestrictionDraft>>({ view: toDraft(null), edit: toDraft(null) });
  const [teams, setTeams] = useState<MentionTeamDto[]>([]);
  const [query, setQuery] = useState("");
  const [is_saving, setIsSaving] = useState(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!is_open || !column) return;
    setDrafts({ view: toDraft(column.view_restriction), edit: toDraft(column.edit_restriction) });
    setQuery("");
    setErrorMessage(null);
  }, [is_open, column]);

  useEffect(() => {
    if (!is_open) return;
    let cancelled = false;
    peopleService
      .listBoardTeams(board_id)
      .then((result) => !cancelled && setTeams(result))
      .catch(() => !cancelled && setTeams([]));
    return () => {
      cancelled = true;
    };
  }, [is_open, board_id]);

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  const normalized_query = query.trim().toLowerCase();
  const visible_people = useMemo(
    () => people.filter((person) => person.full_name.toLowerCase().includes(normalized_query)),
    [people, normalized_query]
  );
  const visible_teams = useMemo(
    () => teams.filter((team) => team.name.toLowerCase().includes(normalized_query)),
    [teams, normalized_query]
  );

  if (!is_open || !column) return null;

  const updateDraft = (kind: RestrictionKind, patch: Partial<RestrictionDraft>) =>
    setDrafts((current) => ({ ...current, [kind]: { ...current[kind], ...patch } }));

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onSave({ view_restriction: toPayload(drafts.view), edit_restriction: toPayload(drafts.edit) });
      onClose();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "We couldn't save the column permissions."));
    } finally {
      setIsSaving(false);
    }
  };

  const renderSection = (kind: RestrictionKind) => {
    const draft = drafts[kind];
    const copy = SECTION_COPY[kind];

    return (
      <section className="rounded-xl border border-shell-border p-4">
        <h3 className="text-[13.5px] font-semibold text-shell-text">{copy.title}</h3>
        <div className="mt-2.5 flex flex-col gap-1.5" role="radiogroup" aria-label={copy.title}>
          {[false, true].map((is_restricted) => (
            <label key={String(is_restricted)} className="flex cursor-pointer items-start gap-2.5 text-[13px] text-shell-text-secondary">
              <input
                type="radio"
                name={`column-permission-${kind}`}
                checked={draft.is_restricted === is_restricted}
                onChange={() => updateDraft(kind, { is_restricted })}
                className="mt-0.5 accent-brand-500"
              />
              <span>{is_restricted ? copy.restricted : copy.everyone}</span>
            </label>
          ))}
        </div>

        {draft.is_restricted && (
          <div className="shell-scrollbar mt-3 max-h-[180px] overflow-y-auto rounded-lg border border-shell-border">
            {visible_teams.map((team) => (
              <PickRow
                key={`team-${team.id}`}
                label={team.name}
                hint={`Team, ${team.member_ids.length} ${team.member_ids.length === 1 ? "member" : "members"}`}
                is_selected={draft.team_ids.includes(team.id)}
                onToggle={() => updateDraft(kind, { team_ids: toggleId(draft.team_ids, team.id) })}
              />
            ))}
            {visible_people.map((person) => (
              <PickRow
                key={`user-${person.id}`}
                label={person.full_name}
                is_selected={draft.user_ids.includes(person.id)}
                onToggle={() => updateDraft(kind, { user_ids: toggleId(draft.user_ids, person.id) })}
              />
            ))}
            {visible_people.length === 0 && visible_teams.length === 0 && (
              <p className="px-3 py-3 text-[12.5px] text-shell-text-faint">Nobody matches &ldquo;{query}&rdquo;.</p>
            )}
          </div>
        )}
      </section>
    );
  };

  const is_any_restricted = drafts.view.is_restricted || drafts.edit.is_restricted;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Column permissions" className="fixed inset-0 z-[420] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[#060e0e]/[0.62]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[421] flex max-h-[88vh] w-[520px] max-w-full flex-col overflow-hidden rounded-[18px] border border-shell-border bg-shell-panel text-shell-text shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-shell-border px-7 py-5">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold tracking-[-0.01em]">Column permissions</h2>
            <p className="truncate text-[12.5px] text-shell-text-muted">&ldquo;{column.label}&rdquo;, board owners always have access</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="shell-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-7 py-5">
          {is_any_restricted && (
            <label className="flex items-center gap-2 rounded-[10px] border border-shell-border-strong bg-shell-bg px-3 py-2">
              <SearchIcon size={14} className="flex-none text-shell-text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people and teams"
                aria-label="Search people and teams"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-shell-text outline-none placeholder:text-shell-text-faint"
              />
            </label>
          )}

          {renderSection("view")}
          {renderSection("edit")}

          {error_message && (
            <p className="rounded-[10px] border border-error-500/30 bg-error-500/10 px-3.5 py-3 text-[13px] leading-[1.5] text-error-400">{error_message}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-shell-border px-7 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={is_saving}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
          >
            {is_saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const PickRow: React.FC<{ label: string; hint?: string; is_selected: boolean; onToggle: () => void }> = ({ label, hint, is_selected, onToggle }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={is_selected}
    onClick={onToggle}
    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-shell-hover"
  >
    <span
      className={`flex h-4 w-4 flex-none items-center justify-center rounded border ${
        is_selected ? "border-brand-500 bg-brand-500 text-white" : "border-shell-border-strong"
      }`}
    >
      {is_selected && <CheckIcon size={10} />}
    </span>
    <span className="min-w-0 flex-1 truncate text-shell-text">{label}</span>
    {hint && <span className="flex-none text-[11.5px] text-shell-text-faint">{hint}</span>}
  </button>
);

export default ColumnPermissionsModal;
