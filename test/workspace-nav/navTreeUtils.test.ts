import { describe, expect, test } from "vitest";
import type { WorkspaceNavNode } from "@/types/workspace";
import {
  applyReorderToTree,
  buildDropPayload,
  filterNavTree,
  flattenVisibleNodes,
  resolveDropPosition,
  splitByMatch,
} from "@/components/workspace-nav/navTreeUtils";

const makeNode = (id: number, label: string, overrides: Partial<WorkspaceNavNode> = {}): WorkspaceNavNode =>
  ({
    id,
    workspace_id: 1,
    parent_id: null,
    type: "leaf",
    label,
    description: null,
    slug: label.toLowerCase(),
    icon: null,
    color: null,
    view_key: "board",
    href: null,
    display_style: null,
    board_type: "main",
    item_column_label: null,
    item_column_width: null,
    sub_item_column_width: null,
    is_favorite: false,
    is_priority: false,
    is_archived: false,
    comments_count: 0,
    position: 0,
    created_at: null,
    creator: null,
    owners: [],
    children: [],
    ...overrides,
  }) as WorkspaceNavNode;

/**
 * Root: Clients (folder: Acme, Globex, Archive (folder: Old)), Roadmap, Budget.
 */
const makeTree = (): WorkspaceNavNode[] => [
  makeNode(1, "Clients", {
    type: "group",
    children: [
      makeNode(11, "Acme", { parent_id: 1 }),
      makeNode(12, "Globex", { parent_id: 1 }),
      makeNode(13, "Archive", { parent_id: 1, type: "group", children: [makeNode(131, "Old", { parent_id: 13 })] }),
    ],
  }),
  makeNode(2, "Roadmap"),
  makeNode(3, "Budget"),
];

const idsOf = (nodes: WorkspaceNavNode[]) => nodes.map((node) => node.id);

describe("filterNavTree", () => {
  test("keeps matches and the folders leading to them, case insensitive", () => {
    const filtered = filterNavTree(makeTree(), "old");
    expect(idsOf(filtered)).toEqual([1]);
    expect(idsOf(filtered[0].children)).toEqual([13]);
    expect(idsOf(filtered[0].children[0].children)).toEqual([131]);
  });

  test("a matching folder keeps all of its content", () => {
    const filtered = filterNavTree(makeTree(), "clients");
    expect(idsOf(filtered[0].children)).toEqual([11, 12, 13]);
  });

  test("an empty query returns the tree untouched", () => {
    const tree = makeTree();
    expect(filterNavTree(tree, "  ")).toBe(tree);
  });
});

describe("flattenVisibleNodes", () => {
  test("lists rows in display order and skips the content of collapsed folders", () => {
    const rows = flattenVisibleNodes(makeTree(), (group_id) => group_id !== 13);
    expect(rows.map((row) => row.node.id)).toEqual([1, 11, 12, 13, 2, 3]);
    expect(rows.find((row) => row.node.id === 13)?.depth).toBe(1);
    expect(rows.find((row) => row.node.id === 12)?.parent_id).toBe(1);
  });
});

describe("resolveDropPosition", () => {
  const rect = { top: 100, height: 40 };

  test("a folder splits into before, inside and after", () => {
    const folder = makeNode(1, "Folder", { type: "group" });
    expect(resolveDropPosition(folder, 105, rect)).toBe("before");
    expect(resolveDropPosition(folder, 120, rect)).toBe("inside");
    expect(resolveDropPosition(folder, 138, rect)).toBe("after");
  });

  test("a board only splits into before and after", () => {
    const board = makeNode(2, "Board");
    expect(resolveDropPosition(board, 119, rect)).toBe("before");
    expect(resolveDropPosition(board, 121, rect)).toBe("after");
  });
});

describe("buildDropPayload", () => {
  test("reorders siblings inside the same parent", () => {
    expect(buildDropPayload(makeTree(), 3, { node_id: 2, position: "before" })).toEqual({
      moved_item_id: 3,
      target_parent_id: null,
      target_ordered_ids: [1, 3, 2],
    });
  });

  test("moves a root board into a folder, appended, and resequences the old parent", () => {
    expect(buildDropPayload(makeTree(), 2, { node_id: 1, position: "inside" })).toEqual({
      moved_item_id: 2,
      target_parent_id: 1,
      target_ordered_ids: [11, 12, 13, 2],
      source_parent_id: null,
      source_ordered_ids: [1, 3],
    });
  });

  test("moves a nested board out to the root, after a given row", () => {
    expect(buildDropPayload(makeTree(), 131, { node_id: 2, position: "after" })).toEqual({
      moved_item_id: 131,
      target_parent_id: null,
      target_ordered_ids: [1, 2, 131, 3],
    });
  });

  test("refuses to drop a folder into itself or its own content, and ignores no op drops", () => {
    expect(buildDropPayload(makeTree(), 1, { node_id: 13, position: "inside" })).toBeNull();
    expect(buildDropPayload(makeTree(), 1, { node_id: 131, position: "before" })).toBeNull();
    expect(buildDropPayload(makeTree(), 2, { node_id: 2, position: "after" })).toBeNull();
    expect(buildDropPayload(makeTree(), 2, { node_id: 1, position: "after" })).toBeNull();
  });
});

describe("applyReorderToTree", () => {
  test("applies a cross folder move without mutating the input", () => {
    const tree = makeTree();
    const payload = buildDropPayload(tree, 2, { node_id: 1, position: "inside" });
    const next = applyReorderToTree(tree, payload!);
    expect(idsOf(next)).toEqual([1, 3]);
    expect(idsOf(next[0].children)).toEqual([11, 12, 13, 2]);
    expect(next[0].children[3].parent_id).toBe(1);
    expect(idsOf(tree)).toEqual([1, 2, 3]);
  });
});

describe("splitByMatch", () => {
  test("marks every case insensitive occurrence", () => {
    expect(splitByMatch("Board of boards", "BOARD")).toEqual([
      { text: "Board", is_match: true },
      { text: " of ", is_match: false },
      { text: "board", is_match: true },
      { text: "s", is_match: false },
    ]);
  });
});
