import { dependencyCandidatesAmong } from "@/components/board/table/treeUtils";
import { fmtDate, fmtRange, parseRangeValue } from "@/components/board/table/dateUtils";
import type { DependencyLinkType } from "@/components/board/table/types";
import type { BoardColumnDto, BoardItemDto, BoardItemValue } from "@/types/board-content";
import type { ItemDependencySection } from "./ItemDependenciesPanel";

/** A Date or Timeline value as the drawer shows it, null when there is no date. */
function dateLabel(value: BoardItemValue | undefined, kind: "date" | "timeline"): string | null {
  if (kind === "timeline") {
    const { start_iso, end_iso } = parseRangeValue(value);
    return start_iso ? fmtRange(start_iso, end_iso || start_iso) : null;
  }
  return typeof value === "string" && value ? fmtDate(value) : null;
}

function predecessorIdsOf(item: BoardItemDto, column_id: string): string[] {
  const raw = item.values[column_id];
  return Array.isArray(raw) ? raw.map(String) : [];
}

/**
 * Everything the item drawer's Dependencies tab shows for `row`: one section per Dependency column
 * of its table and level (item or subitem), with what it depends on, what depends on it and what
 * it may still link to. Reads only rows already loaded on the board.
 */
export function buildItemDependencySections(
  row: BoardItemDto,
  items: BoardItemDto[],
  columns: BoardColumnDto[],
  canEditColumn: (column_id: string) => boolean
): ItemDependencySection[] {
  const scope = row.parent_id === null ? "item" : "subitem";
  const same_level = scope === "item" ? items : items.flatMap((item) => item.children);
  const by_id = new Map(same_level.map((item) => [String(item.id), item]));
  const columns_by_id = new Map(columns.map((column) => [column.id, column]));

  return columns
    .filter((column) => column.type === "dependency" && (column.scope ?? "item") === scope)
    .map((column) => {
      const column_id = String(column.id);
      const date_column_dto = column.config?.date_column_id != null ? columns_by_id.get(column.config.date_column_id) : undefined;
      const date_kind = date_column_dto?.type === "timeline" ? "timeline" : "date";
      const date_column = date_column_dto && (date_column_dto.type === "date" || date_column_dto.type === "timeline") ? { title: date_column_dto.label, kind: date_kind } as const : null;
      const labelOf = (item: BoardItemDto) => (date_column && date_column_dto ? dateLabel(item.values[String(date_column_dto.id)], date_kind) : null);
      const own_links = row.dependency_links?.[column_id] ?? {};

      const links = predecessorIdsOf(row, column_id).flatMap((id) => {
        const predecessor = by_id.get(id);
        if (!predecessor) return [];
        const settings = own_links[id];
        return [{ id, name: predecessor.name, type: (settings?.type ?? "fs") as DependencyLinkType, lag_days: settings?.lag_days ?? 0, date_label: labelOf(predecessor) }];
      });

      const dependents = same_level
        .filter((item) => predecessorIdsOf(item, column_id).includes(String(row.id)))
        .map((item) => ({ id: String(item.id), name: item.name, lag_days: item.dependency_links?.[column_id]?.[String(row.id)]?.lag_days ?? 0, date_label: labelOf(item) }));

      const candidates = dependencyCandidatesAmong(
        same_level.map((item) => ({ id: String(item.id), name: item.name, values: item.values })),
        String(row.id),
        column_id
      );

      return {
        column_id,
        column_title: column.label,
        date_column,
        mode: column.config?.dependency_mode ?? "none",
        own_date_label: labelOf(row),
        links,
        dependents,
        candidates,
        is_read_only: !canEditColumn(column_id),
      };
    });
}
