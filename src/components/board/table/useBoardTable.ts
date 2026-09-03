"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type {
  CellValue,
  ColumnDef,
  ColumnKind,
  DragState,
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

export interface BoardTableState {
  groups: BoardTableGroup[];
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

function initialState(): BoardTableState {
  return {
    groups: buildInitialGroups(),
    open_map: { i1: true, i3: true },
    collapsed_groups: {},
    selected_map: { "i3-s2": true },
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
    status_defs: DEFAULT_STATUS_DEFS.slice(),
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

export function useBoardTable() {
  const [state, setState] = useState<BoardTableState>(initialState);
  const seq_ref = useRef(0);
  const nextId = useCallback((prefix: string) => {
    seq_ref.current += 1;
    return `${prefix}-n${seq_ref.current}`;
  }, []);

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
    setState((s) => {
      if (!s.editing_id) return s;
      const name = (s.edit_draft || "").trim() || "Untitled";
      return { ...s, editing_id: null, groups: updateNodeById<BoardTableNode>(s.groups, s.editing_id, (n) => ({ ...n, name })) };
    });
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
    setState((s) => {
      if (!s.editing_group_key) return s;
      const title = (s.group_draft || "").trim() || "Untitled group";
      return {
        ...s,
        editing_group_key: null,
        groups: s.groups.map((g) => (g.key === s.editing_group_key ? { ...g, title } : g)),
      };
    });
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
  }, []);

  const toggleArrayValue = useCallback((node_id: string, column_id: string, option: string) => {
    setState((s) => ({
      ...s,
      groups: updateNodeById<BoardTableNode>(s.groups, node_id, (n) => {
        const current = (n.values[column_id] as string[]) || [];
        const next = current.includes(option) ? current.filter((v) => v !== option) : current.concat([option]);
        return { ...n, values: { ...n.values, [column_id]: next } };
      }),
    }));
  }, []);

  const clearCellValue = useCallback((node_id: string, column_id: string) => {
    setState((s) => ({
      ...s,
      groups: updateNodeById<BoardTableNode>(s.groups, node_id, (n) => ({ ...n, values: { ...n.values, [column_id]: undefined } })),
      open_cell_menu_key: null,
    }));
  }, []);

  // ---- row menu / structural item ops -------------------------------------

  const openRowMenu = useCallback((id: string) => {
    setState((s) => ({ ...s, ...closeAllMenus, open_row_menu_id: s.open_row_menu_id === id ? null : id }));
  }, []);

  const closeRowMenu = useCallback(() => setState((s) => ({ ...s, open_row_menu_id: null })), []);

  const addItem = useCallback(
    (group_key: string) => {
      const id = nextId("item");
      setState((s) => ({
        ...s,
        groups: insertItemIntoGroup(s.groups, group_key, { id, name: "New item", values: { owner: [], status: "" }, subs: [] }),
        editing_id: id,
        edit_draft: "New item",
        collapsed_groups: { ...s.collapsed_groups, [group_key]: false },
      }));
    },
    [nextId]
  );

  const addSubitem = useCallback(
    (item_id: string) => {
      const id = nextId(item_id);
      setState((s) => ({
        ...s,
        groups: insertSubIntoItem(s.groups, item_id, { id, name: "New subitem", values: { owner: [], status: "" } }),
        open_map: { ...s.open_map, [item_id]: true },
        editing_id: id,
        edit_draft: "New subitem",
      }));
    },
    [nextId]
  );

  const deleteNode = useCallback((id: string) => {
    setState((s) => ({ ...s, groups: removeNodeById(s.groups, id).groups, open_row_menu_id: null, selected_map: { ...s.selected_map, [id]: false } }));
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

  const addGroup = useCallback(() => {
    setState((s) => {
      const color = GROUP_PALETTE[s.groups.length % GROUP_PALETTE.length];
      const key = `g${nextId("grp")}`;
      const template = s.groups[0];
      const new_group: BoardTableGroup = {
        key,
        title: "New group",
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
  }, [nextId]);

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
    (group_key: string, scope: ColumnScope, kind: ColumnKind, label: string, default_width: number) => {
      setState((s) => {
        const list_key = columnListKey(scope);
        const id = nextId("col");
        const column: ColumnDef = { id, title: label, kind, width: default_width };
        return {
          ...s,
          groups: s.groups.map((g) => (g.key !== group_key ? g : { ...g, [list_key]: [...(g[list_key as keyof BoardTableGroup] as ColumnDef[]), column] })),
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
  }, []);

  const duplicateColumn = useCallback(
    (group_key: string, scope: ColumnScope, column_id: string) => {
      setState((s) => {
        const list_key = columnListKey(scope);
        return {
          ...s,
          groups: s.groups.map((g) => {
            if (g.key !== group_key) return g;
            const list = g[list_key as keyof BoardTableGroup] as ColumnDef[];
            const original = list.find((c) => c.id === column_id);
            if (!original) return g;
            const copy: ColumnDef = { ...original, id: nextId("col"), title: `${original.title} (copy)` };
            return { ...g, [list_key]: list.concat(copy) };
          }),
          open_column_menu_key: null,
        };
      });
    },
    [nextId]
  );

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
      renameColumn, renameItemTitle, deleteColumn, duplicateColumn, setSort, openCellMenu, closeCellMenu, openOwnerMenu,
      closeOwnerMenu, setPeopleQuery, openLabelEditor, closeLabelEditor, addStatusDef, renameStatusDef, setStatusDefColor,
      deleteStatusDef, addLabelDef, renameLabelDef, setLabelDefColor, deleteLabelDef, openTagEditor, closeTagEditor, addTagDef,
      setTagDefColor, deleteTagDef, setTagQuery, closeAllOverlays, copyRowLink,
    ]
  );

  return { state, actions, summary_text, findNode: (id: string) => findNode(state.groups, id) };
}

export type BoardTableActions = ReturnType<typeof useBoardTable>["actions"];
