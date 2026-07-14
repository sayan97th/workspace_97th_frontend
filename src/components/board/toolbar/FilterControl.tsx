import React from "react";
import { FilterIcon } from "@/icons/board-icons";
import type { BoardToolbarApi } from "./types";
import ToolbarButton from "./ToolbarButton";

export type FilterControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

/** Button only — the (wide) Filter panel itself floats below the toolbar row, positioned by BoardToolbar rather than BoardPopover since it spans the full toolbar width instead of anchoring to this button. */
function FilterControl<TRow>({ toolbar }: FilterControlProps<TRow>) {
  const is_open = toolbar.active_panel === "filter";
  return (
    <ToolbarButton
      label="Filter"
      Icon={FilterIcon}
      is_open={is_open}
      variant="accent"
      badge_count={toolbar.active_filter_count || undefined}
      onClick={() => toolbar.togglePanel("filter")}
    />
  );
}

export default FilterControl;
