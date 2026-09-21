import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useBoardTable, type UseBoardTableConfig } from "@/components/board/table/useBoardTable";
import { itemIdsOf, makeGroups } from "../../support/tableFixtures";

// The row menu's own state and callbacks in the table hook: what stays local (the standalone demo)
// and which config callbacks a real board hooks its API calls to.

// `initial_groups` must keep the same identity across renders, the hook re-syncs its state whenever it changes.
const setup = (config: UseBoardTableConfig = {}) => {
  const initial_groups = makeGroups();
  return renderHook(() => useBoardTable({ initial_groups, ...config }));
};

const subIdsOf = (result: ReturnType<typeof setup>["result"], item_id: string) =>
  result.current.state.groups.flatMap((g) => g.items).find((it) => it.id === item_id)?.subs.map((s) => s.id);

describe("row menu open state", () => {
  test("opens a row's menu and toggles it closed when clicked again", () => {
    const { result } = setup();
    act(() => result.current.actions.openRowMenu("b"));
    expect(result.current.state.open_row_menu_id).toBe("b");
    act(() => result.current.actions.openRowMenu("b"));
    expect(result.current.state.open_row_menu_id).toBeNull();
  });

  test("opening another row's menu replaces the first", () => {
    const { result } = setup();
    act(() => result.current.actions.openRowMenu("a"));
    act(() => result.current.actions.openRowMenu("c"));
    expect(result.current.state.open_row_menu_id).toBe("c");
  });

  test("closeRowMenu closes it", () => {
    const { result } = setup();
    act(() => result.current.actions.openRowMenu("a"));
    act(() => result.current.actions.closeRowMenu());
    expect(result.current.state.open_row_menu_id).toBeNull();
  });
});

describe("Open item", () => {
  test("hands the row id to the caller that owns the drawer", () => {
    const onOpenItem = vi.fn();
    const { result } = setup({ onOpenItem });
    act(() => result.current.actions.openItem("a1"));
    expect(onOpenItem).toHaveBeenCalledWith("a1");
  });
});

describe("Copy item link", () => {
  const write_text = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    write_text.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText: write_text }, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, "clipboard");
  });

  test("copies the link the board provides, not the current page", async () => {
    const { result } = setup({ getNodeLink: (id) => `https://app.test/boards/5/pulses/${id}` });
    await act(async () => result.current.actions.copyRowLink("a1"));
    expect(write_text).toHaveBeenCalledWith("https://app.test/boards/5/pulses/a1");
  });

  test("falls back to the page address with the row id as its hash", async () => {
    const { result } = setup();
    await act(async () => result.current.actions.copyRowLink("a1"));
    expect(write_text).toHaveBeenCalledWith(`${window.location.origin}${window.location.pathname}#a1`);
  });

  test("shows the copied note, then clears it by itself", async () => {
    const { result } = setup();
    await act(async () => result.current.actions.copyRowLink("a1"));
    expect(result.current.state.copied_row_id).toBe("a1");
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.state.copied_row_id).toBeNull();
  });

  test("does not claim success when the browser refuses the write", async () => {
    write_text.mockRejectedValue(new Error("denied"));
    const { result } = setup();
    await act(async () => result.current.actions.copyRowLink("a1"));
    expect(result.current.state.copied_row_id).toBeNull();
  });

  test("does nothing when the clipboard is not available", async () => {
    Reflect.deleteProperty(navigator, "clipboard");
    const { result } = setup();
    await act(async () => result.current.actions.copyRowLink("a1"));
    expect(result.current.state.copied_row_id).toBeNull();
  });
});

describe("Mark as priority", () => {
  test("toggles the flag locally and reports the new value", () => {
    const onToggleNodePriority = vi.fn();
    const { result } = setup({ onToggleNodePriority });
    act(() => result.current.actions.toggleNodePriority("b"));
    expect(result.current.findNode("b")?.is_priority).toBe(true);
    expect(onToggleNodePriority).toHaveBeenLastCalledWith("b", true);
    act(() => result.current.actions.toggleNodePriority("b"));
    expect(result.current.findNode("b")?.is_priority).toBe(false);
    expect(onToggleNodePriority).toHaveBeenLastCalledWith("b", false);
  });

  test("works on a subitem without touching its parent", () => {
    const onToggleNodePriority = vi.fn();
    const { result } = setup({ onToggleNodePriority });
    act(() => result.current.actions.toggleNodePriority("a1"));
    expect(result.current.findNode("a1")?.is_priority).toBe(true);
    expect(result.current.findNode("a")?.is_priority).toBeUndefined();
    expect(onToggleNodePriority).toHaveBeenCalledWith("a1", true);
  });

  test("closes the row menu", () => {
    const { result } = setup();
    act(() => result.current.actions.openRowMenu("b"));
    act(() => result.current.actions.toggleNodePriority("b"));
    expect(result.current.state.open_row_menu_id).toBeNull();
  });

  test("can be undone", () => {
    const onToggleNodePriority = vi.fn();
    const { result } = setup({ onToggleNodePriority });
    act(() => result.current.actions.toggleNodePriority("b"));
    act(() => result.current.actions.undo());
    expect(result.current.findNode("b")?.is_priority).toBe(false);
    expect(onToggleNodePriority).toHaveBeenLastCalledWith("b", false);
  });
});

describe("Set recurring", () => {
  test("stores the schedule locally and reports it", () => {
    const onSetItemRecurrence = vi.fn();
    const { result } = setup({ onSetItemRecurrence });
    act(() => result.current.actions.setItemRecurrence("b", { frequency: "monthly", interval_count: 2 }));
    expect(result.current.findNode("b")?.recurrence).toEqual({ frequency: "monthly", interval_count: 2 });
    expect(onSetItemRecurrence).toHaveBeenCalledWith("b", { frequency: "monthly", interval_count: 2 });
  });

  test("Stop recurring clears it and reports it", () => {
    const onClearItemRecurrence = vi.fn();
    const { result } = setup({ onClearItemRecurrence });
    act(() => result.current.actions.setItemRecurrence("b", { frequency: "daily", interval_count: 1 }));
    act(() => result.current.actions.clearItemRecurrence("b"));
    expect(result.current.findNode("b")?.recurrence).toBeNull();
    expect(onClearItemRecurrence).toHaveBeenCalledWith("b");
  });
});

describe("Create new row below", () => {
  test("a new item lands right below the reference and opens for naming", () => {
    const { result } = setup();
    act(() => result.current.actions.createBelow("a"));
    const ids = itemIdsOf(result.current.state.groups[0]);
    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe("a");
    expect(ids[2]).toBe("b");
    expect(result.current.state.editing_id).toBe(ids[1]);
    expect(result.current.state.edit_draft).toBe("New item");
  });

  test("a new subitem lands right below the reference subitem", () => {
    const { result } = setup();
    act(() => result.current.actions.createBelow("a1"));
    const subs = subIdsOf(result, "a") ?? [];
    expect(subs).toHaveLength(3);
    expect(subs[0]).toBe("a1");
    expect(subs[2]).toBe("a2");
    expect(result.current.state.edit_draft).toBe("New subitem");
  });

  test("uses the real id when the board already created the row", () => {
    const { result } = setup();
    act(() => result.current.actions.createBelow("a", "9001"));
    expect(itemIdsOf(result.current.state.groups[0])).toEqual(["a", "9001", "b"]);
    expect(result.current.state.editing_id).toBe("9001");
  });

  test("an unknown reference changes nothing", () => {
    const { result } = setup();
    act(() => result.current.actions.createBelow("zzz"));
    expect(itemIdsOf(result.current.state.groups[0])).toEqual(["a", "b"]);
  });
});

describe("Move to group, Convert and Move to item (local)", () => {
  test("Move to group appends the item to the target group", () => {
    const { result } = setup();
    act(() => result.current.actions.moveItemToGroup("b", "g2"));
    expect(itemIdsOf(result.current.state.groups[0])).toEqual(["a"]);
    expect(itemIdsOf(result.current.state.groups[1])).toEqual(["c", "b"]);
  });

  test("Convert to subitem nests the item under the chosen one", () => {
    const { result } = setup();
    act(() => result.current.actions.convertItemToSub("c", "b"));
    expect(itemIdsOf(result.current.state.groups[1])).toEqual([]);
    expect(subIdsOf(result, "b")).toEqual(["c"]);
  });

  test("Convert to item promotes the subitem into its own group's root list", () => {
    const { result } = setup();
    act(() => result.current.actions.convertSubToItem("a1"));
    expect(itemIdsOf(result.current.state.groups[0])).toEqual(["a", "b", "a1"]);
    expect(subIdsOf(result, "a")).toEqual(["a2"]);
  });

  test("Move to item re-parents a subitem, which the old convert action could not do", () => {
    const { result } = setup();
    act(() => result.current.actions.moveSubToItem("a1", "c"));
    expect(subIdsOf(result, "c")).toEqual(["a1"]);
    expect(subIdsOf(result, "a")).toEqual(["a2"]);
  });

  test("each of these closes the row menu", () => {
    const { result } = setup();
    for (const run of [
      () => result.current.actions.moveItemToGroup("b", "g2"),
      () => result.current.actions.convertSubToItem("a1"),
      () => result.current.actions.moveSubToItem("a2", "c"),
    ]) {
      act(() => result.current.actions.openRowMenu("a"));
      act(run);
      expect(result.current.state.open_row_menu_id).toBeNull();
    }
  });
});

describe("Archive and Delete", () => {
  test("Archive removes the row locally without reporting a delete", () => {
    const onDeleteNode = vi.fn();
    const { result } = setup({ onDeleteNode });
    act(() => result.current.actions.archiveNode("b"));
    expect(itemIdsOf(result.current.state.groups[0])).toEqual(["a"]);
    expect(onDeleteNode).not.toHaveBeenCalled();
  });

  test("Archive on a subitem leaves its parent", () => {
    const { result } = setup();
    act(() => result.current.actions.archiveNode("a1"));
    expect(subIdsOf(result, "a")).toEqual(["a2"]);
    expect(itemIdsOf(result.current.state.groups[0])).toEqual(["a", "b"]);
  });

  test("Archive unselects the row so it is not left counted in the selection", () => {
    const { result } = setup();
    act(() => result.current.actions.toggleSelected("b"));
    act(() => result.current.actions.archiveNode("b"));
    expect(result.current.state.selected_map.b).toBe(false);
  });

  test("Delete removes the row and reports it", () => {
    const onDeleteNode = vi.fn();
    const { result } = setup({ onDeleteNode });
    act(() => result.current.actions.deleteNode("b"));
    expect(itemIdsOf(result.current.state.groups[0])).toEqual(["a"]);
    expect(onDeleteNode).toHaveBeenCalledWith("b");
  });
});

describe("Duplicate (local)", () => {
  test("an item is copied right below itself with its subitems", () => {
    const { result } = setup();
    act(() => result.current.actions.duplicateNode("a", true));
    const items = result.current.state.groups[0].items;
    expect(items).toHaveLength(3);
    expect(items[1].name).toBe("Row a (copy)");
    expect(items[1].subs).toHaveLength(2);
    expect(items[1].id).not.toBe("a");
  });

  test("an item can be copied without its subitems", () => {
    const { result } = setup();
    act(() => result.current.actions.duplicateNode("a", false));
    expect(result.current.state.groups[0].items[1].subs).toHaveLength(0);
  });

  test("a subitem is copied inside the same parent", () => {
    const { result } = setup();
    act(() => result.current.actions.duplicateNode("a1", false));
    expect(subIdsOf(result, "a")).toHaveLength(3);
  });
});

describe("read only boards", () => {
  test("every mutating row action is a no-op", () => {
    const onDeleteNode = vi.fn();
    const onToggleNodePriority = vi.fn();
    const { result } = setup({ read_only: true, onDeleteNode, onToggleNodePriority });
    act(() => {
      result.current.actions.archiveNode("b");
      result.current.actions.deleteNode("b");
      result.current.actions.toggleNodePriority("b");
      result.current.actions.moveItemToGroup("b", "g2");
      result.current.actions.convertSubToItem("a1");
      result.current.actions.moveSubToItem("a1", "c");
      result.current.actions.createBelow("a");
      result.current.actions.duplicateNode("a", true);
    });
    expect(itemIdsOf(result.current.state.groups[0])).toEqual(["a", "b"]);
    expect(subIdsOf(result, "a")).toEqual(["a1", "a2"]);
    expect(onDeleteNode).not.toHaveBeenCalled();
    expect(onToggleNodePriority).not.toHaveBeenCalled();
  });

  test("opening an item and the row menu still work", () => {
    const onOpenItem = vi.fn();
    const { result } = setup({ read_only: true, onOpenItem });
    act(() => result.current.actions.openItem("a"));
    act(() => result.current.actions.openRowMenu("a"));
    expect(onOpenItem).toHaveBeenCalledWith("a");
    expect(result.current.state.open_row_menu_id).toBe("a");
  });
});
