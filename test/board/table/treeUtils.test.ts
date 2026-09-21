import { describe, expect, test } from "vitest";
import type { BoardTableItem, BoardTableNode } from "@/components/board/table/types";
import { findNode, insertItemIntoGroup, insertSubIntoItem, locateNode, removeNodeById, updateNodeById } from "@/components/board/table/treeUtils";
import { itemIdsOf, makeGroups, makeItem, makeNode } from "../../support/tableFixtures";

// These are the operations the standalone demo table (no API) runs for the row menu.

describe("locateNode", () => {
  test("finds a root item, a subitem and reports null for an unknown id", () => {
    const groups = makeGroups();
    expect(locateNode(groups, "b")).toEqual({ kind: "item", group_key: "g1", item_index: 1 });
    expect(locateNode(groups, "a2")).toEqual({ kind: "sub", group_key: "g1", item_id: "a", item_index: 0, sub_index: 1 });
    expect(locateNode(groups, "zzz")).toBeNull();
  });
});

describe("removeNodeById", () => {
  test("removes a root item and hands it back", () => {
    const result = removeNodeById(makeGroups(), "b");
    expect(itemIdsOf(result.groups[0])).toEqual(["a"]);
    expect(result.removed_item?.id).toBe("b");
    expect(result.removed_sub).toBeNull();
  });

  test("removes a subitem and hands it back", () => {
    const result = removeNodeById(makeGroups(), "a1");
    expect(result.groups[0].items[0].subs.map((s) => s.id)).toEqual(["a2"]);
    expect(result.removed_sub?.id).toBe("a1");
    expect(result.removed_item).toBeNull();
  });

  test("an unknown id changes nothing", () => {
    const groups = makeGroups();
    const result = removeNodeById(groups, "zzz");
    expect(result.groups).toBe(groups);
    expect(result.removed_item).toBeNull();
    expect(result.removed_sub).toBeNull();
  });
});

describe("moving rows around locally (Move to group, Convert to subitem, Convert to item, Move to item)", () => {
  test("Move to group appends the removed item to the end of the target group", () => {
    const { groups, removed_item } = removeNodeById(makeGroups(), "b");
    const next = insertItemIntoGroup(groups, "g2", removed_item as BoardTableItem);
    expect(itemIdsOf(next[0])).toEqual(["a"]);
    expect(itemIdsOf(next[1])).toEqual(["c", "b"]);
  });

  test("Convert to subitem nests the removed item under the target item", () => {
    const { groups, removed_item } = removeNodeById(makeGroups(), "c");
    const demoted: BoardTableNode = { id: removed_item!.id, name: removed_item!.name, values: removed_item!.values };
    const next = insertSubIntoItem(groups, "b", demoted);
    expect(next[0].items[1].subs.map((s) => s.id)).toEqual(["c"]);
    expect(next[1].items).toHaveLength(0);
  });

  test("Convert to item appends the promoted subitem to its group's root list", () => {
    const { groups, removed_sub, location } = removeNodeById(makeGroups(), "a1");
    const promoted: BoardTableItem = { ...(removed_sub as BoardTableNode), subs: [] };
    const next = insertItemIntoGroup(groups, location!.group_key, promoted);
    expect(itemIdsOf(next[0])).toEqual(["a", "b", "a1"]);
    expect(next[0].items[0].subs.map((s) => s.id)).toEqual(["a2"]);
  });

  test("Move to item re-parents a subitem under another item", () => {
    const { groups, removed_sub } = removeNodeById(makeGroups(), "a1");
    const next = insertSubIntoItem(groups, "c", removed_sub as BoardTableNode);
    expect(next[1].items[0].subs.map((s) => s.id)).toEqual(["a1"]);
    expect(next[0].items[0].subs.map((s) => s.id)).toEqual(["a2"]);
  });

  test("Create new row below inserts at the index right after the reference", () => {
    const groups = makeGroups();
    expect(itemIdsOf(insertItemIntoGroup(groups, "g1", makeItem("new"), 1)[0])).toEqual(["a", "new", "b"]);
    expect(insertSubIntoItem(groups, "a", makeNode("new"), 1)[0].items[0].subs.map((s) => s.id)).toEqual(["a1", "new", "a2"]);
  });

  test("an index past the end appends and a negative index prepends", () => {
    const groups = makeGroups();
    expect(itemIdsOf(insertItemIntoGroup(groups, "g1", makeItem("x"), 99)[0])).toEqual(["a", "b", "x"]);
    expect(itemIdsOf(insertItemIntoGroup(groups, "g1", makeItem("x"), -5)[0])).toEqual(["x", "a", "b"]);
  });

  test("inserting never mutates the original groups", () => {
    const groups = makeGroups();
    insertItemIntoGroup(groups, "g1", makeItem("x"));
    insertSubIntoItem(groups, "a", makeNode("y"));
    expect(itemIdsOf(groups[0])).toEqual(["a", "b"]);
    expect(groups[0].items[0].subs).toHaveLength(2);
  });
});

describe("updateNodeById and findNode", () => {
  test("updates the priority flag of an item and of a subitem independently", () => {
    let groups = makeGroups();
    groups = updateNodeById(groups, "a", (n) => ({ ...n, is_priority: true }));
    groups = updateNodeById(groups, "a2", (n) => ({ ...n, is_priority: true }));
    expect(findNode(groups, "a")?.is_priority).toBe(true);
    expect(findNode(groups, "a2")?.is_priority).toBe(true);
    expect(findNode(groups, "a1")?.is_priority).toBeUndefined();
    expect(findNode(groups, "b")?.is_priority).toBeUndefined();
  });

  test("sets and clears the recurrence of a root item", () => {
    let groups = makeGroups();
    groups = updateNodeById(groups, "b", (n) => ({ ...n, recurrence: { frequency: "weekly", interval_count: 2 } }));
    expect(findNode(groups, "b")?.recurrence).toEqual({ frequency: "weekly", interval_count: 2 });
    groups = updateNodeById(groups, "b", (n) => ({ ...n, recurrence: null }));
    expect(findNode(groups, "b")?.recurrence).toBeNull();
  });

  test("findNode returns null for an unknown id", () => {
    expect(findNode(makeGroups(), "zzz")).toBeNull();
  });
});
