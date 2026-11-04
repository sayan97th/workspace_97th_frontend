import type { BoardAccessEntry } from "@/types/board-invitation";
import type { BoardType } from "@/types/workspace";

/** Roster groups, in the order they are listed. `all` is only a filter value. */
export type RosterGroup = "owners" | "members" | "guests" | "pending";
export type RosterFilter = "all" | RosterGroup;

/** `label` heads each group in the list, `short_label` is the filter chip. */
export const ROSTER_GROUPS: { id: RosterGroup; label: string; short_label: string }[] = [
  { id: "owners", label: "Owners", short_label: "Owners" },
  { id: "members", label: "Board members", short_label: "Members" },
  { id: "guests", label: "Guests", short_label: "Guests" },
  { id: "pending", label: "Pending invitations", short_label: "Pending" },
];

/** Which roster group a row belongs to. */
export const rosterGroupOf = (entry: BoardAccessEntry): RosterGroup => {
  if (entry.kind === "owner") return "owners";
  if (entry.kind === "invitation") return "pending";
  return entry.is_guest ? "guests" : "members";
};

/** Merges rows returned by an add or invite call, replacing any row with the same key. */
export const mergeAccessRows = (current: BoardAccessEntry[], rows: BoardAccessEntry[]): BoardAccessEntry[] => {
  const keys = new Set(rows.map((row) => row.key));
  return [...current.filter((row) => !keys.has(row.key)), ...rows];
};

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date): number => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const daysFromToday = (iso: string): number => Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / DAY_MS);

/** "Sent today", "Sent yesterday", "Sent 3 days ago". */
export const sentLabel = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const days = -daysFromToday(iso);
  if (days <= 0) return "Sent today";
  if (days === 1) return "Sent yesterday";
  return `Sent ${days} days ago`;
};

/** "Expires today", "Expires tomorrow", "Expires in 5 days". */
export const expiresLabel = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const days = daysFromToday(iso);
  if (days <= 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
};

export type BoardAccessCopy = {
  tone: "brand" | "neutral" | "info";
  title: string;
  text: string;
};

/** The banner under the header, saying who can open the board for each board type. */
export const boardAccessCopy = (board_type: BoardType, workspace_name: string): BoardAccessCopy => {
  if (board_type === "private") {
    return {
      tone: "neutral",
      title: "Private board",
      text: "Only the people listed below can open it. Admins and workspace owners need an invite too.",
    };
  }
  if (board_type === "shareable") {
    return {
      tone: "info",
      title: "Shareable board",
      text: `Everyone at ${workspace_name} can open it, and you can invite guests from outside by email.`,
    };
  }
  return {
    tone: "brand",
    title: "Main board",
    text: `Everyone at ${workspace_name} can open it. Add people below to keep them in the loop.`,
  };
};

/** "1 person" / "3 people". */
export const peopleLabel = (count: number): string => (count === 1 ? "1 person" : `${count} people`);

/** Absolute link to the board, the same id route the sidebar opens. */
export const boardUrl = (board_id: number): string =>
  typeof window === "undefined" ? `/boards/${board_id}` : `${window.location.origin}/boards/${board_id}`;
