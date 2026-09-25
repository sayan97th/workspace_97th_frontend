"use client";
import React from "react";
import { CloseIcon } from "@/icons/board-icons";
import { describeFilterRule, isRuleComplete } from "./filterEngine";
import { BOARD_DEFAULT_GROUP_BY_ID, type BoardAdvancedFilterRow, type BoardToolbarApi, type BoardToolbarPanelId } from "./types";

export type ActiveFiltersBarProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

type ChipKind = "search" | "person" | "quick" | "advanced" | "sort" | "group_by";

type Chip = {
  id: string;
  kind: ChipKind;
  label: string;
  onRemove: () => void;
};

/** Panel each chip kind opens, so a filter can be edited straight from its summary. */
const CHIP_PANELS: Record<Exclude<ChipKind, "search">, BoardToolbarPanelId> = {
  person: "person",
  quick: "filter",
  advanced: "filter",
  sort: "sort",
  group_by: "group",
};

const joinWord = (operator: "and" | "or") => (operator === "or" ? " or " : " and ");

/**
 * Summary strip under the toolbar: one removable chip per active filter
 * (Search, Person, each Quick filters facet, each Advanced rule or group) plus
 * the current Sort and Group by, the "Showing X of Y items" count and a Clear
 * filters shortcut. Hidden while nothing narrows or reorders the board.
 */
function ActiveFiltersBar<TRow>({ toolbar }: ActiveFiltersBarProps<TRow>) {
  const fields_by_id = new Map(toolbar.filter_fields.map((field) => [field.id, field]));
  const describe = (rule: BoardAdvancedFilterRow) => {
    const field = rule.column_id ? fields_by_id.get(rule.column_id) : undefined;
    return field && isRuleComplete(rule) ? describeFilterRule(field, rule, toolbar.persons) : null;
  };

  const chips: Chip[] = [];

  const search_query = toolbar.search_query.trim();
  if (search_query) {
    chips.push({ id: "search", kind: "search", label: `Search: "${search_query}"`, onRemove: toolbar.closeSearch });
  }

  if (toolbar.selected_person_ids.length) {
    const names = toolbar.selected_person_ids.map((id) => toolbar.persons.find((person) => person.id === id)?.name ?? id);
    chips.push({ id: "person", kind: "person", label: `Person: ${names.join(", ")}`, onRemove: toolbar.clearPersonFilter });
  }

  for (const facet of toolbar.quick_filter_facets) {
    const selected = toolbar.quick_filter_selections[facet.id];
    if (!selected?.length) continue;
    const labels = selected.map((id) => facet.options.find((option) => option.id === id)?.label ?? id);
    chips.push({
      id: `quick-${facet.id}`,
      kind: "quick",
      label: `${facet.label}: ${labels.join(", ")}`,
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

  const filter_chip_count = chips.length;
  const advanced_item_count =
    toolbar.advanced_filter_rows.filter((rule) => describe(rule)).length +
    toolbar.advanced_filter_groups.filter((group) => group.rules.some((rule) => describe(rule))).length;

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

  if (!chips.length) return null;

  const openChipPanel = (chip: Chip) => {
    if (chip.kind === "search") {
      toolbar.openSearch();
      toolbar.focusSearch();
      return;
    }
    if (chip.kind === "advanced") toolbar.setFilterMode("advanced");
    if (chip.kind === "quick") toolbar.setFilterMode("quick");
    toolbar.openPanel(CHIP_PANELS[chip.kind]);
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="flex h-7 max-w-[340px] items-center gap-1 rounded-full border border-boardtree-border bg-boardtree-hover pl-3 pr-1 text-[12.5px] font-medium text-boardtree-text"
        >
          <button type="button" onClick={() => openChipPanel(chip)} className="min-w-0 truncate text-left hover:text-boardtree-accent" title={chip.label}>
            {chip.label}
          </button>
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`Remove ${chip.label}`}
            className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-boardtree-text-faint hover:bg-boardtree-hover-strong hover:text-boardtree-text"
          >
            <CloseIcon size={9} />
          </button>
        </span>
      ))}

      {toolbar.advanced_filter_operator === "or" && advanced_item_count > 1 && (
        <span className="text-[12px] font-medium text-boardtree-text-muted">Advanced rules match any</span>
      )}

      {filter_chip_count > 0 && (
        <>
          <span className="ml-1 text-[12.5px] text-boardtree-text-muted">
            Showing {toolbar.visible_row_count} of {toolbar.total_row_count} items
          </span>
          <button
            type="button"
            onClick={toolbar.resetAllFilters}
            className="text-[12.5px] font-semibold text-boardtree-accent hover:text-boardtree-accent-hover"
          >
            Clear filters
          </button>
        </>
      )}
    </div>
  );
}

export default ActiveFiltersBar;
