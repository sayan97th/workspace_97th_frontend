import type { BoardTableGroup, BoardTableItem, BoardTableNode } from "@/components/board/table/types";

export const makeNode = (id: string, overrides: Partial<BoardTableNode> = {}): BoardTableNode => ({ id, name: `Row ${id}`, values: {}, ...overrides });

export const makeItem = (id: string, subs: BoardTableNode[] = [], overrides: Partial<BoardTableNode> = {}): BoardTableItem => ({
  ...makeNode(id, overrides),
  subs,
});

export const makeGroup = (key: string, items: BoardTableItem[]): BoardTableGroup => ({
  key,
  title: `Group ${key}`,
  color: "#579bfc",
  tint: "#579bfc",
  is_priority: false,
  items,
  item_title: "Item",
  sub_title: "Subitem",
  base_columns: [],
  custom_columns: [],
  sub_base_columns: [],
  sub_custom_columns: [],
});

/** Group g1 holds item a (subitems a1, a2) and item b, group g2 holds item c. */
export const makeGroups = (): BoardTableGroup[] => [
  makeGroup("g1", [makeItem("a", [makeNode("a1"), makeNode("a2")]), makeItem("b")]),
  makeGroup("g2", [makeItem("c")]),
];

export const itemIdsOf = (group: BoardTableGroup): string[] => group.items.map((item) => item.id);
