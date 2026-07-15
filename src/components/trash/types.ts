import type { BoardPersonOption } from "@/components/board";

/** Kind of asset a trash/archive row represents, driving its type badge in the table. */
export type TrashItemType = "item" | "subitem" | "column" | "group" | "doc" | "dashboard" | "board";

/** Which panel of the account Trash dialog is active. */
export type TrashTabId = "trash" | "archive";

/** One deleted (or archived) asset. `deleted_by_id` references {@link BoardPersonOption.id}. */
export type TrashEntry = {
  id: string;
  name: string;
  type: TrashItemType;
  /** Breadcrumb this entry was deleted from, e.g. ["Fulfillment", "Client Hub"]. */
  deleted_from: string[];
  deleted_by_id: string;
  /** Pre-formatted relative time, e.g. "4 hr ago" — matches this app's other activity feeds. */
  deleted_label: string;
};

export type { BoardPersonOption };
