"use client";
import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Columns2, Fingerprint, UserRound, Users, X } from "lucide-react";
import type { BoardAutomationActionParams, BoardAutomationRecipientSource, BoardAutomationTriggerType } from "@/types/board-automation";
import { SearchIcon } from "@/icons/workspace-icons";
import AvatarBadge from "../../table/menus/AvatarBadge";
import { RECIPIENT_SOURCE_LABELS, recipientSourcesFor, type AutomationBuilderContext } from "./automationCatalog";
import { columnLabel } from "./automationSentence";

/** The recipient fields of a notify action, the only ones this picker writes. */
type RecipientPatch = Pick<BoardAutomationActionParams, "notify_user_id" | "notify_user_ids" | "notify_team_ids" | "recipient_source" | "notify_from_people_column_id">;

export type RecipientPickerProps = {
  params: BoardAutomationActionParams;
  context: AutomationBuilderContext;
  has_trigger_item: boolean;
  trigger_type?: BoardAutomationTriggerType | null;
  onChange: (patch: RecipientPatch) => void;
  onClose: () => void;
};

type Submenu = "subscribers" | "people_column" | null;

type Chip = { key: string; label: string; leading: React.ReactNode; onRemove: () => void };

const ROW = "flex h-8 w-full items-center gap-2.5 rounded-[4px] px-2 text-left text-[14px] text-boardtree-text hover:bg-boardtree-hover";
const SELECTED_ROW = "bg-boardtree-accent-surface hover:bg-boardtree-accent-surface";
const SECTION_TITLE = "px-2 pb-1 pt-2.5 text-[13px] text-boardtree-text-muted";

/** Run sources picked straight from the first rows, "Triggered by" and the rest. Subscribers have their own submenu. */
const SOURCE_ROW_LABELS: Partial<Record<BoardAutomationRecipientSource, string>> = {
  actor: "Triggered by",
  creator: "Item creator",
  owner: "Automation owner",
  mentioned: "Mentioned person",
};

/**
 * monday's "notify" recipient picker: the picks as chips on top, a search over people and teams,
 * then "Me", "Triggered by", the item's subscribers and a People column, and the suggested people.
 * Every pick applies at once and the popover stays open, so several recipients can be chosen in a row.
 */
export default function RecipientPicker({ params, context, has_trigger_item, trigger_type, onChange, onClose }: RecipientPickerProps) {
  const [query, setQuery] = useState("");
  const [submenu, setSubmenu] = useState<Submenu>(null);

  const person_ids = useMemo(
    () => [...new Set([params.notify_user_id, ...(params.notify_user_ids ?? [])].filter((id): id is number => Boolean(id)))],
    [params.notify_user_id, params.notify_user_ids]
  );
  const team_ids = params.notify_team_ids ?? [];
  const sources = recipientSourcesFor(trigger_type, has_trigger_item);
  const people_columns = context.columns.filter((column) => column.scope === "item" && column.kind === "people");
  const people = context.people.filter((person) => !person.is_deactivated);

  /** Writes the people list back, folding the legacy single `notify_user_id` into it. */
  const writePeople = (ids: number[]) => onChange({ notify_user_id: undefined, notify_user_ids: ids });
  const togglePerson = (id: number) => writePeople(person_ids.includes(id) ? person_ids.filter((entry) => entry !== id) : [...person_ids, id]);
  const toggleTeam = (id: number) => onChange({ notify_team_ids: team_ids.includes(id) ? team_ids.filter((entry) => entry !== id) : [...team_ids, id] });
  const toggleSource = (source: BoardAutomationRecipientSource) => onChange({ recipient_source: params.recipient_source === source ? null : source });
  const toggleColumn = (column_id: number) =>
    onChange({ notify_from_people_column_id: params.notify_from_people_column_id === column_id ? undefined : column_id });

  const personName = (id: number) => (context.viewer_id && String(id) === context.viewer_id ? "Me" : context.people.find((person) => person.id === String(id))?.name ?? "Unknown person");
  const personAvatar = (id: number, size = 20) => {
    const person = context.people.find((entry) => entry.id === String(id));
    return person ? <AvatarBadge initials={person.initials} color={person.color} avatar_url={person.avatar_url} name={person.name} size={size} /> : <UserRound size={size - 4} />;
  };

  const chips: Chip[] = [
    ...person_ids.map((id) => ({ key: `person_${id}`, label: personName(id), leading: personAvatar(id, 18), onRemove: () => togglePerson(id) })),
    ...team_ids.map((id) => ({
      key: `team_${id}`,
      label: context.teams?.find((team) => team.id === id)?.name ?? "Team",
      leading: <Users size={14} />,
      onRemove: () => toggleTeam(id),
    })),
    ...(params.recipient_source
      ? [{ key: "source", label: SOURCE_ROW_LABELS[params.recipient_source] ?? RECIPIENT_SOURCE_LABELS[params.recipient_source], leading: <Fingerprint size={14} />, onRemove: () => toggleSource(params.recipient_source!) }]
      : []),
    ...(params.notify_from_people_column_id
      ? [{ key: "column", label: columnLabel(context, params.notify_from_people_column_id), leading: <Columns2 size={14} />, onRemove: () => toggleColumn(params.notify_from_people_column_id!) }]
      : []),
  ];

  const text = query.trim().toLowerCase();
  const matching_people = people.filter((person) => person.name.toLowerCase().includes(text));
  const matching_teams = (context.teams ?? []).filter((team) => team.name.toLowerCase().includes(text));

  const personRow = (id: string, name: string) => {
    const numeric_id = Number(id);
    const is_selected = person_ids.includes(numeric_id);
    return (
      <button key={id} type="button" role="menuitemcheckbox" aria-checked={is_selected} onClick={() => togglePerson(numeric_id)} className={`${ROW} ${is_selected ? SELECTED_ROW : ""}`}>
        {personAvatar(numeric_id)}
        <span className="min-w-0 flex-1 truncate">{name}</span>
      </button>
    );
  };

  const renderSubmenu = () => {
    const back = (
      <button type="button" onClick={() => setSubmenu(null)} className={`${ROW} text-boardtree-text-secondary`}>
        <ChevronLeft size={16} />
        {submenu === "subscribers" ? "Subscribers" : "People column"}
      </button>
    );
    if (submenu === "subscribers") {
      const is_selected = params.recipient_source === "subscribers";
      return (
        <>
          {back}
          <button type="button" role="menuitemcheckbox" aria-checked={is_selected} onClick={() => toggleSource("subscribers")} className={`${ROW} ${is_selected ? SELECTED_ROW : ""}`}>
            <Users size={16} className="text-boardtree-text-secondary" />
            Item subscribers
          </button>
        </>
      );
    }
    return (
      <>
        {back}
        {people_columns.length === 0 && <div className="px-2 py-3 text-[13px] text-boardtree-text-faint">Add a People column to this board first.</div>}
        {people_columns.map((column) => {
          const is_selected = params.notify_from_people_column_id === Number(column.id);
          return (
            <button key={column.id} type="button" role="menuitemcheckbox" aria-checked={is_selected} onClick={() => toggleColumn(Number(column.id))} className={`${ROW} ${is_selected ? SELECTED_ROW : ""}`}>
              <Columns2 size={16} className="text-boardtree-text-secondary" />
              <span className="min-w-0 flex-1 truncate">{column.title}</span>
            </button>
          );
        })}
      </>
    );
  };

  const renderLists = () => {
    if (text) {
      return (
        <>
          {matching_people.length > 0 && <div className={SECTION_TITLE}>People</div>}
          {matching_people.map((person) => personRow(person.id, context.viewer_id === person.id ? `${person.name} (Me)` : person.name))}
          {matching_teams.length > 0 && <div className={SECTION_TITLE}>Teams</div>}
          {matching_teams.map((team) => {
            const is_selected = team_ids.includes(team.id);
            return (
              <button key={team.id} type="button" role="menuitemcheckbox" aria-checked={is_selected} onClick={() => toggleTeam(team.id)} className={`${ROW} ${is_selected ? SELECTED_ROW : ""}`}>
                <Users size={16} className="text-boardtree-text-secondary" />
                <span className="min-w-0 flex-1 truncate">{team.name}</span>
                <span className="text-[12px] text-boardtree-text-faint">{team.member_count}</span>
              </button>
            );
          })}
          {matching_people.length === 0 && matching_teams.length === 0 && <div className="px-2 py-3 text-center text-[13px] text-boardtree-text-faint">No people or teams match your search.</div>}
        </>
      );
    }

    return (
      <>
        {/* Offered even when the viewer is not a member of this board yet, like monday's "Me". */}
        {context.viewer_id && personRow(context.viewer_id, "Me")}
        {sources
          .filter((source) => source !== "subscribers")
          .map((source) => {
            const is_selected = params.recipient_source === source;
            return (
              <button key={source} type="button" role="menuitemcheckbox" aria-checked={is_selected} onClick={() => toggleSource(source)} className={`${ROW} ${is_selected ? SELECTED_ROW : ""}`}>
                <Fingerprint size={16} className="text-boardtree-text-secondary" />
                {SOURCE_ROW_LABELS[source] ?? RECIPIENT_SOURCE_LABELS[source]}
              </button>
            );
          })}
        {sources.includes("subscribers") && (
          <button type="button" aria-haspopup="menu" onClick={() => setSubmenu("subscribers")} className={ROW}>
            <Users size={16} className="text-boardtree-text-secondary" />
            <span className="flex-1">Subscribers</span>
            <ChevronRight size={16} className="text-boardtree-text-secondary" />
          </button>
        )}
        {has_trigger_item && (
          <button type="button" aria-haspopup="menu" onClick={() => setSubmenu("people_column")} className={ROW}>
            <Columns2 size={16} className="text-boardtree-text-secondary" />
            <span className="flex-1">People column</span>
            <ChevronRight size={16} className="text-boardtree-text-secondary" />
          </button>
        )}
        <div className={SECTION_TITLE}>Suggested</div>
        <div className="max-h-[184px] overflow-y-auto">
          {people.filter((person) => person.id !== context.viewer_id).map((person) => personRow(person.id, person.name))}
          {people.length === 0 && <div className="px-2 py-2 text-[13px] text-boardtree-text-faint">No members to suggest.</div>}
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-start gap-2">
        <div className="flex min-h-7 min-w-0 flex-1 flex-wrap items-center gap-1.5" aria-label="Chosen recipients">
          {chips.map((chip) => (
            <span key={chip.key} className="inline-flex h-6 max-w-[180px] items-center gap-1 rounded-[4px] bg-boardtree-accent-surface pl-1 pr-0.5 text-[13px] text-boardtree-text">
              <span className="flex flex-none items-center text-boardtree-text-secondary">{chip.leading}</span>
              <span className="min-w-0 truncate">{chip.label}</span>
              <button type="button" onClick={chip.onRemove} aria-label={`Remove ${chip.label}`} className="flex h-5 w-5 flex-none items-center justify-center rounded-[3px] text-boardtree-text-secondary hover:bg-boardtree-hover">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-7 w-7 flex-none items-center justify-center rounded-[4px] text-boardtree-text-secondary hover:bg-boardtree-hover">
          <X size={16} />
        </button>
      </div>

      {submenu === null && (
        <label className="relative mb-1 block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-boardtree-text-secondary"><SearchIcon size={15} /></span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for people or teams"
            aria-label="Search for people or teams"
            className="h-10 w-full rounded-[4px] border border-boardtree-accent bg-boardtree-surface pl-9 pr-3 text-[14px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint"
          />
        </label>
      )}

      <div role="menu" aria-label="Recipients" className="flex flex-col">
        {submenu ? renderSubmenu() : renderLists()}
      </div>
    </div>
  );
}

