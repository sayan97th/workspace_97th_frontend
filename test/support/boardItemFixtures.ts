import type { BoardItemDto } from "@/types/board-content";

/** A board item as the API returns it, with sensible defaults. */
export const makeItemDto = (id: number, overrides: Partial<BoardItemDto> = {}): BoardItemDto => ({
  id,
  board_id: 1,
  group_id: 10,
  parent_id: null,
  name: `Item ${id}`,
  description: null,
  position: 0,
  is_archived: false,
  is_priority: false,
  values: {},
  comment_count: 0,
  attachment_count: 0,
  checklist_total_count: 0,
  checklist_done_count: 0,
  subitem_count: 0,
  children: [],
  recurrence: null,
  ...overrides,
} as BoardItemDto);

/** A subitem DTO: an item with a parent. */
export const makeSubDto = (id: number, parent_id: number, overrides: Partial<BoardItemDto> = {}): BoardItemDto =>
  makeItemDto(id, { parent_id, ...overrides });

export const idsOf = (items: BoardItemDto[]): number[] => items.map((item) => item.id);

/** Two tables: 10 holds items 1 (with subitems 11 and 12) and 2, and table 20 holds item 3. */
export const makeItemTree = (): BoardItemDto[] => [
  makeItemDto(1, { position: 0, subitem_count: 2, children: [makeSubDto(11, 1, { position: 0 }), makeSubDto(12, 1, { position: 1 })] }),
  makeItemDto(2, { position: 1 }),
  makeItemDto(3, { group_id: 20, position: 0 }),
];
