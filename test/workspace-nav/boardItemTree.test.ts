import { describe, expect, test } from "vitest";
import {
  findItemInTree,
  insertAfterSibling,
  insertItemBelowInTree,
  mapItemInTree,
  relocateItemInTree,
  removeItemFromTree,
  withGroupInTree,
} from "@/components/workspace-nav/boardItemTree";
import { idsOf, makeItemDto, makeItemTree, makeSubDto } from "../support/boardItemFixtures";

describe("findItemInTree, mapItemInTree and removeItemFromTree", () => {
  test("find reaches a root row and a nested subitem, and returns undefined for a missing id", () => {
    const tree = makeItemTree();
    expect(findItemInTree(tree, 2)?.name).toBe("Item 2");
    expect(findItemInTree(tree, 12)?.parent_id).toBe(1);
    expect(findItemInTree(tree, 999)).toBeUndefined();
  });

  test("map updates a nested subitem without touching its siblings or mutating the input", () => {
    const tree = makeItemTree();
    const next = mapItemInTree(tree, 12, (item) => ({ ...item, name: "Renamed" }));
    expect(findItemInTree(next, 12)?.name).toBe("Renamed");
    expect(findItemInTree(next, 11)?.name).toBe("Item 11");
    expect(findItemInTree(tree, 12)?.name).toBe("Item 12");
  });

  test("remove drops a subitem from its parent and a root row from the list", () => {
    const tree = makeItemTree();
    expect(idsOf(removeItemFromTree(tree, 11)[0].children)).toEqual([12]);
    expect(idsOf(removeItemFromTree(tree, 2))).toEqual([1, 3]);
  });

  test("remove drops a root row together with its subitems", () => {
    const next = removeItemFromTree(makeItemTree(), 1);
    expect(idsOf(next)).toEqual([2, 3]);
    expect(findItemInTree(next, 11)).toBeUndefined();
  });
});

describe("withGroupInTree", () => {
  test("points the row and every descendant at the new table", () => {
    const moved = withGroupInTree(makeItemTree()[0], 20);
    expect(moved.group_id).toBe(20);
    expect(moved.children.map((child) => child.group_id)).toEqual([20, 20]);
  });
});

describe("insertAfterSibling", () => {
  test("places the created row right below the reference and shifts the later siblings of the same table", () => {
    const siblings = [makeItemDto(1, { position: 0 }), makeItemDto(2, { position: 1 }), makeItemDto(3, { position: 2 })];
    const next = insertAfterSibling(siblings, siblings[0], makeItemDto(9, { position: 1 }));
    expect(idsOf(next)).toEqual([1, 9, 2, 3]);
    expect(next.map((item) => item.position)).toEqual([0, 1, 2, 3]);
  });

  test("appending below the last row shifts nothing", () => {
    const siblings = [makeItemDto(1, { position: 0 }), makeItemDto(2, { position: 1 })];
    const next = insertAfterSibling(siblings, siblings[1], makeItemDto(9, { position: 2 }));
    expect(idsOf(next)).toEqual([1, 2, 9]);
    expect(next.map((item) => item.position)).toEqual([0, 1, 2]);
  });

  test("leaves the positions of other tables alone", () => {
    const siblings = [makeItemDto(1, { position: 0 }), makeItemDto(3, { group_id: 20, position: 1 }), makeItemDto(2, { position: 1 })];
    const next = insertAfterSibling(siblings, siblings[0], makeItemDto(9, { position: 1 }));
    expect(next.find((item) => item.id === 3)?.position).toBe(1);
    expect(next.find((item) => item.id === 2)?.position).toBe(2);
  });

  test("keeps the array order of the tables it does not touch", () => {
    const siblings = [makeItemDto(1, { position: 0 }), makeItemDto(3, { group_id: 20, position: 0 }), makeItemDto(2, { position: 1 })];
    expect(idsOf(insertAfterSibling(siblings, siblings[0], makeItemDto(9, { position: 1 })))).toEqual([1, 9, 3, 2]);
  });
});

describe("insertItemBelowInTree", () => {
  test("a root row lands below its reference at the root", () => {
    const tree = makeItemTree();
    const next = insertItemBelowInTree(tree, tree[0], makeItemDto(9, { position: 1 }));
    expect(idsOf(next)).toEqual([1, 9, 2, 3]);
    expect(findItemInTree(next, 2)?.position).toBe(2);
  });

  test("a subitem lands below its reference inside the same parent and bumps the parent's count", () => {
    const tree = makeItemTree();
    const next = insertItemBelowInTree(tree, tree[0].children[0], makeSubDto(9, 1, { position: 1 }));
    expect(idsOf(next)).toEqual([1, 2, 3]);
    expect(idsOf(next[0].children)).toEqual([11, 9, 12]);
    expect(next[0].children.map((child) => child.position)).toEqual([0, 1, 2]);
    expect(next[0].subitem_count).toBe(3);
  });

  test("does not mutate the input tree", () => {
    const tree = makeItemTree();
    insertItemBelowInTree(tree, tree[0].children[0], makeSubDto(9, 1, { position: 1 }));
    expect(idsOf(tree[0].children)).toEqual([11, 12]);
    expect(tree[0].subitem_count).toBe(2);
  });
});

describe("relocateItemInTree", () => {
  test("converting a root row into a subitem moves it under the new parent, at the end", () => {
    const tree = makeItemTree();
    const updated = makeItemDto(2, { parent_id: 1, group_id: 10, position: 2, values: { "5": "kept" } });
    const next = relocateItemInTree(tree, tree[1], updated);
    expect(idsOf(next)).toEqual([1, 3]);
    expect(idsOf(next[0].children)).toEqual([11, 12, 2]);
    expect(next[0].subitem_count).toBe(3);
    expect(next[0].children[2]).toMatchObject({ parent_id: 1, position: 2, values: { "5": "kept" } });
  });

  test("the response only replaces placement and values, the rest of the row stays", () => {
    const tree = [makeItemDto(1), makeItemDto(2, { name: "Keep me", comment_count: 4, is_priority: true, values: { "5": "old" } })];
    const updated = makeItemDto(2, { parent_id: 1, name: "Server copy", comment_count: 0, is_priority: false, position: 0, values: { "9": "new" } });
    const moved = relocateItemInTree(tree, tree[1], updated)[0].children[0];
    expect(moved).toMatchObject({ name: "Keep me", comment_count: 4, is_priority: true, values: { "9": "new" } });
  });

  test("converting a row into a subitem of a parent in another table re-points it at that table", () => {
    const tree = makeItemTree();
    const updated = makeItemDto(2, { parent_id: 3, group_id: 20, position: 0 });
    const moved = relocateItemInTree(tree, tree[1], updated).find((item) => item.id === 3)?.children[0];
    expect(moved?.group_id).toBe(20);
  });

  test("promoting a subitem appends it to the root list and lowers its old parent's count", () => {
    const tree = makeItemTree();
    const next = relocateItemInTree(tree, tree[0].children[0], makeItemDto(11, { parent_id: null, group_id: 10, position: 2 }));
    expect(idsOf(next)).toEqual([1, 2, 3, 11]);
    expect(idsOf(next[0].children)).toEqual([12]);
    expect(next[0].subitem_count).toBe(1);
    expect(next[3]).toMatchObject({ parent_id: null, position: 2 });
  });

  test("moving a subitem to another parent updates both counts and keeps a single copy", () => {
    const tree = makeItemTree();
    const next = relocateItemInTree(tree, tree[0].children[0], makeItemDto(11, { parent_id: 2, group_id: 10, position: 0 }));
    expect(idsOf(next[0].children)).toEqual([12]);
    expect(idsOf(next[1].children)).toEqual([11]);
    expect(next[0].subitem_count).toBe(1);
    expect(next[1].subitem_count).toBe(1);
    expect(next.flatMap((item) => [item.id, ...item.children.map((child) => child.id)]).filter((id) => id === 11)).toHaveLength(1);
  });

  test("the old parent's count never goes below zero", () => {
    const tree = [makeItemDto(1, { subitem_count: 0, children: [makeSubDto(11, 1)] })];
    const next = relocateItemInTree(tree, tree[0].children[0], makeItemDto(11, { parent_id: null, position: 0 }));
    expect(next[0].subitem_count).toBe(0);
  });

  test("does not mutate the input tree", () => {
    const tree = makeItemTree();
    relocateItemInTree(tree, tree[1], makeItemDto(2, { parent_id: 1, position: 2 }));
    expect(idsOf(tree)).toEqual([1, 2, 3]);
    expect(idsOf(tree[0].children)).toEqual([11, 12]);
  });
});
