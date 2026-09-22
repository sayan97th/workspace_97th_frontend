import { describe, expect, test, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useBoardTable, type UseBoardTableConfig } from "@/components/board/table/useBoardTable";
import { makeGroup, makeItem } from "../../support/tableFixtures";

// The group menu's own state and callbacks in the table hook: what stays local (the standalone demo)
// and which config callbacks a real board hooks its API calls to.

const buildGroups = (priority_keys: string[] = []) =>
  ["g1", "g2", "g3", "g4"].map((key) => ({ ...makeGroup(key, [makeItem(`${key}-item`)]), is_priority: priority_keys.includes(key) }));

// `initial_groups` must keep the same identity across renders, the hook re-syncs its state whenever it changes.
const setup = (config: UseBoardTableConfig = {}, priority_keys: string[] = []) => {
  const initial_groups = buildGroups(priority_keys);
  return renderHook(() => useBoardTable({ initial_groups, ...config }));
};

const keysOf = (result: ReturnType<typeof setup>["result"]) => result.current.state.groups.map((g) => g.key);

describe("Change group color", () => {
  test("recolors the group locally, both its accent and its tint", () => {
    const { result } = setup();
    act(() => result.current.actions.setGroupColor("g2", "#e04455"));
    const group = result.current.state.groups.find((g) => g.key === "g2");
    expect(group).toMatchObject({ color: "#e04455", tint: "#e04455" });
    expect(result.current.state.groups.find((g) => g.key === "g1")?.color).toBe("#579bfc");
  });

  test("reports the new color to the board so it can be saved", () => {
    const onChangeGroupColor = vi.fn();
    const { result } = setup({ onChangeGroupColor });
    act(() => result.current.actions.setGroupColor("g2", "#e04455"));
    expect(onChangeGroupColor).toHaveBeenCalledExactlyOnceWith("g2", "#e04455");
  });

  test("closes the group menu", () => {
    const { result } = setup();
    act(() => result.current.actions.openGroupMenu("g2"));
    act(() => result.current.actions.setGroupColor("g2", "#e04455"));
    expect(result.current.state.open_group_menu_key).toBeNull();
  });

  test("is ignored on a read-only board", () => {
    const onChangeGroupColor = vi.fn();
    const { result } = setup({ onChangeGroupColor, read_only: true });
    act(() => result.current.actions.setGroupColor("g2", "#e04455"));
    expect(onChangeGroupColor).not.toHaveBeenCalled();
    expect(result.current.state.groups.find((g) => g.key === "g2")?.color).toBe("#579bfc");
  });
});

describe("Move group", () => {
  test.each([
    ["g3", "top", ["g3", "g1", "g2", "g4"]],
    ["g3", "up", ["g1", "g3", "g2", "g4"]],
    ["g2", "down", ["g1", "g3", "g2", "g4"]],
    ["g2", "bottom", ["g1", "g3", "g4", "g2"]],
  ] as const)("moves %s %s", (key, dir, expected) => {
    const onMoveGroup = vi.fn();
    const { result } = setup({ onMoveGroup });
    act(() => result.current.actions.moveGroupByKey(key, dir));
    expect(keysOf(result)).toEqual(expected);
    expect(onMoveGroup).toHaveBeenCalledExactlyOnceWith(key, expected);
  });

  test("a move that changes nothing is not reported", () => {
    const onMoveGroup = vi.fn();
    const { result } = setup({ onMoveGroup });
    act(() => result.current.actions.moveGroupByKey("g1", "top"));
    act(() => result.current.actions.moveGroupByKey("g1", "up"));
    act(() => result.current.actions.moveGroupByKey("g4", "down"));
    act(() => result.current.actions.moveGroupByKey("g4", "bottom"));
    expect(onMoveGroup).not.toHaveBeenCalled();
    expect(keysOf(result)).toEqual(["g1", "g2", "g3", "g4"]);
  });

  test("a priority client group only moves inside the priority groups", () => {
    const onMoveGroup = vi.fn();
    const { result } = setup({ onMoveGroup }, ["g1", "g2"]);
    act(() => result.current.actions.moveGroupByKey("g2", "down"));
    expect(onMoveGroup).not.toHaveBeenCalled();
    act(() => result.current.actions.moveGroupByKey("g2", "top"));
    expect(keysOf(result)).toEqual(["g2", "g1", "g3", "g4"]);
  });

  test("a regular group never moves above the priority client groups", () => {
    const onMoveGroup = vi.fn();
    const { result } = setup({ onMoveGroup }, ["g1", "g2"]);
    act(() => result.current.actions.moveGroupByKey("g3", "top"));
    expect(onMoveGroup).not.toHaveBeenCalled();
    act(() => result.current.actions.moveGroupByKey("g4", "up"));
    expect(keysOf(result)).toEqual(["g1", "g2", "g4", "g3"]);
  });

  test("closes the group menu even when nothing moved", () => {
    const { result } = setup();
    act(() => result.current.actions.openGroupMenu("g1"));
    act(() => result.current.actions.moveGroupByKey("g1", "top"));
    expect(result.current.state.open_group_menu_key).toBeNull();
  });
});

describe("Archive group", () => {
  test("hides the group and reports it, without going through delete", () => {
    const onArchiveGroup = vi.fn();
    const onRemoveGroup = vi.fn();
    const { result } = setup({ onArchiveGroup, onRemoveGroup });
    act(() => result.current.actions.archiveGroup("g2"));
    expect(keysOf(result)).toEqual(["g1", "g3", "g4"]);
    expect(onArchiveGroup).toHaveBeenCalledExactlyOnceWith("g2");
    expect(onRemoveGroup).not.toHaveBeenCalled();
  });
});

describe("Delete group", () => {
  test("removes the group and reports it right away when the board has no confirmation step", () => {
    const onRemoveGroup = vi.fn();
    const { result } = setup({ onRemoveGroup });
    act(() => result.current.actions.removeGroup("g2"));
    expect(keysOf(result)).toEqual(["g1", "g3", "g4"]);
    expect(onRemoveGroup).toHaveBeenCalledExactlyOnceWith("g2");
  });

  test("leaves the group in place and asks the board to confirm when it has a confirmation step", () => {
    const onRequestRemoveGroup = vi.fn();
    const onRemoveGroup = vi.fn();
    const { result } = setup({ onRequestRemoveGroup, onRemoveGroup });
    act(() => result.current.actions.openGroupMenu("g2"));
    act(() => result.current.actions.removeGroup("g2"));
    expect(keysOf(result)).toEqual(["g1", "g2", "g3", "g4"]);
    expect(onRequestRemoveGroup).toHaveBeenCalledExactlyOnceWith("g2");
    expect(onRemoveGroup).not.toHaveBeenCalled();
    expect(result.current.state.open_group_menu_key).toBeNull();
  });
});

describe("Rename group and priority", () => {
  test("renaming reports the trimmed title", () => {
    const onRenameGroup = vi.fn();
    const { result } = setup({ onRenameGroup });
    act(() => result.current.actions.startGroupRename("g2", "Group g2"));
    act(() => result.current.actions.updateGroupDraft("  Backlog  "));
    act(() => result.current.actions.commitGroupRename());
    expect(onRenameGroup).toHaveBeenCalledExactlyOnceWith("g2", "Backlog");
    expect(result.current.state.groups.find((g) => g.key === "g2")?.title).toBe("Backlog");
  });

  test("marking a group as priority reports the new flag, and toggling again clears it", () => {
    const onToggleGroupPriority = vi.fn();
    const { result } = setup({ onToggleGroupPriority });
    act(() => result.current.actions.togglePriority("g2"));
    expect(onToggleGroupPriority).toHaveBeenLastCalledWith("g2", true);
    act(() => result.current.actions.togglePriority("g2"));
    expect(onToggleGroupPriority).toHaveBeenLastCalledWith("g2", false);
  });
});

describe("Collapse and select", () => {
  test("collapsing then expanding all groups reports the collapsed set each time", () => {
    const onCollapsedGroupsChange = vi.fn();
    const { result } = setup({ onCollapsedGroupsChange });
    act(() => result.current.actions.toggleGroupCollapsed("g2"));
    expect(onCollapsedGroupsChange).toHaveBeenLastCalledWith(["g2"]);
    act(() => result.current.actions.expandAllGroups());
    expect(onCollapsedGroupsChange).toHaveBeenLastCalledWith([]);
    expect(result.current.state.collapsed_groups).toEqual({});
  });

  test("Select all items in group selects only that group's rows", () => {
    const { result } = setup();
    act(() => result.current.actions.selectAllInGroup("g2"));
    expect(result.current.state.selected_map).toEqual({ "g2-item": true });
  });
});
