/** Shared helpers for the "Import items" wizard's step components. */
import type { BoardColumnType } from "@/types/board-content";
import type { BoardImportSourceColumn } from "@/types/board-import";

/** Strips the extension (and any trailing `_<digits>` upload-id suffix some exporters add) from an uploaded file's name, for the "new table" name default. */
export function suggestGroupName(file_name: string): string {
  const without_extension = file_name.replace(/\.(csv|txt|xlsx|xls)$/i, "");
  const without_upload_id = without_extension.replace(/_\d{6,}$/, "");
  return (without_upload_id || without_extension || "Imported items").replace(/_/g, " ").trim();
}

/** Reads a human-readable message off whatever `apiClient` throws (see `lib/api-client.ts`'s `{ ...error_data, status_code }` shape). */
export function importErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return fallback;
}

/** Display name for every column type, matching the board's own "+ Add column" menu. */
export const IMPORT_TYPE_LABELS: Record<BoardColumnType, string> = {
  text: "Text",
  long_text: "Long text",
  status: "Status",
  label: "Label",
  people: "People",
  date: "Date",
  tags: "Tags",
  dropdown: "Dropdown",
  number: "Numbers",
  checkbox: "Checkbox",
  progress: "Progress",
  phone: "Phone",
  email: "Email",
  timeline: "Timeline",
  dependency: "Dependency",
  rating: "Rating",
  vote: "Vote",
  link: "Link",
  files: "Files",
  time_tracking: "Time Tracking",
  auto_number: "Item ID",
  formula: "Formula",
  connect_board: "Connect boards",
  mirror: "Mirror",
  checklist: "Checklist",
  button: "Button",
};

/**
 * How an imported cell is stored for the column types whose behaviour isn't
 * obvious from the name alone, shown under a mapped row so nobody is
 * surprised after the import (e.g. that a Dependency links items by name).
 */
export const IMPORT_TYPE_NOTES: Partial<Record<BoardColumnType, string>> = {
  people: "Names are matched to workspace users; names with no match are left out.",
  vote: "Names are matched to workspace users as voters; vote counts can't be imported.",
  status: "Each distinct value becomes a label.",
  label: "Each distinct value becomes a label.",
  dropdown: "Comma-separated values become separate options.",
  tags: "Comma-separated values become board tags.",
  timeline: "Reads \"start - end\" ranges; a single date becomes a one-day range.",
  checklist: "Each line or comma-separated entry becomes a sub-task; \"[x]\" marks it done.",
  dependency: "Item names are linked to items on this tab once every row is imported.",
  connect_board: "Item names are linked to items on the connected board.",
  files: "Each URL is attached as a link; files themselves aren't downloaded.",
  time_tracking: "Reads hh:mm:ss durations or a number of hours.",
  checkbox: "Values like \"v\", \"yes\" or \"true\" tick the box.",
};

/** Column types whose value is computed by the board, so an import can never write into them. Mirrors `BoardColumn::READ_ONLY_TYPES`. */
export const READ_ONLY_COLUMN_TYPES: BoardColumnType[] = ["formula", "mirror", "auto_number", "button"];

/**
 * True when `type` can hold (nearly) every value the source column has.
 * Connect boards can only be an existing column (never a created one), so
 * it's judged like Dependency, which links items by name the same way.
 */
export function isTypeCompatible(source: BoardImportSourceColumn, type: BoardColumnType): boolean {
  return source.compatible_types.includes(type === "connect_board" ? "dependency" : type);
}

/** Types nearly any value fits, so they're only offered as a "better fit" when nothing more specific is. */
const CATCH_ALL_TYPES: BoardColumnType[] = ["text", "long_text", "status", "label", "dropdown", "tags", "checklist", "dependency", "vote"];

/**
 * Up to `limit` types to suggest instead of an ill-fitting one: the detected
 * type first, then specific types the values fit, then catch-all ones.
 */
export function betterFitTypes(source: BoardImportSourceColumn, candidate_types: BoardColumnType[], limit = 3): BoardColumnType[] {
  const compatible = candidate_types.filter((type) => isTypeCompatible(source, type));
  const specific = compatible.filter((type) => !CATCH_ALL_TYPES.includes(type));
  const catch_all = compatible.filter((type) => CATCH_ALL_TYPES.includes(type));
  const ordered = [source.suggested_type, ...specific, ...catch_all].filter((type) => compatible.includes(type));
  return Array.from(new Set(ordered)).slice(0, limit);
}
