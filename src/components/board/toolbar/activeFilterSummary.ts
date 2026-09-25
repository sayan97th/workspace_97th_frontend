import { describeFilterRule, isRuleComplete } from "./filterEngine";
import { BOARD_DEFAULT_GROUP_BY_ID, type BoardAdvancedFilterRow, type BoardToolbarApi, type BoardToolbarPanelId } from "./types";

export type ActiveFilterChipKind = "search" | "person" | "quick" | "advanced" | "sort" | "group_by";

export type ActiveFilterChip = {
  id: string;
  kind: ActiveFilterChipKind;
  label: string;
  onRemove: () => void;
};

/** Panel each chip kind opens, so a filter can be edited straight from its summary. */
export const ACTIVE_FILTER_CHIP_PANELS: Record<Exclude<ActiveFilterChipKind, "search">, BoardToolbarPanelId> = {
  person: "person",
  quick: "filter",
  advanced: "filter",
  sort: "sort",
  group_by: "group",
};

const joinWord = (operator: "and" | "or") => (operator === "or" ? " or " : " and ");

/** Chip kinds that narrow rows, as opposed to Sort and Group by which only reorder them. */
export const isNarrowingChip = (chip: ActiveFilterChip) => chip.kind !== "sort" && chip.kind !== "group_by";

/**
 * One summary per active toolbar setting: Search, Person (people and teams),
 * each Quick filters facet (picks and exclusions), each Advanced rule or group
 * (paused rules are left out), then Sort and Group by. Shared by the chips bar
 * under the toolbar and the Filter button's hover summary.
 */
export function buildActiveFilterChips<TRow>(toolbar: BoardToolbarApi<TRow>): ActiveFilterChip[] {
  const fields_by_id = new Map(toolbar.filter_fields.map((field) => [field.id, field]));
  const describe = (rule: BoardAdvancedFilterRow) => {
    const field = rule.column_id ? fields_by_id.get(rule.column_id) : undefined;
    if (!field || rule.is_disabled || !isRuleComplete(rule)) return null;
    const label = describeFilterRule(field, rule, toolbar.persons);
    return field.scope === "subitem" ? `Subitem ${label.charAt(0).toLowerCase()}${label.slice(1)}` : label;
  };

  const chips: ActiveFilterChip[] = [];

  const search_query = toolbar.search_query.trim();
  if (search_query) {
    chips.push({ id: "search", kind: "search", label: `Search: "${search_query}"`, onRemove: toolbar.closeSearch });
  }

  if (toolbar.selected_person_ids.length || toolbar.selected_team_ids.length) {
    const names = [
      ...(toolbar.teams ?? []).filter((team) => toolbar.selected_team_ids.includes(team.id)).map((team) => `${team.name} (team)`),
      ...toolbar.selected_person_ids.map((id) => toolbar.persons.find((person) => person.id === id)?.name ?? id),
    ];
    chips.push({ id: "person", kind: "person", label: `Person: ${names.join(", ")}`, onRemove: toolbar.clearPersonFilter });
  }

  for (const facet of toolbar.quick_filter_facets) {
    const selected = toolbar.quick_filter_selections[facet.id] ?? [];
    const excluded = toolbar.quick_filter_exclusions[facet.id] ?? [];
    if (!selected.length && !excluded.length) continue;
    const labelOf = (id: string) => facet.options.find((option) => option.id === id)?.label ?? id;
    const parts = [...selected.map(labelOf), ...excluded.map((id) => `not ${labelOf(id)}`)];
    chips.push({
      id: `quick-${facet.id}`,
      kind: "quick",
      label: `${facet.scope === "subitem" ? "Subitem " : ""}${facet.label}: ${parts.join(", ")}`,
      onRemove: () => toolbar.clearQuickFilterFacet(facet.id),
    });
  }

  for (const rule of toolbar.advanced_filter_rows) {
    const label = describe(rule);
    if (label) chips.push({ id: `rule-${rule.id}`, kind: "advanced", label, onRemove: () => toolbar.removeAdvancedFilterRow(rule.id) });
  }

  for (const group of toolbar.advanced_filter_groups) {
    const labels = group.rules.map(describe).filter((label): label is string => label !== null);
    if (!labels.length) continue;
    chips.push({
      id: `group-${group.id}`,
      kind: "advanced",
      label: labels.length === 1 ? labels[0] : `(${labels.join(joinWord(group.join_operator))})`,
      onRemove: () => toolbar.removeAdvancedFilterGroup(group.id),
    });
  }

  const sort_labels = toolbar.sort_rules
    .map((rule) => {
      const option = toolbar.sort_options.find((candidate) => candidate.id === rule.sort_option_id);
      return option ? `${option.label} (${rule.direction === "asc" ? "ascending" : "descending"})` : null;
    })
    .filter((label): label is string => label !== null);
  if (sort_labels.length) {
    chips.push({ id: "sort", kind: "sort", label: `Sorted by ${sort_labels.join(", ")}`, onRemove: toolbar.clearSort });
  }

  if (toolbar.group_by_option_id !== BOARD_DEFAULT_GROUP_BY_ID) {
    const option = toolbar.group_by_options.find((candidate) => candidate.id === toolbar.group_by_option_id);
    if (option) {
      chips.push({
        id: "group-by",
        kind: "group_by",
        label: `Grouped ${option.label.replace(/^By /, "by ")}`,
        onRemove: () => toolbar.setGroupByOptionId(BOARD_DEFAULT_GROUP_BY_ID),
      });
    }
  }

  return chips;
}
