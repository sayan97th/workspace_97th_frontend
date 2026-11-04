"use client";

import type { PersonDef } from "../types";
import { getPersonTitle } from "@/lib/deactivated-user";
import AvatarBadge from "../menus/AvatarBadge";
import { useCellTooltip } from "./CellTooltip";

/** People cell avatar stack, monday style: up to three 28px avatars, then a "+N" bubble. */
const PEOPLE_CELL_MAX_AVATARS = 3;
const PEOPLE_CELL_AVATAR_SIZE = 28;
/** How far each stacked avatar tucks under the previous one, matches `AvatarBadge`'s own overlap. */
const PEOPLE_CELL_OVERLAP = Math.round(PEOPLE_CELL_AVATAR_SIZE * 0.27);
/** Shown for an assigned id that is missing from the roster, so the bubble never reads as a raw id. */
const UNKNOWN_PERSON_NAME = "Unknown user";

interface PeopleCellAvatarsProps {
  owner_ids: string[];
  people: PersonDef[];
}

/** One stacked avatar that shows the person's name in the shared dark cell tooltip on hover. */
function PeopleCellAvatar({ person, person_id }: { person?: PersonDef; person_id: string }) {
  const tooltip_text = person ? getPersonTitle(person.name, person.is_deactivated) : UNKNOWN_PERSON_NAME;
  const { anchor_props, tooltip } = useCellTooltip<HTMLSpanElement>(tooltip_text);

  return (
    <>
      <span
        {...anchor_props}
        className="flex flex-none"
        style={{ marginLeft: -PEOPLE_CELL_OVERLAP }}
        aria-label={tooltip_text}
        data-person-id={person_id}
      >
        {/* No `name` prop here, so the native `title` tooltip never doubles the styled one. */}
        <AvatarBadge
          size={PEOPLE_CELL_AVATAR_SIZE}
          overlap={false}
          initials={person?.initials || "?"}
          color={person?.color || "#9aa0b6"}
          avatar_url={person?.avatar_url}
          is_deactivated={person?.is_deactivated}
        />
      </span>
      {tooltip}
    </>
  );
}

/** The "+N" bubble, its tooltip lists everyone folded into it, one name per line. */
function PeopleCellOverflow({ hidden_people }: { hidden_people: { id: string; label: string }[] }) {
  const { anchor_props, tooltip } = useCellTooltip<HTMLSpanElement>(
    <span className="flex flex-col items-start text-left">
      {hidden_people.map((entry) => (
        <span key={entry.id}>{entry.label}</span>
      ))}
    </span>
  );

  return (
    <>
      <span
        {...anchor_props}
        className="flex flex-none items-center justify-center rounded-full border-2 border-boardtree-surface bg-boardtree-hover-strong text-[11px] font-medium leading-none text-boardtree-text"
        style={{ width: PEOPLE_CELL_AVATAR_SIZE, height: PEOPLE_CELL_AVATAR_SIZE, marginLeft: -PEOPLE_CELL_OVERLAP }}
        aria-label={`${hidden_people.length} more: ${hidden_people.map((entry) => entry.label).join(", ")}`}
      >
        +{hidden_people.length}
      </span>
      {tooltip}
    </>
  );
}

/**
 * The avatars inside a table People cell. Each avatar (and the "+N" bubble) shows who it is in
 * the monday style dark tooltip on hover, instead of the slow native `title`.
 */
export default function PeopleCellAvatars({ owner_ids, people }: PeopleCellAvatarsProps) {
  const people_by_id = new Map(people.map((person) => [person.id, person]));
  const hidden_people = owner_ids.slice(PEOPLE_CELL_MAX_AVATARS).map((id) => {
    const person = people_by_id.get(id);
    return { id, label: person ? getPersonTitle(person.name, person.is_deactivated) : UNKNOWN_PERSON_NAME };
  });

  return (
    // The left padding offsets the first avatar's overlap margin, so the stack stays centered.
    <div className="flex items-center" style={{ paddingLeft: PEOPLE_CELL_OVERLAP }}>
      {owner_ids.slice(0, PEOPLE_CELL_MAX_AVATARS).map((id) => (
        <PeopleCellAvatar key={id} person_id={id} person={people_by_id.get(id)} />
      ))}
      {hidden_people.length > 0 && <PeopleCellOverflow hidden_people={hidden_people} />}
      {owner_ids.length === 0 && (
        // Empty person placeholder, an outlined avatar like monday.com's.
        <div
          className="flex items-center justify-center text-boardtree-control-border"
          style={{ marginLeft: -PEOPLE_CELL_OVERLAP }}
          aria-label="No one assigned"
        >
          <svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true">
            <circle cx="13" cy="13" r="12.25" fill="var(--color-boardtree-surface)" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="13" cy="10.4" r="3.9" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5.6 21.4 a8.2 6.6 0 0 1 14.8 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}
