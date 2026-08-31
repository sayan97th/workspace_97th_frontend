"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  createInitialFlatItems,
  createInitialTreeItems,
  INITIAL_OPEN_IDS,
  INITIAL_SELECTED_IDS,
  PEOPLE_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
} from "./constants";
import type { ActiveBoardTab, BoardItem, BoardSimpleItem, BoardSubitem, DragParentId } from "./types";

type TreeNode = BoardItem | BoardSubitem;

const mapTreeNode = (items: BoardItem[], node_id: string, updater: (node: TreeNode) => TreeNode): BoardItem[] =>
  items.map((item) => {
    if (item.id === node_id) return updater(item) as BoardItem;
    if (item.subitems.some((subitem) => subitem.id === node_id)) {
      return {
        ...item,
        subitems: item.subitems.map((subitem) => (subitem.id === node_id ? (updater(subitem) as BoardSubitem) : subitem)),
      };
    }
    return item;
  });

const findTreeNode = (items: BoardItem[], node_id: string): TreeNode | null => {
  for (const item of items) {
    if (item.id === node_id) return item;
    const subitem = item.subitems.find((candidate) => candidate.id === node_id);
    if (subitem) return subitem;
  }
  return null;
};

const reorderList = <T extends { id: string }>(list: T[], dragged_id: string, target_id: string): T[] => {
  const from_index = list.findIndex((entry) => entry.id === dragged_id);
  const to_index = list.findIndex((entry) => entry.id === target_id);
  if (from_index < 0 || to_index < 0) return list;
  const next = list.slice();
  const [moved] = next.splice(from_index, 1);
  next.splice(to_index, 0, moved);
  return next;
};

export const computeItemProgress = (item: BoardItem): number => {
  const subitems = item.subitems;
  if (!subitems.length) {
    if (item.status === "Done") return 100;
    if (item.status === "Working on it") return 40;
    return 0;
  }
  const score = subitems.reduce((total, subitem) => {
    if (subitem.status === "Done") return total + 1;
    if (subitem.status === "Working on it") return total + 0.4;
    return total;
  }, 0);
  return Math.round((score / subitems.length) * 100);
};

export const useTableBoard = () => {
  const [active_tab, setActiveTab] = useState<ActiveBoardTab>("main-table");
  const [tree_items, setTreeItems] = useState<BoardItem[]>(() => createInitialTreeItems());
  const [flat_items, setFlatItems] = useState<BoardSimpleItem[]>(() => createInitialFlatItems());
  const [open_ids, setOpenIds] = useState<Record<string, boolean>>(INITIAL_OPEN_IDS);
  const [selected_ids, setSelectedIds] = useState<Record<string, boolean>>(INITIAL_SELECTED_IDS);
  const [editing_id, setEditingId] = useState<string | null>(null);
  const [draft_name, setDraftName] = useState("");
  const [status_menu_id, setStatusMenuId] = useState<string | null>(null);
  const [owner_menu_id, setOwnerMenuId] = useState<string | null>(null);
  const [date_menu_id, setDateMenuId] = useState<string | null>(null);
  const [drag_state, setDragState] = useState<{ node_id: string; parent_id: DragParentId } | null>(null);

  const next_id_ref = useRef(0);
  const generateId = useCallback((prefix: string): string => {
    next_id_ref.current += 1;
    return `${prefix}-${next_id_ref.current}`;
  }, []);

  const toggleItemOpen = useCallback((item_id: string) => {
    setOpenIds((current) => ({ ...current, [item_id]: !current[item_id] }));
  }, []);

  const toggleSelected = useCallback((node_id: string) => {
    setSelectedIds((current) => ({ ...current, [node_id]: !current[node_id] }));
  }, []);

  const closeMenus = useCallback(() => {
    setStatusMenuId(null);
    setOwnerMenuId(null);
    setDateMenuId(null);
  }, []);

  const openStatusMenu = useCallback((node_id: string) => {
    setStatusMenuId((current) => (current === node_id ? null : node_id));
    setOwnerMenuId(null);
    setDateMenuId(null);
  }, []);

  const openOwnerMenu = useCallback((node_id: string) => {
    setOwnerMenuId((current) => (current === node_id ? null : node_id));
    setStatusMenuId(null);
    setDateMenuId(null);
  }, []);

  const openDateMenu = useCallback((node_id: string) => {
    setDateMenuId((current) => (current === node_id ? null : node_id));
    setStatusMenuId(null);
    setOwnerMenuId(null);
  }, []);

  const setStatus = useCallback((node_id: string, option_id: string | null) => {
    const status = option_id ?? "";
    setStatusMenuId(null);
    setTreeItems((current) => mapTreeNode(current, node_id, (node) => ({ ...node, status })));
    setFlatItems((current) => current.map((item) => (item.id === node_id ? { ...item, status } : item)));
  }, []);

  const setDate = useCallback((node_id: string, date: string) => {
    setDateMenuId(null);
    setTreeItems((current) => mapTreeNode(current, node_id, (node) => ({ ...node, date })));
    setFlatItems((current) => current.map((item) => (item.id === node_id ? { ...item, date } : item)));
  }, []);

  const toggleOwner = useCallback((node_id: string, person_id: string) => {
    setTreeItems((current) =>
      mapTreeNode(current, node_id, (node) => {
        const owners = node.owner_ids;
        const next_owners = owners.includes(person_id) ? owners.filter((id) => id !== person_id) : [...owners, person_id];
        return { ...node, owner_ids: next_owners };
      })
    );
  }, []);

  const clearOwners = useCallback((node_id: string) => {
    setTreeItems((current) => mapTreeNode(current, node_id, (node) => ({ ...node, owner_ids: [] })));
  }, []);

  const startEditing = useCallback((node_id: string, current_name: string) => {
    setEditingId(node_id);
    setDraftName(current_name);
    setStatusMenuId(null);
    setOwnerMenuId(null);
    setDateMenuId(null);
  }, []);

  const updateDraftName = useCallback((value: string) => {
    setDraftName(value);
  }, []);

  const commitEdit = useCallback(() => {
    setEditingId((current_editing_id) => {
      if (!current_editing_id) return null;
      setDraftName((current_draft) => {
        const trimmed_name = current_draft.trim() || "Untitled";
        setTreeItems((current) => mapTreeNode(current, current_editing_id, (node) => ({ ...node, name: trimmed_name })));
        setFlatItems((current) => current.map((item) => (item.id === current_editing_id ? { ...item, name: trimmed_name } : item)));
        return current_draft;
      });
      return null;
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const addSubitem = useCallback(
    (item_id: string) => {
      const new_id = generateId(`${item_id}-new`);
      setTreeItems((current) =>
        current.map((item) =>
          item.id !== item_id
            ? item
            : { ...item, subitems: [...item.subitems, { id: new_id, name: "New subitem", owner_ids: [], status: "", date: "", comment_count: 0 }] }
        )
      );
      setOpenIds((current) => ({ ...current, [item_id]: true }));
      setEditingId(new_id);
      setDraftName("New subitem");
    },
    [generateId]
  );

  const addTreeItem = useCallback(() => {
    const new_id = generateId("new-item");
    setTreeItems((current) => [...current, { id: new_id, name: "New item", owner_ids: [], status: "", date: "", priority: "", subitems: [], comment_count: 0 }]);
    setEditingId(new_id);
    setDraftName("New item");
  }, [generateId]);

  const addFlatItem = useCallback(() => {
    const new_id = generateId("new-flat");
    setFlatItems((current) => [...current, { id: new_id, name: "New item", owner_id: "", status: "", date: "", priority: "", progress: 0, comment_count: 0 }]);
  }, [generateId]);

  const handleDragStart = useCallback((node_id: string, parent_id: DragParentId) => {
    setDragState({ node_id, parent_id });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState(null);
  }, []);

  const handleDragOver = useCallback(
    (event: React.DragEvent, over_id: string, parent_id: DragParentId) => {
      event.preventDefault();
      if (!drag_state || drag_state.node_id === over_id || drag_state.parent_id !== parent_id) return;

      if (parent_id === "ROOT") {
        setTreeItems((current) => reorderList(current, drag_state.node_id, over_id));
        return;
      }
      setTreeItems((current) =>
        current.map((item) =>
          item.id !== parent_id ? item : { ...item, subitems: reorderList(item.subitems, drag_state.node_id, over_id) }
        )
      );
    },
    [drag_state]
  );

  const total_subitem_count = useMemo(
    () => tree_items.reduce((total, item) => total + item.subitems.length, 0),
    [tree_items]
  );

  const selected_count = useMemo(() => Object.values(selected_ids).filter(Boolean).length, [selected_ids]);

  const getNodeName = useCallback((node_id: string): string => findTreeNode(tree_items, node_id)?.name ?? "", [tree_items]);

  return {
    active_tab,
    setActiveTab,
    tree_items,
    flat_items,
    people: PEOPLE_OPTIONS,
    status_options: STATUS_OPTIONS,
    priority_options: PRIORITY_OPTIONS,
    open_ids,
    selected_ids,
    editing_id,
    draft_name,
    status_menu_id,
    owner_menu_id,
    date_menu_id,
    dragged_node_id: drag_state?.node_id ?? null,
    total_subitem_count,
    selected_count,
    toggleItemOpen,
    toggleSelected,
    closeMenus,
    openStatusMenu,
    openOwnerMenu,
    openDateMenu,
    setStatus,
    setDate,
    toggleOwner,
    clearOwners,
    startEditing,
    updateDraftName,
    commitEdit,
    cancelEdit,
    addSubitem,
    addTreeItem,
    addFlatItem,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    getNodeName,
  };
};

export type UseTableBoardReturn = ReturnType<typeof useTableBoard>;
