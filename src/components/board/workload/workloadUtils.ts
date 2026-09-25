import type { WorkloadPerson } from "./types";
import type { BoardPersonOption } from "../toolbar/types";

/** How busy one person is in one bucket compared with their capacity. */
export type LoadLevel = "empty" | "under" | "full" | "over";

/** From this share of capacity on, a cell reads as "full" rather than "under". */
const FULL_THRESHOLD = 0.85;

export function loadLevel(load: number, capacity: number | null): LoadLevel {
  if (load <= 0) return "empty";
  if (capacity === null || capacity <= 0) return load > 0 && capacity === 0 ? "over" : "under";
  if (load > capacity + 1e-9) return "over";
  return load / capacity >= FULL_THRESHOLD ? "full" : "under";
}

/**
 * Colors and words for each level. The status colors always come with a
 * written label (in the legend and the cell's tooltip), never color alone.
 */
export const LOAD_LEVEL_STYLE: Record<Exclude<LoadLevel, "empty">, { label: string; background: string; text: string }> = {
  under: { label: "Under capacity", background: "#00c875", text: "#ffffff" },
  full: { label: "Near capacity", background: "#fdab3d", text: "#3a2a00" },
  over: { label: "Over capacity", background: "#e2445c", text: "#ffffff" },
};

export function formatLoad(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

/** The People value after moving an item from one person to another: the old person is swapped for the new one, keeping everyone else. */
export function reassignPeople(current_ids: number[], from_id: number | null, to_id: number | null): string[] {
  const without_from = current_ids.filter((id) => id !== from_id);
  const next = to_id === null ? without_from : without_from.includes(to_id) ? without_from : [...without_from, to_id];
  return next.map(String);
}

export function toPersonOption(person: WorkloadPerson): BoardPersonOption {
  const initials = person.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return {
    id: String(person.id ?? "none"),
    name: person.name,
    initials: initials || "?",
    avatar_seed: person.id ?? 0,
    avatar_url: person.photo_url ?? undefined,
    is_deactivated: person.is_deactivated,
  };
}
