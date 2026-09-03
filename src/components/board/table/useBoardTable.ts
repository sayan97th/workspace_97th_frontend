"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CellValue,
  ColumnDef,
  ColumnKind,
  DragState,
  PersonDef,
  SortState,
  StatusDef,
  TagDef,
  BoardTableGroup,
  BoardTableItem,
  BoardTableNode,
} from "./types";
import { buildInitialGroups } from "./mockData";
import {
  DEFAULT_LABEL_DEFS,
  DEFAULT_STATUS_DEFS,
  DEFAULT_TAG_DEFS,
  GROUP_PALETTE,
  PEOPLE,
  STATUS_PALETTE,
} from "./constants";
import {
  findGroup,
  findItem,
  findNode,
  insertItemIntoGroup,
  insertSubIntoItem,
  locateNode,
  removeNodeById,
  reorderWithinList,
  updateNodeById,
} from "./treeUtils";

export type ColumnScope = "main" | "sub";

/**
 * Bridges `BoardTable` to a real, API-backed board. Omitted entirely, the
 * hook behaves exactly like the standalone demo (mock data, no persistence).
 * Passed in (see `TableBoardView.tsx`), `initial_groups`/`people`/
 * `status_defs` seed the hook's local state from real data and re-sync it
 * whenever the caller's data changes, while the `on*` callbacks fire
 * alongside the matching local update so the change is also persisted.
 * Structural creation (add item/subitem/group) instead goes through the
 * `preset_id`/`preset_key` parameters on `addItem`/`addSubitem`/`addGroup`
 * below — the caller awaits the real API call first and only then adds the
 * row locally under its real id, so no local-id-to-real-id reconciliation is
 * ever needed.
 */
export interface UseBoardTableConfig {
  initial_groups?: BoardTableGroup[];
  people?: PersonDef[];
  status_defs?: StatusDef[];
  onRenameNode?: (node_id: string, name: string) => void;
  onCellValueChange?: (node_id: string, column_id: string, value: CellValue) => void;
  /**
   * Appends a new option to a real Dropdown column's `options`, inline from
   * its own cell picker (the "New label" + Add row) — resolves once
   * persisted; the board's next `initial_groups` sync then reflects it.
   * Omitted (the standalone demo), the option is added to the shared,
   * local-only `label_defs` palette instead, mirroring `addLabelDef`.
   */
  onAddColumnOption?: (column_id: string, option: { label: string; color: string }) => Promise<unknown>;
  onDeleteNode?: (node_id: string) => void;
  onRenameGroup?: (group_key: string, title: string) => void;
  onRemoveGroup?: (group_key: string) => void;
  /** Column-header menu — see `ColumnMenu.tsx`. Each acts on an *existing* column id, so it's called alongside the local mutation (no round trip needed first), mirroring `onRenameGroup`/`onRemoveGroup`. */
  onRenameColumn?: (group_key: string, scope: ColumnScope, column_id: string, title: string) => void;
  onDeleteColumn?: (group_key: string, scope: ColumnScope, column_id: string) => void;
  onUpdateColumnSettings?: (
    group_key: string,
    scope: ColumnScope,
    column_id: string,
    patch: { width?: number; hideable?: boolean; pinnable?: boolean }
  ) => void;
  onChangeColumnKind?: (group_key: string, scope: ColumnScope, column_id: string, kind: ColumnKind, default_width: number) => void;
}

export interface BoardTableState {
  groups: BoardTableGroup[];
  people: PersonDef[];
  open_map: Record<string, boolean>;
  collapsed_groups: Record<string, boolean>;
  selected_map: Record<string, boolean>;
  editing_id: string | null;
  edit_draft: string;
  editing_group_key: string | null;
  group_draft: string;
  hover_row_id: string | null;
  hover_group_key: string | null;
  hover_head_key: string | null;
  open_row_menu_id: string | null;
  open_group_menu_key: string | null;
  open_column_menu_key: string | null;
  open_cell_menu_key: string | null;
  open_owner_menu_key: string | null;
  open_picker_key: string | null;
  picker_query: string;
  people_query: string;
  tag_query: string;
  status_defs: StatusDef[];
  label_defs: StatusDef[];
  tag_defs: TagDef[];
  label_editor_kind: "status" | "label" | null;
  tag_editor_open: boolean;
  drag: DragState | null;
  sort: SortState | null;
  copied_row_id: string | null;
}

function initialState(config: UseBoardTableConfig): BoardTableState {
  const is_controlled = Boolean(config.initial_groups);
  return {
    groups: config.initial_groups ?? buildInitialGroups(),
    people: config.people ?? PEOPLE,
    // A real board's rows load collapsed and unselected — only the mock demo
    // opens/selects a couple of rows up front to show the tree off at a glance.
    open_map: is_controlled ? {} : { i1: true, i3: true },
    collapsed_groups: {},
    selected_map: is_controlled ? {} : { "i3-s2": true },
    editing_id: null,
    edit_draft: "",
    editing_group_key: null,
    group_draft: "",
    hover_row_id: null,
    hover_group_key: null,
    hover_head_key: null,
    open_row_menu_id: null,
    open_group_menu_key: null,
    open_column_menu_key: null,
    open_cell_menu_key: null,
    open_owner_menu_key: null,
    open_picker_key: null,
    picker_query: "",
    people_query: "",
    tag_query: "",
    status_defs: config.status_defs ?? DEFAULT_STATUS_DEFS.slice(),
    label_defs: DEFAULT_LABEL_DEFS.slice(),
    tag_defs: DEFAULT_TAG_DEFS.slice(),
    label_editor_kind: null,
    tag_editor_open: false,
    drag: null,
    sort: null,
    copied_row_id: null,
  };
}

const closeAllMenus = {
  open_row_menu_id: null,
  open_group_menu_key: null,
  open_column_menu_key: null,
  open_cell_menu_key: null,
  open_owner_menu_key: null,
  open_picker_key: null,
};

export function useBoardTable(config: UseBoardTableConfig = {}) {
  const [state, setState] = useState<BoardTableState>(() => initialState(config));
  const seq_ref = useRef(0);
  const nextId = useCallback((prefix: string) => {
    seq_ref.current += 1;
    return `${prefix}-n${seq_ref.current}`;
  }, []);

  // Latest-value ref so the `on*` callbacks below always call the caller's
  // current config without forcing every action creator to depend on (and
  // therefore be recreated whenever) `config` itself.
  const config_ref = useRef(config);
  config_ref.current = config;
  // Same latest-value pattern, so a `useCallback([])`-memoized action can read
  // the current state synchronously (e.g. to know which node it's committing
  // a rename for) without depending on — and being recreated by — `state`.
  const state_ref = useRef(state);
  state_ref.current = state;

  // Re-syncs local state whenever the caller's real data changes underneath
  // it (a refetch, another viewer's edit, ...) — skipped while a rename or
  // drag is in flight so an in-flight local edit can't get yanked out from
  // under the user, mirroring `BoardKanban`'s own re-sync guard.
  useEffect(() => {
    if (!config.initial_groups) return;
    setState((s) => (s.editing_id || s.drag ? s : { ...s, groups: config.initial_groups! }));
  }, [config.initial_groups]);

  useEffect(() => {
    if (config.people) setState((s) => ({ ...s, people: config.people! }));
  }, [config.people]);

  useEffect(() => {
    if (config.status_defs) setState((s) => ({ ...s, status_defs: config.status_defs! }));
  }, [config.status_defs]);

  // ---- expand / select / edit -------------------------------------------------

  const toggleItemOpen = useCallback((id: string) => {
    setState((s) => ({ ...s, open_map: { ...s.open_map, [id]: !s.open_map[id] } }));
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setState((s) => ({ ...s, selected_map: { ...s.selected_map, [id]: !s.selected_map[id] } }));
  }, []);

  const toggleGroupCollapsed = useCallback((key: string) => {
    setState((s) => ({ ...s, collapsed_groups: { ...s.collapsed_groups, [key]: !s.collapsed_groups[key] } }));
  }, []);

  const startEditName = useCallback((id: string, current_name: string) => {
    setState((s) => ({ ...s, editing_id: id, edit_draft: current_name, ...closeAllMenus }));
  }, []);

  const updateEditDraft = useCallback((value: string) => {
    setState((s) => ({ ...s, edit_draft: value }));
  }, []);

  const commitEditName = useCallback(() => {
    const editing_id = state_ref.current.editing_id;
    if (!editing_id) return;
    const name = (state_ref.current.edit_draft || "").trim() || "Untitled";
    setState((s) => ({ ...s, editing_id: null, groups: updateNodeById<BoardTableNode>(s.groups, editing_id, (n) => ({ ...n, name })) }));
    config_ref.current.onRenameNode?.(editing_id, name);
  }, []);

  const cancelEditName = useCallback(() => {
    setState((s) => ({ ...s, editing_id: null }));
  }, []);

  const startGroupRename = useCallback((key: string, title: string) => {
    setState((s) => ({ ...s, editing_group_key: key, group_draft: title, open_group_menu_key: null }));
  }, []);

  const updateGroupDraft = useCallback((value: string) => {
    setState((s) => ({ ...s, group_draft: value }));
  }, []);

  const commitGroupRename = useCallback(() => {
    const editing_group_key = state_ref.current.editing_group_key;
    if (!editing_group_key) return;
    const title = (state_ref.current.group_draft || "").trim() || "Untitled group";
    setState((s) => ({
      ...s,
      editing_group_key: null,
      groups: s.groups.map((g) => (g.key === editing_group_key ? { ...g, title } : g)),
    }));
    config_ref.current.onRenameGroup?.(editing_group_key, title);
  }, []);

  const cancelGroupRename = useCallback(() => {
    setState((s) => ({ ...s, editing_group_key: null }));
  }, []);

  // ---- cell values --------------------------------------------------------

  const setCellValue = useCallback((node_id: string, column_id: string, value: CellValue) => {
    setState((s) => ({
      ...s,
      groups: updateNodeById<BoardTableNode>(s.groups, node_id, (n) => ({ ...n, values: { ...n.values, [column_id]: value } })),
    }));
    config_ref.current.onCellValueChange?.(node_id, column_id, value);
  }, []);

  const toggleArrayValue = useCallback((node_id: string, column_id: string, option: string) => {
    let next_value: string[] = [];
    setState((s) => ({
      ...s,
      groups: updateNodeById<BoardTableNode>(s.groups, node_id, (n) => {
        const current = (n.values[column_id] as string[]) || [];
        next_value = current.includes(option) ? current.filter((v) => v !== option) : current.concat([option]);
        return { ...n, values: { ...n.values, [column_id]: next_value } };
      }),
    }));
    config_ref.current.onCellValueChange?.(node_id, column_id, next_value.length ? next_value : null);
  }, []);

  const clearCellValue = useCallback((node_id: string, column_id: string) => {
    setState((s) => ({
      ...s,
      groups: updateNodeById<BoardTableNode>(s.groups, node_id, (n) => ({ ...n, values: { ...n.values, [column_id]: undefined } })),
      open_cell_menu_key: null,
    }));
    config_ref.current.onCellValueChange?.(node_id, column_id, null);
  }, []);

  // ---- row menu / structural item ops -------------------------------------

  const openRowMenu = useCallback((id: string) => {
    setState((s) => ({ ...s, ...closeAllMenus, open_row_menu_id: s.open_row_menu_id === id ? null : id }));
  }, []);

  const closeRowMenu = useCallback(() => setState((s) => ({ ...s, open_row_menu_id: null })), []);

  /**
   * `preset_id` lets a real-data caller await the row's real backend id
   * *before* it ever appears locally (see `UseBoardTableConfig`'s own doc
   * comment), so it's addressable by real handlers (rename, cell edits) from
   * the moment it's inserted — no separate local-id-to-real-id reconciliation
   * step. Omitted, a local id is generated exactly like the standalone demo.
   */
  const addItem = useCallback(
    (group_key: string, preset_id?: string) => {
      const id = preset_id ?? nextId("item");
      setState((s) => ({
        ...s,
        groups: insertItemIntoGroup(s.groups, group_key, { id, name: "New item", values: { owner: [], status: "" }, subs: [] }),
        editing_id: id,
        edit_draft: "New item",
        collapsed_groups: { ...s.collapsed_groups, [group_key]: false },
      }));
      return id;
    },
    [nextId]
  );

  const addSubitem = useCallback(
    (item_id: string, preset_id?: string) => {
      const id = preset_id ?? nextId(item_id);
      setState((s) => ({
        ...s,
        groups: insertSubIntoItem(s.groups, item_id, { id, name: "New subitem", values: { owner: [], status: "" } }),
        open_map: { ...s.open_map, [item_id]: true },
        editing_id: id,
        edit_draft: "New subitem",
      }));
      return id;
    },
    [nextId]
  );

  const deleteNode = useCallback((id: string) => {
    setState((s) => ({ ...s, groups: removeNodeById(s.groups, id).groups, open_row_menu_id: null, selected_map: { ...s.selected_map, [id]: false } }));
    config_ref.current.onDeleteNode?.(id);
  }, []);

  const createBelow = useCallback(
    (id: string) => {
      setState((s) => {
        const location = locateNode(s.groups, id);
        if (!location) return s;
        const new_id = nextId("new");
        if (location.kind === "item") {
          return {
            ...s,
            groups: insertItemIntoGroup(s.groups, location.group_key, { id: new_id, name: "New item", values: { owner: [], status: "" }, subs: [] }, location.item_index + 1),
            editing_id: new_id,
            edit_draft: "New item",
            open_row_menu_id: null,
          };
        }
        return {
          ...s,
          groups: insertSubIntoItem(s.groups, location.item_id, { id: new_id, name: "New subitem", values: { owner: [], status: "" } }, location.sub_index + 1),
          editing_id: new_id,
          edit_draft: "New subitem",
          open_row_menu_id: null,
        };
      });
    },
    [nextId]
  );

  const duplicateNode = useCallback(
    (id: string, with_subs: boolean) => {
      setState((s) => {
        const location = locateNode(s.groups, id);
        if (!location) return s;
        if (location.kind === "item") {
          const group = findGroup(s.groups, location.group_key);
          const original = group?.items[location.item_index];
          if (!original) return s;
          const copy: BoardTableItem = {
            ...original,
            id: nextId("copy"),
            name: `${original.name} (copy)`,
            values: { ...original.values },
            subs: with_subs ? original.subs.map((sub) => ({ ...sub, id: nextId("copy"), values: { ...sub.values } })) : [],
          };
          return { ...s, groups: insertItemIntoGroup(s.groups, location.group_key, copy, location.item_index + 1), open_row_menu_id: null };
        }
        const item = findItem(s.groups, location.item_id);
        const original = item?.subs[location.sub_index];
        if (!original) return s;
        const copy: BoardTableNode = { ...original, id: nextId("copy"), name: `${original.name} (copy)`, values: { ...original.values } };
        return { ...s, groups: insertSubIntoItem(s.groups, location.item_id, copy, location.sub_index + 1), open_row_menu_id: null };
      });
    },
    [nextId]
  );

  const moveItemToGroup = useCallback((item_id: string, target_group_key: string) => {
    setState((s) => {
      const { groups: without, removed_item } = removeNodeById(s.groups, item_id);
      if (!removed_item) return s;
      return { ...s, groups: insertItemIntoGroup(without, target_group_key, removed_item), open_row_menu_id: null };
    });
  }, []);

  const convertSubToItem = useCallback((sub_id: string) => {
    setState((s) => {
      const location = locateNode(s.groups, sub_id);
      if (!location || location.kind !== "sub") return s;
      const { groups: without, removed_sub } = removeNodeById(s.groups, sub_id);
      if (!removed_sub) return s;
      const promoted: BoardTableItem = { ...removed_sub, subs: [] };
      return { ...s, groups: insertItemIntoGroup(without, location.group_key, promoted), open_row_menu_id: null };
    });
  }, []);

  const convertItemToSub = useCallback((item_id: string, target_item_id: string) => {
    setState((s) => {
      const { groups: without, removed_item } = removeNodeById(s.groups, item_id);
      if (!removed_item) return s;
      const demoted: BoardTableNode = { id: removed_item.id, name: removed_item.name, values: removed_item.values };
      return { ...s, groups: insertSubIntoItem(without, target_item_id, demoted), open_row_menu_id: null };
    });
  }, []);

  // ---- hover / drag --------------------------------------------------------

  const setHoverRow = useCallback((id: string | null) => setState((s) => ({ ...s, hover_row_id: id })), []);
  const setHoverGroup = useCallback((key: string | null) => setState((s) => ({ ...s, hover_group_key: key })), []);
  const setHoverHead = useCallback((key: string | null) => setState((s) => ({ ...s, hover_head_key: key })), []);

  const onDragStart = useCallback((node_id: string, parent_id: string) => {
    setState((s) => ({ ...s, drag: { node_id, parent_id } }));
  }, []);

  const onDragOver = useCallback((over_id: string, over_parent_id: string) => {
    setState((s) => {
      const drag = s.drag;
      if (!drag || drag.parent_id !== over_parent_id || drag.node_id === over_id) return s;
      if (over_parent_id === "ROOT") {
        const group = s.groups.find((g) => g.items.some((it) => it.id === drag.node_id));
        if (!group) return s;
        return { ...s, groups: s.groups.map((g) => (g.key !== group.key ? g : { ...g, items: reorderWithinList(g.items, drag.node_id, over_id) })) };
      }
      return {
        ...s,
        groups: s.groups.map((g) => ({
          ...g,
          items: g.items.map((it) => (it.id !== over_parent_id ? it : { ...it, subs: reorderWithinList(it.subs, drag.node_id, over_id) })),
        })),
      };
    });
  }, []);

  const onDragEnd = useCallback(() => setState((s) => ({ ...s, drag: null })), []);

  // ---- group menu / structural group ops -----------------------------------

  const openGroupMenu = useCallback((key: string) => {
    setState((s) => ({ ...s, ...closeAllMenus, open_group_menu_key: s.open_group_menu_key === key ? null : key }));
  }, []);
  const closeGroupMenu = useCallback(() => setState((s) => ({ ...s, open_group_menu_key: null })), []);

  const addGroup = useCallback(
    (preset_key?: string, preset_title?: string) => {
      const key = preset_key ?? `g${nextId("grp")}`;
      setState((s) => {
        const color = GROUP_PALETTE[s.groups.length % GROUP_PALETTE.length];
        const template = s.groups[0];
        const new_group: BoardTableGroup = {
          key,
          title: preset_title ?? "New group",
          color,
          tint: color,
          item_title: "Item",
          sub_title: "Subitem",
          base_columns: template ? template.base_columns.map((c) => ({ ...c })) : [],
          sub_base_columns: template ? template.sub_base_columns.map((c) => ({ ...c })) : [],
          custom_columns: [],
          sub_custom_columns: [],
          items: [],
        };
        return { ...s, groups: s.groups.concat(new_group), open_group_menu_key: null };
      });
      return key;
    },
    [nextId]
  );

  const duplicateGroup = useCallback(
    (key: string, with_items: boolean) => {
      setState((s) => {
        const index = s.groups.findIndex((g) => g.key === key);
        if (index < 0) return s;
        const original = s.groups[index];
        const new_key = `g${nextId("grp")}`;
        const copy: BoardTableGroup = {
          ...original,
          key: new_key,
          title: `${original.title} (copy)`,
          base_columns: original.base_columns.map((c) => ({ ...c })),
          sub_base_columns: original.sub_base_columns.map((c) => ({ ...c })),
          custom_columns: original.custom_columns.map((c) => ({ ...c })),
          sub_custom_columns: original.sub_custom_columns.map((c) => ({ ...c })),
          items: with_items
            ? original.items.map((it) => ({ ...it, id: nextId("copy"), values: { ...it.values }, subs: it.subs.map((sub) => ({ ...sub, id: nextId("copy"), values: { ...sub.values } })) }))
            : [],
        };
        const next_groups = s.groups.slice();
        next_groups.splice(index + 1, 0, copy);
        return { ...s, groups: next_groups, open_group_menu_key: null };
      });
    },
    [nextId]
  );

  const moveGroupByKey = useCallback((key: string, dir: "top" | "up" | "down" | "bottom") => {
    setState((s) => {
      const index = s.groups.findIndex((g) => g.key === key);
      if (index < 0) return s;
      const groups = s.groups.slice();
      const [group] = groups.splice(index, 1);
      let target = index;
      if (dir === "top") target = 0;
      else if (dir === "up") target = Math.max(0, index - 1);
      else if (dir === "down") target = Math.min(groups.length, index + 1);
      else target = groups.length;
      groups.splice(target, 0, group);
      return { ...s, groups, open_group_menu_key: null };
    });
  }, []);

  const setGroupColor = useCallback((key: string, color: string) => {
    setState((s) => ({ ...s, groups: s.groups.map((g) => (g.key === key ? { ...g, color, tint: color } : g)), open_group_menu_key: null }));
  }, []);

  const removeGroup = useCallback((key: string) => {
    setState((s) => ({ ...s, groups: s.groups.filter((g) => g.key !== key), open_group_menu_key: null }));
    config_ref.current.onRemoveGroup?.(key);
  }, []);

  const selectAllInGroup = useCallback((key: string) => {
    setState((s) => {
      const group = findGroup(s.groups, key);
      if (!group) return s;
      const next_selected = { ...s.selected_map };
      group.items.forEach((it) => {
        next_selected[it.id] = true;
        it.subs.forEach((sub) => (next_selected[sub.id] = true));
      });
      return { ...s, selected_map: next_selected, open_group_menu_key: null };
    });
  }, []);

  const expandAllGroups = useCallback(() => setState((s) => ({ ...s, collapsed_groups: {}, open_group_menu_key: null })), []);

  const setAllSubsOpen = useCallback((key: string, value: boolean) => {
    setState((s) => {
      const group = findGroup(s.groups, key);
      if (!group) return s;
      const next_open = { ...s.open_map };
      group.items.forEach((it) => {
        if (it.subs.length) next_open[it.id] = value;
      });
      return { ...s, open_map: next_open, open_group_menu_key: null };
    });
  }, []);

  // ---- columns --------------------------------------------------------------

  const openColumnMenu = useCallback((scoped_key: string) => {
    setState((s) => ({ ...s, ...closeAllMenus, open_column_menu_key: s.open_column_menu_key === scoped_key ? null : scoped_key }));
  }, []);
  const closeColumnMenu = useCallback(() => setState((s) => ({ ...s, open_column_menu_key: null })), []);

  const columnListKey = (scope: ColumnScope) => (scope === "main" ? "custom_columns" : "sub_custom_columns");

  const openPicker = useCallback((scoped_key: string) => {
    setState((s) => ({ ...s, ...closeAllMenus, open_picker_key: s.open_picker_key === scoped_key ? null : scoped_key, picker_query: "" }));
  }, []);
  const closePicker = useCallback(() => setState((s) => ({ ...s, open_picker_key: null })), []);
  const setPickerQuery = useCallback((value: string) => setState((s) => ({ ...s, picker_query: value })), []);

  const addColumn = useCallback(
    (group_key: string, scope: ColumnScope, kind: ColumnKind, label: string, default_width: number, after_column_id?: string) => {
      setState((s) => {
        const list_key = columnListKey(scope);
        const id = nextId("col");
        const column: ColumnDef = { id, title: label, kind, width: default_width };
        return {
          ...s,
          groups: s.groups.map((g) => {
            if (g.key !== group_key) return g;
            const current = g[list_key as keyof BoardTableGroup] as ColumnDef[];
            const insert_at = after_column_id ? current.findIndex((c) => c.id === after_column_id) : -1;
            const next = insert_at < 0 ? current.concat(column) : [...current.slice(0, insert_at + 1), column, ...current.slice(insert_at + 1)];
            return { ...g, [list_key]: next };
          }),
          open_picker_key: null,
        };
      });
    },
    [nextId]
  );

  const renameColumn = useCallback((group_key: string, scope: ColumnScope, column_id: string, title: string) => {
    setState((s) => {
      const list_key = columnListKey(scope);
      return {
        ...s,
        groups: s.groups.map((g) => {
          if (g.key !== group_key) return g;
          const base_key = scope === "main" ? "base_columns" : "sub_base_columns";
          const in_base = (g[base_key as keyof BoardTableGroup] as ColumnDef[]).some((c) => c.id === column_id);
          if (in_base) {
            return { ...g, [base_key]: (g[base_key as keyof BoardTableGroup] as ColumnDef[]).map((c) => (c.id === column_id ? { ...c, title } : c)) };
          }
          return { ...g, [list_key]: (g[list_key as keyof BoardTableGroup] as ColumnDef[]).map((c) => (c.id === column_id ? { ...c, title } : c)) };
        }),
      };
    });
    config_ref.current.onRenameColumn?.(group_key, scope, column_id, title);
  }, []);

  const renameItemTitle = useCallback((group_key: string, scope: ColumnScope, title: string) => {
    setState((s) => ({
      ...s,
      groups: s.groups.map((g) => (g.key !== group_key ? g : { ...g, [scope === "main" ? "item_title" : "sub_title"]: title })),
    }));
  }, []);

  const deleteColumn = useCallback((group_key: string, scope: ColumnScope, column_id: string) => {
    setState((s) => {
      const list_key = columnListKey(scope);
      return {
        ...s,
        groups: s.groups.map((g) => (g.key !== group_key ? g : { ...g, [list_key]: (g[list_key as keyof BoardTableGroup] as ColumnDef[]).filter((c) => c.id !== column_id) })),
        open_column_menu_key: null,
      };
    });
    config_ref.current.onDeleteColumn?.(group_key, scope, column_id);
  }, []);

  const duplicateColumn = useCallback(
    (group_key: string, scope: ColumnScope, column_id: string) => {
      setState((s) => {
        const list_key = columnListKey(scope);
        const base_key = scope === "main" ? "base_columns" : "sub_base_columns";
        return {
          ...s,
          groups: s.groups.map((g) => {
            if (g.key !== group_key) return g;
            const base = g[base_key as keyof BoardTableGroup] as ColumnDef[];
            const custom = g[list_key as keyof BoardTableGroup] as ColumnDef[];
            const original = base.find((c) => c.id === column_id) ?? custom.find((c) => c.id === column_id);
            if (!original) return g;
            const copy: ColumnDef = { ...original, id: nextId("col"), title: `${original.title} (copy)` };
            return { ...g, [list_key]: custom.concat(copy) };
          }),
          open_column_menu_key: null,
        };
      });
    },
    [nextId]
  );

  const changeColumnKind = useCallback((group_key: string, scope: ColumnScope, column_id: string, kind: ColumnKind, default_width: number) => {
    setState((s) => {
      const list_key = columnListKey(scope);
      const base_key = scope === "main" ? "base_columns" : "sub_base_columns";
      const patch = (c: ColumnDef) => (c.id === column_id ? { ...c, kind, width: default_width, options: undefined } : c);
      return {
        ...s,
        groups: s.groups.map((g) =>
          g.key !== group_key
            ? g
            : {
                ...g,
                [base_key]: (g[base_key as keyof BoardTableGroup] as ColumnDef[]).map(patch),
                [list_key]: (g[list_key as keyof BoardTableGroup] as ColumnDef[]).map(patch),
              }
        ),
        open_column_menu_key: null,
      };
    });
    config_ref.current.onChangeColumnKind?.(group_key, scope, column_id, kind, default_width);
  }, []);

  const updateColumnSettings = useCallback(
    (group_key: string, scope: ColumnScope, column_id: string, patch: { width?: number; hideable?: boolean; pinnable?: boolean }) => {
      setState((s) => {
        if (patch.width == null) return s;
        const list_key = columnListKey(scope);
        const base_key = scope === "main" ? "base_columns" : "sub_base_columns";
        const apply = (c: ColumnDef) => (c.id === column_id ? { ...c, width: patch.width! } : c);
        return {
          ...s,
          groups: s.groups.map((g) =>
            g.key !== group_key
              ? g
              : {
                  ...g,
                  [base_key]: (g[base_key as keyof BoardTableGroup] as ColumnDef[]).map(apply),
                  [list_key]: (g[list_key as keyof BoardTableGroup] as ColumnDef[]).map(apply),
                }
          ),
        };
      });
      config_ref.current.onUpdateColumnSettings?.(group_key, scope, column_id, patch);
    },
    []
  );

  const collapseAllGroups = useCallback(() => {
    setState((s) => ({
      ...s,
      collapsed_groups: Object.fromEntries(s.groups.map((g) => [g.key, true])),
      open_column_menu_key: null,
    }));
  }, []);

  const setSort = useCallback((scope_key: string, column_id: string, direction: "asc" | "desc" | null) => {
    setState((s) => ({ ...s, sort: direction ? { scope_key, column_id, direction } : null, open_column_menu_key: null }));
  }, []);

  // ---- cell popovers ----------------------------------------------------

  const openCellMenu = useCallback((scoped_key: string) => {
    setState((s) => ({ ...s, ...closeAllMenus, open_cell_menu_key: s.open_cell_menu_key === scoped_key ? null : scoped_key }));
  }, []);
  const closeCellMenu = useCallback(() => setState((s) => ({ ...s, open_cell_menu_key: null, people_query: "", tag_query: "" })), []);

  const openOwnerMenu = useCallback((scoped_key: string) => {
    setState((s) => ({ ...s, ...closeAllMenus, open_owner_menu_key: s.open_owner_menu_key === scoped_key ? null : scoped_key, people_query: "" }));
  }, []);
  const closeOwnerMenu = useCallback(() => setState((s) => ({ ...s, open_owner_menu_key: null })), []);
  const setPeopleQuery = useCallback((value: string) => setState((s) => ({ ...s, people_query: value })), []);

  // ---- status / label / tag editors -----------------------------------------

  const openLabelEditor = useCallback((kind: "status" | "label") => setState((s) => ({ ...s, label_editor_kind: kind, ...closeAllMenus })), []);
  const closeLabelEditor = useCallback(() => setState((s) => ({ ...s, label_editor_kind: null })), []);

  const addStatusDef = useCallback(() => {
    setState((s) => {
      const color = STATUS_PALETTE[s.status_defs.length % STATUS_PALETTE.length];
      return { ...s, status_defs: s.status_defs.concat({ id: nextId("sd"), label: "New status", color }) };
    });
  }, [nextId]);

  const renameStatusDef = useCallback((id: string, label: string) => {
    setState((s) => ({ ...s, status_defs: s.status_defs.map((d) => (d.id === id ? { ...d, label } : d)) }));
  }, []);

  const setStatusDefColor = useCallback((id: string, color: string) => {
    setState((s) => ({ ...s, status_defs: s.status_defs.map((d) => (d.id === id ? { ...d, color } : d)) }));
  }, []);

  const deleteStatusDef = useCallback((id: string) => {
    setState((s) => ({ ...s, status_defs: s.status_defs.filter((d) => d.id !== id) }));
  }, []);

  const addLabelDef = useCallback(() => {
    setState((s) => {
      const color = STATUS_PALETTE[s.label_defs.length % STATUS_PALETTE.length];
      return { ...s, label_defs: s.label_defs.concat({ id: nextId("lb"), label: "New label", color }) };
    });
  }, [nextId]);

  const renameLabelDef = useCallback((id: string, label: string) => {
    setState((s) => ({ ...s, label_defs: s.label_defs.map((d) => (d.id === id ? { ...d, label } : d)) }));
  }, []);

  const setLabelDefColor = useCallback((id: string, color: string) => {
    setState((s) => ({ ...s, label_defs: s.label_defs.map((d) => (d.id === id ? { ...d, color } : d)) }));
  }, []);

  const deleteLabelDef = useCallback((id: string) => {
    setState((s) => ({ ...s, label_defs: s.label_defs.filter((d) => d.id !== id) }));
  }, []);

  /**
   * Dropdown cell's own inline "New label" + Add row. A real column persists
   * through `onAddColumnOption` and picks up the confirmed option once the
   * board's `initial_groups` re-syncs; a column with no persisted options of
   * its own (the standalone demo) instead appends to the shared `label_defs`
   * palette, exactly like `addLabelDef`.
   */
  const addColumnOption = useCallback((column_id: string, option: { label: string; color: string }) => {
    const label = option.label.trim();
    if (!label) return;
    const on_add_option = config_ref.current.onAddColumnOption;
    if (on_add_option) {
      void on_add_option(column_id, { label, color: option.color });
      return;
    }
    setState((s) => ({ ...s, label_defs: s.label_defs.concat({ id: nextId("lb"), label, color: option.color }) }));
  }, [nextId]);

  const openTagEditor = useCallback(() => setState((s) => ({ ...s, tag_editor_open: true, ...closeAllMenus })), []);
  const closeTagEditor = useCallback(() => setState((s) => ({ ...s, tag_editor_open: false })), []);

  const addTagDef = useCallback(
    (label: string) => {
      setState((s) => {
        const color = STATUS_PALETTE[s.tag_defs.length % STATUS_PALETTE.length];
        return { ...s, tag_defs: s.tag_defs.concat({ id: nextId("tg"), label, color }) };
      });
    },
    [nextId]
  );

  const setTagDefColor = useCallback((id: string, color: string) => {
    setState((s) => ({ ...s, tag_defs: s.tag_defs.map((d) => (d.id === id ? { ...d, color } : d)) }));
  }, []);

  const deleteTagDef = useCallback((id: string) => {
    setState((s) => ({ ...s, tag_defs: s.tag_defs.filter((d) => d.id !== id) }));
  }, []);

  const setTagQuery = useCallback((value: string) => setState((s) => ({ ...s, tag_query: value })), []);

  const closeAllOverlays = useCallback(() => setState((s) => ({ ...s, ...closeAllMenus })), []);

  const copyRowLink = useCallback((id: string) => {
    setState((s) => ({ ...s, copied_row_id: id }));
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(`${typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : ""}#${id}`)
        .catch(() => {});
    }
  }, []);

  const selected_count = useMemo(() => Object.values(state.selected_map).filter(Boolean).length, [state.selected_map]);
  const total_subs = useMemo(() => state.groups.reduce((a, g) => a + g.items.reduce((b, it) => b + it.subs.length, 0), 0), [state.groups]);
  const summary_text = selected_count ? `${selected_count} selected` : `${total_subs} subitems`;

  const actions = useMemo(
    () => ({
      toggleItemOpen,
      toggleSelected,
      toggleGroupCollapsed,
      startEditName,
      updateEditDraft,
      commitEditName,
      cancelEditName,
      startGroupRename,
      updateGroupDraft,
      commitGroupRename,
      cancelGroupRename,
      setCellValue,
      toggleArrayValue,
      clearCellValue,
      openRowMenu,
      closeRowMenu,
      addItem,
      addSubitem,
      deleteNode,
      createBelow,
      duplicateNode,
      moveItemToGroup,
      convertSubToItem,
      convertItemToSub,
      setHoverRow,
      setHoverGroup,
      setHoverHead,
      onDragStart,
      onDragOver,
      onDragEnd,
      openGroupMenu,
      closeGroupMenu,
      addGroup,
      duplicateGroup,
      moveGroupByKey,
      setGroupColor,
      removeGroup,
      selectAllInGroup,
      expandAllGroups,
      setAllSubsOpen,
      openColumnMenu,
      closeColumnMenu,
      openPicker,
      closePicker,
      setPickerQuery,
      addColumn,
      renameColumn,
      renameItemTitle,
      deleteColumn,
      duplicateColumn,
      changeColumnKind,
      updateColumnSettings,
      collapseAllGroups,
      setSort,
      openCellMenu,
      closeCellMenu,
      openOwnerMenu,
      closeOwnerMenu,
      setPeopleQuery,
      openLabelEditor,
      closeLabelEditor,
      addStatusDef,
      renameStatusDef,
      setStatusDefColor,
      deleteStatusDef,
      addLabelDef,
      renameLabelDef,
      setLabelDefColor,
      deleteLabelDef,
      addColumnOption,
      openTagEditor,
      closeTagEditor,
      addTagDef,
      setTagDefColor,
      deleteTagDef,
      setTagQuery,
      closeAllOverlays,
      copyRowLink,
    }),
    [
      toggleItemOpen, toggleSelected, toggleGroupCollapsed, startEditName, updateEditDraft, commitEditName, cancelEditName,
      startGroupRename, updateGroupDraft, commitGroupRename, cancelGroupRename, setCellValue, toggleArrayValue,
      clearCellValue, openRowMenu, closeRowMenu, addItem, addSubitem, deleteNode, createBelow, duplicateNode, moveItemToGroup,
      convertSubToItem, convertItemToSub, setHoverRow, setHoverGroup, setHoverHead, onDragStart, onDragOver, onDragEnd,
      openGroupMenu, closeGroupMenu, addGroup, duplicateGroup, moveGroupByKey, setGroupColor, removeGroup, selectAllInGroup,
      expandAllGroups, setAllSubsOpen, openColumnMenu, closeColumnMenu, openPicker, closePicker, setPickerQuery, addColumn,
      renameColumn, renameItemTitle, deleteColumn, duplicateColumn, changeColumnKind, updateColumnSettings, collapseAllGroups, setSort, openCellMenu, closeCellMenu, openOwnerMenu,
      closeOwnerMenu, setPeopleQuery, openLabelEditor, closeLabelEditor, addStatusDef, renameStatusDef, setStatusDefColor,
      deleteStatusDef, addLabelDef, renameLabelDef, setLabelDefColor, deleteLabelDef, addColumnOption, openTagEditor, closeTagEditor, addTagDef,
      setTagDefColor, deleteTagDef, setTagQuery, closeAllOverlays, copyRowLink,
    ]
  );

  return { state, actions, summary_text, findNode: (id: string) => findNode(state.groups, id) };
}

export type BoardTableActions = ReturnType<typeof useBoardTable>["actions"];
