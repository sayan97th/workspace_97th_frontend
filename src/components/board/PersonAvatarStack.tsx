import React from "react";
import { AVATAR_GRADIENTS } from "./TeamAvatars";

export type PersonAvatarStackPerson = {
  id: number | string;
  full_name: string;
  profile_photo_url?: string | null;
};

export type PersonAvatarStackProps = {
  people: PersonAvatarStackPerson[];
  /** Diameter in pixels. Defaults to 20. */
  size?: number;
  /** How many circles to render before collapsing the rest into a "+N" badge. */
  max_visible?: number;
  /** Text shown in place of the stack when `people` is empty. */
  empty_label?: string;
};

const getInitials = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Stable small hash so string ids (e.g. seed-data slugs) still pick a consistent gradient. */
const hashId = (id: number | string): number => {
  if (typeof id === "number") return id;
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
};

/**
 * Overlapping initials-avatar stack for a short list of people (board owners,
 * item assignees, …) with an empty-state fallback and a "+N" overflow badge —
 * the info-popover equivalent of {@link TeamAvatars}'s board-table stack.
 */
const PersonAvatarStack: React.FC<PersonAvatarStackProps> = ({
  people,
  size = 20,
  max_visible = 4,
  empty_label = "No owners assigned",
}) => {
  if (people.length === 0) {
    return <span className="text-shell-text-faint">{empty_label}</span>;
  }

  const visible = people.slice(0, max_visible);
  const overflow = people.length - visible.length;

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((person) => (
        <span
          key={person.id}
          title={person.full_name}
          className="flex flex-none items-center justify-center rounded-full border-2 font-bold text-white"
          style={{
            width: size,
            height: size,
            fontSize: Math.max(8, Math.round(size * 0.4)),
            background: AVATAR_GRADIENTS[hashId(person.id) % AVATAR_GRADIENTS.length],
            borderColor: "var(--color-shell-panel)",
          }}
        >
          {getInitials(person.full_name)}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="flex flex-none items-center justify-center rounded-full border-2 bg-shell-panel-alt font-semibold text-shell-text-secondary"
          style={{
            width: size,
            height: size,
            fontSize: Math.max(8, Math.round(size * 0.36)),
            borderColor: "var(--color-shell-panel)",
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
};

export default PersonAvatarStack;
