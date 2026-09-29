import type { BoardAutomationAction, BoardAutomationDefinition, BoardAutomationTriggerType } from "@/types/board-automation";
import type { ColumnKind } from "../../table/types";
import { browserTimezone, type AutomationBuilderContext } from "./automationCatalog";

/**
 * The built-in recipes of the Create tab, each one a prefilled sentence the builder opens with.
 * Columns are picked from the table when one of the right kind exists, every other token is left
 * for the user to fill in.
 */

export type TemplateCategory = "status" | "dates" | "items" | "notifications" | "recurring" | "subitems" | "other_boards";

export const TEMPLATE_CATEGORIES: { id: TemplateCategory | "all" | "saved"; label: string }[] = [
  { id: "all", label: "All templates" },
  { id: "status", label: "Status change" },
  { id: "dates", label: "Due dates" },
  { id: "items", label: "Item creation" },
  { id: "notifications", label: "Notifications" },
  { id: "recurring", label: "Recurring" },
  { id: "subitems", label: "Subitems" },
  { id: "other_boards", label: "Cross board" },
  { id: "saved", label: "Saved templates" },
];

export type AutomationRecipe = {
  id: string;
  category: TemplateCategory;
  /** `**bold**` marks the words the card highlights, like monday's recipe cards. */
  title: string;
  build: (context: AutomationBuilderContext) => BoardAutomationDefinition;
};

const firstColumnId = (context: AutomationBuilderContext, kinds: ColumnKind[], scope: "item" | "subitem" = "item"): number | null => {
  const column = context.columns.find((entry) => entry.scope === scope && kinds.includes(entry.kind));
  return column ? Number(column.id) : null;
};

const define = (trigger_type: BoardAutomationTriggerType, trigger_column_id: number | null, actions: BoardAutomationAction[], extra: Partial<BoardAutomationDefinition> = {}): BoardAutomationDefinition => ({
  trigger_type,
  trigger_column_id,
  trigger_value: null,
  trigger_config: null,
  conditions: [],
  actions,
  ...extra,
});

const status = (context: AutomationBuilderContext) => firstColumnId(context, ["status", "label"]);
const date = (context: AutomationBuilderContext) => firstColumnId(context, ["date"]);
const people = (context: AutomationBuilderContext) => firstColumnId(context, ["people"]);
const notifyAssignees = (context: AutomationBuilderContext): BoardAutomationAction => {
  const column_id = people(context);
  return { type: "notify_person", params: column_id ? { notify_from_people_column_id: column_id } : {} };
};
const changeStatus = (context: AutomationBuilderContext): BoardAutomationAction => {
  const column_id = firstColumnId(context, ["status"]);
  return { type: "set_column_value", params: column_id ? { target_column_id: column_id } : {} };
};

export const AUTOMATION_RECIPES: AutomationRecipe[] = [
  {
    id: "status_move",
    category: "status",
    title: "When **status** changes to **something**, **move item** to **group**",
    build: (context) => define("status_changed", status(context), [{ type: "move_to_group", params: {} }]),
  },
  {
    id: "status_notify",
    category: "status",
    title: "When **status** changes to **something**, **notify** **someone**",
    build: (context) => define("status_changed", status(context), [notifyAssignees(context)]),
  },
  {
    id: "status_from_to",
    category: "status",
    title: "When **status** changes from **something** to **something**, **notify** **someone**",
    build: (context) => define("status_changed", status(context), [notifyAssignees(context)]),
  },
  {
    id: "status_create_item",
    category: "status",
    title: "When **status** changes to **something**, **create an item** in **group**",
    build: (context) => define("status_changed", status(context), [{ type: "create_item", params: { item_name: "{item_name}", copy_values: false } }]),
  },
  {
    id: "status_archive",
    category: "status",
    title: "When **status** changes to **something**, **archive item**",
    build: (context) => define("status_changed", status(context), [{ type: "archive_item", params: {} }]),
  },
  {
    id: "status_multi",
    category: "status",
    title: "When **status** changes to **something**, **notify** **someone**, **move item** to **group** and **set date** to **today**",
    build: (context) => {
      const date_id = date(context);
      return define("status_changed", status(context), [
        notifyAssignees(context),
        { type: "move_to_group", params: {} },
        { type: "set_date", params: { offset_days: 0, ...(date_id ? { target_column_id: date_id } : {}) } },
      ]);
    },
  },
  {
    id: "date_notify",
    category: "dates",
    title: "When **date** arrives, **notify** **someone**",
    build: (context) => define("date_arrived", date(context), [notifyAssignees(context)], { trigger_config: { offset_days: 0, timezone: browserTimezone() } }),
  },
  {
    id: "date_soon_notify",
    category: "dates",
    title: "When **date** is **1 day away**, **notify** **someone**",
    build: (context) => define("date_arrived", date(context), [notifyAssignees(context)], { trigger_config: { offset_days: -1, time: "09:00", timezone: browserTimezone() } }),
  },
  {
    id: "date_status",
    category: "dates",
    title: "When **date** arrives, **change status** to **something**",
    build: (context) => define("date_arrived", date(context), [changeStatus(context)], { trigger_config: { offset_days: 0, timezone: browserTimezone() } }),
  },
  {
    id: "date_overdue",
    category: "dates",
    title: "When **date** has passed and **status** is not **something**, **change status** to **something**",
    build: (context) => {
      const status_id = firstColumnId(context, ["status"]);
      return define("date_arrived", date(context), [changeStatus(context)], {
        trigger_config: { offset_days: 1, timezone: browserTimezone() },
        conditions: status_id ? [{ column_id: String(status_id), condition: "is_not", value: "", values: [] }] : [],
      });
    },
  },
  {
    id: "date_create_item",
    category: "dates",
    title: "When **date** arrives, **create an item** for the follow up",
    build: (context) => define("date_arrived", date(context), [{ type: "create_item", params: { item_name: "Follow up: {item_name}" } }], { trigger_config: { offset_days: 0, timezone: browserTimezone() } }),
  },
  {
    id: "item_created_assign",
    category: "items",
    title: "When an **item is created**, **assign** the **item creator**",
    build: (context) => {
      const people_id = people(context);
      return define("item_created", null, [{ type: "assign_person", params: { assign_mode: "creator", ...(people_id ? { target_column_id: people_id } : {}) } }]);
    },
  },
  {
    id: "item_created_defaults",
    category: "items",
    title: "When an **item is created**, set **status** to **something**",
    build: (context) => define("item_created", null, [changeStatus(context)]),
  },
  {
    id: "item_created_notify",
    category: "items",
    title: "When an **item is created**, **notify** **someone**",
    build: () => define("item_created", null, [{ type: "notify_person", params: {} }]),
  },
  {
    id: "item_moved_status",
    category: "items",
    title: "When an item is **moved to group**, **change status** to **something**",
    build: (context) => define("item_moved_to_group", null, [changeStatus(context)]),
  },
  {
    id: "person_assigned_status",
    category: "items",
    title: "When **someone** is assigned, **change status** to **something**",
    build: (context) => define("person_assigned", people(context), [changeStatus(context)]),
  },
  {
    id: "column_notify",
    category: "notifications",
    title: "When **column** changes to **something**, **notify** **someone**",
    build: (context) => define("column_changed", firstColumnId(context, ["status", "dropdown", "number", "checkbox"]), [notifyAssignees(context)]),
  },
  {
    id: "update_notify",
    category: "notifications",
    title: "When an **update is posted**, **notify** **someone**",
    build: (context) => define("update_posted", null, [notifyAssignees(context)]),
  },
  {
    id: "status_post_update",
    category: "notifications",
    title: "When **status** changes to **something**, **create an update** on the item",
    build: (context) => define("status_changed", status(context), [{ type: "post_update", params: { message: "{column_name} changed to {new_value}." } }]),
  },
  {
    id: "recurring_create",
    category: "recurring",
    title: "Every **Monday**, **create an item** in **group**",
    build: () => define("recurring", null, [{ type: "create_item", params: { item_name: "Weekly task {date}" } }], {
      trigger_config: { schedule: { frequency: "weekly", weekdays: [1], time: "09:00", timezone: browserTimezone() } },
    }),
  },
  {
    id: "recurring_notify",
    category: "recurring",
    title: "Every **day**, **notify** **someone**",
    build: () => define("recurring", null, [{ type: "notify_person", params: {} }], {
      trigger_config: { schedule: { frequency: "daily", time: "09:00", timezone: browserTimezone() } },
    }),
  },
  {
    id: "status_subitems",
    category: "subitems",
    title: "When **status** changes to **something**, **create subitems** as a checklist",
    build: (context) => define("status_changed", status(context), [{ type: "create_subitem", params: { subitem_names: ["Plan", "Build", "Review"] } }]),
  },
  {
    id: "subitem_status_parent",
    category: "subitems",
    title: "When a **subitem status** changes to **something**, **change** the item **status** to **something**",
    build: (context) => define("status_changed", firstColumnId(context, ["status", "label"], "subitem"), [changeStatus(context)]),
  },
  {
    id: "subitem_created_notify",
    category: "subitems",
    title: "When a **subitem is created**, **notify** **someone**",
    build: () => define("subitem_created", null, [{ type: "notify_person", params: {} }]),
  },
  {
    id: "cross_board_create",
    category: "other_boards",
    title: "When **status** changes to **something**, **create an item** on **another board**",
    build: (context) => define("status_changed", status(context), [{ type: "create_item", params: { item_name: "{item_name}", copy_values: true, target_board_id: null } }]),
  },
  {
    id: "cross_board_move",
    category: "other_boards",
    title: "When **status** changes to **something**, **move item** to **another board**",
    build: (context) => define("status_changed", status(context), [{ type: "move_to_board", params: {} }]),
  },
];

/** Splits a `**bold**` title into plain and highlighted parts. */
export function titleParts(title: string): { text: string; is_bold: boolean }[] {
  return title.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part) => (part.startsWith("**") ? { text: part.slice(2, -2), is_bold: true } : { text: part, is_bold: false }));
}
