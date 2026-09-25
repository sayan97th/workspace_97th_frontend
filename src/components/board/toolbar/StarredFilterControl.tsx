"use client";
import React from "react";
import { StarIcon, type IconProps } from "@/icons/workspace-icons";
import { BOARD_FILTER_CHECKED_OPTION_ID, BOARD_FILTER_STARRED_FIELD_ID } from "./filterEngine";
import type { BoardToolbarApi } from "./types";
import ToolbarButton from "./ToolbarButton";

export type StarredFilterControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

const STARRED_COLOR = "#fdab3d";

const FilledStarIcon = ({ className }: IconProps) => (
  <span className={className} style={{ color: STARRED_COLOR, display: "flex" }}>
    <StarIcon filled size={15} />
  </span>
);

const OutlineStarIcon = ({ className }: IconProps) => (
  <span className={className} style={{ display: "flex" }}>
    <StarIcon size={15} />
  </span>
);

/** Whether the "Starred" Quick filters facet is narrowing to starred rows only. */
export const isStarredFilterActive = <TRow,>(toolbar: BoardToolbarApi<TRow>): boolean => {
  const selected = toolbar.quick_filter_selections[BOARD_FILTER_STARRED_FIELD_ID] ?? [];
  return selected.length === 1 && selected[0] === BOARD_FILTER_CHECKED_OPTION_ID;
};

/**
 * One click "Starred" toggle: shows only the rows marked with a star.
 * It drives the "Starred" Quick filters facet, so the pick shows in the chips
 * bar, combines with every other filter, is filtered on the API as well and is
 * kept by saved views, saved filters, shared URLs and remembered filters.
 * Renders nothing on boards that don't describe the Starred field.
 */
function StarredFilterControl<TRow>({ toolbar }: StarredFilterControlProps<TRow>) {
  const has_starred_field = toolbar.filter_fields.some((field) => field.id === BOARD_FILTER_STARRED_FIELD_ID);
  if (!has_starred_field) return null;

  const is_active = isStarredFilterActive(toolbar);

  const toggleStarredFilter = () => {
    if (is_active) toolbar.clearQuickFilterFacet(BOARD_FILTER_STARRED_FIELD_ID);
    else toolbar.selectOnlyQuickFilterOption(BOARD_FILTER_STARRED_FIELD_ID, BOARD_FILTER_CHECKED_OPTION_ID);
  };

  return (
    <ToolbarButton
      label="Starred"
      Icon={is_active ? FilledStarIcon : OutlineStarIcon}
      has_selection={is_active}
      is_pressed={is_active}
      aria_label="Show only starred items"
      title={is_active ? "Showing only starred items. Click to show all items." : "Show only starred items"}
      onClick={toggleStarredFilter}
    />
  );
}

export default StarredFilterControl;
