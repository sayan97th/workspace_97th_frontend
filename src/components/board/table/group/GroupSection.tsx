"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import type { BoardTableGroup } from "../types";
import { computeSubNameColWidth, mainMinWidth, subMinWidth } from "../layoutUtils";
import { applySort } from "../sortUtils";
import ItemRow from "../rows/ItemRow";
import SubitemHeaderRow from "../rows/SubitemHeaderRow";
import SubitemRow from "../rows/SubitemRow";
import AddSubitemRow from "../rows/AddSubitemRow";
import AddItemRow from "../rows/AddItemRow";
import GroupSummaryRow from "../rows/GroupSummaryRow";
import CollapsedGroupSummaryRow from "../rows/CollapsedGroupSummaryRow";
import GroupSkeletonRows from "../rows/GroupSkeletonRows";
import TreeBar from "../rows/TreeBar";
import GroupHeaderBar from "./GroupHeaderBar";
import GroupColumnHeaderRow from "./GroupColumnHeaderRow";
import GroupDragPreview from "./GroupDragPreview";
import type { GroupDragHandle } from "./SortableGroup";

/**
 * How many of a loaded table's rows get mounted into the DOM per reveal —
 * see the `visible_count` state below. A table like a "Done" bucket can
 * hold 1,000+ items; mounting every `ItemRow` (each a grid of cells, drag
 * handlers, hover state, ...) the instant its data loads is what actually
 * freezes the page — separate from, and downstream of, `is_items_loaded`'s
 * own network-level lazy loading.
 */
const RENDER_CHUNK_SIZE = 50;

interface GroupSectionProps {
  group: BoardTableGroup;
  group_index: number;
  name_col_width: number;
  state: BoardTableState;
  actions: BoardTableActions;
  onRequestColumnFilter?: (column_id: string) => void;
  /** Opens the column permissions dialog for a column, only passed for board owners. */
  onRequestColumnPermissions?: (column_id: string) => void;
  onRequestGroupByColumn?: (column_id: string) => void;
  onRequestColumnSort?: (column_id: string, direction: "asc" | "desc" | null) => void;
  active_sort_column_id?: string | null;
  active_sort_direction?: "asc" | "desc" | null;
  /** Lets the group header start a drag of this group, see `SortableGroup`. */
  drag_handle?: GroupDragHandle;
  /** While any group is being dragged, every group shows only a compact bar. */
  is_drag_compact?: boolean;
}

export default function GroupSection({
  group,
  group_index,
  name_col_width,
  state,
  actions,
  onRequestColumnFilter,
  onRequestColumnPermissions,
  onRequestGroupByColumn,
  onRequestColumnSort,
  active_sort_column_id = null,
  active_sort_direction = null,
  drag_handle,
  is_drag_compact = false,
}: GroupSectionProps) {
  const is_collapsed = !!state.collapsed_groups[group.key];
  const min_width = mainMinWidth(name_col_width, group.base_columns, group.custom_columns);
  const sorted_items = applySort(group.items, state.sort, `main:${group.key}`, group.base_columns.concat(group.custom_columns));
  const is_items_loaded = group.is_items_loaded !== false;

  // Lazily requests this table's real rows (`actions.requestGroupItems`)
  // the moment it scrolls near the viewport, instead of every table in the
  // tab fetching its items up front — see `GroupSkeletonRows` for what
  // renders in the meantime. A generous `rootMargin` prefetches ahead of
  // the actual scroll position so tables are usually already loaded by the
  // time they're visible. No-ops (and never observes) once loaded, and for
  // every non-lazy caller (the standalone demo, Kanban/Calendar/Gantt's own
  // eager-loaded tabs) whose groups never set `is_items_loaded` at all.
  const section_ref = useRef<HTMLDivElement>(null);
  const has_requested_ref = useRef(false);
  useEffect(() => {
    if (is_items_loaded || has_requested_ref.current) return;
    const node = section_ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || has_requested_ref.current) return;
        has_requested_ref.current = true;
        actions.requestGroupItems(group.key);
        observer.disconnect();
      },
      { rootMargin: "800px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [is_items_loaded, group.key, actions]);

  // Mounts a loaded table's rows in chunks rather than all at once — the
  // same "reveal more as the viewer scrolls near it" idea as the fetch
  // trigger above, one level deeper (DOM rendering instead of network
  // fetching). `load_more_ref`'s sentinel sits right after the currently
  // mounted rows, so as it scrolls near the viewport this fires again with
  // the next chunk, and the sentinel itself moves further down — repeating
  // until every row is mounted. Rebuilt per `visible_count` change (cheap:
  // just a fresh `IntersectionObserver` on the same or a moved sentinel)
  // rather than reused, so it always reflects the current reveal state
  // instead of risking a stale observer on a since-unmounted sentinel.
  const [visible_count, setVisibleCount] = useState(RENDER_CHUNK_SIZE);
  const has_more_rows = visible_count < sorted_items.length;
  const load_more_ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!is_items_loaded || !has_more_rows) return;
    const node = load_more_ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisibleCount((count) => count + RENDER_CHUNK_SIZE);
      },
      { rootMargin: "1000px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [is_items_loaded, has_more_rows, visible_count]);

  if (is_drag_compact) {
    return (
      <div ref={section_ref} style={{ paddingTop: group_index === 0 ? 0 : 8 }}>
        <GroupDragPreview group={group} />
      </div>
    );
  }

  return (
    // `paddingTop`, not `marginTop`. A sticky child (`GroupHeaderBar`) can only stay pinned
    // to `top: 0` while some part of ITS OWN containing block (this very div) is still on
    // screen. Margin sits outside that box, so a margin-based gap between groups is a dead
    // zone no sticky header can occupy, the previous group's header un-sticks the instant its
    // box scrolls past, but the next group's box (and its `top: 0` claim) hasn't arrived yet,
    // and the raw page background flashes through for the width of that gap. Padding is part
    // of the box itself, so the same spacing here keeps the handoff between one group's
    // sticky header and the next completely contiguous while looking identical at rest.
    <div ref={section_ref} style={{ paddingTop: group_index === 0 ? 0 : is_collapsed ? 10 : 30 }}>
      {is_collapsed ? (
        <CollapsedGroupSummaryRow group={group} name_col_width={name_col_width} min_width={min_width} state={state} actions={actions} drag_handle={drag_handle} />
      ) : (
        <GroupHeaderBar group={group} min_width={min_width} state={state} actions={actions} drag_handle={drag_handle} />
      )}

      {!is_collapsed && (
        <div>
          <GroupColumnHeaderRow
            group={group}
            name_col_width={name_col_width}
            min_width={min_width}
            state={state}
            actions={actions}
            onRequestColumnFilter={onRequestColumnFilter}
            onRequestColumnPermissions={onRequestColumnPermissions}
            onRequestGroupByColumn={onRequestGroupByColumn}
            onRequestColumnSort={onRequestColumnSort}
            active_sort_column_id={active_sort_column_id}
            active_sort_direction={active_sort_direction}
          />

          {!is_items_loaded ? (
            <GroupSkeletonRows
              name_col_width={name_col_width}
              min_width={min_width}
              base_columns={group.base_columns}
              custom_columns={group.custom_columns}
              color={group.color}
              row_height={state.row_height}
              item_count={group.item_count}
              pinned_column_count={state.pinned_column_count}
            />
          ) : (
            <>
              {sorted_items.slice(0, visible_count).map((item) => {
                const is_open = !!state.open_map[item.id];
                // `state.sub_column_width` is set once the user drags the Subitem column's
                // own resize handle (or a real board loads with one already persisted) —
                // until then this still auto-sizes per item from its own longest subitem
                // name, exactly as before (see `BoardTable`'s `name_col_width` for the
                // Item column's identical fallback).
                const sub_name_col_width = state.sub_column_width ?? computeSubNameColWidth(item.subs.map((s) => s.name));
                const sub_min_width = subMinWidth(min_width, sub_name_col_width, group.sub_base_columns, group.sub_custom_columns);
                const sorted_subs = applySort(item.subs, state.sort, `sub:${item.id}`, group.sub_base_columns.concat(group.sub_custom_columns));

                return (
                  <Fragment key={item.id}>
                    <ItemRow item={item} group={group} name_col_width={name_col_width} min_width={min_width} state={state} actions={actions} />

                    {is_open && item.subs.length > 0 && (
                      <>
                        <SubitemHeaderRow
                          item={item}
                          group={group}
                          name_col_width={sub_name_col_width}
                          min_width={sub_min_width}
                          state={state}
                          actions={actions}
                          onRequestColumnFilter={onRequestColumnFilter}
                          onRequestColumnPermissions={onRequestColumnPermissions}
                          onRequestGroupByColumn={onRequestGroupByColumn}
                        />
                        {sorted_subs.map((sub) => (
                          <SubitemRow key={sub.id} sub={sub} item={item} group={group} name_col_width={sub_name_col_width} min_width={sub_min_width} state={state} actions={actions} />
                        ))}
                        {!state.read_only && (
                          <AddSubitemRow min_width={sub_min_width} color={group.color} tint={group.tint} onAdd={() => actions.addSubitem(item.id)} />
                        )}
                        <div className="flex items-stretch" style={{ minWidth: sub_min_width, height: 16 }}>
                          <TreeBar variant="gap" color={group.color} tint={group.tint} />
                        </div>
                      </>
                    )}
                  </Fragment>
                );
              })}

              {has_more_rows && (
                <div ref={load_more_ref}>
                  <GroupSkeletonRows
                    name_col_width={name_col_width}
                    min_width={min_width}
                    base_columns={group.base_columns}
                    custom_columns={group.custom_columns}
                    color={group.color}
                    row_height={state.row_height}
                    item_count={2}
                    pinned_column_count={state.pinned_column_count}
                  />
                </div>
              )}

              {!state.read_only && state.can_create_items && (
                <AddItemRow min_width={min_width} color={group.color} onAdd={() => actions.addItem(group.key)} />
              )}

              <GroupSummaryRow group={group} name_col_width={name_col_width} min_width={min_width} state={state} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
