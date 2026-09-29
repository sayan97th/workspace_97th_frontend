import type { BoardAutomationAction, BoardAutomationCondition, BoardAutomationDefinition, BoardAutomationTriggerType } from "@/types/board-automation";
import type { ColumnKind } from "../../table/types";
import { browserTimezone, type AutomationBuilderContext } from "./automationCatalog";

/**
 * The built-in recipes of the Create tab, each one a prefilled sentence the builder opens with,
 * grouped like monday's automation center. Columns are picked from the table when one of the
 * right kind exists; `requires` lists the columns a recipe needs, so the gallery can offer to add
 * the missing ones. Every other token is left for the user to fill in. No AI anywhere.
 */

/** Categories a recipe can be listed under. A recipe may sit in several. */
export type TemplateCategory = "recommended" | "productivity" | "dates" | "communication" | "sync" | "connected";

/** Every entry of the category rail, the recipe categories plus the views that are not recipes. */
export type GalleryCategory = "explore" | TemplateCategory | "account" | "saved";

/** Something outside the board a recipe talks to, shown as the icon chain on its card. */
export type RecipeApp = "email" | "slack" | "webhook" | "form" | "team";

/** A column a recipe needs. Two entries of the same kind ask for two such columns. */
export type RecipeColumnNeed = { kind: ColumnKind; scope: "item" | "subitem"; label: string };

export type AutomationRecipe = {
  id: string;
  categories: TemplateCategory[];
  /** `**bold**` marks the words the card highlights, like monday's recipe cards. */
  title: string;
  /** Outside apps, empty for recipes that stay inside the board. */
  apps: RecipeApp[];
  requires: RecipeColumnNeed[];
  build: (context: AutomationBuilderContext) => BoardAutomationDefinition;
};

export const RECIPE_APP_LABELS: Record<RecipeApp, string> = {
  email: "Email",
  slack: "Slack",
  webhook: "Webhooks",
  form: "Forms",
  team: "Teams",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** The id of the `nth` column (0 based) of one of `kinds`, null when the table has fewer. */
const pick = (context: AutomationBuilderContext, kinds: ColumnKind[], nth = 0, scope: "item" | "subitem" = "item"): number | null => {
  const column = context.columns.filter((entry) => entry.scope === scope && kinds.includes(entry.kind))[nth];
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

const withColumn = <T extends object>(key: string, column_id: number | null, params: T): T => (column_id ? { ...params, [key]: column_id } : params);

const condition = (column_id: number | null | string, operator: string, values: string[] = [], value = ""): BoardAutomationCondition[] =>
  column_id ? [{ column_id: String(column_id), condition: operator, value, values }] : [];

const status = (context: AutomationBuilderContext) => pick(context, ["status", "label"]);
const date = (context: AutomationBuilderContext, nth = 0) => pick(context, ["date"], nth);
const people = (context: AutomationBuilderContext) => pick(context, ["people"]);

/** The id of the option labelled `label` on the first status column, for recipes about "Done". */
const statusOption = (context: AutomationBuilderContext, label: string): string | null => {
  const column = context.columns.find((entry) => entry.id === String(status(context)));
  return column?.options?.find((option) => option.label.toLowerCase() === label.toLowerCase())?.id ?? null;
};

const dayConfig = (offset_days = 0, time?: string) => ({ offset_days, timezone: browserTimezone(), ...(time ? { time } : {}) });
const daily = () => ({ schedule: { frequency: "daily" as const, time: "09:00", timezone: browserTimezone() } });
const weekly = () => ({ schedule: { frequency: "weekly" as const, weekdays: [1], time: "09:00", timezone: browserTimezone() } });

const notifyAssignees = (context: AutomationBuilderContext): BoardAutomationAction => ({ type: "notify_person", params: withColumn("notify_from_people_column_id", people(context), {}) });
const emailAssignees = (context: AutomationBuilderContext): BoardAutomationAction => ({ type: "send_email", params: withColumn("notify_from_people_column_id", people(context), {}) });
const changeStatus = (context: AutomationBuilderContext): BoardAutomationAction => ({ type: "set_column_value", params: withColumn("target_column_id", pick(context, ["status"]), {}) });
const moveToGroup = (): BoardAutomationAction => ({ type: "move_to_group", params: {} });

const NEEDS = {
  status: { kind: "status", scope: "item", label: "Status" },
  date: { kind: "date", scope: "item", label: "Date" },
  due_date: { kind: "date", scope: "item", label: "Due date" },
  people: { kind: "people", scope: "item", label: "Person" },
  number: { kind: "number", scope: "item", label: "Days" },
  timeline: { kind: "timeline", scope: "item", label: "Timeline" },
  time_tracking: { kind: "time_tracking", scope: "item", label: "Time tracking" },
  connect: { kind: "connect_board", scope: "item", label: "Connected items" },
  text: { kind: "text", scope: "item", label: "Notes" },
  subitem_status: { kind: "status", scope: "subitem", label: "Status" },
} satisfies Record<string, RecipeColumnNeed>;

// ── Recipes ───────────────────────────────────────────────────────────────────

export const AUTOMATION_RECIPES: AutomationRecipe[] = [
  // Recommended
  {
    id: "status_move",
    categories: ["recommended", "productivity"],
    title: "When **status** changes to **something** move item to **group**",
    apps: [],
    requires: [NEEDS.status],
    build: (context) => define("status_changed", status(context), [moveToGroup()]),
  },
  {
    id: "status_notify",
    categories: ["recommended", "communication"],
    title: "When **status** changes to **something** notify **someone**",
    apps: [],
    requires: [NEEDS.status],
    build: (context) => define("status_changed", status(context), [notifyAssignees(context)]),
  },
  {
    id: "item_created_assign_creator",
    categories: ["recommended", "productivity"],
    title: "When an item is created assign creator as **person**",
    apps: [],
    requires: [NEEDS.people],
    build: (context) => define("item_created", null, [{ type: "assign_person", params: withColumn("target_column_id", people(context), { assign_mode: "creator" as const }) }]),
  },
  {
    id: "date_notify",
    categories: ["recommended", "dates", "communication"],
    title: "When **date** arrives **notify someone**",
    apps: [],
    requires: [NEEDS.date],
    build: (context) => define("date_arrived", date(context), [notifyAssignees(context)], { trigger_config: dayConfig() }),
  },
  {
    id: "date_status_notify",
    categories: ["recommended", "dates", "communication"],
    title: "When **date** arrives and only if **status is something** notify **someone**",
    apps: [],
    requires: [NEEDS.date, NEEDS.status],
    build: (context) => define("date_arrived", date(context), [notifyAssignees(context)], { trigger_config: dayConfig(), conditions: condition(status(context), "is") }),
  },
  {
    id: "recurring_create_item",
    categories: ["recommended", "dates"],
    title: "**Every time period** create **an item**",
    apps: [],
    requires: [],
    build: () => define("recurring", null, [{ type: "create_item", params: { item_name: "Weekly task {date}" } }], { trigger_config: weekly() }),
  },
  {
    id: "recurring_duplicate_group",
    categories: ["recommended", "dates", "productivity"],
    title: "**Every time period** duplicate **group**",
    apps: [],
    requires: [],
    build: () => define("recurring", null, [{ type: "duplicate_group", params: { group_name: "Week {week}", with_items: true } }], { trigger_config: weekly() }),
  },
  {
    id: "status_email",
    categories: ["recommended", "communication"],
    title: "When **status** changes to **something**, send an **email** to **someone**",
    apps: ["email"],
    requires: [NEEDS.status],
    build: (context) => define("status_changed", status(context), [emailAssignees(context)]),
  },
  {
    id: "webhook_create_item",
    categories: ["recommended", "sync"],
    title: "When a **webhook** is received, create an item in **group**",
    apps: ["webhook"],
    requires: [],
    build: () => define("webhook_received", null, [{ type: "create_item", params: { item_name: "{payload.name}" } }]),
  },
  {
    id: "form_notify",
    categories: ["recommended", "productivity", "communication"],
    title: "When a **form** is submitted, notify **someone**",
    apps: ["form"],
    requires: [],
    build: () => define("form_submitted", null, [{ type: "notify_person", params: { message: "New form answer: {item_name}" } }]),
  },

  // Productivity
  {
    id: "all_subitems_done",
    categories: ["productivity"],
    title: "When all subitems of an item have the **status** of **something**, change the item's **status** to **something**",
    apps: [],
    requires: [NEEDS.subitem_status, NEEDS.status],
    build: (context) => define("all_subitems_status", pick(context, ["status", "label"], 0, "subitem"), [changeStatus(context)]),
  },
  {
    id: "status_condition_move",
    categories: ["productivity"],
    title: "When **status** changes to **something** and only if **status is something** move item to **group**",
    apps: [],
    requires: [NEEDS.status],
    build: (context) => define("status_changed", status(context), [moveToGroup()], { conditions: condition(status(context), "is") }),
  },
  {
    id: "item_created_set_status",
    categories: ["productivity"],
    title: "When an item is created set **status** to **something**",
    apps: [],
    requires: [NEEDS.status],
    build: (context) => define("item_created", null, [changeStatus(context)]),
  },
  {
    id: "status_archive",
    categories: ["productivity"],
    title: "When **status** changes to **something** archive item",
    apps: [],
    requires: [NEEDS.status],
    build: (context) => define("status_changed", status(context), [{ type: "archive_item", params: {} }]),
  },
  {
    id: "status_delete",
    categories: ["productivity"],
    title: "When **status** changes to **something** delete item",
    apps: [],
    requires: [NEEDS.status],
    build: (context) => define("status_changed", status(context), [{ type: "delete_item", params: {} }]),
  },
  {
    id: "item_created_assign_someone",
    categories: ["productivity"],
    title: "When an item is created **assign someone** as assignee",
    apps: [],
    requires: [NEEDS.people],
    build: (context) => define("item_created", null, [{ type: "assign_person", params: withColumn("target_column_id", people(context), { assign_mode: "user" as const }) }]),
  },
  {
    id: "status_assign",
    categories: ["productivity"],
    title: "When **status** changes to **something assign someone** as **assignee**",
    apps: [],
    requires: [NEEDS.status, NEEDS.people],
    build: (context) => define("status_changed", status(context), [{ type: "assign_person", params: withColumn("target_column_id", people(context), { assign_mode: "user" as const }) }]),
  },
  {
    id: "status_condition_set_status",
    categories: ["productivity"],
    title: "When **status** changes to **something** and only if **status is something** set **status** to **something**",
    apps: [],
    requires: [NEEDS.status],
    build: (context) => define("status_changed", status(context), [changeStatus(context)], { conditions: condition(status(context), "is") }),
  },
  {
    id: "form_assign_status",
    categories: ["productivity"],
    title: "When **a form** is submitted, assign **someone** and set **status** to **something**",
    apps: ["form"],
    requires: [NEEDS.people, NEEDS.status],
    build: (context) =>
      define("form_submitted", null, [{ type: "assign_person", params: withColumn("target_column_id", people(context), { assign_mode: "user" as const }) }, changeStatus(context)]),
  },
  {
    id: "status_done_update",
    categories: ["productivity", "communication"],
    title: "When **status** changes to Done, create a pre-made **update**",
    apps: [],
    requires: [NEEDS.status],
    build: (context) =>
      define("status_changed", status(context), [{ type: "post_update", params: { message: "{item_name} is done. Thanks {actor_name}!" } }], { trigger_value: statusOption(context, "Done") }),
  },
  {
    id: "status_time_start",
    categories: ["productivity"],
    title: "When **status** changes to **something**, start **time tracking**",
    apps: [],
    requires: [NEEDS.status, NEEDS.time_tracking],
    build: (context) => define("status_changed", status(context), [{ type: "time_tracking", params: withColumn("target_column_id", pick(context, ["time_tracking"]), { mode: "start" as const }) }]),
  },
  {
    id: "status_time_stop",
    categories: ["productivity"],
    title: "When **status** changes to **something**, stop **time tracking**",
    apps: [],
    requires: [NEEDS.status, NEEDS.time_tracking],
    build: (context) => define("status_changed", status(context), [{ type: "time_tracking", params: withColumn("target_column_id", pick(context, ["time_tracking"]), { mode: "stop" as const }) }]),
  },
  {
    id: "status_copy_value",
    categories: ["productivity"],
    title: "When **status** changes to **something**, copy **a column** to **another column**",
    apps: [],
    requires: [NEEDS.status],
    build: (context) => define("status_changed", status(context), [{ type: "copy_column_value", params: {} }]),
  },
  {
    id: "item_created_subitems",
    categories: ["productivity"],
    title: "When an item is created, create **subitems** as a checklist",
    apps: [],
    requires: [],
    build: () => define("item_created", null, [{ type: "create_subitem", params: { subitem_names: ["Plan", "Build", "Review"] } }]),
  },
  {
    id: "status_subitems",
    categories: ["productivity"],
    title: "When **status** changes to **something**, create **subitems** as a checklist",
    apps: [],
    requires: [NEEDS.status],
    build: (context) => define("status_changed", status(context), [{ type: "create_subitem", params: { subitem_names: ["Plan", "Build", "Review"] } }]),
  },
  {
    id: "item_moved_status",
    categories: ["productivity"],
    title: "When an item is **moved to group**, change **status** to **something**",
    apps: [],
    requires: [NEEDS.status],
    build: (context) => define("item_moved_to_group", null, [changeStatus(context)]),
  },
  {
    id: "group_all_done_archive",
    categories: ["productivity"],
    title: "When all items in **a group** have the **status** of **something**, archive the group and create **a new one**",
    apps: [],
    requires: [NEEDS.status],
    build: (context) =>
      define("all_group_items_status", status(context), [
        { type: "create_group", params: { group_name: "Sprint {week}", position: "top" } },
        { type: "archive_group", params: { from_item_group: true } },
      ], { trigger_value: statusOption(context, "Done") }),
  },

  // Dates
  {
    id: "date_status_set_status",
    categories: ["dates"],
    title: "When **date** arrives and only if **status is something** set **status** to **something**",
    apps: [],
    requires: [NEEDS.date, NEEDS.status],
    build: (context) => define("date_arrived", date(context), [changeStatus(context)], { trigger_config: dayConfig(), conditions: condition(status(context), "is") }),
  },
  {
    id: "item_created_dates",
    categories: ["dates"],
    title: "When an item is created set **date** to today and push **due date** by **some days**",
    apps: [],
    requires: [NEEDS.date, NEEDS.due_date],
    build: (context) =>
      define("item_created", null, [
        { type: "set_date", params: withColumn("target_column_id", date(context), { offset_days: 0 }) },
        { type: "set_date_from_column", params: withColumn("source_column_id", date(context), withColumn("target_column_id", date(context, 1), { offset_days: 7, number_sign: 1 as const })) },
      ]),
  },
  {
    id: "date_move",
    categories: ["dates"],
    title: "**When date** arrives move item to **group**",
    apps: [],
    requires: [NEEDS.date],
    build: (context) => define("date_arrived", date(context), [moveToGroup()], { trigger_config: dayConfig() }),
  },
  {
    id: "date_changed_adjust",
    categories: ["dates"],
    title: "When **date** changes, adjust **another date** by the number of days in **number**",
    apps: [],
    requires: [NEEDS.date, NEEDS.due_date, NEEDS.number],
    build: (context) =>
      define("date_changed", date(context), [
        { type: "set_date_from_column", params: withColumn("number_column_id", pick(context, ["number"]), withColumn("source_column_id", date(context), withColumn("target_column_id", date(context, 1), { offset_days: 0, number_sign: 1 as const }))) },
      ]),
  },
  {
    id: "date_dependency",
    categories: ["dates"],
    title: "Ensure that **this date** in the item always starts after **this other date**",
    apps: [],
    requires: [NEEDS.date, NEEDS.due_date],
    build: (context) =>
      define("date_changed", date(context), [{ type: "ensure_date_after", params: withColumn("source_column_id", date(context), withColumn("target_column_id", date(context, 1), { gap_days: 1 })) }]),
  },
  {
    id: "status_push_date",
    categories: ["dates"],
    title: "When **status** changes to **something** push **due date** by **some days**",
    apps: [],
    requires: [NEEDS.status, NEEDS.date],
    build: (context) => define("status_changed", status(context), [{ type: "shift_date", params: withColumn("target_column_id", date(context), { amount: 3, unit: "days" as const }) }]),
  },
  {
    id: "date_status_move",
    categories: ["dates"],
    title: "**When date** arrives and only if **status is something** move item to **group**",
    apps: [],
    requires: [NEEDS.date, NEEDS.status],
    build: (context) => define("date_arrived", date(context), [moveToGroup()], { trigger_config: dayConfig(), conditions: condition(status(context), "is") }),
  },
  {
    id: "recurring_new_group",
    categories: ["dates", "productivity"],
    title: "**Every time period**, create a new **group**",
    apps: [],
    requires: [],
    build: () => define("recurring", null, [{ type: "create_group", params: { group_name: "Week {week}", position: "top" } }], { trigger_config: weekly() }),
  },
  {
    id: "date_move_push",
    categories: ["dates"],
    title: "**When date** arrives move item to **group** and push **due date** by **some days**",
    apps: [],
    requires: [NEEDS.date],
    build: (context) =>
      define("date_arrived", date(context), [moveToGroup(), { type: "shift_date", params: withColumn("target_column_id", date(context), { amount: 7, unit: "days" as const }) }], { trigger_config: dayConfig() }),
  },
  {
    id: "date_status_archive",
    categories: ["dates"],
    title: "**When date** arrives and **a status is something**, archive the item",
    apps: [],
    requires: [NEEDS.date, NEEDS.status],
    build: (context) => define("date_arrived", date(context), [{ type: "archive_item", params: {} }], { trigger_config: dayConfig(), conditions: condition(status(context), "is") }),
  },
  {
    id: "scan_archive_passed",
    categories: ["dates"],
    title: "Every day, if **date** has passed and **status** is **something**, archive the item",
    apps: [],
    requires: [NEEDS.date, NEEDS.status],
    build: (context) =>
      define("item_scan", null, [{ type: "archive_item", params: {} }], {
        trigger_config: daily(),
        conditions: [...condition(date(context), "is", [], "past"), ...condition(status(context), "is", statusOption(context, "Done") ? [statusOption(context, "Done") as string] : [])],
      }),
  },
  {
    id: "date_duplicate_push",
    categories: ["dates"],
    title: "When **due date** arrives, duplicate the item and push the date by **some time**",
    apps: [],
    requires: [NEEDS.due_date],
    build: (context) =>
      define("date_arrived", date(context), [{ type: "duplicate_item", params: { with_subitems: true } }, { type: "shift_date", params: withColumn("target_column_id", date(context), { amount: 1, unit: "weeks" as const }) }], { trigger_config: dayConfig() }),
  },
  {
    id: "date_create_item",
    categories: ["dates"],
    title: "**When date** arrives create an **item** in **group**",
    apps: [],
    requires: [NEEDS.date],
    build: (context) => define("date_arrived", date(context), [{ type: "create_item", params: { item_name: "Follow up: {item_name}" } }], { trigger_config: dayConfig() }),
  },
  {
    id: "date_move_board",
    categories: ["dates", "sync"],
    title: "**When date** arrives move **item** to **board**",
    apps: [],
    requires: [NEEDS.date],
    build: (context) => define("date_arrived", date(context), [{ type: "move_to_board", params: {} }], { trigger_config: dayConfig() }),
  },
  {
    id: "date_archive",
    categories: ["dates"],
    title: "**When date** arrives archive item",
    apps: [],
    requires: [NEEDS.date],
    build: (context) => define("date_arrived", date(context), [{ type: "archive_item", params: {} }], { trigger_config: dayConfig() }),
  },
  {
    id: "date_soon_notify",
    categories: ["dates", "communication"],
    title: "When **date** is **1 day away**, notify **someone**",
    apps: [],
    requires: [NEEDS.date],
    build: (context) => define("date_arrived", date(context), [notifyAssignees(context)], { trigger_config: dayConfig(-1, "09:00") }),
  },
  {
    id: "status_timeline",
    categories: ["dates"],
    title: "When **status** changes to **something**, set **timeline** to start today for **a week**",
    apps: [],
    requires: [NEEDS.status, NEEDS.timeline],
    build: (context) => define("status_changed", status(context), [{ type: "set_timeline", params: withColumn("target_column_id", pick(context, ["timeline"]), { start_offset_days: 0, duration_days: 7 }) }]),
  },
  {
    id: "scan_overdue_notify",
    categories: ["dates", "communication"],
    title: "**Every day**, if **date** has passed and **status** is not **something**, notify **someone**",
    apps: [],
    requires: [NEEDS.date, NEEDS.status],
    build: (context) =>
      define("item_scan", null, [notifyAssignees(context)], {
        trigger_config: daily(),
        conditions: [...condition(date(context), "is", [], "past"), ...condition(status(context), "is_not", statusOption(context, "Done") ? [statusOption(context, "Done") as string] : [])],
      }),
  },

  // Communication
  {
    id: "date_status_email",
    categories: ["communication"],
    title: "**When date** arrives and **status is something**, send an **email** to **someone**",
    apps: ["email"],
    requires: [NEEDS.date, NEEDS.status],
    build: (context) => define("date_arrived", date(context), [emailAssignees(context)], { trigger_config: dayConfig(), conditions: condition(status(context), "is") }),
  },
  {
    id: "item_created_email",
    categories: ["communication"],
    title: "When a new item is created, send an **email** to **someone**",
    apps: ["email"],
    requires: [],
    build: () => define("item_created", null, [{ type: "send_email", params: {} }]),
  },
  {
    id: "item_created_slack_channel",
    categories: ["communication"],
    title: "When an item is created, **notify** in **channel**",
    apps: ["slack"],
    requires: [],
    build: () => define("item_created", null, [{ type: "slack_notify_channel", params: {} }]),
  },
  {
    id: "status_slack_channel",
    categories: ["communication"],
    title: "When **a status** changes to **something**, **notify** in **channel**",
    apps: ["slack"],
    requires: [NEEDS.status],
    build: (context) => define("status_changed", status(context), [{ type: "slack_notify_channel", params: {} }]),
  },
  {
    id: "item_created_notify",
    categories: ["communication"],
    title: "When an item is created **notify someone**",
    apps: [],
    requires: [],
    build: () => define("item_created", null, [{ type: "notify_person", params: {} }]),
  },
  {
    id: "scan_status_email",
    categories: ["communication"],
    title: "**Every time period**, if **status is something**, send an **email** to **someone**",
    apps: ["email"],
    requires: [NEEDS.status],
    build: (context) => define("item_scan", null, [emailAssignees(context)], { trigger_config: weekly(), conditions: condition(status(context), "is") }),
  },
  {
    id: "status_from_to_email",
    categories: ["communication"],
    title: "When **status** changes from **something** to **something else**, send an **email** to **someone**",
    apps: ["email"],
    requires: [NEEDS.status],
    build: (context) => define("status_changed", status(context), [emailAssignees(context)]),
  },
  {
    id: "update_slack_channel",
    categories: ["communication"],
    title: "When any update is posted, send it to **channel**",
    apps: ["slack"],
    requires: [],
    build: () => define("update_posted", null, [{ type: "slack_notify_channel", params: { message: "{actor_name} on {item_name}: {update_text}" } }]),
  },
  {
    id: "recurring_email",
    categories: ["communication"],
    title: "**Every time period**, send an **email** to **someone**",
    apps: ["email"],
    requires: [],
    build: () => define("recurring", null, [{ type: "send_email", params: {} }], { trigger_config: weekly() }),
  },
  {
    id: "item_created_notify_team",
    categories: ["communication"],
    title: "When an item is created, **notify team**",
    apps: ["team"],
    requires: [],
    build: () => define("item_created", null, [{ type: "notify_team", params: {} }]),
  },
  {
    id: "column_email",
    categories: ["communication"],
    title: "When **a column** changes, send an **email** to **someone**",
    apps: ["email"],
    requires: [],
    build: (context) => define("column_changed", pick(context, ["status", "dropdown", "number", "checkbox", "text", "date"]), [emailAssignees(context)]),
  },
  {
    id: "status_notify_team",
    categories: ["communication"],
    title: "When **a status** changes to **something**, **notify team**",
    apps: ["team"],
    requires: [NEEDS.status],
    build: (context) => define("status_changed", status(context), [{ type: "notify_team", params: {} }]),
  },
  {
    id: "column_notify",
    categories: ["communication"],
    title: "When **column** changes **notify someone**",
    apps: [],
    requires: [],
    build: (context) => define("column_changed", pick(context, ["status", "dropdown", "number", "checkbox", "text", "date"]), [notifyAssignees(context)]),
  },
  {
    id: "date_slack_person",
    categories: ["communication"],
    title: "**When date** arrives, **notify user** on Slack",
    apps: ["slack"],
    requires: [NEEDS.date],
    build: (context) => define("date_arrived", date(context), [{ type: "slack_notify_person", params: withColumn("notify_from_people_column_id", people(context), {}) }], { trigger_config: dayConfig() }),
  },
  {
    id: "recurring_notify",
    categories: ["communication"],
    title: "**Every time period**, **notify someone**",
    apps: [],
    requires: [],
    build: () => define("recurring", null, [{ type: "notify_person", params: {} }], { trigger_config: daily() }),
  },
  {
    id: "scan_status_notify",
    categories: ["communication"],
    title: "**Every time period**, if **status is something**, **notify someone**",
    apps: [],
    requires: [NEEDS.status],
    build: (context) => define("item_scan", null, [notifyAssignees(context)], { trigger_config: weekly(), conditions: condition(status(context), "is") }),
  },
  {
    id: "group_all_done_notify",
    categories: ["communication"],
    title: "When all items in **this group** have the **status** of **something**, **notify someone**",
    apps: [],
    requires: [NEEDS.status],
    build: (context) => define("all_group_items_status", status(context), [{ type: "notify_person", params: {} }], { trigger_value: statusOption(context, "Done") }),
  },
  {
    id: "column_slack_channel",
    categories: ["communication"],
    title: "When **a column** changes, **notify** in **channel**",
    apps: ["slack"],
    requires: [],
    build: (context) => define("column_changed", pick(context, ["status", "dropdown", "number", "checkbox", "text", "date"]), [{ type: "slack_notify_channel", params: {} }]),
  },
  {
    id: "name_changed_notify",
    categories: ["communication"],
    title: "When an **item name** changes, **notify someone**",
    apps: [],
    requires: [],
    build: (context) => define("name_changed", null, [{ type: "notify_person", params: withColumn("notify_from_people_column_id", people(context), { message: "\"{old_value}\" was renamed to \"{new_value}\"." }) }]),
  },

  // Sync
  {
    id: "status_webhook",
    categories: ["sync"],
    title: "When **status** changes to **something**, send a **webhook**",
    apps: ["webhook"],
    requires: [NEEDS.status],
    build: (context) => define("status_changed", status(context), [{ type: "send_webhook", params: {} }]),
  },
  {
    id: "item_created_webhook",
    categories: ["sync"],
    title: "When an item is created, send it to a **webhook**",
    apps: ["webhook"],
    requires: [],
    build: () => define("item_created", null, [{ type: "send_webhook", params: {} }]),
  },
  {
    id: "form_webhook",
    categories: ["sync"],
    title: "When **a form** is submitted, send the answers to a **webhook**",
    apps: ["form", "webhook"],
    requires: [],
    build: () => define("form_submitted", null, [{ type: "send_webhook", params: {} }]),
  },
  {
    id: "webhook_notify",
    categories: ["sync", "communication"],
    title: "When a **webhook** is received, **notify someone**",
    apps: ["webhook"],
    requires: [],
    build: () => define("webhook_received", null, [{ type: "notify_person", params: { message: "New webhook: {payload.name}" } }]),
  },
  {
    id: "cross_board_create",
    categories: ["sync", "connected"],
    title: "When **status** changes to **something**, create an item on **another board** and copy its values",
    apps: [],
    requires: [NEEDS.status],
    build: (context) => define("status_changed", status(context), [{ type: "create_item", params: { item_name: "{item_name}", copy_values: true, target_board_id: null } }]),
  },
  {
    id: "cross_board_move",
    categories: ["sync"],
    title: "When **status** changes to **something**, move item to **another board**",
    apps: [],
    requires: [NEEDS.status],
    build: (context) => define("status_changed", status(context), [{ type: "move_to_board", params: {} }]),
  },

  // Connected & mirror columns
  {
    id: "item_created_connect",
    categories: ["connected"],
    title: "When an item is created, connect it to the item with the same **name** on **another board**",
    apps: [],
    requires: [NEEDS.connect],
    build: (context) => define("item_created", null, [{ type: "connect_items", params: withColumn("target_column_id", pick(context, ["connect_board"]), { match_column_id: "name", linked_match_column_id: "name" }) }]),
  },
  {
    id: "status_connect",
    categories: ["connected"],
    title: "When **status** changes to **something**, connect the item by matching **a column**",
    apps: [],
    requires: [NEEDS.status, NEEDS.connect],
    build: (context) => define("status_changed", status(context), [{ type: "connect_items", params: withColumn("target_column_id", pick(context, ["connect_board"]), { match_column_id: "name", linked_match_column_id: "name" }) }]),
  },
  {
    id: "column_connect",
    categories: ["connected"],
    title: "When **a column** changes, connect the item to the matching items on **another board**",
    apps: [],
    requires: [NEEDS.text, NEEDS.connect],
    build: (context) => {
      const text = pick(context, ["text", "email"]);
      return define("column_changed", text, [{ type: "connect_items", params: withColumn("target_column_id", pick(context, ["connect_board"]), { match_column_id: text ? String(text) : "name", linked_match_column_id: "name" }) }]);
    },
  },
];

/** Splits a `**bold**` title into plain and highlighted parts. */
export function titleParts(title: string): { text: string; is_bold: boolean }[] {
  return title.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part) => (part.startsWith("**") ? { text: part.slice(2, -2), is_bold: true } : { text: part, is_bold: false }));
}

/** The columns a recipe needs that the table does not have yet, counting two needs of one kind as two columns. */
export function missingColumns(requires: RecipeColumnNeed[], context: AutomationBuilderContext): RecipeColumnNeed[] {
  const used = new Map<string, number>();
  return requires.filter((need) => {
    const key = `${need.scope}:${need.kind}`;
    const nth = used.get(key) ?? 0;
    used.set(key, nth + 1);
    const matching = context.columns.filter((column) => column.scope === need.scope && (column.kind === need.kind || (need.kind === "status" && column.kind === "label")));
    return matching.length <= nth;
  });
}
