import { describe, expect, test, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useBoardTable, type UseBoardTableConfig } from "@/components/board/table/useBoardTable";
import type { ColumnDef } from "@/components/board/table/types";
import { makeGroup, makeItem } from "../../support/tableFixtures";

// Range selection, multi cell copy and paste, clearing and the fill handle in the table hook.

const status: ColumnDef = {
  id: "status",
  title: "Status",
  kind: "status",
  width: 140,
  options: [
    { id: "s_work", label: "Working on it", color: "#fdab3d" },
    { id: "s_done", label: "Done", color: "#00c875" },
  ],
};
const hours: ColumnDef = { id: "hours", title: "Hours", kind: "number", width: 100 };
const formula: ColumnDef = { id: "total", title: "Total", kind: "formula", width: 100 };

const buildGroups = () => {
  const items = ["a", "b", "c", "d"].map((id, index) => makeItem(id, [], { values: { status: index === 0 ? "s_done" : null, hours: String(index + 1) } }));
  return [{ ...makeGroup("g1", items.slice(0, 3)), base_columns: [status, hours, formula] }, { ...makeGroup("g2", items.slice(3)), base_columns: [status, hours, formula] }];
};

const setup = (config: UseBoardTableConfig = {}) => {
  const initial_groups = buildGroups();
  return renderHook(() => useBoardTable({ initial_groups, ...config }));
};

const valueOf = (result: ReturnType<typeof setup>["result"], node_id: string, column_id: string) => {
  for (const group of result.current.state.groups) {
    const item = group.items.find((entry) => entry.id === node_id);
    if (item) return item.values[column_id];
  }
  return undefined;
};

describe("range selection", () => {
  test("Shift+click selects the block between two cells", () => {
    const { result } = setup();
    act(() => result.current.actions.pointerDownCell("a", "status", false));
    act(() => result.current.actions.pointerDownCell("b", "hours", true));
    expect([...result.current.state.selected_cell_keys].sort()).toEqual(["a:hours", "a:status", "b:hours", "b:status"]);
    expect(result.current.state.fill_handle_cell).toEqual({ node_id: "b", column_id: "hours" });
  });

  test("dragging across cells extends the selection", () => {
    const { result } = setup();
    act(() => result.current.actions.pointerDownCell("a", "hours", false));
    act(() => result.current.actions.pointerEnterCell("c", "hours"));
    expect(result.current.state.selected_cell_keys.size).toBe(3);
  });

  test("Shift+arrow keys grow the selection", () => {
    const { result } = setup();
    act(() => result.current.actions.pointerDownCell("a", "status", false));
    act(() => result.current.actions.moveActiveCell("down", true));
    act(() => result.current.actions.moveActiveCell("right", true));
    expect(result.current.state.selected_cell_keys.size).toBe(4);
  });
});

describe("copy and paste", () => {
  test("copies the selection as TSV with labels", () => {
    const { result } = setup();
    act(() => result.current.actions.pointerDownCell("a", "status", false));
    act(() => result.current.actions.pointerDownCell("b", "hours", true));
    let text: string | null = null;
    act(() => {
      text = result.current.actions.copySelection();
    });
    expect(text).toBe("Done\t1\n\t2");
  });

  test("pastes spreadsheet text from the selected cell and saves it as one batch", () => {
    const onCellValuesChange = vi.fn();
    const { result } = setup({ onCellValuesChange });
    act(() => result.current.actions.pointerDownCell("b", "status", false));
    act(() => result.current.actions.pasteText("Working on it\t10\nDone\t20\n"));
    expect(valueOf(result, "b", "status")).toBe("s_work");
    expect(valueOf(result, "c", "hours")).toBe("20");
    expect(onCellValuesChange).toHaveBeenCalledTimes(1);
    expect(onCellValuesChange.mock.calls[0][0]).toHaveLength(4);
  });

  test("repeats a single copied value over the whole selection", () => {
    const { result } = setup();
    act(() => result.current.actions.pointerDownCell("a", "hours", false));
    act(() => result.current.actions.pointerDownCell("c", "hours", true));
    act(() => result.current.actions.pasteText("7"));
    expect(["a", "b", "c"].map((id) => valueOf(result, id, "hours"))).toEqual(["7", "7", "7"]);
  });

  test("skips cells it cannot write and reports them", () => {
    const onCellPasteResult = vi.fn();
    const { result } = setup({ onCellPasteResult });
    act(() => result.current.actions.pointerDownCell("a", "status", false));
    act(() => result.current.actions.pasteText("Nope\t5\t9"));
    expect(valueOf(result, "a", "status")).toBe("s_done");
    expect(valueOf(result, "a", "hours")).toBe("5");
    expect(onCellPasteResult).toHaveBeenCalledWith({ written: 1, skipped: 2, rows_left_out: 0 });
  });

  test("a paste is one undo step", () => {
    const { result } = setup();
    act(() => result.current.actions.pointerDownCell("a", "hours", false));
    act(() => result.current.actions.pasteText("40\n50"));
    act(() => result.current.actions.undo());
    expect([valueOf(result, "a", "hours"), valueOf(result, "b", "hours")]).toEqual(["1", "2"]);
  });

  test("does not write rows the viewer may not edit", () => {
    const { result } = setup({ canEditNode: (id) => id !== "b" });
    act(() => result.current.actions.pointerDownCell("a", "hours", false));
    act(() => result.current.actions.pasteText("40\n50"));
    expect([valueOf(result, "a", "hours"), valueOf(result, "b", "hours")]).toEqual(["40", "2"]);
  });

  test("does nothing on a read only board", () => {
    const { result } = setup({ read_only: true });
    act(() => result.current.actions.pointerDownCell("a", "hours", false));
    act(() => result.current.actions.pasteText("40"));
    expect(valueOf(result, "a", "hours")).toBe("1");
  });
});

describe("clearing", () => {
  test("Delete empties every selected cell", () => {
    const { result } = setup();
    act(() => result.current.actions.pointerDownCell("a", "status", false));
    act(() => result.current.actions.pointerDownCell("b", "hours", true));
    act(() => result.current.actions.clearSelectedCells());
    expect([valueOf(result, "a", "status"), valueOf(result, "a", "hours"), valueOf(result, "b", "hours")]).toEqual([null, null, null]);
    expect(valueOf(result, "c", "hours")).toBe("3");
  });
});

describe("fill handle", () => {
  test("continues the selected number series down to the hovered row", () => {
    const { result } = setup();
    act(() => result.current.actions.pointerDownCell("a", "hours", false));
    act(() => result.current.actions.pointerDownCell("b", "hours", true));
    act(() => result.current.actions.startFillDrag("b", "hours"));
    act(() => result.current.actions.pointerEnterCell("d", "hours"));
    expect([...result.current.state.fill_target_keys].sort()).toEqual(["c:hours", "d:hours"]);
    act(() => result.current.actions.commitFillDrag());
    expect([valueOf(result, "c", "hours"), valueOf(result, "d", "hours")]).toEqual(["3", "4"]);
  });

  test("double click fills down to the end of the group only", () => {
    const { result } = setup();
    act(() => result.current.actions.pointerDownCell("a", "status", false));
    act(() => result.current.actions.fillDownToGroupEnd("a", "status"));
    expect([valueOf(result, "b", "status"), valueOf(result, "c", "status"), valueOf(result, "d", "status")]).toEqual(["s_done", "s_done", null]);
  });
});

describe("group drag and drop", () => {
  test("moves a group to where it was dropped and reports the new order", () => {
    const onMoveGroup = vi.fn();
    const initial_groups = ["g1", "g2", "g3"].map((key) => makeGroup(key, []));
    const { result } = renderHook(() => useBoardTable({ initial_groups, onMoveGroup }));
    act(() => result.current.actions.moveGroupToKey("g3", "g1"));
    expect(result.current.state.groups.map((g) => g.key)).toEqual(["g3", "g1", "g2"]);
    expect(onMoveGroup).toHaveBeenCalledWith("g3", ["g3", "g1", "g2"]);
  });

  test("keeps priority groups above the others", () => {
    const initial_groups = ["g1", "g2", "g3"].map((key) => ({ ...makeGroup(key, []), is_priority: key === "g1" }));
    const { result } = renderHook(() => useBoardTable({ initial_groups }));
    act(() => result.current.actions.moveGroupToKey("g3", "g1"));
    expect(result.current.state.groups.map((g) => g.key)).toEqual(["g1", "g3", "g2"]);
  });

  test("cannot be dragged while grouped by a column", () => {
    const initial_groups = ["g1", "g2"].map((key) => makeGroup(key, []));
    const { result } = renderHook(() => useBoardTable({ initial_groups, can_reorder_groups: false }));
    expect(result.current.state.can_reorder_groups).toBe(false);
  });
});
