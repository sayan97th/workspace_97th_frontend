/** Shared helpers for the "Import items" wizard's step components. */
import type { BoardColumnType } from "@/types/board-content";
import type { BoardImportMapping, BoardImportSourceColumn } from "@/types/board-import";

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
  doc: "Doc",
  world_clock: "World clock",
  location: "Location",
  creation_log: "Creation log",
  last_updated: "Last updated",
  item_number: "Auto number",
  week: "Week",
  country: "Country",
  color_picker: "Color picker",
  hour: "Hour",
  progress_tracking: "Progress tracking",
};

/**
 * How an imported cell is stored for the column types whose behaviour isn't
 * obvious from the name alone, shown under a mapped row so nobody is
 * surprised after the import (e.g. that a Dependency links items by name).
 */
export const IMPORT_TYPE_NOTES: Partial<Record<BoardColumnType, string>> = {
  people: "Names are matched to workspace users; names with no match are left out.",
  vote: "Names are matched to workspace users as voters; vote counts can't be imported.",
  status: "Each distinct value becomes a label, a dropdown list from the file keeps every option.",
  label: "Each distinct value becomes a label.",
  dropdown: "Comma-separated values become separate options, a dropdown list from the file keeps every option.",
  tags: "Comma-separated values become board tags.",
  timeline: "Reads \"start - end\" ranges; a single date becomes a one-day range.",
  checklist: "Each line or comma-separated entry becomes a sub-task; \"[x]\" marks it done.",
  dependency: "Item names are linked to items on this tab once every row is imported.",
  connect_board: "Item names are linked to items on the connected board.",
  files: "Embedded images and documents are uploaded, URLs are attached as links.",
  time_tracking: "Reads hh:mm:ss durations or a number of hours.",
  checkbox: "Values like \"v\", \"yes\" or \"TRUE\" tick the box.",
  rating: "Whole numbers become stars, the scale grows up to 10 when a value needs it.",
  country: "Country names or two letter codes become countries, other values are left empty.",
  world_clock: "Reads time zone names like \"America/New_York\".",
  week: "Reads week numbers (\"2026-W38\") or any date of the week.",
  hour: "Reads times like \"14:30\" or \"2:30 PM\".",
  color_picker: "Reads hex colors like \"#00C875\".",
  location: "Each value is kept as an address, line breaks become commas.",
};

/** Column types whose value is computed by the board, so an import can never write into them. Mirrors `BoardColumn::READ_ONLY_TYPES`. */
export const READ_ONLY_COLUMN_TYPES: BoardColumnType[] = [
  "formula", "mirror", "auto_number", "button", "creation_log", "last_updated", "item_number", "progress_tracking",
];

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

/** The id of a "Map columns" row. Rows the backend suggested are keyed by their source column, copies carry their own key. */
export function mappingRowKey(mapping: BoardImportMapping): string {
  return mapping.row_key ?? `source-${mapping.source_index}`;
}

/** The mappings as the commit endpoint takes them, without the wizard only row fields. */
export function toCommitMappings(mappings: BoardImportMapping[]): BoardImportMapping[] {
  return mappings.map(({ row_key: _row_key, is_copy: _is_copy, ...mapping }) => mapping);
}

/** `"Feedback Description 2"`, the first numbered label not already taken (case insensitive). */
export function nextCopyLabel(label: string, taken_labels: string[]): string {
  const taken = new Set(taken_labels.map((candidate) => candidate.trim().toLowerCase()));
  const base = label.trim() || "Untitled";
  for (let number = 2; ; number++) {
    const candidate = `${base} ${number}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

/** The label a mapping row gives the board column it writes into, null when it isn't creating one. */
export function newColumnLabel(mapping: BoardImportMapping, source_columns: BoardImportSourceColumn[]): string | null {
  if (mapping.mode !== "create") return null;
  const label = mapping.new_label?.trim() || source_columns.find((source) => source.index === mapping.source_index)?.label.trim() || "";
  return label || null;
}

/** The first label two "Create new column" rows share (case insensitive), so the board never gets two look alike columns by accident. */
export function findDuplicateNewLabel(mappings: BoardImportMapping[], source_columns: BoardImportSourceColumn[]): string | null {
  const seen = new Set<string>();
  for (const mapping of mappings) {
    const label = newColumnLabel(mapping, source_columns);
    if (label === null) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) return label;
    seen.add(key);
  }
  return null;
}

let copy_counter = 0;

/**
 * A new row importing `source` again, placed right after the last row that
 * already imports it (or at the end), as a new column with a numbered name
 * so it never collides with the columns the import already creates.
 */
export function insertCopyMapping(
  mappings: BoardImportMapping[],
  source: BoardImportSourceColumn,
  creatable_column_types: BoardColumnType[],
  source_columns: BoardImportSourceColumn[],
  board_labels: string[]
): { mappings: BoardImportMapping[]; row_key: string } {
  copy_counter += 1;
  const row_key = `copy-${source.index}-${Date.now().toString(36)}-${copy_counter}`;
  const taken_labels = [
    ...board_labels,
    ...mappings.map((mapping) => newColumnLabel(mapping, source_columns)).filter((label): label is string => label !== null),
  ];
  const copy: BoardImportMapping = {
    source_index: source.index,
    mode: "create",
    target_column_id: null,
    new_label: nextCopyLabel(source.label, [source.label, ...taken_labels]),
    new_type: creatable_column_types.includes(source.suggested_type) ? source.suggested_type : "text",
    row_key,
    is_copy: true,
  };
  let insert_at = mappings.length;
  mappings.forEach((mapping, position) => {
    if (mapping.source_index === source.index) insert_at = position + 1;
  });
  return { mappings: [...mappings.slice(0, insert_at), copy, ...mappings.slice(insert_at)], row_key };
}
