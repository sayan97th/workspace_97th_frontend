import { describe, expect, test, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useBoardTable, type UseBoardTableConfig } from "@/components/board/table/useBoardTable";
import { itemIdsOf, makeGroups } from "../../support/tableFixtures";

// Board permissions ("Edit content", "Assigned items only") and column permissions, as the table
// hook enforces them: blocked actions are no-ops, everything else keeps working.

const setup = (config: UseBoardTableConfig = {}) => {
  const initial_groups = makeGroups();
  return renderHook(() => useBoardTable({ initial_groups, ...config }));
};

describe("without structure access", () => {
  test("adding or deleting a group does nothing", () => {
    const { result } = setup({ can_edit_structure: false });
    act(() => result.current.actions.addGroup());
    expect(result.current.state.groups).toHaveLength(2);
    act(() => result.current.actions.removeGroup("g1"));
    expect(result.current.state.groups.map((group) => group.key)).toEqual(["g1", "g2"]);
  });

  test("items can still be added and edited", () => {
    const onCellValueChange = vi.fn();
    const { result } = setup({ can_edit_structure: false, onCellValueChange });
    act(() => result.current.actions.addItem("g2"));
    expect(itemIdsOf(result.current.state.groups[1])).toHaveLength(2);
    act(() => result.current.actions.setCellValue("a", "status", "done"));
    expect(onCellValueChange).toHaveBeenCalledWith("a", "status", "done");
  });

  test("the state exposes the flags for the add buttons", () => {
    const { result } = setup({ can_edit_structure: false, can_create_items: false });
    expect(result.current.state.can_edit_structure).toBe(false);
    expect(result.current.state.can_create_items).toBe(false);
  });
});

describe("assigned items only", () => {
  const canEditNode = (node_id: string) => node_id === "a" || node_id === "a1";

  test("only assigned rows accept cell changes", () => {
    const onCellValueChange = vi.fn();
    const { result } = setup({ canEditNode, can_create_items: false, onCellValueChange });
    act(() => result.current.actions.setCellValue("b", "status", "done"));
    expect(onCellValueChange).not.toHaveBeenCalled();
    act(() => result.current.actions.setCellValue("a", "status", "done"));
    expect(onCellValueChange).toHaveBeenCalledWith("a", "status", "done");
  });

  test("row actions on someone else's row do nothing", () => {
    const { result } = setup({ canEditNode, can_create_items: false });
    act(() => result.current.actions.deleteNode("b"));
    expect(itemIdsOf(result.current.state.groups[0])).toEqual(["a", "b"]);
    act(() => result.current.actions.deleteNode("a"));
    expect(itemIdsOf(result.current.state.groups[0])).toEqual(["b"]);
  });

  test("new items can't be added", () => {
    const { result } = setup({ canEditNode, can_create_items: false });
    act(() => result.current.actions.addItem("g2"));
    expect(itemIdsOf(result.current.state.groups[1])).toEqual(["c"]);
  });
});

describe("column permissions", () => {
  test("a column the viewer can't edit ignores changes, other columns still work", () => {
    const onCellValueChange = vi.fn();
    const { result } = setup({ canEditColumn: (column_id) => column_id !== "budget", onCellValueChange });
    act(() => result.current.actions.setCellValue("a", "budget", 100));
    act(() => result.current.actions.clearCellValue("a", "budget"));
    expect(onCellValueChange).not.toHaveBeenCalled();
    act(() => result.current.actions.setCellValue("a", "notes", "hello"));
    expect(onCellValueChange).toHaveBeenCalledWith("a", "notes", "hello");
  });
});
